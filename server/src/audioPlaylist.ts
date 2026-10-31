import { RoomTheme } from '../../shared/constants';

export interface AudioTrackInfo {
  id: string;
  title: string;
  url: string;
  durationSeconds: number;
}

/**
 * Danh sách phát lấy từ YouTube Playlist:
 * https://www.youtube.com/watch?v=Qq6dBbRusdw&list=PLcphJq1YOg_wKNMSxmsLwTww_VeC2j-DO
 * Đã tải luồng âm thanh thực về /audio/yt_Qq6dBbRusdw.mp3 và /audio/yt_jRdRY-QAFkg.mp3
 * để phát trực tiếp qua HTML5 Audio không bị trình duyệt chặn iframe.
 */
export const PLAYLISTS_BY_THEME: Record<RoomTheme, AudioTrackInfo[]> = {
  'Tụng kinh sáng': [
    {
      id: 'yt_Qq6dBbRusdw',
      title: 'Nhạc Thiền Cho Buổi Sáng Tĩnh Tâm An Lạc - Ngày Mới Tràn Đầy Năng Lượng',
      url: '/audio/yt_Qq6dBbRusdw.mp3',
      durationSeconds: 600
    },
    {
      id: 'yt_jRdRY-QAFkg',
      title: 'Nhạc Thiền Tĩnh Tâm - Hoa Sen Nước Chảy Thư Thái',
      url: '/audio/yt_jRdRY-QAFkg.mp3',
      durationSeconds: 600
    }
  ],
  'Thiền': [
    {
      id: 'yt_Qq6dBbRusdw',
      title: 'Nhạc Thiền Cho Buổi Sáng Tĩnh Tâm An Lạc - Ngày Mới Tràn Đầy Năng Lượng',
      url: '/audio/yt_Qq6dBbRusdw.mp3',
      durationSeconds: 600
    },
    {
      id: 'yt_jRdRY-QAFkg',
      title: 'Nhạc Thiền Tĩnh Tâm - Hoa Sen Nước Chảy Thư Thái',
      url: '/audio/yt_jRdRY-QAFkg.mp3',
      durationSeconds: 600
    }
  ],
  'Chung': [
    {
      id: 'yt_Qq6dBbRusdw',
      title: 'Nhạc Thiền Cho Buổi Sáng Tĩnh Tâm An Lạc - Ngày Mới Tràn Đầy Năng Lượng',
      url: '/audio/yt_Qq6dBbRusdw.mp3',
      durationSeconds: 600
    },
    {
      id: 'yt_jRdRY-QAFkg',
      title: 'Nhạc Thiền Tĩnh Tâm - Hoa Sen Nước Chảy Thư Thái',
      url: '/audio/yt_jRdRY-QAFkg.mp3',
      durationSeconds: 600
    }
  ],
  'Nhà Thờ Công Giáo': [
    {
      id: 'yt_0gurLbd6CvM',
      title: 'Piano Thánh Ca Không Lời — Nhạc Cầu Nguyện Bình An Nơi Thánh Đường',
      url: '/audio/yt_0gurLbd6CvM.mp3',
      durationSeconds: 600
    },
    {
      id: 'yt_cp1ON3N7uRI',
      title: 'Hòa Tấu Piano & Đàn Organ Thánh Ca Dịu Dàng — Tâm Hồn Dâng Chúa',
      url: '/audio/yt_cp1ON3N7uRI.mp3',
      durationSeconds: 600
    }
  ],
  'Thánh Ca & Cầu Nguyện': [
    {
      id: 'yt_0gurLbd6CvM',
      title: 'Piano Thánh Ca Không Lời — Nhạc Cầu Nguyện Bình An Nơi Thánh Đường',
      url: '/audio/yt_0gurLbd6CvM.mp3',
      durationSeconds: 600
    },
    {
      id: 'yt_cp1ON3N7uRI',
      title: 'Hòa Tấu Piano & Đàn Organ Thánh Ca Dịu Dàng — Tâm Hồn Dâng Chúa',
      url: '/audio/yt_cp1ON3N7uRI.mp3',
      durationSeconds: 600
    }
  ],
  'Chầu Thánh Thể & Tĩnh Tâm': [
    {
      id: 'yt_cp1ON3N7uRI',
      title: 'Hòa Tấu Piano & Đàn Organ Thánh Ca Dịu Dàng — Tâm Hồn Dâng Chúa',
      url: '/audio/yt_cp1ON3N7uRI.mp3',
      durationSeconds: 600
    },
    {
      id: 'yt_0gurLbd6CvM',
      title: 'Piano Thánh Ca Không Lời — Nhạc Cầu Nguyện Bình An Nơi Thánh Đường',
      url: '/audio/yt_0gurLbd6CvM.mp3',
      durationSeconds: 600
    }
  ]
};

export class RoomRadioClock {
  private theme: RoomTheme;
  private tracks: AudioTrackInfo[];
  private currentIndex = 0;
  private trackStartTime: number;

  constructor(theme: RoomTheme, initialStartTime = Date.now()) {
    this.theme = theme;
    this.tracks = PLAYLISTS_BY_THEME[theme] ?? PLAYLISTS_BY_THEME['Chung'];
    this.trackStartTime = initialStartTime;
  }

  public tick(now = Date.now()): AudioTrackInfo & { startTime: number } {
    let currentTrack = this.tracks[this.currentIndex];
    let elapsedMs = now - this.trackStartTime;
    let durationMs = currentTrack.durationSeconds * 1000;

    // Tự động chuyển sang bài kế tiếp trong playlist khi hết bài
    while (elapsedMs >= durationMs) {
      this.trackStartTime += durationMs;
      this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
      currentTrack = this.tracks[this.currentIndex];
      durationMs = currentTrack.durationSeconds * 1000;
      elapsedMs = now - this.trackStartTime;
    }

    return {
      ...currentTrack,
      startTime: this.trackStartTime
    };
  }

  public getCurrentState(now = Date.now()): AudioTrackInfo & { startTime: number; theme: RoomTheme } {
    const info = this.tick(now);
    return {
      ...info,
      theme: this.theme
    };
  }
}
