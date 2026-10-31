export const SERVER_PORT = 2567;

// 3. Kích thước không gian 3D Chánh điện (Phong cách chùa Việt)
export const HALL_LENGTH = 30; // Trục Z: từ -15m đến +15m
export const HALL_WIDTH = 18;  // Trục X: từ -9m đến +9m
export const WALL_HEIGHT = 6;  // Tường cao 6m
export const HALL_MIN_X = -HALL_WIDTH / 2; // -9
export const HALL_MAX_X = HALL_WIDTH / 2;  // +9
export const HALL_MIN_Z = -HALL_LENGTH / 2; // -15
export const HALL_MAX_Z = HALL_LENGTH / 2;  // +15

// Sân chùa phía trước (Cổng tam quan, cây bồ đề, chuông chùa)
export const COURTYARD_MAX_Z = 27.5;
export const COURTYARD_MIN_X = -11.5;
export const COURTYARD_MAX_X = 11.5;
export const DOORWAY_HALF_WIDTH = 4.2; // Lối cửa chính vào chánh điện ở Z = +15

// 4. Thông số Nhân vật & Di chuyển
export const PLAYER_HEIGHT = 1.7;        // Cao khoảng 1,7m
export const PLAYER_RADIUS = 0.42;       // Bán kính va chạm nhân vật
export const PLAYER_SPEED = 3.5;         // Tốc độ đi bộ: 3,5 m/giây
export const NET_SEND_INTERVAL_MS = 100; // Gửi vị trí tối đa 10 lần/giây (100ms)
export const NAME_TAG_MAX_DISTANCE = 15; // Đọc rõ tên ở khoảng cách 15m

// 5. Tương tác cơ bản
export const BEADS_PER_ROUND = 108;      // Đủ 108 hạt tính 1 vòng

// 6. Đốt nhang
export const INCENSE_PRAY_DURATION_MS = 2000;        // Chắp tay 2 giây trước khi cắm nhang
export const INCENSE_BURN_DURATION_MS = 30 * 60 * 1000; // Cháy trong 30 phút (1.800.000 ms)
export const MAX_INCENSE_PER_PLAYER = 3;             // Mỗi người tối đa 3 nén cùng lúc
export const MAX_INCENSE_IN_BURNER = 50;             // Lư hương tối đa 50 nén
export const MAX_SMOKE_PARTICLES = 200;              // Tối đa 200 hạt khói cho cả lư

// 7. Chat trong phòng
export const CHAT_MAX_MESSAGES = 50;     // Hiện 50 tin gần nhất
export const CHAT_MAX_LENGTH = 200;      // Tin nhắn tối đa 200 ký tự
export const CHAT_COOLDOWN_MS = 2000;    // Giới hạn 1 tin / 2 giây

// 10 & 11. Phòng, Sảnh & Mất kết nối
export const ALLOWED_ROOM_CAPACITIES = [10, 30, 50] as const;
export const EMPTY_ROOM_CLOSE_MS = 30 * 60 * 1000; // Phòng không còn ai trong 30 phút tự đóng
export const RECONNECT_TIMEOUT_SEC = 30;           // Thử nối lại trong 30 giây
export const DISCONNECT_FADE_MS = 10 * 1000;       // Nhân vật mất kết nối mờ dần và biến mất sau 10 giây

export type ReligionMode = 'buddhist' | 'catholic';

export type RoomTheme =
  | 'Tụng kinh sáng'
  | 'Thiền'
  | 'Chung'
  | 'Nhà Thờ Công Giáo'
  | 'Thánh Ca & Cầu Nguyện'
  | 'Chầu Thánh Thể & Tĩnh Tâm';

export const BUDDHIST_ROOM_THEMES: RoomTheme[] = ['Tụng kinh sáng', 'Thiền', 'Chung'];
export const CATHOLIC_ROOM_THEMES: RoomTheme[] = [
  'Nhà Thờ Công Giáo',
  'Thánh Ca & Cầu Nguyện',
  'Chầu Thánh Thể & Tĩnh Tâm'
];
export const ROOM_THEMES: RoomTheme[] = [...BUDDHIST_ROOM_THEMES, ...CATHOLIC_ROOM_THEMES];

