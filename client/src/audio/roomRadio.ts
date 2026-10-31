import { SERVER_PORT } from '../../../shared/constants';

export interface RadioSyncPayload {
  trackId: string;
  trackTitle: string;
  trackUrl: string;
  trackDuration: number;
  startTime: number;
  serverNow: number;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const LOCAL_YOUTUBE_AUDIO_MAP: Record<string, { url: string; duration: number }> = {
  Qq6dBbRusdw: { url: '/audio/yt_Qq6dBbRusdw.mp3', duration: 600 },
  'jRdRY-QAFkg': { url: '/audio/yt_jRdRY-QAFkg.mp3', duration: 600 },
  cwgzIKhcQac: { url: '/audio/yt_Qq6dBbRusdw.mp3', duration: 600 },
  jXaHC9M9cZQ: { url: '/audio/yt_jRdRY-QAFkg.mp3', duration: 600 },
  eD2x7vSkzbQ: { url: '/audio/yt_Qq6dBbRusdw.mp3', duration: 600 },
  'KUEoex9YP-A': { url: '/audio/yt_jRdRY-QAFkg.mp3', duration: 600 }
};

/**
 * Kênh Âm Thanh Phát Sẵn Theo Phòng (Kiểu Radio, nghe cùng nhau - Mục 9):
 * - Ưu tiên phát trực tiếp file MP3 chất lượng cao đã tải từ YouTube (/audio/yt_Qq6dBbRusdw.mp3, /audio/yt_jRdRY-QAFkg.mp3)
 *   qua HTML5 Audio để không bao giờ bị trình duyệt chặn IFrame.
 * - Đồng thời hỗ trợ phát bất kỳ link YouTube tuỳ chọn nào người chơi dán vào trong phần Cài đặt.
 */
export class RoomRadioPlayer {
  private audioEl: HTMLAudioElement;
  private ytPlayer: any = null;
  private isYtReady = false;
  private activeMode: 'youtube' | 'html5' = 'html5';
  private loadedYtVideoId = '';
  private pendingYtVideoId = '';
  private isCustomOverride = false;

  private volume = 0.65;
  private muted = false;
  private currentTrackId = '';
  private currentTrackTitle = '';
  private currentTrackUrl = '';
  private currentTrackDuration = 600;
  private currentStartTime = 0;
  private serverClockOffsetMs = 0;
  private driftCheckTimer?: number;
  private onTrackChangeCallback?: (title: string, offsetSec: number) => void;

  constructor() {
    this.audioEl = new Audio();
    this.audioEl.preload = 'auto';
    this.audioEl.loop = false;
    this.audioEl.volume = this.volume;

    this.audioEl.addEventListener('ended', () => {
      if (this.activeMode === 'html5' && this.currentTrackId) {
        if (this.isCustomOverride) {
          this.audioEl.currentTime = 0;
          this.audioEl.play().catch(() => {});
        } else {
          this.seekAndPlayCurrentOffset();
        }
      }
    });

    this.initYouTubeIframeAPI();

    // Định kỳ mỗi 2 giây kiểm tra độ lệch để giữ đồng bộ dưới 1 giây giữa mọi người trong phòng
    this.driftCheckTimer = window.setInterval(() => {
      if (!this.isCustomOverride) {
        this.checkAndCorrectDrift();
      }
    }, 2000);
  }

  private initYouTubeIframeAPI(): void {
    let holder = document.getElementById('yt-radio-hidden-container');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'yt-radio-hidden-container';
      // Kích thước chuẩn 200x200 ẩn dưới lớp canvas để YouTube IFrame API không từ chối phát
      holder.style.position = 'fixed';
      holder.style.right = '0px';
      holder.style.bottom = '0px';
      holder.style.width = '200px';
      holder.style.height = '200px';
      holder.style.opacity = '0.001';
      holder.style.zIndex = '-1';
      holder.style.pointerEvents = 'none';
      const playerDiv = document.createElement('div');
      playerDiv.id = 'yt-radio-iframe';
      holder.appendChild(playerDiv);
      document.body.appendChild(holder);
    }

