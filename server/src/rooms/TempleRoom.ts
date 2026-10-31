import { Room, Client, ServerError } from '@colyseus/core';
import {
  TempleRoomState,
  PlayerSchema,
  IncenseStickSchema,
  ChatMessageSchema
} from '../schema';
import {
  containsProfanity,
  PROFANITY_NAME_ERROR,
  PROFANITY_CHAT_ERROR
} from '../profanity';
import { RoomRadioClock } from '../audioPlaylist';
import {
  upsertActiveTempleRoom,
  removeActiveTempleRoom
} from './LobbyRoom';
import {
  ALLOWED_ROOM_CAPACITIES,
  CHAT_COOLDOWN_MS,
  CHAT_MAX_LENGTH,
  CHAT_MAX_MESSAGES,
  CUSHION_POSITIONS,
  DISCONNECT_FADE_MS,
  EMPTY_ROOM_CLOSE_MS,
  INCENSE_BURN_DURATION_MS,
  MAX_INCENSE_IN_BURNER,
  MAX_INCENSE_PER_PLAYER,
  RECONNECT_TIMEOUT_SEC,
  ROOM_THEMES,
  RoomTheme,
  PlayerAction,
  EXP_REWARDS,
  getLevelFromExp,
  getMilestoneInfo,
  isCatholicRoom
} from '../../../shared/constants';

export interface TempleRoomCreateOptions {
  roomName?: string;
  theme?: RoomTheme;
  maxClients?: number;
  isPrivate?: boolean;
  roomCode?: string;
}

export interface TempleRoomJoinOptions {
  name?: string;
  robeColor?: 'brown' | 'blue';
  roomCode?: string;
  initialExp?: number;
  clientId?: string;
}

export interface ChatReportLogEntry {
  roomId: string;
  reporterId: string;
  reporterName: string;
  messageId: string;
  senderName: string;
  messageText: string;
  reportedAt: string;
}

export const serverModerationLogs: ChatReportLogEntry[] = [];

export class TempleRoom extends Room<TempleRoomState> {
  private radioClock!: RoomRadioClock;
  private customTrackOverride: {
    id: string;
    title: string;
    url: string;
    durationSeconds: number;
    startTime: number;
  } | null = null;
  private roomCode: string = '';
  private hadAnyPlayerJoined = false;
  private emptyRoomCloseTimer?: NodeJS.Timeout;
  private tickInterval?: NodeJS.Timeout;
  private lastChatSentAt = new Map<string, number>();
  private lastExpActionAt = new Map<string, number>();
  private clientDeviceMap = new Map<string, string>();
  private lastHeartbeatAt = new Map<string, number>();
  private bowTickCounter = 0;
  private incenseSlotCounter = 0;

  onCreate(options: TempleRoomCreateOptions): void {
    const rawName = (options?.roomName ?? 'Chánh Điện Thanh Tịnh').trim();
    if (containsProfanity(rawName)) {
      throw new ServerError(400, PROFANITY_NAME_ERROR);
    }

    const theme: RoomTheme = ROOM_THEMES.includes(options?.theme as RoomTheme)
      ? (options.theme as RoomTheme)
      : 'Chung';

    const capacity = ALLOWED_ROOM_CAPACITIES.includes(options?.maxClients as 10 | 30 | 50)
      ? (options.maxClients as number)
      : 50;

    this.maxClients = capacity;
    this.autoDispose = false; // Tự quản lý đóng phòng theo đúng quy tắc Mục 10

    const isPrivate = Boolean(options?.isPrivate);
    this.roomCode = isPrivate ? (options?.roomCode ?? '').trim().toUpperCase() : '';

    const state = new TempleRoomState();
    state.roomName = rawName;
    state.theme = theme;
    state.maxCapacity = capacity;
    state.isPrivate = isPrivate;
    state.serverTime = Date.now();
    this.setState(state);

    // Khởi tạo kênh âm thanh Radio phát sẵn liên tục theo chủ đề phòng (Mục 9)
    this.radioClock = new RoomRadioClock(theme, Date.now());
    this.syncAudioState(Date.now());

    // Đăng ký phòng vào danh sách Sảnh
    this.publishRoomInfoToLobby();

    // Hẹn giờ 30 phút nếu phòng tạo ra mà không có ai vào thì tự đóng (Mục 10)
    this.resetEmptyRoomTimer();

    // Vòng lặp hệ thống mỗi 1000ms: cập nhật bài hát Radio, xóa nhang hết hạn 30 phút, xóa nhân vật mất kết nối quá hạn
    this.tickInterval = setInterval(() => {
      this.onServerTick();
    }, 1000);

    this.registerMessageHandlers();
  }

