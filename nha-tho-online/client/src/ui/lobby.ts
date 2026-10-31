import {
  ALLOWED_ROOM_CAPACITIES,
  BUDDHIST_ROOM_THEMES,
  CATHOLIC_ROOM_THEMES,
  RobeColor,
  RoomTheme,
  ReligionMode,
  isCatholicRoom
} from '../../../shared/constants';
import {
  containsProfanity,
  PROFANITY_NAME_ERROR
} from '../../../server/src/profanity';
import { LobbyRoomItem } from '../net/client';

export interface LobbyCallbacks {
  onUnlockAudioFromGesture: () => void;
  onSelectReligionMode?: (mode: ReligionMode) => void;
  onQuickEnterReligionMode?: (params: {
    mode: ReligionMode;
    playerName: string;
    robeColor: RobeColor;
  }) => Promise<void>;
  onJoinRoomRequest: (params: {
    roomId: string;
    playerName: string;
    robeColor: RobeColor;
    roomCode?: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  onCreateRoomRequest: (params: {
    roomName: string;
    theme: RoomTheme;
    maxClients: number;
    isPrivate: boolean;
    roomCode?: string;
    playerName: string;
    robeColor: RobeColor;
  }) => Promise<{ ok: boolean; message?: string }>;
  onJoinByCodeRequest: (params: {
    roomCode: string;
    playerName: string;
    robeColor: RobeColor;
  }) => Promise<{ ok: boolean; message?: string }>;
  onPlaySoloOffline: (playerName: string, robeColor: RobeColor) => void;
}

export class LobbyUI {
  private container: HTMLElement;
  private callbacks: LobbyCallbacks;
  private playerName = '';
  private robeColor: RobeColor = 'brown';
  private religionMode: ReligionMode = 'buddhist';
  private isNicknameConfirmed = false;
  private rooms: LobbyRoomItem[] = [];

  private stepNicknameEl!: HTMLElement;
  private stepRoomsEl!: HTMLElement;
  private nameInputEl!: HTMLInputElement;
  private nameErrorEl!: HTMLElement;
  private currentNameBadgeEl!: HTMLElement;
  private roomsListEl!: HTMLElement;
  private lobbyErrorEl!: HTMLElement;
  private createModalEl!: HTMLElement;
  private createRoomErrorEl!: HTMLElement;

  constructor(callbacks: LobbyCallbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('lobby-overlay')!;
    this.renderBaseHTML();
    this.bindEvents();
  }

  private renderBaseHTML(): void {
    this.container.innerHTML = `
      <div class="lobby-card">
        <div class="lobby-mode-switcher" style="display:flex;gap:10px;margin-bottom:14px;justify-content:center;flex-wrap:wrap;">
          <button id="btn-mode-buddhist" type="button" class="btn-primary" style="flex:1;min-width:210px;padding:10px 14px;border-radius:10px;font-size:0.95rem;">
            ⛩️ Chế Độ Phật Giáo (Chùa)
          </button>
          <button id="btn-mode-catholic" type="button" class="btn-secondary" style="flex:1;min-width:210px;padding:10px 14px;border-radius:10px;font-size:0.95rem;">
            ⛪ Chế Độ Thiên Chúa (Nhà Thờ)
          </button>
        </div>

        <div class="lobby-header">
          <h1 id="lobby-main-title">⛩️ CHÙA ONLINE</h1>
          <p id="lobby-main-subtitle" class="lobby-subtitle">Không gian Chánh Điện 3D thanh tịnh — Tụng kinh, Thiền định, Lễ Phật, Đua Cấp Công Đức & Mở Khóa Hào Quang</p>
        </div>

        <!-- Bước 1: Màn hình nhập biệt danh (kiểm tra lọc từ tục ngay khi gõ xong) -->
        <div id="lobby-step-nickname" class="lobby-section">
          <label id="lobby-name-label" class="field-label" for="nickname-input">Nhập pháp danh / biệt danh của bạn:</label>
          <input
            id="nickname-input"
            class="text-input"
            type="text"
            maxlength="24"
            placeholder="Ví dụ: Tâm An, Minh Phúc, Giuse Minh..."
            autocomplete="off"
          />
          <div id="nickname-error" class="error-banner hidden"></div>

          <div class="robe-selector">
            <span>Chọn nhân vật (Nam / Nữ):</span>
            <label class="robe-option">
              <input type="radio" name="robeColor" value="brown" checked />
              <span id="robe-swatch-1" class="robe-swatch brown"></span>
              <span id="robe-label-1">👩 Nhân Vật Nữ (Phật Tử Áo Nâu)</span>
            </label>
            <label class="robe-option">
              <input type="radio" name="robeColor" value="blue" />
              <span id="robe-swatch-2" class="robe-swatch blue"></span>
              <span id="robe-label-2">👨 Nhân Vật Nam (Phật Tử Áo Lam)</span>
            </label>
          </div>

          <div class="lobby-actions-row" style="flex-wrap:wrap;">
            <button id="btn-quick-buddhist" class="btn-primary" style="flex:1;">⛩️ Vào Chùa Ngay</button>
            <button id="btn-quick-catholic" class="btn-primary" style="flex:1;background:linear-gradient(135deg,#2b5ca8,#1b3b6f);border-color:#7fb3ff;">⛪ Vào Nhà Thờ Ngay</button>
            <button id="btn-confirm-nickname" class="btn-secondary">Danh Sách Sảnh</button>
            <button id="btn-play-solo" class="btn-secondary" title="Dạo một mình không cần kết nối">Đi Dạo Một Mình</button>
          </div>
        </div>

        <!-- Bước 2: Màn hình Sảnh liệt kê các phòng đang mở -->
        <div id="lobby-step-rooms" class="lobby-section hidden">
          <div class="lobby-toolbar">
            <div class="user-greeting">
              🙏 Xin chào, <strong id="lobby-current-name">Phật Tử</strong>
              <button id="btn-change-name" class="btn-link">Đổi tên</button>
            </div>
            <div class="lobby-toolbar-right">
              <div class="code-join-box">
                <input
                  id="quick-room-code-input"
                  class="code-input"
                  type="text"
                  maxlength="6"
                  placeholder="Mã 6 ký tự"
                />
                <button id="btn-join-by-code" class="btn-secondary">Vào bằng mã</button>
              </div>
              <button id="btn-open-create-room" class="btn-primary">+ Tạo Phòng Mới</button>
            </div>
          </div>

          <div id="lobby-error" class="error-banner hidden"></div>

          <div class="rooms-table-header">
            <span>Tên phòng & Chủ đề</span>
            <span>Đang phát (Kênh Radio)</span>
            <span>Số người</span>
            <span>Thao tác</span>
          </div>
          <div id="rooms-list-container" class="rooms-list">
            <div class="empty-rooms-msg">Đang tải danh sách phòng...</div>
          </div>
        </div>
      </div>

      <!-- Modal Tạo Phòng Mới -->
      <div id="create-room-modal" class="modal-backdrop hidden">
        <div class="modal-box">
          <h3 id="create-room-modal-title">🕯️ Tạo Phòng Chánh Điện Mới</h3>

          <label class="field-label" for="create-room-religion">Không gian tôn giáo của phòng:</label>
          <select id="create-room-religion" class="select-input" style="margin-bottom:10px;">
            <option value="buddhist">⛩️ Chùa Phật Giáo (Chánh Điện, Tụng Kinh, Thiền)</option>
            <option value="catholic">⛪ Nhà Thờ Công Giáo (Thánh Đường, Thánh Ca, Cầu Nguyện)</option>
          </select>

          <label class="field-label" for="create-room-name">Tên phòng:</label>
          <input
            id="create-room-name"
            class="text-input"
            type="text"
            maxlength="40"
            placeholder="Ví dụ: Đạo Tràng An Lạc..."
          />

          <div class="form-row-2col">
            <div>
              <label class="field-label" for="create-room-theme">Chủ đề & Kênh nhạc riêng:</label>
              <select id="create-room-theme" class="select-input">
                ${BUDDHIST_ROOM_THEMES.map((t) => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="field-label" for="create-room-capacity">Sức chứa tối đa:</label>
              <select id="create-room-capacity" class="select-input">
                ${ALLOWED_ROOM_CAPACITIES.map(
                  (c) => `<option value="${c}" ${c === 50 ? 'selected' : ''}>${c} người</option>`
                ).join('')}
              </select>
            </div>
          </div>

          <div class="privacy-row">
            <label class="checkbox-label">
              <input id="create-room-private" type="checkbox" />
              <span>Phòng riêng (Vào bằng mã 6 ký tự)</span>
            </label>
            <input
              id="create-room-code"
              class="code-input hidden"
              type="text"
              maxlength="6"
              placeholder="Tự nhập 6 ký tự hoặc để trống"
            />
          </div>

          <div id="create-room-error" class="error-banner hidden"></div>

          <div class="modal-actions">
            <button id="btn-cancel-create-room" class="btn-secondary">Hủy</button>
            <button id="btn-submit-create-room" class="btn-primary">Tạo & Vào Phòng</button>
          </div>
        </div>
      </div>
    `;

    this.stepNicknameEl = document.getElementById('lobby-step-nickname')!;
    this.stepRoomsEl = document.getElementById('lobby-step-rooms')!;
    this.nameInputEl = document.getElementById('nickname-input') as HTMLInputElement;
    this.nameErrorEl = document.getElementById('nickname-error')!;
    this.currentNameBadgeEl = document.getElementById('lobby-current-name')!;
    this.roomsListEl = document.getElementById('rooms-list-container')!;
    this.lobbyErrorEl = document.getElementById('lobby-error')!;
    this.createModalEl = document.getElementById('create-room-modal')!;
    this.createRoomErrorEl = document.getElementById('create-room-error')!;
  }

  private bindEvents(): void {
    // Kiểm tra lọc từ tục ngay khi người chơi gõ hoặc gõ xong ô biệt danh (Mục 8 & Mục 12)
    const validateNicknameField = (): boolean => {
      const val = this.nameInputEl.value.trim();
      if (!val) {
        this.showNameError('');
        return false;
      }
      if (containsProfanity(val)) {
        this.showNameError(PROFANITY_NAME_ERROR);
        return false;
      }
      if (val.length < 2) {
        this.showNameError('Tên cần có ít nhất 2 ký tự');
        return false;
      }
      this.showNameError('');
      return true;
    };

    this.nameInputEl.addEventListener('input', validateNicknameField);
    this.nameInputEl.addEventListener('change', validateNicknameField);
    this.nameInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('btn-confirm-nickname')?.click();
      }
    });