export function isCatholicRoom(
  theme?: string,
  roomName?: string,
  religionMode?: string
): boolean {
  if (religionMode === 'catholic') return true;
  if (religionMode === 'buddhist' && theme && BUDDHIST_ROOM_THEMES.includes(theme as RoomTheme)) {
    const nCheck = (roomName || '').toLowerCase();
    if (
      !nCheck.includes('nhà thờ') &&
      !nCheck.includes('thánh đường') &&
      !nCheck.includes('công giáo') &&
      !nCheck.includes('thiên chúa')
    ) {
      return false;
    }
  }
  if (
    theme === 'Nhà Thờ Công Giáo' ||
    theme === 'Thánh Ca & Cầu Nguyện' ||
    theme === 'Chầu Thánh Thể & Tĩnh Tâm'
  ) {
    return true;
  }
  const n = (roomName || '').toLowerCase();
  return (
    n.includes('nhà thờ') ||
    n.includes('thánh đường') ||
    n.includes('nhà nguyện') ||
    n.includes('công giáo') ||
    n.includes('thiên chúa') ||
    n.includes('giáo xứ') ||
    n.includes('mân côi') ||
    n.includes('chúa')
  );
}

// Hệ thống 15 Cấp Độ Tu Tập / Ân Sủng & 15 Tầng Hiệu Ứng Hào Quang 3D (Đua Top Cùng Bạn Bè)
export interface LevelMilestone {
  level: number;
  minExp: number;
  buddhistTitle: string;
  catholicTitle: string;
  color: string;
  buddhistEffect: string;
  catholicEffect: string;
  badgeIcon: string;
}