  onAuth(_client: Client, options: TempleRoomJoinOptions): boolean {
    const rawName = (options?.name ?? '').trim();
    if (!rawName || rawName.length < 2 || rawName.length > 24) {
      throw new ServerError(400, 'Tên người chơi phải từ 2 đến 24 ký tự');
    }
    if (containsProfanity(rawName)) {
      throw new ServerError(400, PROFANITY_NAME_ERROR);
    }

    if (this.state.isPrivate) {
      const providedCode = (options?.roomCode ?? '').trim().toUpperCase();
      if (providedCode !== this.roomCode) {
        throw new ServerError(403, 'Mã phòng 6 ký tự không chính xác');
      }
    }

    return true;
  }

  onJoin(client: Client, options: TempleRoomJoinOptions): void {
    this.hadAnyPlayerJoined = true;
    this.clearEmptyRoomTimer();

    const baseName = (options?.name ?? 'Phật Tử').trim();
    const incomingClientId = String(options?.clientId ?? '').trim();

    // Xóa ngay mọi phiên cũ đã mất kết nối (!p.connected) hoặc cùng thiết bị / cùng tên cũ
    // để khi người chơi tải lại trang qua Cloudflare Tunnel hoặc thoát ra vào lại
    // không bao giờ bị nhân đôi nhân vật hay bị đổi tên thành _2
    const staleIds: string[] = [];
    this.state.players.forEach((p, id) => {
      const sameDevice = incomingClientId && this.clientDeviceMap.get(id) === incomingClientId;
      const sameBaseName =
        p.name.toLowerCase() === baseName.toLowerCase() ||
        p.name.toLowerCase().startsWith(`${baseName.toLowerCase()}_`);
      if (!p.connected || sameDevice || sameBaseName) {
        staleIds.push(id);
      }
    });
    for (const sid of staleIds) {
      this.state.players.delete(sid);
      this.lastChatSentAt.delete(sid);
      this.clientDeviceMap.delete(sid);
      this.lastHeartbeatAt.delete(sid);
      const oldClient = this.clients.find((c) => c.sessionId === sid);
      if (oldClient && oldClient.sessionId !== client.sessionId) {
        try {
          oldClient.leave(4001);
        } catch {
          // Ignore
        }
      }
    }

    if (incomingClientId) {
      this.clientDeviceMap.set(client.sessionId, incomingClientId);
    }
    this.lastHeartbeatAt.set(client.sessionId, Date.now());

    const uniqueName = this.assignUniquePlayerName(baseName);

    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = uniqueName;

    // Chọn vị trí xuất hiện không trùng lên bất kỳ người chơi nào đang đứng trong phòng
    const spawnPos = this.findNonOverlappingSpawn();
    player.x = spawnPos.x;
    player.z = spawnPos.z;
    player.rotation = 0;
    player.action = 'idle';
    player.robeColor = options?.robeColor === 'blue' ? 'blue' : 'brown';
    player.cushionIndex = -1;
    player.connected = true;
    player.disconnectedAt = 0;
    const startExp = Math.max(0, Math.min(99999, Math.floor(Number(options?.initialExp) || 0)));
    player.exp = startExp;
    player.level = getLevelFromExp(startExp);

    this.state.players.set(client.sessionId, player);

    // Gửi thông tin đồng bộ âm thanh Radio & thông tin phòng ngay sau khi client đăng ký xong listener
    this.syncAudioState(Date.now());
    setTimeout(() => {
      try {
        client.send('audio_sync', {
          trackId: this.state.audioState.trackId,
          trackTitle: this.state.audioState.trackTitle,
          trackUrl: this.state.audioState.trackUrl,
          trackDuration: this.state.audioState.trackDuration,
          startTime: this.state.audioState.startTime,
          serverNow: Date.now()
        });

        client.send('joined_room_info', {
          sessionId: client.sessionId,
          assignedName: uniqueName,
          roomName: this.state.roomName,
          theme: this.state.theme,
          isPrivate: this.state.isPrivate,
          roomCode: this.roomCode
        });
      } catch {
        // Ignore if client already left
      }
    }, 30);

    this.publishRoomInfoToLobby();
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Giải phóng bồ đoàn nếu người chơi đang ngồi lạy
    player.cushionIndex = -1;

    if (consented) {
      this.state.players.delete(client.sessionId);
      this.lastChatSentAt.delete(client.sessionId);
      this.publishRoomInfoToLobby();
      this.checkCloseIfRoomEmpty();
      return;
    }

    // Khi mất kết nối đột ngột (đóng tab trên điện thoại/máy tính):
    // Chỉ giữ chờ kết nối lại tối đa 3 giây rồi xóa hẳn để không bị kẹt nhân vật trong phòng
    player.connected = false;
    player.disconnectedAt = Date.now();
    this.publishRoomInfoToLobby();

    try {
      await this.allowReconnection(client, 3);
      player.connected = true;
      player.disconnectedAt = 0;
      this.publishRoomInfoToLobby();
    } catch {
      this.state.players.delete(client.sessionId);
      this.lastChatSentAt.delete(client.sessionId);
      this.publishRoomInfoToLobby();
      this.checkCloseIfRoomEmpty();
    }
  }

