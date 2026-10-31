import * as Colyseus from 'colyseus.js';
import {
  SERVER_PORT,
  RECONNECT_TIMEOUT_SEC,
  PlayerAction,
  RobeColor,
  RoomTheme
} from '../../../shared/constants';
import { RadioSyncPayload } from '../audio/roomRadio';
import { SyncedIncenseData } from '../scene/props';

export interface LobbyRoomItem {
  roomId: string;
  roomName: string;
  theme: RoomTheme;
  clients: number;
  maxClients: number;
  currentTrackTitle: string;
  isPrivate: boolean;
}

export interface RemotePlayerState {
  id: string;
  name: string;
  x: number;
  z: number;
  rotation: number;
  action: PlayerAction;
  robeColor: RobeColor;
  cushionIndex: number;
  connected: boolean;
  disconnectedAt: number;
  exp: number;
  level: number;
}

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  timeString: string;
  text: string;
}

export interface JoinedRoomInfo {
  sessionId: string;
  assignedName: string;
  roomName: string;
  theme: RoomTheme;
  isPrivate: boolean;
  roomCode: string;
  maxCapacity: number;
}

export interface NetworkCallbacks {
  onLobbyRoomsUpdated?: (rooms: LobbyRoomItem[]) => void;
  onJoinedTempleRoom?: (info: JoinedRoomInfo) => void;
  onPlayersChanged?: (players: Map<string, RemotePlayerState>, mySessionId: string) => void;
  onIncenseChanged?: (sticks: SyncedIncenseData[]) => void;
  onChatMessagesChanged?: (messages: ChatMessageItem[]) => void;
  onChatError?: (errorMessage: string) => void;
  onAudioSync?: (payload: RadioSyncPayload) => void;
  onBowResult?: (res: { ok: boolean; message?: string; cushionIndex?: number; x?: number; z?: number }) => void;
  onIncenseResult?: (res: { ok: boolean; message?: string; stickId?: string; expiresAt?: number }) => void;
  onHeadBubble?: (payload: { senderId: string; senderName: string; text: string; isChant: boolean }) => void;
  onExpGained?: (payload: { amount: number; totalExp: number; level: number; reason: string }) => void;
  onPlayerLevelUp?: (payload: {
    sessionId: string;
    name: string;
    level: number;
    exp: number;
    title: string;
    effectName: string;
    badgeIcon: string;
    color: string;
  }) => void;
  onReconnectingState?: (reconnecting: boolean, message?: string) => void;
}

export class GameNetworkClient {
  private client: Colyseus.Client;
  private lobbyRoom: Colyseus.Room | null = null;
  private templeRoom: Colyseus.Room | null = null;
  private callbacks: NetworkCallbacks;
  private isIntentionalLeave = false;
  private statePollInterval?: number;

  constructor(callbacks: NetworkCallbacks) {
    const isViteDev = window.location.port === '5173';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const endpoint = isViteDev
      ? `${wsProtocol}://${window.location.hostname || 'localhost'}:${SERVER_PORT}`
      : `${wsProtocol}://${window.location.host}`;
    this.client = new Colyseus.Client(endpoint);
    this.callbacks = callbacks;

    // Gửi thông báo thoát phòng ngay lập tức khi người chơi đóng tab hoặc tải lại trang trên Điện thoại / Máy tính
    const handleUnload = () => {
      this.isIntentionalLeave = true;
      try {
        this.templeRoom?.send('leave_now');
        this.templeRoom?.leave(true);
      } catch {
        // Ignore unload errors
      }
    };
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
  }

  public async connectLobby(): Promise<boolean> {
    try {
      if (this.lobbyRoom) {
        this.lobbyRoom.send('refresh_rooms');
        return true;
      }
      this.lobbyRoom = await this.client.joinOrCreate('lobby_room');
      this.lobbyRoom.onMessage('rooms_list', (rooms: LobbyRoomItem[]) => {
        this.callbacks.onLobbyRoomsUpdated?.(rooms);
      });
      this.lobbyRoom.onLeave(() => {
        this.lobbyRoom = null;
      });
      return true;
    } catch {
      return false;
    }
  }