    const createPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      this.ytPlayer = new window.YT.Player('yt-radio-iframe', {
        height: '200',
        width: '200',
        videoId: 'Qq6dBbRusdw',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1
        },
        events: {
          onReady: () => {
            this.isYtReady = true;
            this.applyYtVolume();
            if (this.activeMode === 'youtube' && this.pendingYtVideoId) {
              this.seekAndPlayCurrentOffset();
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 0 && this.activeMode === 'youtube' && this.currentTrackId) {
              this.seekAndPlayCurrentOffset();
            }
          },
          onError: () => {
            this.fallbackToLocalAudio();
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        createPlayer();
      };
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }
  }

  private getApiBase(): string {
    const isViteDev = window.location.port === '5173';
    return isViteDev ? `http://${window.location.hostname || 'localhost'}:${SERVER_PORT}` : '';
  }

  private extractYouTubeId(urlOrSpec: string): string | null {
    if (!urlOrSpec) return null;
    const trimmed = urlOrSpec.trim();
    if (trimmed.startsWith('youtube:')) {
      return trimmed.slice('youtube:'.length).trim();
    }
    if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  /**
   * Được gọi ngay trong sự kiện click nút "Vào phòng" để mở khóa quyền phát tự động của trình duyệt
   */
  public unlockFromUserGesture(): void {
    if (!this.audioEl.src) {
      this.audioEl.src = '/audio/yt_Qq6dBbRusdw.mp3';
    }
    this.audioEl.volume = this.muted ? 0 : this.volume;
    this.audioEl.play().catch(() => {});
  }

  public onTrackChange(cb: (title: string, offsetSec: number) => void): void {
    this.onTrackChangeCallback = cb;
  }

  /**
   * Cho phép người chơi chủ động đổi bài nhạc nền hoặc dán link YouTube bất kỳ trong bảng Cài đặt.
   * Phát trực tiếp qua luồng HTML5 Audio MP3 (/api/yt-stream?id=...) để tương thích 100% iPhone Safari / Android / PC.
   */
  public selectCustomTrack(
    trackUrlOrSpec: string,
    customTitle?: string,
    onResolvedForRoom?: (streamUrl: string, finalTitle: string) => void
  ): void {
    const ytId = this.extractYouTubeId(trackUrlOrSpec);
    this.isCustomOverride = true;
    const apiBase = this.getApiBase();

    if (ytId && LOCAL_YOUTUBE_AUDIO_MAP[ytId]) {
      const mapped = LOCAL_YOUTUBE_AUDIO_MAP[ytId];
      this.activeMode = 'html5';
      this.pauseYtPlayer();
      this.currentTrackId = `custom_${ytId}`;
      this.currentTrackTitle =
        customTitle ||
        (ytId === 'Qq6dBbRusdw'
          ? 'Nhạc Thiền Cho Buổi Sáng Tĩnh Tâm An Lạc - Ngày Mới Tràn Đầy Năng Lượng'
          : 'Nhạc Thiền Tĩnh Tâm - Hoa Sen Nước Chảy Thư Thái');
      this.currentTrackUrl = mapped.url;
      this.currentTrackDuration = mapped.duration;
      this.currentStartTime = Date.now();
      this.audioEl.src = mapped.url;
      this.audioEl.currentTime = 0;
      this.audioEl.volume = this.muted ? 0 : this.volume;
      this.audioEl.play().catch(() => {});
      this.onTrackChangeCallback?.(this.currentTrackTitle, 0);
      onResolvedForRoom?.(mapped.url, this.currentTrackTitle);
      return;
    }

    if (ytId) {
      const streamUrl = `${apiBase}/api/yt-stream?id=${ytId}`;
      this.activeMode = 'html5';
      this.pendingYtVideoId = '';
      this.pauseYtPlayer();
      this.currentTrackId = `yt_${ytId}`;
      this.currentTrackTitle = customTitle || `Đang tải nhạc YouTube (${ytId})...`;
      this.currentTrackUrl = streamUrl;
      this.currentTrackDuration = 600;
      this.currentStartTime = Date.now();

      // Gán trực tiếp vào HTML5 Audio ngay trong sự kiện click của người dùng để iPhone Safari cho phép phát ngay
      this.audioEl.src = streamUrl;
      this.audioEl.currentTime = 0;
      this.audioEl.volume = this.muted ? 0 : this.volume;
      this.audioEl.play().catch(() => {});
      this.onTrackChangeCallback?.(this.currentTrackTitle, 0);

      // Lấy tên thật của video YouTube qua oEmbed
      fetch(`${apiBase}/api/yt-info?id=${ytId}`)
        .then((r) => r.json())
        .then((info) => {
          if (info && info.title) {
            this.currentTrackTitle = info.title;
            this.onTrackChangeCallback?.(this.currentTrackTitle, 0);
            onResolvedForRoom?.(`/api/yt-stream?id=${ytId}`, this.currentTrackTitle);
          }
        })
        .catch(() => {
          onResolvedForRoom?.(`/api/yt-stream?id=${ytId}`, `Nhạc YouTube (${ytId})`);
        });
      return;
    }

    // File âm thanh trực tiếp (/audio/...)
    this.activeMode = 'html5';
    this.pauseYtPlayer();
    this.currentTrackId = `file_${Date.now()}`;
    this.currentTrackTitle = customTitle || 'Nhạc Thiền Tĩnh Tâm';
    this.currentTrackUrl = trackUrlOrSpec;
    this.currentTrackDuration = 600;
    this.currentStartTime = Date.now();
    this.audioEl.src = trackUrlOrSpec;
    this.audioEl.currentTime = 0;
    this.audioEl.volume = this.muted ? 0 : this.volume;
    this.audioEl.play().catch(() => {});
    this.onTrackChangeCallback?.(this.currentTrackTitle, 0);
    onResolvedForRoom?.(trackUrlOrSpec, this.currentTrackTitle);
  }

  /**
   * Đồng bộ với trạng thái Radio của phòng từ Server
   */
  public syncWithServer(payload: RadioSyncPayload): void {
    if (!payload || !payload.trackUrl) return;
    if (this.isCustomOverride && payload.trackUrl === this.currentTrackUrl) return;

    this.serverClockOffsetMs = payload.serverNow - Date.now();
    this.currentStartTime = payload.startTime;
    this.currentTrackTitle = payload.trackTitle;
    this.currentTrackId = payload.trackId;
    const apiBase = this.getApiBase();

    const ytId = this.extractYouTubeId(payload.trackUrl);
    if (ytId && LOCAL_YOUTUBE_AUDIO_MAP[ytId]) {
      const mapped = LOCAL_YOUTUBE_AUDIO_MAP[ytId];
      this.activeMode = 'html5';
      this.pendingYtVideoId = '';
      this.pauseYtPlayer();
      this.currentTrackUrl = mapped.url;
      this.currentTrackDuration = mapped.duration;
      if (!this.audioEl.src.endsWith(mapped.url)) {
        this.audioEl.src = mapped.url;
        this.audioEl.load();
      }
    } else if (ytId) {
      const streamUrl = `${apiBase}/api/yt-stream?id=${ytId}`;
      this.activeMode = 'html5';
      this.pendingYtVideoId = '';
      this.pauseYtPlayer();
      this.currentTrackUrl = streamUrl;
      this.currentTrackDuration = Math.max(1, payload.trackDuration || 600);
      if (!this.audioEl.src.includes(`id=${ytId}`)) {
        this.audioEl.src = streamUrl;
        this.audioEl.load();
      }
    } else {
      const resolvedUrl = payload.trackUrl.startsWith('/api/')
        ? `${apiBase}${payload.trackUrl}`
        : payload.trackUrl;
      this.activeMode = 'html5';
      this.pendingYtVideoId = '';
      this.pauseYtPlayer();
      this.currentTrackUrl = resolvedUrl;
      this.currentTrackDuration = Math.max(1, payload.trackDuration || 600);
      if (!this.audioEl.src.endsWith(payload.trackUrl)) {
        this.audioEl.src = resolvedUrl;
        this.audioEl.load();
      }
    }

    const offsetSec = this.seekAndPlayCurrentOffset();
    if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback(this.currentTrackTitle, offsetSec);
    }
  }

