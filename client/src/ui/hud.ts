import {
  BEADS_PER_ROUND,
  PlayerAction,
  ReligionMode,
  LEVEL_MILESTONES,
  getMilestoneInfo,
  getCurrentLevelMinExp,
  getNextLevelMinExp
} from '../../../shared/constants';
import { SyncedIncenseData } from '../scene/props';
import { TimeOfDayMode } from '../scene/lighting';

export interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  exp: number;
  isMe?: boolean;
}

export interface FortuneLotItem {
  number: string;
  rank: string;
  title: string;
  poem: string[];
  meaning: string;
  dharmaAdvice: string;
}

export const FORTUNE_LOTS: FortuneLotItem[] = [
  {
    number: 'Quẻ Số 01',
    rank: 'Thượng Thượng Quẻ — Đại Cát An Lạc',
    title: 'Liên Hoa Khai Nở Giữa Hồ Thu',
    poem: [
      'Sen vàng nở rộ giữa hồ trong,',
      'Hương thơm lan tỏa khắp muôn lòng,',
      'Tâm thành lễ Phật duyên lành đến,',
      'Gia đạo bình an vạn sự thông.'
    ],
    meaning:
      'Mọi việc cầu nguyện về gia đạo, sức khỏe và công việc đều đang bước vào thời kỳ hanh thông, quý nhân tương trợ.',
    dharmaAdvice:
      'Giữ tâm khiêm cung, năng làm việc thiện lành và san sẻ phước báu cho người xung quanh.'
  },
  {
    number: 'Quẻ Số 08',
    rank: 'Thượng Cát — Phúc Lộc Viên Thành',
    title: 'Thuận Buồm Xuôi Gió Vượt Trùng Khơi',
    poem: [
      'Gió lành đưa đẩy cánh buồm xa,',
      'Sóng lặng trời trong ánh nguyệt ngà,',
      'Công danh sự nghiệp đều sáng tỏ,',
      'Phúc đức vun trồng rạng nếp nhà.'
    ],
    meaning:
      'Những dự định đang ấp ủ sẽ sớm gặt hái thành quả tốt đẹp. Người đi xa bình an, học hành và thi cử đỗ đạt.',
    dharmaAdvice:
      'Mỗi ngày dành vài phút tĩnh tâm niệm Phật để giữ trí tuệ sáng suốt trước mọi quyết định.'
  },
  {
    number: 'Quẻ Số 15',
    rank: 'Thượng Cát — Minh Nguyệt Trung Thiên',
    title: 'Trăng Rằm Sáng Tỏ Chiếu Muôn Phương',
    poem: [
      'Mây mù tan biến ánh trăng thanh,',
      'Trời quang cảnh tịnh phúc duyên lành,',
      'Bao nhiêu lo lắng nay khép lại,',
      'Hoa trái ngọt lành nở trên cành.'
    ],
    meaning:
      'Khó khăn, hiểu lầm hay khúc mắc trước đây đều sẽ được hóa giải êm đẹp. Tâm hồn tìm lại sự bình yên.',
    dharmaAdvice:
      'Lấy lòng bao dung và lời nói ái ngữ để đối đãi với mọi người, oán kết tự nhiên tiêu tan.'
  },
  {
    number: 'Quẻ Số 24',
    rank: 'Trung Cát — Tĩnh Tâm Chờ Thời',
    title: 'Mầm Xanh Đợi Nắng Xuân Về',
    poem: [
      'Đất ẩm mầm xanh đã nhú chồi,',
      'Chờ cơn mưa ấm khắp nơi nơi,',
      'Kiên trì nhẫn nại đừng nóng vội,',
      'Đến độ xuân sang nở rạng ngời.'
    ],
    meaning:
      'Việc cầu mong cần thêm chút thời gian để chín muồi. Không nên hấp tấp vội vàng, cứ vững bước làm tốt việc hiện tại.',
    dharmaAdvice:
      'Học hạnh Nhẫn Nhục và Chánh Niệm trong từng bước chân, quả lành ắt sẽ trổ đúng thời.'
  },
  {
    number: 'Quẻ Số 36',
    rank: 'Thượng Cát — Từ Bi Gia Hộ',
    title: 'Cam Lồ Tưới Mát Cõi Tâm An',
    poem: [
      'Nhành dương nước tịnh rưới muôn nơi,',
      'Bệnh tật tiêu trừ khổ não vơi,',
      'Chí tâm hướng Phật cầu gia hộ,',
      'Thân tâm an lạc nở nụ cười.'
    ],
    meaning:
      'Quẻ báo điềm lành về sức khỏe và bình an cho bản thân cùng cha mẹ, người thân trong gia đình.',
    dharmaAdvice:
      'Khuyến khích ăn chay, phóng sinh và giữ tâm thanh tịnh để tăng trưởng phước thọ.'
  },
  {
    number: 'Quẻ Số 68',
    rank: 'Thượng Thượng Quẻ — Trí Tuệ Viên Minh',
    title: 'Chuông Chùa Ngân Vang Giữa Sớm Mai',
    poem: [
      'Tiếng chuông thức tỉnh giấc mộng dài,',
      'Trí sáng tâm minh hướng tương lai,',
      'Thiện duyên hội tụ người hiền đến,',
      'Công thành danh toại chẳng phôi phai.'
    ],
    meaning:
      'Trí tuệ khai mở, gặp được thầy hiền bạn tốt giúp đỡ trên con đường học tập và lập nghiệp.',
    dharmaAdvice:
      'Chăm chỉ học hỏi, lắng nghe với tâm cầu thị và luôn nhớ ơn những người đã nâng đỡ mình.'
  }
];

export const CATHOLIC_FORTUNE_LOTS: FortuneLotItem[] = [
  {
    number: 'Lộc Thánh 01 — Thánh vịnh 23, 1',
    rank: 'Hồng Ân Bình An — Chúa Chăn Nuôi',
    title: 'Chúa Là Mục Tử Chăn Dắt Tôi',
    poem: [
      '"Chúa là mục tử chăn dắt tôi, tôi chẳng thiếu thốn gì.',
      'Trong đồng cỏ xanh tươi, Người cho tôi nằm nghỉ.',
      'Người đưa tôi tới dòng nước trong lành',
      'và bổ sức cho tâm hồn tôi."'
    ],
    meaning:
      'Gia đình và công việc luôn được Thiên Chúa quan phòng chở che. Mọi lo âu sẽ sớm nhường chỗ cho sự bình an sâu thẳm.',
    dharmaAdvice:
      'Hãy phó thác mọi dự định trong tay Chúa và giữ lòng cậy trông vững vàng mỗi ngày.'
  },
  {
    number: 'Lộc Thánh 02 — Mát-thêu 5, 9',
    rank: 'Phúc Lộc Hòa Bình — Con Cái Thiên Chúa',
    title: 'Phúc Cho Ai Xây Dựng Hòa Bình',
    poem: [
      '"Phúc thay ai xây dựng hòa bình,',
      'vì họ sẽ được gọi là con cái Thiên Chúa.',
      'Ánh sáng của anh em phải chiếu giãi trước mặt thiên hạ,',
      'để họ nhìn thấy những việc tốt đẹp anh em làm."'
    ],
    meaning:
      'Sự hòa thuận và yêu thương trong gia đình sẽ mang lại muôn vàn ơn lành. Các mối quan hệ đều tốt đẹp, êm ấm.',
    dharmaAdvice:
      'Sống hiền hòa, tha thứ và đem niềm vui đến cho những người xung quanh.'
  },
  {
    number: 'Lộc Thánh 03 — Giê-rê-mi-a 29, 11',
    rank: 'Hồng Ân Hy Vọng — Tương Lai Tươi Sáng',
    title: 'Chương Trình Bình An Và Hy Vọng',
    poem: [
      '"Ta biết các kế hoạch Ta định làm cho các ngươi,',
      'kế hoạch thịnh vượng chứ không phải tai ương,',
      'để ban cho các ngươi một tương lai',
      'và một niềm hy vọng tràn đầy."'
    ],
    meaning:
      'Những dự định học tập, công việc và ơn gọi đang đi đúng hướng. Hãy kiên trì vì mùa gặt tốt lành đang đến gần.',
    dharmaAdvice:
      'Siêng năng cầu nguyện sớm tối và làm việc với trọn tấm lòng yêu mến.'
  },
  {
    number: 'Lộc Thánh 04 — Phi-líp-phê 4, 13',
    rank: 'Ơn Sức Mạnh — Vững Bước Tin Yêu',
    title: 'Tôi Làm Được Mọi Sự Trong Đấng Ban Sức Mạnh',
    poem: [
      '"Tôi có thể làm được mọi sự',
      'trong Đấng ban sức mạnh cho tôi.',
      'Đừng lo lắng gì cả, nhưng trong mọi hoàn cảnh,',
      'hãy dâng lời cầu xin cùng với lòng biết ơn."'
    ],
    meaning:
      'Chúa ban thêm nghị lực và sự khôn ngoan để bạn vượt qua mọi thử thách và đạt được thành quả xứng đáng.',
    dharmaAdvice:
      'Hãy tạ ơn Chúa trong mọi hoàn cảnh và chia sẻ nâng đỡ những người yếu thế.'
  }
];