  public async createTempleRoom(params: {
    roomName: string;
    theme: RoomTheme;
    maxClients: number;
    isPrivate: boolean;
    roomCode?: string;
  }): Promise<{
    ok: boolean;
    message?: string;
    roomId?: string;
    roomCode?: string;
  }> {
    const connected = await this.connectLobby();
    if (!connected || !this.lobbyRoom) {
      return { ok: false, message: 'Không thể kết nối tới máy chủ Sảnh' };
    }

    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        resolve({ ok: false, message: 'Máy chủ phản hồi quá thời gian' });
      }, 6000);

      const unbind = this.lobbyRoom!.onMessage('create_room_result', (res) => {
        clearTimeout(timeout);
        unbind();
        resolve(res);
      });

      this.lobbyRoom!.send('create_room', params);
    });
  }

  public async verifyRoomCode(params: {
    roomId?: string;
    roomCode: string;
  }): Promise<{ ok: boolean; roomId?: string; roomCode?: string; message?: string }> {
    const connected = await this.connectLobby();
    if (!connected || !this.lobbyRoom) {
      return { ok: false, message: 'Không thể kết nối tới máy chủ Sảnh' };
    }

    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        resolve({ ok: false, message: 'Quá thời gian kiểm tra mã phòng' });
      }, 5000);

      const unbind = this.lobbyRoom!.onMessage('verify_room_code_result', (res) => {
        clearTimeout(timeout);
        unbind();
        resolve(res);
      });

      this.lobbyRoom!.send('verify_room_code', params);
    });
  }

  public async joinTempleRoom(
    roomId: string,
    options: { name: string; robeColor: RobeColor; roomCode?: string; initialExp?: number }
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      if (this.templeRoom) {
        this.isIntentionalLeave = true;
        await this.templeRoom.leave(true);
        this.templeRoom = null;
      }

      let clientId = '';
      try {
        clientId = localStorage.getItem('chua_online_client_id') || '';
        if (!clientId) {
          clientId = `cid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          localStorage.setItem('chua_online_client_id', clientId);
        }
      } catch {
        clientId = `cid_${Date.now()}`;
      }

      this.isIntentionalLeave = false;
      const room = await this.client.joinById(roomId, { ...options, clientId });
      this.bindTempleRoom(room);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể vào phòng';
      return { ok: false, message: msg };
    }
  }

  private bindTempleRoom(room: Colyseus.Room): void {
    this.templeRoom = room;

    room.onMessage('joined_room_info', (info: JoinedRoomInfo) => {
      this.callbacks.onJoinedTempleRoom?.({
        ...info,
        maxCapacity: Number(room.state?.maxCapacity ?? 50)
      });
      this.extractAndEmitState(room);
    });

    room.onMessage('audio_sync', (payload: RadioSyncPayload) => {
      this.callbacks.onAudioSync?.(payload);
    });

    room.onMessage('bow_result', (res) => {
      this.callbacks.onBowResult?.(res);
    });

    room.onMessage('incense_result', (res) => {
      this.callbacks.onIncenseResult?.(res);
    });

    room.onMessage('chat_error', (res: { message: string }) => {
      this.callbacks.onChatError?.(res.message);
    });

    room.onMessage('report_chat_ack', () => {
      // Đã ghi nhận báo cáo phía server
    });

    room.onMessage(
      'head_bubble',
      (payload: { senderId: string; senderName: string; text: string; isChant: boolean }) => {
        this.callbacks.onHeadBubble?.(payload);
      }
    );

    room.onMessage(
      'exp_gained',
      (payload: { amount: number; totalExp: number; level: number; reason: string }) => {
        this.callbacks.onExpGained?.(payload);
      }
    );

    room.onMessage(
      'player_level_up',
      (payload: {
        sessionId: string;
        name: string;
        level: number;
        exp: number;
        title: string;
        effectName: string;
        badgeIcon: string;
        color: string;
      }) => {
        this.callbacks.onPlayerLevelUp?.(payload);
      }
    );

    room.onStateChange(() => {
      this.extractAndEmitState(room);
    });

    // Yêu cầu server gửi lại thông tin phòng & đồng bộ Radio ngay sau khi đã gắn đầy đủ listener
    room.send('request_initial_info');

    if (this.statePollInterval) {
      clearInterval(this.statePollInterval);
    }
    let pollTicks = 0;
    this.statePollInterval = window.setInterval(() => {
      if (this.templeRoom) {
        this.extractAndEmitState(this.templeRoom);
        pollTicks++;
        if (pollTicks % 30 === 0) {
          try {
            this.templeRoom.send('ping_alive');
          } catch {
            // Ignore
          }
        }
      }
    }, 100);

    // Xử lý mất kết nối và tự động nối lại trong 30 giây (Mục 11)
    room.onLeave(async (code: number) => {
      if (this.isIntentionalLeave || code === 1000 || code === 4001) {
        return;
      }

      const token = room.reconnectionToken;
      this.callbacks.onReconnectingState?.(true, 'Đang kết nối lại...');

      const deadline = Date.now() + RECONNECT_TIMEOUT_SEC * 1000;
      while (Date.now() < deadline && !this.isIntentionalLeave) {
        try {
          const reconnectedRoom = await this.client.reconnect(token);
          this.bindTempleRoom(reconnectedRoom);
          this.callbacks.onReconnectingState?.(false);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      this.callbacks.onReconnectingState?.(
        false,
        'Mất kết nối quá 30 giây. Đã quay lại màn hình sảnh.'
      );
    });
  }

  private extractAndEmitState(room: Colyseus.Room): void {
    const st = room.state as any;
    if (!st) return;

    // 1. Players
    if (st.players) {
      const map = new Map<string, RemotePlayerState>();
      st.players.forEach((p: any, id: string) => {
        map.set(id, {
          id: p.id || id,
          name: p.name || 'Phật Tử',
          x: Number(p.x ?? 0),
          z: Number(p.z ?? 12),
          rotation: Number(p.rotation ?? 0),
          action: (p.action as PlayerAction) || 'idle',
          robeColor: (p.robeColor as RobeColor) || 'brown',
          cushionIndex: Number(p.cushionIndex ?? -1),
          connected: Boolean(p.connected ?? true),
          disconnectedAt: Number(p.disconnectedAt ?? 0),
          exp: Number(p.exp ?? 0),
          level: Number(p.level ?? 1)
        });
      });
      this.callbacks.onPlayersChanged?.(map, room.sessionId);
    }

    // 2. Incense Sticks
    if (st.incenseSticks) {
      const sticks: SyncedIncenseData[] = [];
      for (let i = 0; i < st.incenseSticks.length; i++) {
        const s = st.incenseSticks[i];
        if (s) {
          sticks.push({
            id: s.id,
            ownerId: s.ownerId,
            ownerName: s.ownerName,
            slotIndex: Number(s.slotIndex ?? i),
            expiresAt: Number(s.expiresAt ?? 0)
          });
        }
      }
      this.callbacks.onIncenseChanged?.(sticks);
    }

    // 3. Chat Messages
    if (st.chatMessages) {
      const msgs: ChatMessageItem[] = [];
      for (let i = 0; i < st.chatMessages.length; i++) {
        const m = st.chatMessages[i];
        if (m) {
          msgs.push({
            id: m.id,
            senderId: m.senderId,
            senderName: m.senderName,
            timeString: m.timeString,
            text: m.text
          });
        }
      }
      this.callbacks.onChatMessagesChanged?.(msgs);
    }
  }

  public sendMove(x: number, z: number, rotation: number, action: PlayerAction): void {
    this.templeRoom?.send('move', { x, z, rotation, action });
  }

  public sendSetAction(action: PlayerAction): void {
    this.templeRoom?.send('set_action', { action });
  }

  public requestBow(preferredCushionIndex?: number): void {
    this.templeRoom?.send('request_bow', { preferredCushionIndex });
  }

  public startBowAtCushion(cushionIndex: number): void {
    this.templeRoom?.send('start_bow_at_cushion', { cushionIndex });
  }

  public stopBow(): void {
    this.templeRoom?.send('stop_bow');
  }

  public plantIncense(): void {
    this.templeRoom?.send('plant_incense');
  }

  public sendChat(text: string): void {
    this.templeRoom?.send('chat', { text });
  }

  public sendChant(text: string): void {
    this.templeRoom?.send('chant', { text });
  }

  public reportChatMessage(messageId: string): void {
    this.templeRoom?.send('report_chat', { messageId });
  }

  public sendChangeRoomTrack(trackUrl: string, trackTitle?: string): void {
    this.templeRoom?.send('change_room_track', { trackUrl, trackTitle });
  }

  public sendGainExp(amount: number, reason: string): void {
    this.templeRoom?.send('gain_exp', { amount, reason });
  }

  public async leaveTempleRoom(): Promise<void> {
    this.isIntentionalLeave = true;
    if (this.statePollInterval) {
      clearInterval(this.statePollInterval);
      this.statePollInterval = undefined;
    }
    if (this.templeRoom) {
      try {
        await this.templeRoom.leave(true);
      } catch {
        // Ignore leave errors
      }
      this.templeRoom = null;
    }
  }

  public isInTempleRoom(): boolean {
    return this.templeRoom !== null;
  }

  public getSessionId(): string {
    return this.templeRoom?.sessionId ?? 'local_player';
  }
}
