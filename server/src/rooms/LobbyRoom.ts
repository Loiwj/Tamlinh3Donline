import { Room, Client, matchMaker } from '@colyseus/core';
import { LobbyState, LobbyRoomEntrySchema } from '../schema';
import { containsProfanity, PROFANITY_NAME_ERROR } from '../profanity';
import {
  ALLOWED_ROOM_CAPACITIES,
  ROOM_THEMES,
  RoomTheme
} from '../../../shared/constants';

export interface ActiveTempleRoomRecord {
  roomId: string;
  roomName: string;
  theme: RoomTheme;
  clients: number;
  maxClients: number;
  currentTrackTitle: string;
  isPrivate: boolean;
  roomCode: string;
}

// Bộ nhớ chung trên Server lưu danh sách các phòng đang mở và thông tin bài đang phát
const activeTempleRooms = new Map<string, ActiveTempleRoomRecord>();
const lobbySubscribers = new Set<(rooms: ActiveTempleRoomRecord[]) => void>();

export function upsertActiveTempleRoom(record: ActiveTempleRoomRecord): void {
  activeTempleRooms.set(record.roomId, record);
  notifyLobbySubscribers();
}

export function removeActiveTempleRoom(roomId: string): void {
  if (activeTempleRooms.delete(roomId)) {
    notifyLobbySubscribers();
  }
}

export function getActiveTempleRooms(): ActiveTempleRoomRecord[] {
  return Array.from(activeTempleRooms.values());
}

export function findTempleRoomByCode(code: string): ActiveTempleRoomRecord | undefined {
  const normalized = code.trim().toUpperCase();
  for (const r of activeTempleRooms.values()) {
    if (r.roomCode.toUpperCase() === normalized) {
      return r;
    }
  }
  return undefined;
}

function notifyLobbySubscribers(): void {
  const list = getActiveTempleRooms();
  for (const fn of lobbySubscribers) {
    fn(list);
  }
}

function generateSixCharCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class LobbyRoom extends Room<LobbyState> {
  private unsubscribeFn?: (rooms: ActiveTempleRoomRecord[]) => void;

  onCreate(): void {
    this.setState(new LobbyState());
    this.autoDispose = false;

    const syncToState = (records: ActiveTempleRoomRecord[]) => {
      const currentIds = new Set(records.map((r) => r.roomId));
      for (const existingId of Array.from(this.state.rooms.keys())) {
        if (!currentIds.has(existingId)) {
          this.state.rooms.delete(existingId);
        }
      }
      for (const rec of records) {
        let entry = this.state.rooms.get(rec.roomId);
        if (!entry) {
          entry = new LobbyRoomEntrySchema();
          entry.roomId = rec.roomId;
          this.state.rooms.set(rec.roomId, entry);
        }
        entry.roomName = rec.roomName;
        entry.theme = rec.theme;
        entry.clients = rec.clients;
        entry.maxClients = rec.maxClients;
        entry.currentTrackTitle = rec.currentTrackTitle;
        entry.isPrivate = rec.isPrivate;
      }
      this.broadcast('rooms_list', this.serializeRoomList());
    };

    this.unsubscribeFn = syncToState;
    lobbySubscribers.add(syncToState);
    syncToState(getActiveTempleRooms());

    // Kiểm tra biệt danh người chơi qua bộ lọc từ tục
    this.onMessage('validate_name', (client, payload: { name?: string }) => {
      const rawName = (payload?.name ?? '').trim();
      if (!rawName || rawName.length < 2 || rawName.length > 24) {
        client.send('validate_name_result', {
          ok: false,
          message: 'Tên phải từ 2 đến 24 ký tự'
        });
        return;
      }
      if (containsProfanity(rawName)) {
        client.send('validate_name_result', {
          ok: false,
          message: PROFANITY_NAME_ERROR
        });
        return;
      }
      client.send('validate_name_result', { ok: true, name: rawName });
    });

    // Yêu cầu lấy danh sách phòng mới nhất
    this.onMessage('refresh_rooms', (client) => {
      client.send('rooms_list', this.serializeRoomList());
    });

    // Tạo phòng mới từ Sảnh
    this.onMessage(
      'create_room',
      async (
        client,
        payload: {
          roomName?: string;
          theme?: RoomTheme;
          maxClients?: number;
          isPrivate?: boolean;
          roomCode?: string;
        }
      ) => {
        const roomName = (payload?.roomName ?? '').trim();
        if (!roomName || roomName.length < 2 || roomName.length > 40) {
          client.send('create_room_result', {
            ok: false,
            message: 'Tên phòng phải từ 2 đến 40 ký tự'
          });
          return;
        }

        // Kiểm tra tên phòng qua bộ lọc từ tục (Mục 8 & Mục 10)
        if (containsProfanity(roomName)) {
          client.send('create_room_result', {
            ok: false,
            message: PROFANITY_NAME_ERROR
          });
          return;
        }

        const theme: RoomTheme = ROOM_THEMES.includes(payload?.theme as RoomTheme)
          ? (payload.theme as RoomTheme)
          : 'Chung';

        const maxClients = ALLOWED_ROOM_CAPACITIES.includes(payload?.maxClients as 10 | 30 | 50)
          ? (payload.maxClients as number)
          : 50;

        const isPrivate = Boolean(payload?.isPrivate);
        let roomCode = '';
        if (isPrivate) {
          const customCode = (payload?.roomCode ?? '').trim().toUpperCase();
          if (customCode && /^[A-Z0-9]{6}$/.test(customCode)) {
            roomCode = customCode;
          } else {
            roomCode = generateSixCharCode();
          }
        }

        try {
          const created = await matchMaker.createRoom('temple_room', {
            roomName,
            theme,
            maxClients,
            isPrivate,
            roomCode
          });

          client.send('create_room_result', {
            ok: true,
            roomId: created.roomId,
            roomName,
            theme,
            maxClients,
            isPrivate,
            roomCode
          });
        } catch (err) {
          client.send('create_room_result', {
            ok: false,
            message: 'Không thể tạo phòng lúc này, vui lòng thử lại'
          });
        }
      }
    );

    // Tìm và xác thực phòng riêng bằng mã 6 ký tự
    this.onMessage('verify_room_code', (client, payload: { roomId?: string; roomCode?: string }) => {
      const code = (payload?.roomCode ?? '').trim().toUpperCase();
      if (code.length !== 6) {
        client.send('verify_room_code_result', {
          ok: false,
          message: 'Mã phòng phải gồm đúng 6 ký tự'
        });
        return;
      }

      if (payload?.roomId) {
        const rec = activeTempleRooms.get(payload.roomId);
        if (!rec) {
          client.send('verify_room_code_result', {
            ok: false,
            message: 'Phòng không còn tồn tại'
          });
          return;
        }
        if (rec.roomCode.toUpperCase() !== code) {
          client.send('verify_room_code_result', {
            ok: false,
            message: 'Mã phòng 6 ký tự không chính xác'
          });
          return;
        }
        client.send('verify_room_code_result', {
          ok: true,
          roomId: rec.roomId,
          roomCode: code
        });
        return;
      }

      // Tìm phòng bất kỳ có mã 6 ký tự khớp
      const matched = findTempleRoomByCode(code);
      if (!matched) {
        client.send('verify_room_code_result', {
          ok: false,
          message: 'Không tìm thấy phòng có mã 6 ký tự này'
        });
        return;
      }

      client.send('verify_room_code_result', {
        ok: true,
        roomId: matched.roomId,
        roomCode: code
      });
    });
  }

  onJoin(client: Client): void {
    client.send('rooms_list', this.serializeRoomList());
  }

  onDispose(): void {
    if (this.unsubscribeFn) {
      lobbySubscribers.delete(this.unsubscribeFn);
    }
  }

  private serializeRoomList() {
    return getActiveTempleRooms().map((r) => ({
      roomId: r.roomId,
      roomName: r.roomName,
      theme: r.theme,
      clients: r.clients,
      maxClients: r.maxClients,
      currentTrackTitle: r.currentTrackTitle,
      isPrivate: r.isPrivate
    }));
  }
}