export interface HUDCallbacks {
  onTogglePray: () => void;
  onToggleBow: () => void;
  onToggleBeadsModal: (open: boolean) => void;
  onRequestOfferIncense: () => void;
  onBeadPulled: (currentCount: number, roundsCompleted: number) => void;
  onChantPhrase: (phrase: string) => void;
  onStartSutraReading: (lines: string[], title: string) => void;
  onStopSutraReading: () => void;
  onDrawFortuneStick?: (fortune: FortuneLotItem) => void;
  onHangWishOnTree?: (wishText: string) => void;
  onCycleTimeOfDay?: (mode: TimeOfDayMode) => void;
  onToggleReligionMode?: () => void;
  onOpenSettings: () => void;
  onOpenLobby: () => void;
  onToggleChat?: () => void;
  onJoystickMove?: (jx: number, jz: number) => void;
  onZoomCamera?: (delta: number) => void;
}

export const PRESET_SUTRAS: Record<string, { title: string; lines: string[] }> = {
  bat_nha: {
    title: 'Bát Nhã Tâm Kinh',
    lines: [
      '🙏 Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
      '📖 Quán Tự Tại Bồ Tát hành thâm Bát Nhã Ba La Mật Đa thời',
      '📖 Chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách',
      '📖 Xá Lợi Tử! Sắc bất dị không, không bất dị sắc',
      '📖 Sắc tức thị không, không tức thị sắc, thọ tưởng hành thức diệc phục như thị',
      '📖 Yết đế yết đế, ba la yết đế, ba la tăng yết đế, Bồ đề tát bà ha'
    ]
  },
  tu_bi: {
    title: 'Kinh Từ Bi (Metta Sutta)',
    lines: [
      '🙏 Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
      '🪷 Nguyện cho tất cả chúng sinh đều được an vui, hạnh phúc',
      '🪷 Nguyện cho muôn loài không oán thù, không làm khổ lẫn nhau',
      '🪷 Tâm từ bi trải rộng khắp mười phương không bờ bến',
      '🪷 Nguyện cầu thế giới hòa bình, chúng sinh an lạc'
    ]
  },
  tan_phat: {
    title: 'Kệ Tán Phật & Hồi Hướng',
    lines: [
      '🙏 Phật thân thanh tịnh tựa lưu ly, Phật diện như trăng rằm sáng tỏ',
      '🙏 Hào quang rực rỡ chiếu mười phương, Từ bi tế độ khắp muôn loài',
      '🙏 Chí tâm đảnh lễ Nam Mô A Di Đà Phật',
      '🙏 Nguyện đem công đức này, hướng về khắp tất cả',
      '🙏 Đệ tử và chúng sinh, đều trọn thành Phật đạo'
    ]
  },
  cau_an: {
    title: 'Sám Nguyện Cầu An Gia Đạo',
    lines: [
      '🙏 Nam Mô Đại Bi Quán Thế Âm Bồ Tát',
      '🕯️ Nguyện tiêu tam chướng trừ phiền não, nguyện đắc trí huệ chơn minh liễu',
      '🕯️ Cầu nguyện gia đạo bình an, thân tâm thường an lạc',
      '🕯️ Mười phương chư Phật từ bi gia hộ độ trì',
      '🙏 Nam Mô A Di Đà Phật'
    ]
  },
  kinh_lay_cha: {
    title: '✝️ Kinh Lạy Cha (Pater Noster)',
    lines: [
      '✝️ Nhân danh Cha và Con và Thánh Thần. Amen.',
      '🙏 Lạy Cha chúng con ở trên trời, chúng con nguyện danh Cha cả sáng',
      '🙏 Nước Cha trị đến, ý Cha thể hiện dưới đất cũng như trên trời',
      '🙏 Xin Cha cho chúng con hôm nay lương thực hằng ngày',
      '🙏 Và tha nợ chúng con như chúng con cũng tha kẻ có nợ chúng con',
      '🙏 Xin chớ để chúng con sa chước cám dỗ, nhưng cứu chúng con cho khỏi sự dữ. Amen.'
    ]
  },
  kinh_kinh_mung: {
    title: '🌹 Kinh Kính Mừng (Ave Maria)',
    lines: [
      '🌹 Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà',
      '🌹 Bà có phúc lạ hơn mọi người nữ, và Giêsu con lòng Bà gồm phúc lạ',
      '🌹 Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội',
      '🌹 Khi nay và trong giờ lâm tử. Amen.'
    ]
  },
  kinh_hoa_binh: {
    title: '🕊️ Kinh Hòa Bình (Thánh Phanxicô)',
    lines: [
      '🕊️ Lạy Chúa từ nhân, xin cho con biết mến yêu và phụng sự Chúa trong mọi người',
      '🕊️ Lạy Chúa xin hãy dùng con như khí cụ bình an của Chúa',
      '🕊️ Để con đem yêu thương vào nơi oán thù, đem thứ tha vào nơi lăng nhục',
      '🕊️ Chính lúc quên mình là lúc gặp lại bản thân, chính lúc thứ tha là lúc được tha thứ. Amen.'
    ]
  },
  kinh_sang_danh: {
    title: '✨ Kinh Sáng Danh & Kinh Tin Kính',
    lines: [
      '✨ Sáng danh Đức Chúa Cha, và Đức Chúa Con, và Đức Chúa Thánh Thần',
      '✨ Như đã có trước vô cùng, và bây giờ, và hằng có, và đời đời chẳng cùng. Amen.',
      '✝️ Tôi tin kính Đức Chúa Trời là Cha phép tắc vô cùng dựng nên trời đất',
      '✝️ Tôi tin kính Đức Chúa Giêsu Kitô là Con Một Đức Chúa Cha cùng là Chúa chúng tôi',
      '🕊️ Tôi tin kính Đức Chúa Thánh Thần, tôi tin có Hội Thánh hằng có ở khắp thế này. Amen.'
    ]
  },
  kinh_thanh_giuse: {
    title: '⚜️ Kinh Cầu Cùng Thánh Cả Giuse',
    lines: [
      '⚜️ Lạy Thánh Cả Giuse, Đấng bảo trợ trung thành của Thánh Gia Thất',
      '⚜️ Xin Người thương gìn giữ gia đình chúng con luôn bình an và hiệp nhất',
      '⚜️ Xin ban cho chúng con lòng khiêm nhường, siêng năng lao động và cậy trông Chúa',
      '⚜️ Lạy Thánh Cả Giuse, xin cầu cho chúng con. Amen.'
    ]
  },
  kinh_long_thuong_xot: {
    title: '❤️ Kinh Lòng Chúa Thương Xót',
    lines: [
      '❤️ Lạy Cha Hằng Hữu, con xin dâng lên Cha Mình và Máu, Linh Hồn và Thần Tính của Con Rất Yêu Dấu Cha',
      '❤️ Vì cuộc khổ nạn đau thương của Chúa Giêsu Kitô, xin Cha thương xót chúng con và toàn thế giới',
      '❤️ Lạy Đấng Chí Thánh, là Thiên Chúa Toàn Năng Hằng Hữu, xin thương xót chúng con',
      '❤️ Lạy Chúa Giêsu, con tín thác vào Chúa! Amen.'
    ]
  }
};

export class GameHUD {
  private callbacks: HUDCallbacks;
  private rootEl: HTMLElement;
  private roomNameEl!: HTMLElement;
  private roomCodeEl!: HTMLElement;
  private playerCountEl!: HTMLElement;
  private nowPlayingEl!: HTMLElement;

  private btnPray!: HTMLButtonElement;
  private btnBow!: HTMLButtonElement;
  private btnBeads!: HTMLButtonElement;
  private btnIncense!: HTMLButtonElement;
  private btnSutra!: HTMLButtonElement;
  private btnFortune!: HTMLButtonElement;
  private btnWish!: HTMLButtonElement;

  private beadsOverlayEl!: HTMLElement;
  private beadsCanvas!: HTMLCanvasElement;
  private beadCounterEl!: HTMLElement;
  private beadRoundBannerEl!: HTMLElement;
  private isBeadsOpen = false;
  private beadCount = 0;
  private completedRounds = 0;
  private dragOffsetPx = 0;
  private isDraggingBead = false;
  private lastDragY = 0;

  private sutraOverlayEl!: HTMLElement;
  private isSutraOpen = false;
  private isReadingSutra = false;

  // Giao diện Xin Xăm Đầu Năm / Gieo Quẻ Quan Âm
  private fortuneOverlayEl!: HTMLElement;
  private isFortuneOpen = false;
  private currentFortune: FortuneLotItem | null = null;