    // Chọn màu áo
    this.container.querySelectorAll('input[name="robeColor"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.robeColor = target.value === 'blue' ? 'blue' : 'brown';
      });
    });

    const createModalTitle = document.getElementById('create-room-modal-title')!;
    const createReligionSelect = document.getElementById('create-room-religion') as HTMLSelectElement;
    const createThemeSelect = document.getElementById('create-room-theme') as HTMLSelectElement;
    const createNameInput = document.getElementById('create-room-name') as HTMLInputElement;
    const privateCheckbox = document.getElementById('create-room-private') as HTMLInputElement;
    const privateCodeInput = document.getElementById('create-room-code') as HTMLInputElement;
    const btnOpenCreateRoom = document.getElementById('btn-open-create-room')!;

    const syncCreateModalReligionMode = (mode: ReligionMode) => {
      createReligionSelect.value = mode;
      if (mode === 'catholic') {
        createModalTitle.textContent = '⛪ Tạo Phòng Thánh Đường Nhà Thờ Mới';
        createNameInput.placeholder = 'Ví dụ: Giáo Xứ Bình An, Nhà Thờ Đức Bà...';
        createThemeSelect.innerHTML = CATHOLIC_ROOM_THEMES.map(
          (t) => `<option value="${t}">⛪ ${t} (Nhạc Thánh Ca Nhà Thờ)</option>`
        ).join('');
        btnOpenCreateRoom.textContent = '+ Tạo Phòng Nhà Thờ';
      } else {
        createModalTitle.textContent = '🕯️ Tạo Phòng Chánh Điện Chùa Mới';
        createNameInput.placeholder = 'Ví dụ: Đạo Tràng An Lạc, Chùa Một Cột...';
        createThemeSelect.innerHTML = BUDDHIST_ROOM_THEMES.map(
          (t) => `<option value="${t}">⛩️ ${t} (Nhạc Thiền Chùa)</option>`
        ).join('');
        btnOpenCreateRoom.textContent = '+ Tạo Phòng Chùa';
      }
    };

    const applyReligionModeUI = (mode: ReligionMode) => {
      this.religionMode = mode;
      const btnB = document.getElementById('btn-mode-buddhist')!;
      const btnC = document.getElementById('btn-mode-catholic')!;
      const mainTitle = document.getElementById('lobby-main-title')!;
      const mainSubtitle = document.getElementById('lobby-main-subtitle')!;
      const nameLabel = document.getElementById('lobby-name-label')!;
      const robeLabel1 = document.getElementById('robe-label-1')!;
      const robeLabel2 = document.getElementById('robe-label-2')!;
      const swatch1 = document.getElementById('robe-swatch-1')!;
      const swatch2 = document.getElementById('robe-swatch-2')!;

      if (mode === 'catholic') {
        btnC.className = 'btn-primary';
        btnB.className = 'btn-secondary';
        mainTitle.textContent = '⛪ NHÀ THỜ ONLINE';
        mainSubtitle.textContent =
          'Không gian Thánh Đường Công Giáo 3D — Cầu nguyện, Lần hạt Mân Côi, Đọc Kinh Thánh, Đua 15 Cấp Ân Sủng & Mở Khóa 15 Hào Quang';
        nameLabel.textContent = 'Nhập tên Thánh / biệt danh của bạn:';
        robeLabel1.textContent = '👩 Nhân Vật Nữ (Áo Lễ Trắng Kem)';
        robeLabel2.textContent = '👨 Nhân Vật Nam (Áo Vest Trang Nghiêm)';
        swatch1.style.background = '#f2ede2';
        swatch2.style.background = '#263b59';
      } else {
        btnB.className = 'btn-primary';
        btnC.className = 'btn-secondary';
        mainTitle.textContent = '⛩️ CHÙA ONLINE';
        mainSubtitle.textContent =
          'Không gian Chánh Điện 3D thanh tịnh — Tụng kinh, Thiền định, Lễ Phật, Đua 15 Cấp Công Đức & Mở Khóa 15 Hào Quang';
        nameLabel.textContent = 'Nhập pháp danh / biệt danh của bạn:';
        robeLabel1.textContent = '👩 Nhân Vật Nữ (Phật Tử Áo Nâu)';
        robeLabel2.textContent = '👨 Nhân Vật Nam (Phật Tử Áo Lam)';
        swatch1.style.background = '#6f432a';
        swatch2.style.background = '#5c768d';
      }
      syncCreateModalReligionMode(mode);
      this.callbacks.onSelectReligionMode?.(mode);
    };

    document.getElementById('btn-mode-buddhist')!.addEventListener('click', () => {
      applyReligionModeUI('buddhist');
    });
    document.getElementById('btn-mode-catholic')!.addEventListener('click', () => {
      applyReligionModeUI('catholic');
    });

    const handleQuickEnter = async (mode: ReligionMode) => {
      const val =
        this.nameInputEl.value.trim() || (mode === 'catholic' ? 'Giáo Dân' : 'Phật Tử');
      if (containsProfanity(val)) {
        this.showNameError(PROFANITY_NAME_ERROR);
        return;
      }
      applyReligionModeUI(mode);
      this.callbacks.onUnlockAudioFromGesture();
      this.playerName = val;
      this.isNicknameConfirmed = true;
      this.currentNameBadgeEl.textContent = this.playerName;
      if (this.callbacks.onQuickEnterReligionMode) {
        await this.callbacks.onQuickEnterReligionMode({
          mode,
          playerName: this.playerName,
          robeColor: this.robeColor
        });
      }
    };

    document.getElementById('btn-quick-buddhist')!.addEventListener('click', () => {
      handleQuickEnter('buddhist');
    });
    document.getElementById('btn-quick-catholic')!.addEventListener('click', () => {
      handleQuickEnter('catholic');
    });

    // Xác nhận biệt danh để sang màn hình Sảnh
    document.getElementById('btn-confirm-nickname')!.addEventListener('click', () => {
      const val = this.nameInputEl.value.trim();
      if (!val || val.length < 2) {
        this.showNameError('Vui lòng nhập biệt danh từ 2 đến 24 ký tự');
        return;
      }
      if (containsProfanity(val)) {
        this.showNameError(PROFANITY_NAME_ERROR);
        return;
      }

      this.playerName = val;
      this.isNicknameConfirmed = true;
      this.currentNameBadgeEl.textContent = this.playerName;
      this.stepNicknameEl.classList.add('hidden');
      this.stepRoomsEl.classList.remove('hidden');
    });

    // Chế độ đi dạo một mình (Bước 1)
    document.getElementById('btn-play-solo')!.addEventListener('click', () => {
      const val = this.nameInputEl.value.trim() || 'Phật Tử';
      if (containsProfanity(val)) {
        this.showNameError(PROFANITY_NAME_ERROR);
        return;
      }
      this.callbacks.onUnlockAudioFromGesture();
      this.playerName = val;
      this.isNicknameConfirmed = true;
      this.currentNameBadgeEl.textContent = this.playerName;
      this.hide();
      this.callbacks.onPlaySoloOffline(this.playerName, this.robeColor);
    });

    // Nút đổi tên
    document.getElementById('btn-change-name')!.addEventListener('click', () => {
      this.isNicknameConfirmed = false;
      this.stepRoomsEl.classList.add('hidden');
      this.stepNicknameEl.classList.remove('hidden');
      this.nameInputEl.focus();
    });

    // Vào phòng bằng mã 6 ký tự
    const codeInput = document.getElementById('quick-room-code-input') as HTMLInputElement;
    document.getElementById('btn-join-by-code')!.addEventListener('click', async () => {
      const code = codeInput.value.trim().toUpperCase();
      if (code.length !== 6) {
        this.showLobbyError('Vui lòng nhập mã phòng gồm đúng 6 ký tự');
        return;
      }
      this.showLobbyError('');
      // Click vào phòng tính là lần click đầu tiên mở khóa âm thanh trình duyệt (Mục 9)
      this.callbacks.onUnlockAudioFromGesture();

      const res = await this.callbacks.onJoinByCodeRequest({
        roomCode: code,
        playerName: this.playerName,
        robeColor: this.robeColor
      });
      if (!res.ok) {
        this.showLobbyError(res.message || 'Không thể vào phòng bằng mã này');
      }
    });

    // Mở/Đóng modal Tạo phòng
    createReligionSelect.addEventListener('change', () => {
      const selectedMode: ReligionMode =
        createReligionSelect.value === 'catholic' ? 'catholic' : 'buddhist';
      applyReligionModeUI(selectedMode);
    });

    btnOpenCreateRoom.addEventListener('click', () => {
      this.createRoomErrorEl.classList.add('hidden');
      syncCreateModalReligionMode(this.religionMode);
      createNameInput.value = '';
      privateCheckbox.checked = false;
      privateCodeInput.value = '';
      privateCodeInput.classList.add('hidden');
      this.createModalEl.classList.remove('hidden');
      createNameInput.focus();
    });

    document.getElementById('btn-cancel-create-room')!.addEventListener('click', () => {
      this.createModalEl.classList.add('hidden');
    });

    privateCheckbox.addEventListener('change', () => {
      privateCodeInput.classList.toggle('hidden', !privateCheckbox.checked);
    });

    // Kiểm tra lọc từ tục ngay khi gõ tên phòng mới
    createNameInput.addEventListener('input', () => {
      const rName = createNameInput.value.trim();
      if (rName && containsProfanity(rName)) {
        this.showCreateRoomError(PROFANITY_NAME_ERROR);
      } else {
        this.showCreateRoomError('');
      }
    });

    document.getElementById('btn-submit-create-room')!.addEventListener('click', async () => {
      const roomName = createNameInput.value.trim();
      if (!roomName || roomName.length < 2) {
        this.showCreateRoomError('Tên phòng phải có ít nhất 2 ký tự');
        return;
      }
      if (containsProfanity(roomName)) {
        this.showCreateRoomError(PROFANITY_NAME_ERROR);
        return;
      }

      const theme = (document.getElementById('create-room-theme') as HTMLSelectElement)
        .value as RoomTheme;
      const maxClients = Number(
        (document.getElementById('create-room-capacity') as HTMLSelectElement).value
      );
      const isPrivate = privateCheckbox.checked;
      const customCode = privateCodeInput.value.trim().toUpperCase();

      if (isPrivate && customCode.length > 0 && !/^[A-Z0-9]{6}$/.test(customCode)) {
        this.showCreateRoomError('Mã phòng riêng phải gồm đúng 6 chữ cái hoặc chữ số');
        return;
      }

      // Click nút Tạo & Vào phòng cũng mở khóa luôn Audio trình duyệt
      this.callbacks.onUnlockAudioFromGesture();

      const res = await this.callbacks.onCreateRoomRequest({
        roomName,
        theme,
        maxClients,
        isPrivate,
        roomCode: customCode || undefined,
        playerName: this.playerName,
        robeColor: this.robeColor
      });

      if (!res.ok) {
        this.showCreateRoomError(res.message || 'Lỗi tạo phòng');
      } else {
        this.createModalEl.classList.add('hidden');
      }
    });
  }

  public updateRoomsList(rooms: LobbyRoomItem[]): void {
    this.rooms = rooms;
    if (rooms.length === 0) {
      this.roomsListEl.innerHTML = `
        <div class="empty-rooms-msg">
          Hiện chưa có phòng nào đang mở. Hãy bấm <strong>"+ Tạo Phòng Mới"</strong> để khai mở đạo tràng!
        </div>
      `;
      return;
    }

    this.roomsListEl.innerHTML = '';
    for (const r of rooms) {
      const row = document.createElement('div');
      row.className = 'room-item-row';

      const lockBadge = r.isPrivate
        ? `<span class="badge-private" title="Phòng riêng cần mã 6 ký tự">🔒 Riêng tư</span>`
        : `<span class="badge-public">🌐 Công khai</span>`;
      const catholic = isCatholicRoom(r.theme, r.roomName);
      const modeBadge = catholic
        ? `<span class="badge-private" style="background:rgba(43,92,168,0.35);border-color:#68a2ff;color:#cbe0ff;">⛪ Nhà Thờ</span>`
        : `<span class="badge-public" style="background:rgba(212,155,39,0.22);border-color:#e6b84c;color:#ffe599;">⛩️ Chùa</span>`;

      row.innerHTML = `
        <div class="room-col-main">
          <div class="room-title-line">
            ${modeBadge}
            <strong class="room-name"></strong>
            ${lockBadge}
          </div>
          <span class="room-theme-tag">Chủ đề: ${r.theme}</span>
        </div>
        <div class="room-col-playing">
          <span class="playing-label">🎵 Đang phát: ${r.currentTrackTitle || 'Nhạc Thiền Tĩnh Tâm'}</span>
          <span class="listening-sub">🎧 ${r.clients} người đang nghe</span>
        </div>
        <div class="room-col-count">
          <span class="capacity-pill ${r.clients >= r.maxClients ? 'full' : ''}">
            ${r.clients}/${r.maxClients}
          </span>
        </div>
        <div class="room-col-action">
          ${
            r.isPrivate
              ? `<input type="text" class="inline-code-input" maxlength="6" placeholder="Mã 6 ký tự" />`
              : ''
          }
          <button class="btn-join-room" ${r.clients >= r.maxClients ? 'disabled' : ''}>
            Vào
          </button>
        </div>
      `;

      // Gán textContent để chống XSS
      const nameEl = row.querySelector('.room-name')!;
      nameEl.textContent = r.roomName;

      const joinBtn = row.querySelector('.btn-join-room') as HTMLButtonElement;
      const inlineCodeInput = row.querySelector('.inline-code-input') as HTMLInputElement | null;

      joinBtn.addEventListener('click', async () => {
        this.showLobbyError('');
        // Bấm nút "Vào" mở khóa ngay lập tức kênh âm thanh trình duyệt (Mục 9)
        this.callbacks.onUnlockAudioFromGesture();

        let roomCode: string | undefined;
        if (r.isPrivate) {
          roomCode = inlineCodeInput?.value.trim().toUpperCase() || '';
          if (roomCode.length !== 6) {
            this.showLobbyError('Phòng riêng yêu cầu nhập đúng mã 6 ký tự để vào');
            inlineCodeInput?.focus();
            return;
          }
        }

        const res = await this.callbacks.onJoinRoomRequest({
          roomId: r.roomId,
          playerName: this.playerName || 'Phật Tử',
          robeColor: this.robeColor,
          roomCode
        });

        if (!res.ok) {
          this.showLobbyError(res.message || 'Không thể vào phòng');
        }
      });

      this.roomsListEl.appendChild(row);
    }
  }

  private showNameError(msg: string): void {
    if (!msg) {
      this.nameErrorEl.classList.add('hidden');
      this.nameErrorEl.textContent = '';
    } else {
      this.nameErrorEl.textContent = msg;
      this.nameErrorEl.classList.remove('hidden');
    }
  }

  public showLobbyError(msg: string): void {
    if (!msg) {
      this.lobbyErrorEl.classList.add('hidden');
      this.lobbyErrorEl.textContent = '';
    } else {
      this.lobbyErrorEl.textContent = msg;
      this.lobbyErrorEl.classList.remove('hidden');
    }
  }

  private showCreateRoomError(msg: string): void {
    if (!msg) {
      this.createRoomErrorEl.classList.add('hidden');
      this.createRoomErrorEl.textContent = '';
    } else {
      this.createRoomErrorEl.textContent = msg;
      this.createRoomErrorEl.classList.remove('hidden');
    }
  }

  public show(forceRoomsStep = false): void {
    this.container.classList.remove('hidden');
    if (forceRoomsStep) {
      if (!this.playerName) {
        this.playerName = this.nameInputEl.value.trim() || 'Phật Tử';
      }
      this.isNicknameConfirmed = true;
      this.currentNameBadgeEl.textContent = this.playerName;
    }
    if (this.isNicknameConfirmed) {
      this.stepNicknameEl.classList.add('hidden');
      this.stepRoomsEl.classList.remove('hidden');
    } else {
      this.stepNicknameEl.classList.remove('hidden');
      this.stepRoomsEl.classList.add('hidden');
    }
  }

  public hide(): void {
    this.container.classList.add('hidden');
    this.createModalEl.classList.add('hidden');
  }
}