  public computeTargetOffsetSeconds(): number {
    if (!this.currentStartTime || this.currentTrackDuration <= 0) return 0;
    const estimatedServerNow = Date.now() + this.serverClockOffsetMs;
    const elapsedSeconds = Math.max(0, (estimatedServerNow - this.currentStartTime) / 1000);
    return elapsedSeconds % this.currentTrackDuration;
  }

  private seekAndPlayCurrentOffset(): number {
    const targetSec = this.computeTargetOffsetSeconds();

    if (this.activeMode === 'youtube') {
      const ytId = this.pendingYtVideoId || this.extractYouTubeId(this.currentTrackUrl);
      if (ytId && this.isYtReady && this.ytPlayer) {
        try {
          this.applyYtVolume();
          if (this.loadedYtVideoId !== ytId) {
            this.loadedYtVideoId = ytId;
            this.ytPlayer.loadVideoById({
              videoId: ytId,
              startSeconds: Math.floor(targetSec)
            });
          } else {
            const cur = Number(this.ytPlayer.getCurrentTime?.() ?? 0);
            if (Math.abs(cur - targetSec) > 1.2) {
              this.ytPlayer.seekTo(Math.floor(targetSec), true);
            }
            this.ytPlayer.playVideo();
          }
        } catch {
          this.fallbackToLocalAudio();
        }
      }
      return targetSec;
    }

    // Chế độ HTML5 Audio phát trực tiếp file MP3 nhạc thiền
    const applySeek = () => {
      try {
        if (Math.abs(this.audioEl.currentTime - targetSec) > 0.8) {
          this.audioEl.currentTime = targetSec;
        }
      } catch {
        // Metadata chưa tải xong
      }
      this.audioEl.volume = this.muted ? 0 : this.volume;
      this.audioEl.play().catch(() => {});
    };

    if (this.audioEl.readyState >= 1) {
      applySeek();
    } else {
      this.audioEl.addEventListener('loadedmetadata', applySeek, { once: true });
    }
    return targetSec;
  }