  // Giao diện Cây Bồ Đề Ước Nguyện
  private wishOverlayEl!: HTMLElement;
  private isWishOpen = false;
  private wishesList: { author: string; text: string; time: string }[] = [
    { author: 'Tâm An', text: 'Cầu chúc cha mẹ luôn mạnh khỏe, gia đình bình an hạnh phúc', time: '08:30' },
    { author: 'Minh Phúc', text: 'Nguyện cầu thế giới hòa bình, muôn loài an lạc', time: '09:15' },
    { author: 'Diệu Liên', text: 'Cầu học hành hanh thông, tâm luôn sáng suốt tịnh lạc', time: '10:00' }
  ];

  private timeModes: TimeOfDayMode[] = ['morning', 'sunset', 'night'];
  private currentTimeIdx = 0;
  private religionMode: ReligionMode = 'buddhist';
  private leaderboardOverlayEl!: HTMLElement;
  private isLeaderboardOpen = false;
  private leaderboardEntries: LeaderboardEntry[] = [];
  private currentLevel = 1;
  private currentExp = 0;

  private incenseTooltipEl!: HTMLElement;
  private toastEl!: HTMLElement;
  private toastTimer?: number;
  private reconnectBannerEl!: HTMLElement;

  constructor(callbacks: HUDCallbacks) {
    this.callbacks = callbacks;
    this.rootEl = document.getElementById('hud-overlay')!;
    this.renderHTML();
    this.bindEvents();
    this.drawPrayerBeadsCanvas();
    this.renderWishesList();
  }

