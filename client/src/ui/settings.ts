export interface SettingsCallbacks {
  onMusicVolumeChange: (vol: number) => void;
  onSfxVolumeChange: (vol: number) => void;
  onToggleMuteAll: (muted: boolean) => void;
  onToggleHideChat: (hidden: boolean) => void;
  onChangeCustomTrack?: (urlOrSpec: string, title?: string) => void;
  onLeaveRoom: () => void;
}

/**
 * Bảng Cài Đặt ở góc phải trên (Mục 12):
 * - Âm lượng nhạc/kinh (Radio)
 * - Chọn bài nhạc nền hoặc dán link YouTube bất kỳ
 * - Âm lượng hiệu ứng (SFX: chuông, mõ, tràng hạt, giọng đọc kinh)
 * - Nút tắt tiếng riêng cho từng người (không ảnh hưởng người khác)
 * - Nút ẩn/hiện khung chat
 * - Nút rời phòng
 */
export class SettingsUI {
  private container: HTMLElement;
  private callbacks: SettingsCallbacks;
  private muted = false;
  private chatHidden = false;

  constructor(callbacks: SettingsCallbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('settings-overlay')!;
    this.renderHTML();
    this.bindEvents();
  }

  private renderHTML(): void {
    this.container.innerHTML = `
      <div class="modal-backdrop" id="settings-backdrop">
        <div class="modal-box settings-box">
          <div class="settings-header">
            <h3>⚙️ Cài Đặt Âm Thanh & Phòng</h3>
            <button id="btn-close-settings" class="btn-close-small">✕</button>
          </div>

          <div class="settings-row">
            <label for="slider-music-vol">🎵 Âm lượng Nhạc nền / Kinh (Radio):</label>
            <input id="slider-music-vol" type="range" min="0" max="100" value="65" />
          </div>

          <div class="settings-row">
            <label for="select-music-track">🎶 Đổi bài Nhạc Thiền / Thánh Ca đang phát:</label>
            <select id="select-music-track" class="select-input">
              <option value="/audio/yt_0gurLbd6CvM.mp3" data-title="Piano Thánh Ca Không Lời - Nhạc Cầu Nguyện Tĩnh Tâm Trong Nhà Thờ">
                ⛪ 1. Piano Thánh Ca Không Lời - Cầu Nguyện Nhà Thờ
              </option>
              <option value="/audio/yt_cp1ON3N7uRI.mp3" data-title="Hòa Tấu Đàn Organ & Piano Thánh Đường - Chầu Thánh Thể Trang Nghiêm">
                ⛪ 2. Hòa Tấu Đàn Organ & Piano Thánh Đường Trang Nghiêm
              </option>
              <option value="/audio/yt_Qq6dBbRusdw.mp3" data-title="Nhạc Thiền Cho Buổi Sáng Tĩnh Tâm An Lạc - Ngày Mới Tràn Đầy Năng Lượng">
                ⛩️ 3. Nhạc Thiền Cho Buổi Sáng Tĩnh Tâm An Lạc (Chùa)
              </option>
              <option value="/audio/yt_jRdRY-QAFkg.mp3" data-title="Nhạc Thiền Tĩnh Tâm - Hoa Sen Nước Chảy Thư Thái">
                ⛩️ 4. Nhạc Thiền Hoa Sen Nước Chảy Thư Thái (Chùa)
              </option>
            </select>
          </div>

          <div class="settings-row">
            <label for="input-custom-yt">🔗 Hoặc dán link YouTube nhạc thiền bất kỳ:</label>
            <div style="display: flex; gap: 6px;">
              <input
                id="input-custom-yt"
                class="text-input"
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <button id="btn-apply-custom-yt" class="btn-primary" style="white-space: nowrap;">Phát</button>
            </div>
          </div>

          <div class="settings-row">
            <label for="slider-sfx-vol">🔔 Âm lượng Hiệu ứng & Giọng Đọc Kinh:</label>
            <input id="slider-sfx-vol" type="range" min="0" max="100" value="80" />
          </div>

          <div class="settings-toggles">
            <button id="btn-settings-mute" class="btn-secondary">🔊 Đang bật tiếng</button>
            <button id="btn-settings-chat" class="btn-secondary">💬 Ẩn khung chat</button>
          </div>

          <hr class="settings-divider" />

          <div class="settings-footer">
            <button id="btn-settings-leave" class="btn-danger">🚪 Rời phòng về Sảnh</button>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    document.getElementById('btn-close-settings')!.addEventListener('click', () => {
      this.hide();
    });

    const musicSlider = document.getElementById('slider-music-vol') as HTMLInputElement;
    musicSlider.addEventListener('input', () => {
      this.callbacks.onMusicVolumeChange(Number(musicSlider.value) / 100);
    });

    const trackSelect = document.getElementById('select-music-track') as HTMLSelectElement;
    trackSelect.addEventListener('change', () => {
      const opt = trackSelect.selectedOptions[0];
      const title = opt?.getAttribute('data-title') || 'Nhạc Thiền Tĩnh Tâm';
      this.callbacks.onChangeCustomTrack?.(trackSelect.value, title);
    });

    const customYtInput = document.getElementById('input-custom-yt') as HTMLInputElement;
    customYtInput.addEventListener('keydown', (e) => e.stopPropagation());
    document.getElementById('btn-apply-custom-yt')!.addEventListener('click', () => {
      const val = customYtInput.value.trim();
      if (!val) return;
      this.callbacks.onChangeCustomTrack?.(val, 'Nhạc Thiền YouTube Tuỳ Chọn');
      customYtInput.value = '';
    });

    const sfxSlider = document.getElementById('slider-sfx-vol') as HTMLInputElement;
    sfxSlider.addEventListener('input', () => {
      this.callbacks.onSfxVolumeChange(Number(sfxSlider.value) / 100);
    });

    const muteBtn = document.getElementById('btn-settings-mute') as HTMLButtonElement;
    muteBtn.addEventListener('click', () => {
      this.muted = !this.muted;
      muteBtn.textContent = this.muted ? '🔇 Đã tắt tiếng (Bấm để bật)' : '🔊 Đang bật tiếng';
      this.callbacks.onToggleMuteAll(this.muted);
    });

    const chatBtn = document.getElementById('btn-settings-chat') as HTMLButtonElement;
    chatBtn.addEventListener('click', () => {
      this.chatHidden = !this.chatHidden;
      chatBtn.textContent = this.chatHidden ? '💬 Hiện khung chat' : '💬 Ẩn khung chat';
      this.callbacks.onToggleHideChat(this.chatHidden);
    });

    document.getElementById('btn-settings-leave')!.addEventListener('click', () => {
      this.hide();
      this.callbacks.onLeaveRoom();
    });
  }

  public show(): void {
    this.container.classList.remove('hidden');
  }

  public hide(): void {
    this.container.classList.add('hidden');
  }
}