export const LEVEL_MILESTONES: LevelMilestone[] = [
  {
    level: 1,
    minExp: 0,
    buddhistTitle: 'Tân Phật Tử',
    catholicTitle: 'Tân Tín Hữu',
    color: '#ffffff',
    buddhistEffect: 'Tâm Sơ Khởi (Trang phục truyền thống)',
    catholicEffect: 'Tâm Sơ Khởi (Lễ phục truyền thống)',
    badgeIcon: '🌱'
  },
  {
    level: 2,
    minExp: 40,
    buddhistTitle: 'Tâm Thành Kính',
    catholicTitle: 'Tâm Hòa Bình',
    color: '#4ef5a5',
    buddhistEffect: '🌟 Vòng Pháp Trận Liên Hoa Lục Bảo Dưới Chân',
    catholicEffect: '🌟 Vòng Sáng Ân Sủng Lục Bảo Dưới Chân',
    badgeIcon: '🌟'
  },
  {
    level: 3,
    minExp: 100,
    buddhistTitle: 'Hiền Nhân Tinh Tấn',
    catholicTitle: 'Sứ Giả Ánh Sáng',
    color: '#5ec8ff',
    buddhistEffect: '😇 Hào Quang Phật Pháp Vàng Kim Sau Đầu',
    catholicEffect: '😇 Vòng Hào Quang Thánh Ân Vàng Kim Sau Đầu',
    badgeIcon: '😇'
  },
  {
    level: 4,
    minExp: 180,
    buddhistTitle: 'Liên Hoa Hành Giả',
    catholicTitle: 'Tâm Hồn Thánh Khiết',
    color: '#ff94e8',
    buddhistEffect: '🪷 Đài Sen Vàng 12 Cánh Nổi Đỡ Dưới Chân',
    catholicEffect: '⭐ Ngôi Sao Bethlehem 8 Cánh Phát Sáng Dưới Chân',
    badgeIcon: '🪷'
  },
  {
    level: 5,
    minExp: 280,
    buddhistTitle: 'Đạo Tâm Kiên Cố',
    catholicTitle: 'Chiến Binh Cầu Nguyện',
    color: '#d98aff',
    buddhistEffect: '✨ Tứ Linh Châu Bay Quanh Thân & Tên Vàng Kim',
    catholicEffect: '✨ Tứ Ngọc Thiên Thần Bay Quanh Thân & Tên Vàng Kim',
    badgeIcon: '✨'
  },
  {
    level: 6,
    minExp: 400,
    buddhistTitle: 'Bậc Chân Tu',
    catholicTitle: 'Hiền Nhân Thánh Đức',
    color: '#ffd700',
    buddhistEffect: '👑 Pháp Luân Kim Quang 8 Nan Xoay Sau Lưng',
    catholicEffect: '👑 Đôi Cánh Ánh Sáng Thiên Thần Trắng Vàng Sau Lưng',
    badgeIcon: '👑'
  },
  {
    level: 7,
    minExp: 540,
    buddhistTitle: 'Kim Cương Hộ Pháp',
    catholicTitle: 'Sứ Thần Hòa Bình',
    color: '#52ffe8',
    buddhistEffect: '🧣 Dải Lụa Tiên Phi Thiên & Vương Miện Thất Tinh Trên Đầu',
    catholicEffect: '💫 Triều Thiên 7 Ngôi Sao Vàng Lơ Lửng Trên Đỉnh Đầu',
    badgeIcon: '💫'
  },
  {
    level: 8,
    minExp: 700,
    buddhistTitle: 'Đại Sư Giác Ngộ',
    catholicTitle: 'Thánh Ân Rực Rỡ',
    color: '#ff9d3b',
    buddhistEffect: '🔥 Đại Pháp Trận Lưỡng Nghi Kép & 6 Tinh Thể Kim Cương',
    catholicEffect: '🔥 Đại Vòng Thánh Giá Kép & 6 Tinh Thể Pha Lê Vàng',
    badgeIcon: '🔥'
  },
  {
    level: 9,
    minExp: 880,
    buddhistTitle: 'La Hán Tịnh Tâm',
    catholicTitle: 'Tổng Lãnh Thiên Thần',
    color: '#80ff72',
    buddhistEffect: '🕊️ Đôi Hạc Tiên Linh Quang Vỗ Cánh Bay Quanh Đầu',
    catholicEffect: '🕊️ Đôi Chim Bồ Câu Hòa Bình Trắng Phát Sáng Bay Lượn',
    badgeIcon: '🕊️'
  },
  {
    level: 10,
    minExp: 1080,
    buddhistTitle: 'Bồ Tát Hóa Thân',
    catholicTitle: 'Thiên Thần Cherubim',
    color: '#ff66c4',
    buddhistEffect: '🌈 Bát Bảo Minh Châu (8 Ngọc Ngũ Sắc Xoay Kép 2 Tầng)',
    catholicEffect: '🌈 Bát Tinh Cầu Vồng (8 Quả Cầu Thánh Quang Xoay Kép)',
    badgeIcon: '🌈'
  },
  {
    level: 11,
    minExp: 1320,
    buddhistTitle: 'Pháp Vương Trí Tuệ',
    catholicTitle: 'Thiên Thần Seraphim 6 Cánh',
    color: '#ffbf00',
    buddhistEffect: '⚡ Tam Trọng Đại Pháp Luân Hoàng Kim Xoay Ngược Chiều',
    catholicEffect: '⚡ Đôi Cánh Đại Thiên Thần Seraphim 6 Cánh Hoàng Kim',
    badgeIcon: '⚡'
  },
  {
    level: 12,
    minExp: 1600,
    buddhistTitle: 'Chuyển Luân Thánh Vương',
    catholicTitle: 'Sứ Giả Thiên Đàng',
    color: '#00f5d4',
    buddhistEffect: '🌌 Cột Sáng Thông Thiên Chiếu Thẳng Từ Trời Xuống',
    catholicEffect: '🌌 Cột Sáng Thiên Đàng Chiếu Rọi Toàn Thân',
    badgeIcon: '🌌'
  },
  {
    level: 13,
    minExp: 1920,
    buddhistTitle: 'Vô Thượng Chân Nhân',
    catholicTitle: 'Ngôi Sao Vĩnh Cửu',
    color: '#ff758f',
    buddhistEffect: '🏮 Mưa Đèn Hoa Đăng & Hoa Sen Vàng Bay Lên Quanh Người',
    catholicEffect: '🌠 Mưa Sao Băng Vàng & Lông Vũ Ánh Sáng Bay Quanh Người',
    badgeIcon: '🏮'
  },
  {
    level: 14,
    minExp: 2300,
    buddhistTitle: 'Cửu Phẩm Liên Hoa Tổ',
    catholicTitle: 'Đấng Hiển Vinh Quang',
    color: '#c77dff',
    buddhistEffect: '🐉 Song Long Kim Quang (2 Luồng Rồng Sáng Xoắn Ốc Quanh Thân)',
    catholicEffect: '🐉 Đôi Dải Ngân Hà Hoàng Kim Xoắn Ốc Quanh Thân',
    badgeIcon: '🐉'
  },
  {
    level: 15,
    minExp: 2750,
    buddhistTitle: 'Đại Bồ Tát Toàn Giác',
    catholicTitle: 'Đại Thánh Ân Tối Thượng',
    color: '#ff4d4d',
    buddhistEffect: '☀️ Thái Dương Phật Quang Cửu Trọng & Toàn Bộ 15 Hào Quang Tối Thượng',
    catholicEffect: '☀️ Mặt Trời Vinh Quang Tối Thượng & Toàn Bộ 15 Thánh Quang Cực Đại',
    badgeIcon: '☀️'
  }
];