  private renderHTML(): void {
    this.rootEl.innerHTML = `
      <!-- Góc trái trên: Tên phòng, Số người, Chuyển Chế Độ Chùa/Nhà Thờ, Thanh Cấp Độ & Đua Top -->
      <div class="hud-top-left">
        <div class="room-header-row">
          <span id="hud-room-name" class="hud-room-title">Chánh Điện Thanh Tịnh</span>
          <span id="hud-room-code" class="hud-room-code hidden"></span>
        </div>
        <div class="hud-meta-row" style="flex-wrap:wrap;gap:6px;">
          <span id="hud-player-count">👥 1/50 người</span>
          <button id="btn-hud-lobby-inline" class="btn-hud-lobby-inline" title="Quay về Sảnh để chọn phòng hoặc tạo phòng mới">
            ⛩️ Chọn Sảnh
          </button>
          <button id="btn-hud-switch-religion" class="btn-hud-lobby-inline" style="background:linear-gradient(135deg,#2b5ca8,#193768);border-color:#7fb3ff;color:#fff;" title="Chuyển ngay giữa Chùa Phật Giáo và Nhà Thờ Thiên Chúa">
            ⛪ Chế Độ Nhà Thờ
          </button>
        </div>
        <!-- Thanh Cấp Độ Tu Tập / Ân Sủng & Nút Đua Top -->
        <div id="hud-level-box" style="margin-top:6px;padding:6px 8px;background:rgba(0,0,0,0.42);border:1px solid rgba(255,215,100,0.4);border-radius:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:0.78rem;">
            <span id="hud-level-title" style="font-weight:700;color:#ffe599;">🌱 Lv.1 • Tân Phật Tử</span>
            <button id="btn-hud-leaderboard" type="button" style="background:linear-gradient(135deg,#d49b27,#8f580a);border:1px solid #ffe599;color:#fff;border-radius:6px;padding:2px 7px;font-size:0.72rem;font-weight:700;cursor:pointer;">
              🏆 Đua Top & Hào Quang
            </button>
          </div>
          <div style="position:relative;height:7px;background:rgba(255,255,255,0.14);border-radius:4px;overflow:hidden;margin-top:4px;">
            <div id="hud-exp-fill" style="width:0%;height:100%;background:linear-gradient(90deg,#4ef5a5,#ffd700);transition:width 0.3s ease;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.69rem;color:#d8c7b4;margin-top:2px;">
            <span id="hud-exp-text">0 / 50 Công Đức</span>
            <span id="hud-exp-gain-popup" style="color:#4ef5a5;font-weight:700;"></span>
          </div>
        </div>
        <div id="hud-now-playing" class="hud-now-playing" style="margin-top:4px;">
          🎵 Đang phát: Nhạc Thiền Cho Buổi Sáng Tĩnh Tâm An Lạc
        </div>
      </div>

      <!-- Góc phải trên: Đổi Thời Gian, Chọn Sảnh, Chat & Cài đặt -->
      <div class="hud-top-right">
        <button id="btn-hud-time" class="btn-hud-icon" title="Đổi khung cảnh Ban Ngày / Hoàng Hôn / Đêm Hoa Đăng">
          ☀️ <span class="hud-btn-text" id="hud-time-label">Ban Ngày</span>
        </button>
        <button id="btn-hud-lobby" class="btn-hud-icon" title="Về Sảnh chọn phòng">
          ⛩️ <span class="hud-btn-text">Sảnh Phòng</span>
        </button>
        <button id="btn-hud-chat" class="btn-hud-icon" title="Ẩn / Hiện khung trò chuyện">
          💬 <span class="hud-btn-text">Chat</span>
        </button>
        <button id="btn-hud-settings" class="btn-hud-icon" title="Cài đặt âm thanh & phòng">
          ⚙️ <span class="hud-btn-text">Cài đặt</span>
        </button>
      </div>

      <!-- Cụm nút Phóng to / Thu nhỏ Camera nhanh trên điện thoại -->
      <div class="mobile-zoom-controls">
        <button id="btn-zoom-in" class="btn-zoom" title="Phóng gần nhân vật">＋</button>
        <button id="btn-zoom-out" class="btn-zoom" title="Thu xa toàn cảnh">－</button>
      </div>

      <!-- Thanh nút tương tác dưới cùng -->
      <div class="hud-bottom-bar">
        <button id="btn-action-pray" class="btn-action">
          <span class="action-icon">🙏</span>
          <span class="action-label">Chắp tay</span>
        </button>
        <button id="btn-action-bow" class="btn-action">
          <span class="action-icon">🙇</span>
          <span class="action-label" id="label-action-bow">Lạy</span>
        </button>
        <button id="btn-action-beads" class="btn-action">
          <span class="action-icon">📿</span>
          <span class="action-label">Tràng hạt</span>
        </button>
        <button id="btn-action-incense" class="btn-action">
          <span class="action-icon">🕯️</span>
          <span class="action-label">Dâng nhang</span>
        </button>
        <button id="btn-action-sutra" class="btn-action">
          <span class="action-icon">📖</span>
          <span class="action-label" id="label-action-sutra">Tụng kinh</span>
        </button>
        <button id="btn-action-fortune" class="btn-action">
          <span class="action-icon">🎋</span>
          <span class="action-label">Xin xăm</span>
        </button>
        <button id="btn-action-wish" class="btn-action">
          <span class="action-icon">🌳</span>
          <span class="action-label">Cầu nguyện</span>
        </button>
      </div>

      <!-- Giao diện chuỗi Tràng hạt 108 hạt / Chuỗi Mân Côi -->
      <div id="beads-overlay" class="beads-overlay hidden">
        <div class="beads-panel">
          <div class="beads-header">
            <h4 id="beads-modal-title">📿 Lần Tràng Hạt Tịnh Tâm (108 Hạt)</h4>
            <button id="btn-close-beads" class="btn-close-small" title="Đóng">✕</button>
          </div>
          <p id="beads-modal-hint" class="beads-hint">Dùng chuột hoặc ngón tay kéo chuỗi hạt xuống qua vạch vàng để lần từng hạt</p>
          <canvas id="beads-canvas" width="240" height="300"></canvas>
          <div id="bead-counter" class="bead-counter">Hạt: 0 / 108 &nbsp;|&nbsp; Số vòng: 0</div>
          <div id="bead-round-banner" class="bead-round-banner hidden">✨ Đã lần xong 1 vòng ✨</div>
        </div>
      </div>

      <!-- Giao diện Niệm Phật / Cầu Nguyện & Đọc Kinh Tuỳ Chọn -->
      <div id="sutra-overlay" class="sutra-overlay hidden">
        <div class="sutra-panel">
          <div class="beads-header">
            <h4 id="sutra-modal-title">📖 Niệm Phật & Đọc Kinh Tuỳ Chọn</h4>
            <button id="btn-close-sutra" class="btn-close-small" title="Đóng">✕</button>
          </div>

          <div class="sutra-section">
            <label id="sutra-sec1-label" class="field-label">1. Niệm Phật nhanh (nhảy chữ & phát giọng đọc):</label>
            <div id="chant-preset-grid" class="chant-Preset-grid">
              <button class="btn-chant-preset" data-chant="🪷 Nam Mô Bổn Sư Thích Ca Mâu Ni Phật 🙏">Đức Phật Thích Ca</button>
              <button class="btn-chant-preset" data-chant="🙏 Nam Mô A Di Đà Phật 🙏">Đức Phật A Di Đà</button>
              <button class="btn-chant-preset" data-chant="🌿 Nam Mô Đại Bi Quán Thế Âm Bồ Tát 🙏">Quan Thế Âm Bồ Tát</button>
              <button class="btn-chant-preset" data-chant="🔱 Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát 🙏">Địa Tạng Vương Bồ Tát</button>
              <button class="btn-chant-preset" data-chant="😊 Nam Mô Đương Lai Hạ Sinh Di Lặc Tôn Phật 🙏">Phật Di Lặc Hoan Hỷ</button>
              <button class="btn-chant-preset" data-chant="🛡️ Nam Mô Hộ Pháp Vi Đà Tôn Thiên Bồ Tát 🙏">Hộ Pháp Vi Đà</button>
            </div>
            <div class="custom-chant-row">
              <input
                id="custom-chant-input"
                class="text-input"
                type="text"
                maxlength="120"
                placeholder="Nhập câu niệm Phật / lời cầu nguyện tuỳ chọn..."
              />
              <button id="btn-send-custom-chant" class="btn-primary">Niệm</button>
            </div>
          </div>

          <hr class="settings-divider" />

          <div class="sutra-section">
            <label id="sutra-sec2-label" class="field-label" for="select-sutra-preset">2. Chọn bài Kinh để nhân vật tụng đọc từng câu:</label>
            <select id="select-sutra-preset" class="select-input">
              <option value="bat_nha">Bát Nhã Tâm Kinh</option>
              <option value="tu_bi">Kinh Từ Bi (Metta Sutta)</option>
              <option value="tan_phat">Kệ Tán Phật & Hồi Hướng Công Đức</option>
              <option value="cau_an">Sám Nguyện Cầu An Gia Đạo</option>
              <option value="custom">✍️ Tự nhập bài Kinh / Lời nguyện tuỳ chọn...</option>
            </select>

            <textarea
              id="custom-sutra-textarea"
              class="sutra-textarea"
              rows="4"
              placeholder="Mỗi dòng là một câu kinh sẽ hiển thị lần lượt trên đầu nhân vật..."
            ></textarea>

            <div class="sutra-actions-row">
              <button id="btn-start-sutra" class="btn-primary">📖 Bắt đầu Đọc Kinh</button>
              <button id="btn-stop-sutra" class="btn-danger hidden">⏹️ Dừng Đọc Kinh</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Giao diện Xin Xăm Đầu Năm / Rút Lộc Thánh Lời Chúa -->
      <div id="fortune-overlay" class="sutra-overlay hidden">
        <div class="sutra-panel">
          <div class="beads-header">
            <h4 id="fortune-modal-title">🎋 Xin Xăm Linh Ứng — Gieo Quẻ Quan Âm</h4>
            <button id="btn-close-fortune" class="btn-close-small" title="Đóng">✕</button>
          </div>
          <p id="fortune-modal-hint" class="beads-hint">Chắp tay thành tâm trước Phật đài rồi bấm nút Lắc Ống Xăm để nhận lời khuyên thiện lành</p>

          <div style="text-align: center; margin: 10px 0;">
            <button id="btn-shake-fortune" class="btn-primary" style="width: 100%; font-size: 1.02rem;">
              🎋 Lắc Ống Xăm & Rút Quẻ Lành
            </button>
          </div>

          <div id="fortune-result-box" class="fortune-result-box hidden">
            <div class="fortune-header-badge">
              <span id="fortune-number">Quẻ Số 01</span> — <strong id="fortune-rank">Thượng Thượng Quẻ</strong>
            </div>
            <h4 id="fortune-title" style="color: #ffe599; text-align: center; margin: 6px 0;">Liên Hoa Khai Nở</h4>
            <div id="fortune-poem" class="fortune-poem"></div>
            <div class="fortune-detail">
              <strong id="fortune-label-meaning">📜 Lời Giải:</strong> <span id="fortune-meaning"></span>
            </div>
            <div class="fortune-detail" style="margin-top: 6px;">
              <strong id="fortune-label-advice">🪷 Lời Phật Dạy:</strong> <span id="fortune-advice"></span>
            </div>
            <button id="btn-share-fortune" class="btn-secondary" style="width: 100%; margin-top: 10px;">
              🙏 Chia sẻ Quẻ lành & Đọc to lời chúc
            </button>
          </div>
        </div>
      </div>

      <!-- Giao diện Cây Bồ Đề Ước Nguyện / Cây Phước Lành -->
      <div id="wish-overlay" class="sutra-overlay hidden">
        <div class="sutra-panel">
          <div class="beads-header">
            <h4 id="wish-modal-title">🌳 Cây Bồ Đề Ước Nguyện — Treo Thẻ Cầu An</h4>
            <button id="btn-close-wish" class="btn-close-small" title="Đóng">✕</button>
          </div>
          <p id="wish-modal-hint" class="beads-hint">Gửi lời cầu chúc bình an, sức khỏe, hiếu đạo lên cành Cây Bồ Đề ngoài sân chùa</p>

          <div class="custom-chant-row" style="margin-bottom: 10px;">
            <input
              id="wish-input"
              class="text-input"
              type="text"
              maxlength="140"
              placeholder="Viết lời ước nguyện / cầu an..."
            />
            <button id="btn-submit-wish" class="btn-primary" style="white-space: nowrap;">🏮 Treo Thẻ</button>
          </div>

          <div id="wish-list-label" class="field-label">🏮 Các Thẻ Ước Nguyện đang treo trên Cây Bồ Đề:</div>
          <div id="wishes-list-box" class="wishes-list-box"></div>
        </div>
      </div>

      <!-- Giao diện Đua Top Cấp Độ & Bảng Mở Khóa Hiệu Ứng Hào Quang -->
      <div id="leaderboard-overlay" class="sutra-overlay hidden">
        <div class="sutra-panel" style="max-width:440px;">
          <div class="beads-header">
            <h4 id="leaderboard-modal-title">🏆 Bảng Đua Top Cấp Độ & Hiệu Ứng Hào Quang</h4>
            <button id="btn-close-leaderboard" class="btn-close-small" title="Đóng">✕</button>
          </div>
          <p class="beads-hint" style="margin-bottom:8px;">
            Thực hiện các nghi thức (Lạy, Dâng nhang/Thắp nến, Tụng/Đọc kinh, Lần hạt, Xin xăm/Lời Chúa, Ước nguyện) để tăng Cấp Độ và mở khóa Hào Quang 3D rực rỡ!
          </p>

          <div class="field-label">🔥 Bảng Xếp Hạng Người Chơi Trong Sảnh:</div>
          <div id="leaderboard-list-box" class="wishes-list-box" style="max-height:145px;margin-bottom:10px;"></div>

          <div class="field-label">✨ 15 Mốc Cấp Độ & 15 Hiệu Ứng Hào Quang 3D Mở Khóa:</div>
          <div id="milestones-list-box" class="wishes-list-box" style="max-height:240px;"></div>
        </div>
      </div>

      <!-- Tooltip hiện tên người dâng & thời gian còn lại khi rê chuột vào nén nhang -->
      <div id="incense-tooltip" class="incense-tooltip hidden"></div>

      <!-- Thông báo nổi (Toast) -->
      <div id="hud-toast" class="hud-toast hidden"></div>

      <!-- Thông báo mất kết nối -->
      <div id="reconnect-banner" class="reconnect-banner hidden">
        🔄 Đang kết nối lại...
      </div>
    `;

    this.roomNameEl = document.getElementById('hud-room-name')!;
    this.roomCodeEl = document.getElementById('hud-room-code')!;
    this.playerCountEl = document.getElementById('hud-player-count')!;
    this.nowPlayingEl = document.getElementById('hud-now-playing')!;

    this.btnPray = document.getElementById('btn-action-pray') as HTMLButtonElement;
    this.btnBow = document.getElementById('btn-action-bow') as HTMLButtonElement;
    this.btnBeads = document.getElementById('btn-action-beads') as HTMLButtonElement;
    this.btnIncense = document.getElementById('btn-action-incense') as HTMLButtonElement;
    this.btnSutra = document.getElementById('btn-action-sutra') as HTMLButtonElement;
    this.btnFortune = document.getElementById('btn-action-fortune') as HTMLButtonElement;
    this.btnWish = document.getElementById('btn-action-wish') as HTMLButtonElement;

    this.beadsOverlayEl = document.getElementById('beads-overlay')!;
    this.beadsCanvas = document.getElementById('beads-canvas') as HTMLCanvasElement;
    this.beadCounterEl = document.getElementById('bead-counter')!;
    this.beadRoundBannerEl = document.getElementById('bead-round-banner')!;
    this.sutraOverlayEl = document.getElementById('sutra-overlay')!;
    this.fortuneOverlayEl = document.getElementById('fortune-overlay')!;
    this.wishOverlayEl = document.getElementById('wish-overlay')!;
    this.leaderboardOverlayEl = document.getElementById('leaderboard-overlay')!;
    this.incenseTooltipEl = document.getElementById('incense-tooltip')!;
    this.toastEl = document.getElementById('hud-toast')!;
    this.reconnectBannerEl = document.getElementById('reconnect-banner')!;
  }