  onDispose(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.clearEmptyRoomTimer();
    removeActiveTempleRoom(this.roomId);
  }

  private registerMessageHandlers(): void {
    this.onMessage('ping_alive', (client) => {
      this.lastHeartbeatAt.set(client.sessionId, Date.now());
    });

    // 0. Gói tin báo thoát ngay khi người chơi đóng tab hoặc chuyển trang (pagehide / beforeunload)
    this.onMessage('leave_now', (client) => {
      this.state.players.delete(client.sessionId);
      this.lastChatSentAt.delete(client.sessionId);
      this.clientDeviceMap.delete(client.sessionId);
      this.lastHeartbeatAt.delete(client.sessionId);
      this.publishRoomInfoToLobby();
      this.checkCloseIfRoomEmpty();
    });

    // 1. Nhận gói tin di chuyển từ client (tối đa 10 lần/giây)
    this.onMessage(
      'move',
      (
        client,
        payload: { x: number; z: number; rotation: number; action?: PlayerAction }
      ) => {
        this.lastHeartbeatAt.set(client.sessionId, Date.now());
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        let nextX = player.x;
        let nextZ = player.z;

        if (typeof payload?.x === 'number' && Number.isFinite(payload.x)) {
          nextX = Math.max(-12, Math.min(12, payload.x));
        }
        if (typeof payload?.z === 'number' && Number.isFinite(payload.z)) {
          nextZ = Math.max(-14.6, Math.min(27.5, payload.z));
        }

        // Nếu đang dừng lại (idle/pray/beads), đẩy nhẹ để 2 người không đứng chồng khít lên nhau
        if (payload?.action && payload.action !== 'walk' && payload.action !== 'bow') {
          this.state.players.forEach((other, otherId) => {
            if (otherId === client.sessionId || !other.connected) return;
            const dx = nextX - other.x;
            const dz = nextZ - other.z;
            const dist = Math.hypot(dx, dz);
            if (dist < 0.68) {
              const angle = dist > 0.001 ? Math.atan2(dz, dx) : Math.random() * Math.PI * 2;
              nextX = other.x + Math.cos(angle) * 0.72;
              nextZ = other.z + Math.sin(angle) * 0.72;
            }
          });
        }

        player.x = Number(nextX.toFixed(2));
        player.z = Number(nextZ.toFixed(2));

        if (typeof payload?.rotation === 'number' && Number.isFinite(payload.rotation)) {
          player.rotation = payload.rotation;
        }
        if (payload?.action) {
          const prevAction = player.action;
          player.action = payload.action;
          // LƯU Ý QUAN TRỌNG: KHÔNG xóa player.cushionIndex khi action === 'walk' vì nhân vật đang đi bộ tới bồ đoàn đã đặt chỗ!
          // Chỉ giải phóng bồ đoàn khi người chơi đang lạy ('bow') mà chủ động bước ra xa bồ đoàn
          if (prevAction === 'bow' && payload.action !== 'bow' && player.cushionIndex !== -1) {
            player.cushionIndex = -1;
          }
        }
      }
    );

    // 2. Đổi trạng thái hành động (Chắp tay / Lần tràng hạt / Đứng yên)
    this.onMessage('set_action', (client, payload: { action: PlayerAction }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const allowed: PlayerAction[] = ['idle', 'walk', 'pray', 'bow', 'beads'];
      if (allowed.includes(payload?.action)) {
        player.action = payload.action;
        if (payload.action !== 'bow') {
          player.cushionIndex = -1;
        }
        if (payload.action === 'pray') {
          const now = Date.now();
          const last = this.lastExpActionAt.get(`${client.sessionId}_pray`) ?? 0;
          if (now - last >= 2200) {
            this.lastExpActionAt.set(`${client.sessionId}_pray`, now);
            const reason = isCatholicRoom(this.state.theme, this.state.roomName)
              ? 'Làm dấu Thánh Giá'
              : 'Chắp tay lễ bái';
            this.awardExp(client, player, EXP_REWARDS.PRAY, reason);
          }
        }
      }
    });

    // 3. Yêu cầu tìm bồ đoàn trống gần nhất để Lạy (Mục 5 — đảm bảo tuyệt đối không có 2 người ngồi chung 1 bồ đoàn)
    this.onMessage('request_bow', (client, payload?: { preferredCushionIndex?: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const occupiedIndices = this.getOccupiedCushionIndices(client.sessionId);

      let chosenSpot = null;

      // Nếu người chơi click trực tiếp vào 1 bồ đoàn cụ thể và bồ đoàn đó còn trống
      if (
        typeof payload?.preferredCushionIndex === 'number' &&
        payload.preferredCushionIndex >= 0 &&
        payload.preferredCushionIndex < CUSHION_POSITIONS.length &&
        !occupiedIndices.has(payload.preferredCushionIndex)
      ) {
        chosenSpot = CUSHION_POSITIONS[payload.preferredCushionIndex];
      } else {
        // Tìm bồ đoàn trống gần vị trí nhân vật nhất
        let minDist = Infinity;
        for (const spot of CUSHION_POSITIONS) {
          if (occupiedIndices.has(spot.index)) continue;
          const dist = Math.hypot(spot.x - player.x, spot.z - player.z);
          if (dist < minDist) {
            minDist = dist;
            chosenSpot = spot;
          }
        }
      }

      if (!chosenSpot) {
        client.send('bow_result', {
          ok: false,
          message: 'Đã hết chỗ bồ đoàn trống, vui lòng đợi'
        });
        return;
      }

      // Đặt chỗ ngay lập tức cho người chơi này để không ai khác giành mất trong lúc đang bước tới
      player.cushionIndex = chosenSpot.index;
      client.send('bow_result', {
        ok: true,
        cushionIndex: chosenSpot.index,
        x: chosenSpot.x,
        z: chosenSpot.z
      });
    });

    // Xác nhận nhân vật đã đi tới đúng bồ đoàn và bắt đầu lạy
    this.onMessage('start_bow_at_cushion', (client, payload: { cushionIndex: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const occupiedByOthers = this.getOccupiedCushionIndices(client.sessionId);
      const requestedIdx = payload?.cushionIndex;
      const spot = CUSHION_POSITIONS[requestedIdx];

      if (spot && !occupiedByOthers.has(spot.index)) {
        player.cushionIndex = spot.index;
        player.x = spot.x;
        player.z = spot.z;
        player.rotation = 0; // Xoay mặt hướng về tượng Phật / Cung Thánh (-Z)
        player.action = 'bow';
        const reason = isCatholicRoom(this.state.theme, this.state.roomName)
          ? 'Quỳ cầu nguyện'
          : 'Quỳ lạy Phật';
        this.awardExp(client, player, EXP_REWARDS.BOW_CYCLE, reason);
      } else {
        // Nếu bồ đoàn đó vừa bị người khác đứng vào, tự động chuyển sang bồ đoàn trống gần nhất
        let fallbackSpot = null;
        let minDist = Infinity;
        for (const s of CUSHION_POSITIONS) {
          if (occupiedByOthers.has(s.index)) continue;
          const d = Math.hypot(s.x - player.x, s.z - player.z);
          if (d < minDist) {
            minDist = d;
            fallbackSpot = s;
          }
        }
        if (fallbackSpot) {
          player.cushionIndex = fallbackSpot.index;
          player.x = fallbackSpot.x;
          player.z = fallbackSpot.z;
          player.rotation = 0;
          player.action = 'bow';
          client.send('bow_result', {
            ok: true,
            cushionIndex: fallbackSpot.index,
            x: fallbackSpot.x,
            z: fallbackSpot.z
          });
          const reason = isCatholicRoom(this.state.theme, this.state.roomName)
            ? 'Quỳ cầu nguyện'
            : 'Quỳ lạy Phật';
          this.awardExp(client, player, EXP_REWARDS.BOW_CYCLE, reason);
        }
      }
    });

    // Dừng lạy, đứng dậy giải phóng bồ đoàn
    this.onMessage('stop_bow', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.cushionIndex = -1;
      player.action = 'idle';
    });

    // 4. Đốt nhang (Mục 6: tối đa 3 nén/người, tối đa 50 nén/lư, cháy 30 phút)
    this.onMessage('plant_incense', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const now = Date.now();
      this.cleanupExpiredIncense(now);

      // Đếm số nén nhang đang cháy của người chơi này
      let playerActiveSticks = 0;
      for (const stick of this.state.incenseSticks) {
        if (stick.ownerId === client.sessionId || stick.ownerName === player.name) {
          playerActiveSticks++;
        }
      }

      if (playerActiveSticks >= MAX_INCENSE_PER_PLAYER) {
        client.send('incense_result', {
          ok: false,
          message: `Mỗi người chỉ được dâng tối đa ${MAX_INCENSE_PER_PLAYER} nén nhang cùng lúc`
        });
        return;
      }

      // Nếu lư hương đã đầy 50 nén thì nén cũ nhất tàn trước để nhường chỗ
      while (this.state.incenseSticks.length >= MAX_INCENSE_IN_BURNER) {
        this.state.incenseSticks.shift();
      }

      const newStick = new IncenseStickSchema();
      newStick.id = `inc_${now}_${Math.random().toString(36).slice(2, 7)}`;
      newStick.ownerId = client.sessionId;
      newStick.ownerName = player.name;
      newStick.slotIndex = this.incenseSlotCounter++ % MAX_INCENSE_IN_BURNER;
      newStick.createdAt = now;
      newStick.expiresAt = now + INCENSE_BURN_DURATION_MS;

      this.state.incenseSticks.push(newStick);

      const catholic = isCatholicRoom(this.state.theme, this.state.roomName);
      this.broadcast('head_bubble', {
        senderId: client.sessionId,
        senderName: player.name,
        text: catholic ? '✝️ Lạy Chúa, xin nhận lời con cầu nguyện ✝️' : '🙏 Nam Mô A Di Đà Phật 🙏',
        isChant: true
      });

      this.awardExp(
        client,
        player,
        EXP_REWARDS.OFFER_INCENSE,
        catholic ? 'Thắp nến cầu nguyện' : 'Dâng hương lễ Phật'
      );

      client.send('incense_result', {
        ok: true,
        stickId: newStick.id,
        ownerName: newStick.ownerName,
        expiresAt: newStick.expiresAt
      });
    });

    // Niệm Phật / Đọc kinh tuỳ chọn hiện chữ trên đầu nhân vật (có qua bộ lọc từ tục)
    this.onMessage('chant', (client, payload: { text?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const rawText = (payload?.text ?? '').trim().slice(0, 140);
      if (!rawText) return;

      if (containsProfanity(rawText)) {
        client.send('chat_error', { message: PROFANITY_CHAT_ERROR });
        return;
      }

      this.broadcast('head_bubble', {
        senderId: client.sessionId,
        senderName: player.name,
        text: rawText,
        isChant: true
      });

      const now = Date.now();
      const last = this.lastExpActionAt.get(`${client.sessionId}_chant`) ?? 0;
      if (now - last >= 1500) {
        this.lastExpActionAt.set(`${client.sessionId}_chant`, now);
        const catholic = isCatholicRoom(this.state.theme, this.state.roomName);
        this.awardExp(
          client,
          player,
          EXP_REWARDS.CHANT,
          catholic ? 'Đọc kinh cầu nguyện' : 'Tụng kinh niệm Phật'
        );
      }
    });

    // Nhận điểm Công Đức / Ân Sủng khi lần hạt, xin xăm, rút Lời Chúa, ước nguyện...
    this.onMessage('gain_exp', (client, payload: { amount?: number; reason?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const now = Date.now();
      const last = this.lastExpActionAt.get(`${client.sessionId}_gain`) ?? 0;
      if (now - last < 220) return; // chống spam quá nhanh
      this.lastExpActionAt.set(`${client.sessionId}_gain`, now);

      const safeAmount = Math.max(1, Math.min(100, Math.floor(Number(payload?.amount) || 8)));
      const reason = String(payload?.reason || 'Tu tập thành tâm').slice(0, 60);
      this.awardExp(client, player, safeAmount, reason);
    });

    // 5. Chat trong phòng (Mục 7 & Mục 8: 50 tin gần nhất, tối đa 200 ký tự, 1 tin/2s, lọc từ tục)
    this.onMessage('chat', (client, payload: { text?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const rawText = (payload?.text ?? '').trim();
      if (!rawText) return;

      if (rawText.length > CHAT_MAX_LENGTH) {
        client.send('chat_error', {
          message: `Tin nhắn tối đa ${CHAT_MAX_LENGTH} ký tự`
        });
        return;
      }

      const now = Date.now();
      const prevSent = this.lastChatSentAt.get(client.sessionId) ?? 0;
      if (now - prevSent < CHAT_COOLDOWN_MS) {
        client.send('chat_error', {
          message: 'Bạn gửi quá nhanh, chờ 2 giây'
        });
        return;
      }

      if (containsProfanity(rawText)) {
        client.send('chat_error', {
          message: PROFANITY_CHAT_ERROR
        });
        return;
      }

      this.lastChatSentAt.set(client.sessionId, now);

      const msg = new ChatMessageSchema();
      msg.id = `msg_${now}_${Math.random().toString(36).slice(2, 6)}`;
      msg.senderId = client.sessionId;
      msg.senderName = player.name;
      const d = new Date(now);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      msg.timeString = `${hh}:${mm}`;
      msg.text = rawText;

      this.state.chatMessages.push(msg);
      while (this.state.chatMessages.length > CHAT_MAX_MESSAGES) {
        this.state.chatMessages.shift();
      }

      // Khi nhấn chat thì tin nhắn nhảy lên trên đầu nhân vật gửi
      this.broadcast('head_bubble', {
        senderId: client.sessionId,
        senderName: player.name,
        text: rawText,
        isChant: false
      });
    });

    // 6. Báo cáo tin nhắn xấu (Mục 7: ẩn phía người báo cáo + ghi log phía server)
    this.onMessage('report_chat', (client, payload: { messageId?: string }) => {
      const reporter = this.state.players.get(client.sessionId);
      if (!reporter || !payload?.messageId) return;

      const targetMsg = this.state.chatMessages.find((m) => m.id === payload.messageId);
      if (!targetMsg) return;

      const logEntry: ChatReportLogEntry = {
        roomId: this.roomId,
        reporterId: client.sessionId,
        reporterName: reporter.name,
        messageId: targetMsg.id,
        senderName: targetMsg.senderName,
        messageText: targetMsg.text,
        reportedAt: new Date().toISOString()
      };
      serverModerationLogs.push(logEntry);
      console.log(
        `[MODERATION REPORT] Room=${this.roomId} | Reporter="${reporter.name}" reported message (${targetMsg.id}) from "${targetMsg.senderName}": "${targetMsg.text}"`
      );

      client.send('report_chat_ack', { messageId: targetMsg.id });
    });

    // 7. Đồng bộ lại kênh âm thanh Radio và thông tin phòng bất kỳ lúc nào client yêu cầu
    this.onMessage('request_initial_info', (client) => {
      const player = this.state.players.get(client.sessionId);
      const now = Date.now();
      this.syncAudioState(now);
      client.send('joined_room_info', {
        sessionId: client.sessionId,
        assignedName: player?.name ?? 'Phật Tử',
        roomName: this.state.roomName,
        theme: this.state.theme,
        isPrivate: this.state.isPrivate,
        roomCode: this.roomCode
      });
      client.send('audio_sync', {
        trackId: this.state.audioState.trackId,
        trackTitle: this.state.audioState.trackTitle,
        trackUrl: this.state.audioState.trackUrl,
        trackDuration: this.state.audioState.trackDuration,
        startTime: this.state.audioState.startTime,
        serverNow: now
      });
    });

    this.onMessage('request_audio_sync', (client) => {
      const now = Date.now();
      this.syncAudioState(now);
      client.send('audio_sync', {
        trackId: this.state.audioState.trackId,
        trackTitle: this.state.audioState.trackTitle,
        trackUrl: this.state.audioState.trackUrl,
        trackDuration: this.state.audioState.trackDuration,
        startTime: this.state.audioState.startTime,
        serverNow: now
      });
    });

    // 8. Người chơi đổi nhạc nền hoặc dán link YouTube mới trong phòng -> đồng bộ cho cả phòng cùng nghe
    this.onMessage(
      'change_room_track',
      (_client, payload: { trackUrl?: string; trackTitle?: string }) => {
        const rawUrl = String(payload?.trackUrl ?? '').trim();
        if (!rawUrl) return;
        const now = Date.now();
        this.customTrackOverride = {
          id: `custom_${now}`,
          title: String(payload?.trackTitle || 'Nhạc Thiền Tĩnh Tâm').slice(0, 120),
          url: rawUrl,
          durationSeconds: 600,
          startTime: now
        };
        this.syncAudioState(now);
        this.publishRoomInfoToLobby();
        this.broadcast('audio_sync', {
          trackId: this.state.audioState.trackId,
          trackTitle: this.state.audioState.trackTitle,
          trackUrl: this.state.audioState.trackUrl,
          trackDuration: this.state.audioState.trackDuration,
          startTime: this.state.audioState.startTime,
          serverNow: now
        });
      }
    );
  }

  /**
   * Tìm tập hợp các bồ đoàn đã có người đặt chỗ hoặc đang có người đứng/quỳ gần đó
   */
  private getOccupiedCushionIndices(excludeSessionId: string): Set<number> {
    const occupied = new Set<number>();
    this.state.players.forEach((p, id) => {
      if (id === excludeSessionId || !p.connected) return;
      if (p.cushionIndex >= 0) {
        occupied.add(p.cushionIndex);
      }
      // Nếu có người đang đứng ngay trên bồ đoàn (dù chưa bấm Lạy), cũng tránh xếp người khác đè lên
      for (const spot of CUSHION_POSITIONS) {
        if (Math.hypot(p.x - spot.x, p.z - spot.z) < 0.72) {
          occupied.add(spot.index);
        }
      }
    });
    return occupied;
  }

  /**
   * Chọn vị trí xuất hiện (Spawn) ở lối vào chánh điện sao cho không đè lên bất kỳ ai đang đứng
   */
  private findNonOverlappingSpawn(): { x: number; z: number } {
    for (let attempt = 0; attempt < 30; attempt++) {
      const candidateX = Number(((Math.random() - 0.5) * 6.4).toFixed(2));
      const candidateZ = Number((11.2 + Math.random() * 3.2).toFixed(2));
      let tooClose = false;
      this.state.players.forEach((p) => {
        if (!p.connected) return;
        if (Math.hypot(p.x - candidateX, p.z - candidateZ) < 0.95) {
          tooClose = true;
        }
      });
      if (!tooClose) {
        return { x: candidateX, z: candidateZ };
      }
    }
    return {
      x: Number(((Math.random() - 0.5) * 7.2).toFixed(2)),
      z: Number((11.5 + Math.random() * 3.0).toFixed(2))
    };
  }

  /**
   * Người chơi trùng tên trong cùng phòng: tự thêm hậu tố số (tên, tên_2, tên_3...)
   */
  private assignUniquePlayerName(desiredName: string): string {
    const existingNames = new Set<string>();
    this.state.players.forEach((p) => {
      if (p.connected) {
        existingNames.add(p.name.toLowerCase());
      }
    });

    if (!existingNames.has(desiredName.toLowerCase())) {
      return desiredName;
    }

    let suffix = 2;
    while (existingNames.has(`${desiredName}_${suffix}`.toLowerCase())) {
      suffix++;
    }
    return `${desiredName}_${suffix}`;
  }

  private awardExp(
    client: Client | undefined,
    player: PlayerSchema,
    amount: number,
    reason: string
  ): void {
    const prevLevel = player.level || 1;
    player.exp = (player.exp || 0) + amount;
    const nextLevel = getLevelFromExp(player.exp);
    player.level = nextLevel;

    if (client) {
      try {
        client.send('exp_gained', {
          amount,
          totalExp: player.exp,
          level: nextLevel,
          reason
        });
      } catch {
        // Ignore send error
      }
    }

    if (nextLevel > prevLevel) {
      const milestone = getMilestoneInfo(nextLevel);
      const catholic = isCatholicRoom(this.state.theme, this.state.roomName);
      this.broadcast('player_level_up', {
        sessionId: player.id,
        name: player.name,
        level: nextLevel,
        exp: player.exp,
        title: catholic ? milestone.catholicTitle : milestone.buddhistTitle,
        effectName: catholic ? milestone.catholicEffect : milestone.buddhistEffect,
        badgeIcon: milestone.badgeIcon,
        color: milestone.color
      });
    }
  }

  private onServerTick(): void {
    const now = Date.now();
    this.state.serverTime = now;

    // Cộng điểm Công Đức / Ân Sủng định kỳ mỗi 3 giây cho những người chơi đang thành tâm Quỳ Lạy / Cầu Nguyện
    this.bowTickCounter++;
    if (this.bowTickCounter % 3 === 0) {
      const catholic = isCatholicRoom(this.state.theme, this.state.roomName);
      this.state.players.forEach((p, sid) => {
        if (p.connected && p.action === 'bow') {
          const c = this.clients.find((cl) => cl.sessionId === sid);
          this.awardExp(
            c,
            p,
            EXP_REWARDS.BOW_CYCLE,
            catholic ? 'Thành tâm quỳ cầu nguyện' : 'Thành tâm lễ Phật'
          );
        }
      });
    }

    // Quét dọn ngay các nhân vật mất kết nối quá 2 giây hoặc đóng tab qua tunnel quá 15 giây không gửi heartbeat
    let removedAnyGhost = false;
    this.state.players.forEach((p, id) => {
      const lastBeat = this.lastHeartbeatAt.get(id) ?? now;
      const isDeadSocket = now - lastBeat >= 15000;
      if (
        (!p.connected && p.disconnectedAt > 0 && now - p.disconnectedAt >= 2000) ||
        isDeadSocket
      ) {
        this.state.players.delete(id);
        this.lastChatSentAt.delete(id);
        this.clientDeviceMap.delete(id);
        this.lastHeartbeatAt.delete(id);
        removedAnyGhost = true;
      }
    });
    if (removedAnyGhost) {
      this.publishRoomInfoToLobby();
      this.checkCloseIfRoomEmpty();
    }

    const prevTrackId = this.state.audioState.trackId;
    this.syncAudioState(now);
    if (this.state.audioState.trackId !== prevTrackId) {
      this.publishRoomInfoToLobby();
      this.broadcast('audio_sync', {
        trackId: this.state.audioState.trackId,
        trackTitle: this.state.audioState.trackTitle,
        trackUrl: this.state.audioState.trackUrl,
        trackDuration: this.state.audioState.trackDuration,
        startTime: this.state.audioState.startTime,
        serverNow: now
      });
    }

    this.cleanupExpiredIncense(now);
  }

  private syncAudioState(now: number): void {
    if (this.customTrackOverride) {
      this.state.audioState.trackId = this.customTrackOverride.id;
      this.state.audioState.trackTitle = this.customTrackOverride.title;
      this.state.audioState.trackUrl = this.customTrackOverride.url;
      this.state.audioState.trackDuration = this.customTrackOverride.durationSeconds;
      this.state.audioState.startTime = this.customTrackOverride.startTime;
      return;
    }
    const current = this.radioClock.getCurrentState(now);
    this.state.audioState.trackId = current.id;
    this.state.audioState.trackTitle = current.title;
    this.state.audioState.trackUrl = current.url;
    this.state.audioState.trackDuration = current.durationSeconds;
    this.state.audioState.startTime = current.startTime;
  }

  private cleanupExpiredIncense(now: number): void {
    for (let i = this.state.incenseSticks.length - 1; i >= 0; i--) {
      const stick = this.state.incenseSticks[i];
      if (stick && now >= stick.expiresAt) {
        this.state.incenseSticks.splice(i, 1);
      }
    }
  }

  private countConnectedPlayers(): number {
    let count = 0;
    this.state.players.forEach((p) => {
      if (p.connected) count++;
    });
    return count;
  }

  private publishRoomInfoToLobby(): void {
    upsertActiveTempleRoom({
      roomId: this.roomId,
      roomName: this.state.roomName,
      theme: this.state.theme as RoomTheme,
      clients: this.countConnectedPlayers(),
      maxClients: this.maxClients,
      currentTrackTitle: this.state.audioState.trackTitle,
      isPrivate: this.state.isPrivate,
      roomCode: this.roomCode
    });
  }

  private checkCloseIfRoomEmpty(): void {
    // Chỉ tự đóng ngay đối với phòng riêng tư khi người cuối cùng rời phòng;
    // Các sảnh công cộng mặc định (Chùa & Nhà Thờ) luôn mở sẵn để người chơi chuyển qua lại bất kỳ lúc nào
    if (this.state.isPrivate && this.hadAnyPlayerJoined && this.state.players.size === 0) {
      this.disconnect();
    } else if (this.state.isPrivate && this.state.players.size === 0) {
      this.resetEmptyRoomTimer();
    }
  }

  private resetEmptyRoomTimer(): void {
    this.clearEmptyRoomTimer();
    // Mục 10: Phòng không còn ai trong 30 phút thì server tự đóng
    this.emptyRoomCloseTimer = setTimeout(() => {
      if (this.state.players.size === 0) {
        this.disconnect();
      }
    }, EMPTY_ROOM_CLOSE_MS);
  }

  private clearEmptyRoomTimer(): void {
    if (this.emptyRoomCloseTimer) {
      clearTimeout(this.emptyRoomCloseTimer);
      this.emptyRoomCloseTimer = undefined;
    }
  }
}