  private fallbackToLocalAudio(): void {
    this.activeMode = 'html5';
    this.currentTrackDuration = 600;
    this.audioEl.src = '/audio/yt_Qq6dBbRusdw.mp3';
    this.audioEl.load();
    this.seekAndPlayCurrentOffset();
  }

  private checkAndCorrectDrift(): void {
    if (!this.currentTrackId) return;
    const expectedSec = this.computeTargetOffsetSeconds();

    if (this.activeMode === 'youtube') {
      if (!this.isYtReady || !this.ytPlayer) return;
      try {
        const state = this.ytPlayer.getPlayerState?.();
        if (state === 2 || state === 5 || state === -1) {
          this.ytPlayer.playVideo();
        }
        if (state === 1) {
          const actualSec = Number(this.ytPlayer.getCurrentTime?.() ?? 0);
          const drift = Math.abs(expectedSec - actualSec);
          if (drift > 1.2 && drift < this.currentTrackDuration - 1.5) {
            this.ytPlayer.seekTo(Math.floor(expectedSec), true);
          }
        }
      } catch {
        // Ignore
      }
      return;
    }

    if (this.audioEl.paused) {
      this.audioEl.play().catch(() => {});
      return;
    }
    const actualSec = this.audioEl.currentTime;
    const drift = Math.abs(expectedSec - actualSec);

    if (drift > 0.9 && drift < this.currentTrackDuration - 0.9) {
      try {
        this.audioEl.currentTime = expectedSec;
      } catch {
        // Ignore seek error
      }
    }
  }

  private applyYtVolume(): void {
    if (!this.isYtReady || !this.ytPlayer) return;
    try {
      if (this.muted) {
        this.ytPlayer.mute?.();
        this.ytPlayer.setVolume?.(0);
      } else {
        this.ytPlayer.unMute?.();
        this.ytPlayer.setVolume?.(Math.round(this.volume * 100));
      }
    } catch {
      // Ignore
    }
  }

  private pauseYtPlayer(): void {
    if (this.isYtReady && this.ytPlayer) {
      try {
        this.ytPlayer.pauseVideo?.();
      } catch {
        // Ignore
      }
    }
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (!this.muted) {
      this.audioEl.volume = this.volume;
    }
    this.applyYtVolume();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.audioEl.volume = this.muted ? 0 : this.volume;
    this.applyYtVolume();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getCurrentTrackTitle(): string {
    return this.currentTrackTitle;
  }

  public stop(): void {
    this.currentTrackId = '';
    this.isCustomOverride = false;
    this.audioEl.pause();
    this.pauseYtPlayer();
  }

  public dispose(): void {
    if (this.driftCheckTimer) {
      clearInterval(this.driftCheckTimer);
    }
    this.stop();
  }
}