  private bindEvents(): void {
    this.btnPray.addEventListener('click', () => {
      this.closeAllSubModals();
      this.callbacks.onTogglePray();
    });

    this.btnBow.addEventListener('click', () => {
      this.closeAllSubModals();
      this.callbacks.onToggleBow();
    });

    this.btnBeads.addEventListener('click', () => {
      const next = !this.isBeadsOpen;
      this.closeAllSubModals();
      this.isBeadsOpen = next;
      this.beadsOverlayEl.classList.toggle('hidden', !this.isBeadsOpen);
      this.btnBeads.classList.toggle('active', this.isBeadsOpen);
      this.callbacks.onToggleBeadsModal(this.isBeadsOpen);
      if (this.isBeadsOpen) {
        this.drawPrayerBeadsCanvas();
      }
    });

    document.getElementById('btn-close-beads')!.addEventListener('click', () => {
      this.closeBeadsIfOpen();
      this.callbacks.onToggleBeadsModal(false);
    });

    this.btnIncense.addEventListener('click', () => {
      this.closeAllSubModals();
      this.callbacks.onRequestOfferIncense();
    });

    this.btnSutra.addEventListener('click', () => {
      const next = !this.isSutraOpen;
      this.closeAllSubModals();
      this.isSutraOpen = next;
      this.sutraOverlayEl.classList.toggle('hidden', !this.isSutraOpen);
      this.btnSutra.classList.toggle('active', this.isSutraOpen || this.isReadingSutra);
    });

    document.getElementById('btn-close-sutra')!.addEventListener('click', () => {
      this.closeSutraIfOpen();
    });

    // Xin Xăm Đầu Năm / Gieo Quẻ Quan Âm
    this.btnFortune.addEventListener('click', () => {
      this.openFortuneModal();
    });

    document.getElementById('btn-close-fortune')!.addEventListener('click', () => {
      this.closeFortuneIfOpen();
    });

    document.getElementById('btn-shake-fortune')!.addEventListener('click', () => {
      const pool = this.religionMode === 'catholic' ? CATHOLIC_FORTUNE_LOTS : FORTUNE_LOTS;
      const lot = pool[Math.floor(Math.random() * pool.length)];
      this.currentFortune = lot;
      document.getElementById('fortune-number')!.textContent = lot.number;
      document.getElementById('fortune-rank')!.textContent = lot.rank;
      document.getElementById('fortune-title')!.textContent = lot.title;
      document.getElementById('fortune-poem')!.innerHTML = lot.poem.map((l) => `<div>${l}</div>`).join('');
      document.getElementById('fortune-meaning')!.textContent = lot.meaning;
      document.getElementById('fortune-advice')!.textContent = lot.dharmaAdvice;
      document.getElementById('fortune-result-box')!.classList.remove('hidden');
      this.callbacks.onDrawFortuneStick?.(lot);
    });

    document.getElementById('btn-share-fortune')!.addEventListener('click', () => {
      if (!this.currentFortune) return;
      const msg = `🎋 ${this.currentFortune.number} (${this.currentFortune.rank}): ${this.currentFortune.title}`;
      this.callbacks.onChantPhrase(msg);
      this.closeFortuneIfOpen();
    });

    // Cây Bồ Đề Ước Nguyện
    this.btnWish.addEventListener('click', () => {
      this.openWishModal();
    });

    document.getElementById('btn-close-wish')!.addEventListener('click', () => {
      this.closeWishIfOpen();
    });

    const wishInput = document.getElementById('wish-input') as HTMLInputElement;
    wishInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        document.getElementById('btn-submit-wish')?.click();
      }
    });

    document.getElementById('btn-submit-wish')!.addEventListener('click', () => {
      const val = wishInput.value.trim();
      if (!val) return;
      wishInput.value = '';
      this.callbacks.onHangWishOnTree?.(val);
    });

    // Đổi Thời Gian: Ban Ngày / Hoàng Hôn / Đêm Hoa Đăng
    const btnTime = document.getElementById('btn-hud-time')!;
    btnTime.addEventListener('click', () => {
      this.currentTimeIdx = (this.currentTimeIdx + 1) % this.timeModes.length;
      const mode = this.timeModes[this.currentTimeIdx];
      const labels: Record<TimeOfDayMode, string> = {
        morning: '☀️ <span class="hud-btn-text">Ban Ngày</span>',
        sunset: '🌇 <span class="hud-btn-text">Hoàng Hôn</span>',
        night: '🏮 <span class="hud-btn-text">Đêm Hoa Đăng</span>'
      };
      btnTime.innerHTML = labels[mode];
      this.callbacks.onCycleTimeOfDay?.(mode);
    });

    document.getElementById('btn-hud-settings')!.addEventListener('click', () => {
      this.callbacks.onOpenSettings();
    });

    document.getElementById('btn-hud-lobby')!.addEventListener('click', () => {
      this.closeAllSubModals();
      this.callbacks.onOpenLobby();
    });

    document.getElementById('btn-hud-lobby-inline')!.addEventListener('click', () => {
      this.closeAllSubModals();
      this.callbacks.onOpenLobby();
    });

    document.getElementById('btn-hud-switch-religion')!.addEventListener('click', () => {
      this.closeAllSubModals();
      this.callbacks.onToggleReligionMode?.();
    });

    document.getElementById('btn-hud-leaderboard')!.addEventListener('click', () => {
      const next = !this.isLeaderboardOpen;
      this.closeAllSubModals();
      this.isLeaderboardOpen = next;
      this.leaderboardOverlayEl.classList.toggle('hidden', !this.isLeaderboardOpen);
      if (this.isLeaderboardOpen) {
        this.renderLeaderboardAndMilestones();
      }
    });

    document.getElementById('btn-close-leaderboard')!.addEventListener('click', () => {
      this.isLeaderboardOpen = false;
      this.leaderboardOverlayEl.classList.add('hidden');
    });

    document.getElementById('btn-hud-chat')!.addEventListener('click', () => {
      this.callbacks.onToggleChat?.();
    });

    document.getElementById('btn-zoom-in')!.addEventListener('click', () => {
      this.callbacks.onZoomCamera?.(-0.85);
    });

    document.getElementById('btn-zoom-out')!.addEventListener('click', () => {
      this.callbacks.onZoomCamera?.(0.85);
    });

    const chantPresetGrid = document.getElementById('chant-preset-grid')!;
    chantPresetGrid.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.btn-chant-preset') as HTMLElement | null;
      if (!target) return;
      const phrase =
        target.getAttribute('data-chant') ||
        (this.religionMode === 'catholic'
          ? '✝️ Nhân danh Cha và Con và Thánh Thần. Amen.'
          : '🙏 Nam Mô A Di Đà Phật 🙏');
      this.callbacks.onChantPhrase(phrase);
    });

    const customChantInput = document.getElementById('custom-chant-input') as HTMLInputElement;
    const triggerCustomChant = () => {
      const val = customChantInput.value.trim();
      if (!val) return;
      const prefix = this.religionMode === 'catholic' ? '✝️' : '🙏';
      this.callbacks.onChantPhrase(`${prefix} ${val}`);
      customChantInput.value = '';
    };
    document.getElementById('btn-send-custom-chant')!.addEventListener('click', triggerCustomChant);
    customChantInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') triggerCustomChant();
    });

    const sutraSelect = document.getElementById('select-sutra-preset') as HTMLSelectElement;
    const sutraTextarea = document.getElementById('custom-sutra-textarea') as HTMLTextAreaElement;
    const populateSutraText = () => {
      const key = sutraSelect.value;
      if (key === 'custom') {
        sutraTextarea.value = '';
        sutraTextarea.focus();
      } else if (PRESET_SUTRAS[key]) {
        sutraTextarea.value = PRESET_SUTRAS[key].lines.join('\n');
      }
    };
    sutraSelect.addEventListener('change', populateSutraText);
    populateSutraText();

    sutraTextarea.addEventListener('keydown', (e) => e.stopPropagation());

    const btnStartSutra = document.getElementById('btn-start-sutra')!;
    const btnStopSutra = document.getElementById('btn-stop-sutra')!;

    btnStartSutra.addEventListener('click', () => {
      const lines = sutraTextarea.value
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        this.showToast('Vui lòng nhập ít nhất 1 câu kinh để tụng đọc');
        return;
      }
      const key = sutraSelect.value;
      const title = PRESET_SUTRAS[key]?.title || 'Kinh Tuỳ Chọn';
      this.setSutraReadingState(true);
      this.closeSutraIfOpen();
      this.callbacks.onStartSutraReading(lines, title);
    });

    btnStopSutra.addEventListener('click', () => {
      this.setSutraReadingState(false);
      this.callbacks.onStopSutraReading();
    });

    const stepDistancePx = 38;

    this.beadsCanvas.addEventListener('pointerdown', (e: PointerEvent) => {
      this.isDraggingBead = true;
      this.lastDragY = e.clientY;
      this.beadsCanvas.setPointerCapture(e.pointerId);
    });

    this.beadsCanvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isDraggingBead) return;
      const dy = e.clientY - this.lastDragY;
      this.lastDragY = e.clientY;

      if (dy > 0) {
        this.dragOffsetPx += dy;
        while (this.dragOffsetPx >= stepDistancePx) {
          this.dragOffsetPx -= stepDistancePx;
          this.advanceOneBead();
        }
        this.drawPrayerBeadsCanvas();
      }
    });

    const endBeadDrag = () => {
      this.isDraggingBead = false;
    };
    this.beadsCanvas.addEventListener('pointerup', endBeadDrag);
    this.beadsCanvas.addEventListener('pointercancel', endBeadDrag);
  }

  public openFortuneModal(): void {
    const next = !this.isFortuneOpen;
    this.closeAllSubModals();
    this.isFortuneOpen = next;
    this.fortuneOverlayEl.classList.toggle('hidden', !this.isFortuneOpen);
    this.btnFortune.classList.toggle('active', this.isFortuneOpen);
  }

  public closeFortuneIfOpen(): void {
    if (this.isFortuneOpen) {
      this.isFortuneOpen = false;
      this.fortuneOverlayEl.classList.add('hidden');
      this.btnFortune.classList.remove('active');
    }
  }

  public openWishModal(): void {
    const next = !this.isWishOpen;
    this.closeAllSubModals();
    this.isWishOpen = next;
    this.wishOverlayEl.classList.toggle('hidden', !this.isWishOpen);
    this.btnWish.classList.toggle('active', this.isWishOpen);
  }

  public closeWishIfOpen(): void {
    if (this.isWishOpen) {
      this.isWishOpen = false;
      this.wishOverlayEl.classList.add('hidden');
      this.btnWish.classList.remove('active');
    }
  }

  public addWishEntry(author: string, text: string): void {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    this.wishesList.unshift({ author, text, time: `${hh}:${mm}` });
    if (this.wishesList.length > 30) {
      this.wishesList.pop();
    }
    this.renderWishesList();
  }

  private renderWishesList(): void {
    const box = document.getElementById('wishes-list-box');
    if (!box) return;
    box.innerHTML = '';
    for (const w of this.wishesList) {
      const row = document.createElement('div');
      row.className = 'wish-card-item';
      const header = document.createElement('div');
      header.className = 'wish-card-header';
      header.textContent = `🏮 ${w.author} (${w.time})`;
      const body = document.createElement('div');
      body.className = 'wish-card-body';
      body.textContent = w.text;
      row.appendChild(header);
      row.appendChild(body);
      box.appendChild(row);
    }
  }

  public closeAllSubModals(): void {
    this.closeBeadsIfOpen();
    this.closeSutraIfOpen();
    this.closeFortuneIfOpen();
    this.closeWishIfOpen();
    this.isLeaderboardOpen = false;
    this.leaderboardOverlayEl?.classList.add('hidden');
  }

  public setReligionMode(mode: ReligionMode): void {
    this.religionMode = mode;
    const switchBtn = document.getElementById('btn-hud-switch-religion')!;
    const prayIcon = this.btnPray.querySelector('.action-icon')!;
    const prayLabel = this.btnPray.querySelector('.action-label')!;
    const beadsLabel = this.btnBeads.querySelector('.action-label')!;
    const incenseLabel = this.btnIncense.querySelector('.action-label')!;
    const sutraLabel = document.getElementById('label-action-sutra')!;
    const fortuneIcon = this.btnFortune.querySelector('.action-icon')!;
    const fortuneLabel = this.btnFortune.querySelector('.action-label')!;
    const wishIcon = this.btnWish.querySelector('.action-icon')!;
    const wishLabel = this.btnWish.querySelector('.action-label')!;
    const sutraSelect = document.getElementById('select-sutra-preset') as HTMLSelectElement;

    const sutraModalTitle = document.getElementById('sutra-modal-title')!;
    const sutraSec1Label = document.getElementById('sutra-sec1-label')!;
    const chantPresetGrid = document.getElementById('chant-preset-grid')!;
    const customChantInput = document.getElementById('custom-chant-input') as HTMLInputElement;
    const btnSendCustomChant = document.getElementById('btn-send-custom-chant')!;
    const sutraSec2Label = document.getElementById('sutra-sec2-label')!;

    const beadsModalTitle = document.getElementById('beads-modal-title')!;
    const beadsModalHint = document.getElementById('beads-modal-hint')!;
    const fortuneModalTitle = document.getElementById('fortune-modal-title')!;
    const fortuneModalHint = document.getElementById('fortune-modal-hint')!;
    const btnShakeFortune = document.getElementById('btn-shake-fortune')!;
    const fortuneLabelMeaning = document.getElementById('fortune-label-meaning')!;
    const fortuneLabelAdvice = document.getElementById('fortune-label-advice')!;
    const btnShareFortune = document.getElementById('btn-share-fortune')!;

    const wishModalTitle = document.getElementById('wish-modal-title')!;
    const wishModalHint = document.getElementById('wish-modal-hint')!;
    const wishListLabel = document.getElementById('wish-list-label')!;

    if (mode === 'catholic') {
      switchBtn.textContent = '⛩️ Chế Độ Chùa';
      switchBtn.style.background = 'linear-gradient(135deg,#c98c24,#8a5508)';
      switchBtn.style.borderColor = '#ffe599';
      prayIcon.textContent = '✝️';
      prayLabel.textContent = 'Làm dấu';
      beadsLabel.textContent = 'Mân Côi';
      incenseLabel.textContent = 'Thắp nến';
      if (!this.isReadingSutra) sutraLabel.textContent = 'Đọc kinh';
      fortuneIcon.textContent = '📜';
      fortuneLabel.textContent = 'Lời Chúa';
      wishIcon.textContent = '🌿';
      wishLabel.textContent = 'Phước lành';

      sutraModalTitle.textContent = '📖 Đọc Kinh Thánh & Lời Nguyện Cầu Công Giáo';
      sutraSec1Label.textContent = '1. Lời Cầu Nguyện nhanh dâng Chúa, Đức Mẹ & Các Thánh:';
      chantPresetGrid.innerHTML = `
        <button class="btn-chant-preset" data-chant="✝️ Nhân danh Cha và Con và Thánh Thần. Amen.">✝️ Dấu Thánh Giá</button>
        <button class="btn-chant-preset" data-chant="👑 Lạy Chúa Giêsu Kitô Vua, con tín thác vào Chúa!">👑 Chúa Giêsu Kitô Vua</button>
        <button class="btn-chant-preset" data-chant="🌹 Kính mừng Maria đầy ơn phúc, xin cầu cho chúng con!">🌹 Đức Mẹ Maria Ban Ơn</button>
        <button class="btn-chant-preset" data-chant="⚜️ Lạy Thánh Cả Giuse, xin bảo trợ gia đình chúng con!">⚜️ Thánh Cả Giuse</button>
        <button class="btn-chant-preset" data-chant="❤️ Lạy Chúa Giêsu Lòng Thương Xót, xin thương xót chúng con!">❤️ Lòng Chúa Thương Xót</button>
        <button class="btn-chant-preset" data-chant="⚔️ Lạy Thánh Micae Tổng Lãnh Thiên Thần, xin bảo vệ chúng con!">⚔️ Thánh Micae Tổng Lãnh</button>
      `;
      customChantInput.placeholder = 'Nhập lời nguyện cầu dâng Chúa, Đức Mẹ & Các Thánh...';
      btnSendCustomChant.textContent = 'Nguyện cầu';
      sutraSec2Label.textContent = '2. Chọn bài Kinh Công Giáo để nhân vật đọc từng câu:';
      sutraSelect.innerHTML = `
        <option value="kinh_lay_cha">✝️ Kinh Lạy Cha (Pater Noster)</option>
        <option value="kinh_kinh_mung">🌹 Kinh Kính Mừng (Ave Maria)</option>
        <option value="kinh_sang_danh">✨ Kinh Sáng Danh & Kinh Tin Kính</option>
        <option value="kinh_hoa_binh">🕊️ Kinh Hòa Bình (Thánh Phanxicô)</option>
        <option value="kinh_thanh_giuse">⚜️ Kinh Cầu Cùng Thánh Cả Giuse</option>
        <option value="kinh_long_thuong_xot">❤️ Kinh Lòng Chúa Thương Xót</option>
        <option value="custom">✍️ Tự nhập lời Kinh / Cầu nguyện tuỳ chọn...</option>
      `;

      beadsModalTitle.textContent = '📿 Lần Chuỗi Mân Côi (Kính Đức Mẹ Maria)';
      beadsModalHint.textContent = 'Dùng chuột hoặc ngón tay kéo chuỗi hạt Mân Côi xuống để lần từng hạt cầu nguyện';
      fortuneModalTitle.textContent = '📜 Rút Lộc Thánh — Lời Chúa Dẫn Đường';
      fortuneModalHint.textContent = 'Chắp tay cầu nguyện trước Cung Thánh rồi bấm nút Rút Lộc Thánh để đón nhận Lời Chúa soi sáng';
      btnShakeFortune.textContent = '📜 Rút Lộc Thánh & Đón Nhận Lời Chúa';
      fortuneLabelMeaning.textContent = '📖 Ý Nghĩa Lời Chúa:';
      fortuneLabelAdvice.textContent = '✝️ Sứ Điệp Sống Đạo:';
      btnShareFortune.textContent = '✝️ Chia sẻ Lộc Thánh & Đọc to Lời Chúa';

      wishModalTitle.textContent = '🌿 Cây Phước Lành — Gửi Tâm Nguyện Bình An';
      wishModalHint.textContent = 'Gửi tâm nguyện cầu bình an, gia đạo hạnh phúc lên Cây Phước Lành bên Đài Đức Mẹ La Vang';
      wishListLabel.textContent = '🌿 Các Tâm Nguyện đang treo trên Cây Phước Lành:';
    } else {
      switchBtn.textContent = '⛪ Chế Độ Nhà Thờ';
      switchBtn.style.background = 'linear-gradient(135deg,#2b5ca8,#193768)';
      switchBtn.style.borderColor = '#7fb3ff';
      prayIcon.textContent = '🙏';
      prayLabel.textContent = 'Chắp tay';
      beadsLabel.textContent = 'Tràng hạt';
      incenseLabel.textContent = 'Dâng nhang';
      if (!this.isReadingSutra) sutraLabel.textContent = 'Tụng kinh';
      fortuneIcon.textContent = '🎋';
      fortuneLabel.textContent = 'Xin xăm';
      wishIcon.textContent = '🌳';
      wishLabel.textContent = 'Cầu nguyện';

      sutraModalTitle.textContent = '📖 Niệm Phật & Đọc Kinh Tuỳ Chọn';
      sutraSec1Label.textContent = '1. Niệm Phật nhanh (nhảy chữ & phát giọng đọc):';
      chantPresetGrid.innerHTML = `
        <button class="btn-chant-preset" data-chant="🪷 Nam Mô Bổn Sư Thích Ca Mâu Ni Phật 🙏">🪷 Đức Phật Thích Ca</button>
        <button class="btn-chant-preset" data-chant="🙏 Nam Mô A Di Đà Phật 🙏">🙏 Đức Phật A Di Đà</button>
        <button class="btn-chant-preset" data-chant="🌿 Nam Mô Đại Bi Quán Thế Âm Bồ Tát 🙏">🌿 Quan Thế Âm Bồ Tát</button>
        <button class="btn-chant-preset" data-chant="🔱 Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát 🙏">🔱 Địa Tạng Vương Bồ Tát</button>
        <button class="btn-chant-preset" data-chant="😊 Nam Mô Đương Lai Hạ Sinh Di Lặc Tôn Phật 🙏">😊 Phật Di Lặc Hoan Hỷ</button>
        <button class="btn-chant-preset" data-chant="🛡️ Nam Mô Hộ Pháp Vi Đà Tôn Thiên Bồ Tát 🙏">🛡️ Hộ Pháp Vi Đà</button>
      `;
      customChantInput.placeholder = 'Nhập câu niệm Phật / lời cầu nguyện tuỳ chọn...';
      btnSendCustomChant.textContent = 'Niệm';
      sutraSec2Label.textContent = '2. Chọn bài Kinh Phật để nhân vật tụng đọc từng câu:';
      sutraSelect.innerHTML = `
        <option value="bat_nha">Bát Nhã Tâm Kinh</option>
        <option value="tu_bi">Kinh Từ Bi (Metta Sutta)</option>
        <option value="tan_phat">Kệ Tán Phật & Hồi Hướng Công Đức</option>
        <option value="cau_an">Sám Nguyện Cầu An Gia Đạo</option>
        <option value="custom">✍️ Tự nhập bài Kinh / Lời nguyện tuỳ chọn...</option>
      `;

      beadsModalTitle.textContent = '📿 Lần Tràng Hạt Tịnh Tâm (108 Hạt)';
      beadsModalHint.textContent = 'Dùng chuột hoặc ngón tay kéo chuỗi hạt xuống qua vạch vàng để lần từng hạt';
      fortuneModalTitle.textContent = '🎋 Xin Xăm Linh Ứng — Gieo Quẻ Quan Âm';
      fortuneModalHint.textContent = 'Chắp tay thành tâm trước Phật đài rồi bấm nút Lắc Ống Xăm để nhận lời khuyên thiện lành';
      btnShakeFortune.textContent = '🎋 Lắc Ống Xăm & Rút Quẻ Lành';
      fortuneLabelMeaning.textContent = '📜 Lời Giải:';
      fortuneLabelAdvice.textContent = '🪷 Lời Phật Dạy:';
      btnShareFortune.textContent = '🙏 Chia sẻ Quẻ lành & Đọc to lời chúc';

      wishModalTitle.textContent = '🌳 Cây Bồ Đề Ước Nguyện — Treo Thẻ Cầu An';
      wishModalHint.textContent = 'Gửi lời cầu chúc bình an, sức khỏe, hiếu đạo lên cành Cây Bồ Đề ngoài sân chùa';
      wishListLabel.textContent = '🏮 Các Thẻ Ước Nguyện đang treo trên Cây Bồ Đề:';
    }
    sutraSelect.dispatchEvent(new Event('change'));
    this.updateLevelProgress(this.currentLevel, this.currentExp);
    this.renderLeaderboardAndMilestones();
  }

  public updateLevelProgress(
    level: number,
    exp: number,
    gainedAmount?: number,
    reason?: string
  ): void {
    this.currentLevel = Math.max(1, level);
    this.currentExp = Math.max(0, exp);
    const milestone = getMilestoneInfo(this.currentLevel);
    const curMin = getCurrentLevelMinExp(this.currentLevel);
    const nextMin = getNextLevelMinExp(this.currentLevel);
    const span = Math.max(1, nextMin - curMin);
    const pct = Math.max(0, Math.min(100, Math.round(((this.currentExp - curMin) / span) * 100)));

    const titleEl = document.getElementById('hud-level-title');
    const fillEl = document.getElementById('hud-exp-fill');
    const textEl = document.getElementById('hud-exp-text');
    const popupEl = document.getElementById('hud-exp-gain-popup');

    const titleStr =
      this.religionMode === 'catholic' ? milestone.catholicTitle : milestone.buddhistTitle;
    const expUnit = this.religionMode === 'catholic' ? 'Ân Sủng' : 'Công Đức';

    if (titleEl) {
      titleEl.textContent = `${milestone.badgeIcon} Lv.${this.currentLevel} • ${titleStr}`;
      titleEl.style.color = milestone.color;
    }
    if (fillEl) {
      fillEl.style.width = `${pct}%`;
    }
    if (textEl) {
      textEl.textContent = `${this.currentExp} / ${nextMin} ${expUnit}`;
    }
    if (popupEl && gainedAmount && gainedAmount > 0) {
      popupEl.textContent = `+${gainedAmount} (${reason || expUnit})`;
      window.setTimeout(() => {
        if (popupEl.textContent?.includes(`+${gainedAmount}`)) {
          popupEl.textContent = '';
        }
      }, 2500);
    }
    if (this.isLeaderboardOpen) {
      this.renderLeaderboardAndMilestones();
    }
  }

  public updateLeaderboard(entries: LeaderboardEntry[]): void {
    this.leaderboardEntries = [...entries].sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.exp - a.exp;
    });
    if (this.isLeaderboardOpen) {
      this.renderLeaderboardAndMilestones();
    }
  }

  private renderLeaderboardAndMilestones(): void {
    const lbBox = document.getElementById('leaderboard-list-box');
    const msBox = document.getElementById('milestones-list-box');
    const catholic = this.religionMode === 'catholic';
    const expUnit = catholic ? 'Ân Sủng' : 'Công Đức';

    if (lbBox) {
      lbBox.innerHTML = '';
      if (this.leaderboardEntries.length === 0) {
        lbBox.innerHTML = '<div style="font-size:0.82rem;color:#c9b49b;">Đang tải bảng xếp hạng...</div>';
      } else {
        this.leaderboardEntries.forEach((entry, idx) => {
          const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
          const ms = getMilestoneInfo(entry.level);
          const roleTitle = catholic ? ms.catholicTitle : ms.buddhistTitle;
          const row = document.createElement('div');
          row.className = 'wish-card-item';
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.alignItems = 'center';
          if (entry.isMe) {
            row.style.border = '1px solid #ffd700';
            row.style.background = 'rgba(255,215,0,0.12)';
          }
          const left = document.createElement('div');
          left.style.fontWeight = '700';
          left.style.color = ms.color;
          left.textContent = `${rankIcon} ${entry.name} ${entry.isMe ? '(Bạn)' : ''}`;

          const right = document.createElement('div');
          right.style.fontSize = '0.8rem';
          right.style.color = '#ffe599';
          right.textContent = `${ms.badgeIcon} Lv.${entry.level} (${roleTitle}) • ${entry.exp} ${expUnit}`;

          row.appendChild(left);
          row.appendChild(right);
          lbBox.appendChild(row);
        });
      }
    }

    if (msBox) {
      msBox.innerHTML = '';
      for (const m of LEVEL_MILESTONES) {
        const unlocked = this.currentLevel >= m.level;
        const row = document.createElement('div');
        row.className = 'wish-card-item';
        row.style.opacity = unlocked ? '1' : '0.68';
        if (unlocked) {
          row.style.borderLeft = `3px solid ${m.color}`;
        }
        const h = document.createElement('div');
        h.className = 'wish-card-header';
        h.style.color = m.color;
        const title = catholic ? m.catholicTitle : m.buddhistTitle;
        h.textContent = `${m.badgeIcon} Cấp ${m.level} (${m.minExp} ${expUnit}) — ${title} ${unlocked ? '✅ Đã mở khóa' : '🔒'}`;

        const b = document.createElement('div');
        b.className = 'wish-card-body';
        b.textContent = `Hiệu ứng 3D: ${catholic ? m.catholicEffect : m.buddhistEffect}`;
        row.appendChild(h);
        row.appendChild(b);
        msBox.appendChild(row);
      }
    }
  }

  public setSutraReadingState(reading: boolean): void {
    this.isReadingSutra = reading;
    const btnStart = document.getElementById('btn-start-sutra')!;
    const btnStop = document.getElementById('btn-stop-sutra')!;
    const labelSutra = document.getElementById('label-action-sutra')!;
    btnStart.classList.toggle('hidden', reading);
    btnStop.classList.toggle('hidden', !reading);
    labelSutra.textContent = reading
      ? 'Đang đọc...'
      : this.religionMode === 'catholic'
        ? 'Đọc kinh'
        : 'Tụng kinh';
    this.btnSutra.classList.toggle('active', reading || this.isSutraOpen);
  }

  public closeSutraIfOpen(): void {
    if (this.isSutraOpen) {
      this.isSutraOpen = false;
      this.sutraOverlayEl.classList.add('hidden');
      this.btnSutra.classList.toggle('active', this.isReadingSutra);
    }
  }

  private advanceOneBead(): void {
    this.beadCount += 1;
    if (this.beadCount >= BEADS_PER_ROUND) {
      this.beadCount = 0;
      this.completedRounds += 1;
      this.beadRoundBannerEl.textContent = `✨ Đã lần xong ${this.completedRounds} vòng (${BEADS_PER_ROUND} hạt)! ✨`;
      this.beadRoundBannerEl.classList.remove('hidden');
      this.showToast('Đã lần xong 1 vòng');
    } else {
      this.beadRoundBannerEl.classList.add('hidden');
    }

    this.beadCounterEl.innerHTML = `Hạt: <strong>${this.beadCount} / ${BEADS_PER_ROUND}</strong> &nbsp;|&nbsp; Số vòng: <strong>${this.completedRounds}</strong>`;
    this.callbacks.onBeadPulled(this.beadCount, this.completedRounds);
  }

  private drawPrayerBeadsCanvas(): void {
    const ctx = this.beadsCanvas.getContext('2d');
    if (!ctx) return;

    const w = this.beadsCanvas.width;
    const h = this.beadsCanvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#c99b49';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 86, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffd966';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(w / 2 + 52, h / 2);
    ctx.lineTo(w / 2 + 114, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const visibleBeads = 18;
    const angleOffset = (this.dragOffsetPx / 38) * ((Math.PI * 2) / visibleBeads);

    for (let i = 0; i < visibleBeads; i++) {
      const angle = (i / visibleBeads) * Math.PI * 2 + angleOffset;
      const bx = w / 2 + Math.cos(angle) * 86;
      const by = h / 2 + Math.sin(angle) * 86;

      const beadNumber = (this.beadCount - i + BEADS_PER_ROUND * 10) % BEADS_PER_ROUND;
      const isGuruBead = beadNumber === 0;
      const radius = isGuruBead ? 16 : 12.5;

      const grad = ctx.createRadialGradient(bx - 4, by - 4, 2, bx, by, radius);
      if (isGuruBead) {
        grad.addColorStop(0, '#ffe599');
        grad.addColorStop(0.5, '#d49b27');
        grad.addColorStop(1, '#7a4b08');
      } else {
        grad.addColorStop(0, '#b87346');
        grad.addColorStop(0.6, '#753c1b');
        grad.addColorStop(1, '#3d1c08');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#291205';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = '#ffe599';
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.beadCount}/${BEADS_PER_ROUND}`, w / 2, h / 2 - 8);
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#d6c5b3';
    ctx.fillText('Kéo xuống để lần hạt', w / 2, h / 2 + 20);
  }

  public closeBeadsIfOpen(): void {
    if (this.isBeadsOpen) {
      this.isBeadsOpen = false;
      this.beadsOverlayEl.classList.add('hidden');
      this.btnBeads.classList.remove('active');
    }
  }

  public updateActionButtonsState(action: PlayerAction): void {
    this.btnPray.classList.toggle('active', action === 'pray');
    this.btnBow.classList.toggle('active', action === 'bow');
    this.btnBeads.classList.toggle('active', action === 'beads');

    const bowLabel = document.getElementById('label-action-bow')!;
    bowLabel.textContent = action === 'bow' ? 'Dừng' : 'Lạy';
  }

  public updateRoomHeader(params: {
    roomName?: string;
    roomCode?: string;
    playerCount?: number;
    maxCapacity?: number;
    nowPlayingTitle?: string;
  }): void {
    if (params.roomName !== undefined) {
      this.roomNameEl.textContent = params.roomName;
    }
    if (params.roomCode !== undefined) {
      if (params.roomCode) {
        this.roomCodeEl.textContent = `Mã phòng: ${params.roomCode}`;
        this.roomCodeEl.classList.remove('hidden');
      } else {
        this.roomCodeEl.classList.add('hidden');
      }
    }
    if (params.playerCount !== undefined && params.maxCapacity !== undefined) {
      this.playerCountEl.textContent = `👥 ${params.playerCount}/${params.maxCapacity} người`;
    }
    if (params.nowPlayingTitle !== undefined) {
      this.nowPlayingEl.textContent = `🎵 Đang phát: ${params.nowPlayingTitle}`;
    }
  }

  public showIncenseTooltip(
    stick: SyncedIncenseData | null,
    screenX = 0,
    screenY = 0
  ): void {
    if (!stick) {
      this.incenseTooltipEl.classList.add('hidden');
      return;
    }

    const remainingMs = Math.max(0, stick.expiresAt - Date.now());
    const totalSec = Math.ceil(remainingMs / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');

    this.incenseTooltipEl.innerHTML = '';
    const line1 = document.createElement('div');
    line1.innerHTML = `🕯️ Người dâng: <strong></strong>`;
    line1.querySelector('strong')!.textContent = stick.ownerName;

    const line2 = document.createElement('div');
    line2.textContent = `⏳ Thời gian còn lại: ${mm}:${ss}`;

    this.incenseTooltipEl.appendChild(line1);
    this.incenseTooltipEl.appendChild(line2);

    this.incenseTooltipEl.style.left = `${Math.min(window.innerWidth - 220, screenX + 14)}px`;
    this.incenseTooltipEl.style.top = `${Math.max(12, screenY - 48)}px`;
    this.incenseTooltipEl.classList.remove('hidden');
  }

  public showToast(message: string, durationMs = 3400): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, durationMs);
  }

  public setReconnectingBanner(visible: boolean, text = 'Đang kết nối lại...'): void {
    this.reconnectBannerEl.textContent = `🔄 ${text}`;
    this.reconnectBannerEl.classList.toggle('hidden', !visible);
  }

  public show(): void {
    this.rootEl.classList.remove('hidden');
  }

  public hide(): void {
    this.rootEl.classList.add('hidden');
    this.closeAllSubModals();
    this.showIncenseTooltip(null);
  }
}