export const EXP_REWARDS = {
  PRAY: 12,
  BOW_CYCLE: 18,
  BEAD_CLICK: 10,
  BEAD_ROUND_BONUS: 100,
  CHANT: 28,
  OFFER_INCENSE: 40,
  DRAW_FORTUNE: 25,
  ADD_WISH: 35
} as const;

export function getLevelFromExp(exp: number): number {
  const safeExp = Math.max(0, Math.floor(exp || 0));
  if (safeExp >= 2750) {
    return 15 + Math.floor((safeExp - 2750) / 450);
  }
  for (let i = LEVEL_MILESTONES.length - 1; i >= 0; i--) {
    if (safeExp >= LEVEL_MILESTONES[i].minExp) {
      return LEVEL_MILESTONES[i].level;
    }
  }
  return 1;
}

export function getMilestoneInfo(level: number): LevelMilestone {
  const clampedIdx = Math.min(Math.max(1, level), LEVEL_MILESTONES.length) - 1;
  return LEVEL_MILESTONES[clampedIdx];
}

export function getNextLevelMinExp(level: number): number {
  if (level < 15) {
    const next = LEVEL_MILESTONES.find((m) => m.level === level + 1);
    return next ? next.minExp : 2750;
  }
  return 2750 + (level - 14) * 450;
}

export function getCurrentLevelMinExp(level: number): number {
  if (level <= 1) return 0;
  if (level <= 15) {
    const cur = LEVEL_MILESTONES.find((m) => m.level === level);
    return cur ? cur.minExp : 0;
  }
  return 2750 + (level - 15) * 450;
}

export type PlayerAction = 'idle' | 'walk' | 'pray' | 'bow' | 'beads';
export type RobeColor = 'brown' | 'blue';

// Tọa độ Lư hương đồng lớn đặt giữa điện
export const INCENSE_BURNER_POS = { x: 0, y: 0, z: -3.8, radius: 0.95 };
export const INCENSE_STAND_POS = { x: 0, z: -2.15 };

// Tọa độ 12 Bồ đoàn xếp thành 2 hàng đối diện tượng Phật (nhìn về hướng -Z)
export interface CushionSpot {
  index: number;
  x: number;
  z: number;
}

