/**
 * Quản lý kênh âm thanh Hiệu ứng (SFX):
 * - Tiếng chuông chùa (Đại Hồng Chung)
 * - Tiếng mõ gỗ khi nhân vật Lạy
 * - Tiếng hạt gỗ khi người chơi kéo Tràng hạt
 * Có kênh âm lượng độc lập và nút tắt tiếng riêng cho từng người.
 */
export class SoundEffectsManager {
  private volume = 0.75;
  private muted = false;
  private bellAudio: HTMLAudioElement;
  private moAudio: HTMLAudioElement;
  private beadAudio: HTMLAudioElement;

  constructor() {
    this.bellAudio = new Audio('/audio/sfx_bell.wav');
    this.moAudio = new Audio('/audio/sfx_mo.wav');
    this.beadAudio = new Audio('/audio/sfx_bead.wav');

    this.bellAudio.preload = 'auto';
    this.moAudio.preload = 'auto';
    this.beadAudio.preload = 'auto';
  }

  /**
   * Mở khóa âm thanh trình duyệt ngay khi người dùng bấm nút "Vào phòng"
   */
  public unlockFromUserGesture(): void {
    for (const el of [this.bellAudio, this.moAudio, this.beadAudio]) {
      el.volume = 0;
      el.play()
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.volume = this.muted ? 0 : this.volume;
        })
        .catch(() => {
          // Bỏ qua nếu trình duyệt chưa sẵn sàng
        });
    }
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playBell(): void {
    if (this.muted || this.volume <= 0.01) return;
    this.playClone(this.bellAudio, this.volume);
  }

  public playMo(): void {
    if (this.muted || this.volume <= 0.01) return;
    this.playClone(this.moAudio, this.volume * 0.85);
  }

  public playBeadClick(): void {
    if (this.muted || this.volume <= 0.01) return;
    this.playClone(this.beadAudio, this.volume * 0.7);
  }

  private playClone(source: HTMLAudioElement, gain: number): void {
    try {
      const clone = source.cloneNode(true) as HTMLAudioElement;
      clone.volume = Math.max(0, Math.min(1, gain));
      clone.play().catch(() => {});
    } catch {
      // Ignore playback error
    }
  }
}