export const CUSHION_POSITIONS: CushionSpot[] = [
  // Hàng 1 (gần bàn thờ và lư hương hơn, Z = 1.0)
  { index: 0, x: -5.2, z: 1.0 },
  { index: 1, x: -3.2, z: 1.0 },
  { index: 2, x: -1.3, z: 1.0 },
  { index: 3, x: 1.3, z: 1.0 },
  { index: 4, x: 3.2, z: 1.0 },
  { index: 5, x: 5.2, z: 1.0 },
  // Hàng 2 (phía sau hàng 1, Z = 3.6)
  { index: 6, x: -5.2, z: 3.6 },
  { index: 7, x: -3.2, z: 3.6 },
  { index: 8, x: -1.3, z: 3.6 },
  { index: 9, x: 1.3, z: 3.6 },
  { index: 10, x: 3.2, z: 3.6 },
  { index: 11, x: 5.2, z: 3.6 }
];

// Danh sách hộp bao vật cản (AABB) trên mặt phẳng XZ để nhân vật đi vòng qua
export interface AABB2D {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const OBSTACLE_BOXES: AABB2D[] = [
  // Bệ tượng Phật lớn chính giữa phía trước
  { id: 'buddha_pedestal', minX: -3.5, maxX: 3.5, minZ: -14.2, maxZ: -9.0 },
  // Bàn thờ hoa quả và nến
  { id: 'altar_table', minX: -3.0, maxX: 3.0, minZ: -8.4, maxZ: -6.2 },
  // Lư hương đồng lớn giữa điện
  { id: 'incense_burner', minX: -1.05, maxX: 1.05, minZ: -4.85, maxZ: -2.75 },
  // Cột gỗ lớn trong chánh điện (2 hàng cột)
  { id: 'pillar_l1', minX: -6.9, maxX: -6.1, minZ: -10.4, maxZ: -9.6 },
  { id: 'pillar_r1', minX: 6.1, maxX: 6.9, minZ: -10.4, maxZ: -9.6 },
  { id: 'pillar_l2', minX: -6.9, maxX: -6.1, minZ: -3.4, maxZ: -2.6 },
  { id: 'pillar_r2', minX: 6.1, maxX: 6.9, minZ: -3.4, maxZ: -2.6 },
  { id: 'pillar_l3', minX: -6.9, maxX: -6.1, minZ: 4.6, maxZ: 5.4 },
  { id: 'pillar_r3', minX: 6.1, maxX: 6.9, minZ: 4.6, maxZ: 5.4 },
  { id: 'pillar_l4', minX: -6.9, maxX: -6.1, minZ: 11.6, maxZ: 12.4 },
  { id: 'pillar_r4', minX: 6.1, maxX: 6.9, minZ: 11.6, maxZ: 12.4 },
  // Tường mặt tiền chánh điện (trừ cửa chính từ X = -4.2 đến +4.2)
  { id: 'front_wall_left', minX: -9.2, maxX: -4.2, minZ: 14.55, maxZ: 15.45 },
  { id: 'front_wall_right', minX: 4.2, maxX: 9.2, minZ: 14.55, maxZ: 15.45 },
  // Cây bồ đề ở sân ngoài (bên trái)
  { id: 'bodhi_tree', minX: -8.6, maxX: -5.8, minZ: 19.1, maxZ: 21.9 },
  // Gác chuông chùa ở góc sân (bên phải)
  { id: 'bell_pavilion', minX: 5.8, maxX: 8.6, minZ: 19.1, maxZ: 21.9 },
  // Trụ cổng Tam Quan ở lối vào sân chùa (Z = 26.2)
  { id: 'tam_quan_p1', minX: -6.2, maxX: -5.0, minZ: 25.6, maxZ: 26.8 },
  { id: 'tam_quan_p2', minX: -2.4, maxX: -1.4, minZ: 25.6, maxZ: 26.8 },
  { id: 'tam_quan_p3', minX: 1.4, maxX: 2.4, minZ: 25.6, maxZ: 26.8 },
  { id: 'tam_quan_p4', minX: 5.0, maxX: 6.2, minZ: 25.6, maxZ: 26.8 }
];
