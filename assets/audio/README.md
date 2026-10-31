# Thư mục Âm thanh (`assets/audio/`)

## Trạng thái hiện tại & Bản quyền
Toàn bộ các file âm thanh `.wav` trong thư mục này được tạo tự động bằng thuật toán tổng hợp sóng âm (Procedural Audio Synthesis - giấy phép **CC0 Public Domain**, 100% không bản quyền). Các file có giai điệu chuông thiền, âm trầm tụng niệm và tiếng chuông/mõ thật để bạn có thể kiểm tra ngay lập tức tính năng **Radio đồng bộ theo phòng (độ lệch < 1 giây)** và **Hiệu ứng âm thanh (SFX)**.

## Danh sách các file âm thanh và vị trí thay file thật
Nếu bạn muốn thay thế bằng các bản thu âm MP3/WAV thực tế (đảm bảo có giấy phép hợp lệ như CC0 / CC-BY hoặc tự thu âm), chỉ cần ghi đè đúng tên file vào thư mục `assets/audio/` hoặc cập nhật đường dẫn/thời lượng trong `server/src/audioPlaylist.ts`:

### 1. Kênh Radio theo chủ đề phòng (`server/src/audioPlaylist.ts`)
- **Chủ đề "Tụng kinh sáng"**:
  - `assets/audio/chant_morning_1.wav` — *"Kinh Khởi Đầu Ngày Mới (Bản mẫu CC0)"* (Thời lượng mặc định: 24 giây)
  - `assets/audio/chant_morning_2.wav` — *"Tiếng Chuông Chánh Niệm Buổi Sáng (Bản mẫu CC0)"* (Thời lượng mặc định: 20 giây)
- **Chủ đề "Thiền"**:
  - `assets/audio/zen_music_1.wav` — *"Nhạc Thiền Tĩnh Tâm Dưới Bóng Bồ Đề (Bản mẫu CC0)"* (Thời lượng mặc định: 24 giây)
  - `assets/audio/zen_music_2.wav` — *"Hơi Thở An Lạc - Chuông Xoay Thiền Định (Bản mẫu CC0)"* (Thời lượng mặc định: 20 giây)
- **Chủ đề "Chung"** (Phát luân phiên nhạc nền Việt ngũ cung và bài kinh):
  - `assets/audio/vn_ambient_1.wav` — *"Nhạc Nền Ngũ Cung Chùa Việt Thanh Tịnh (Bản mẫu CC0)"* (Thời lượng mặc định: 24 giây)
  - Kết hợp luân phiên với `chant_morning_1.wav` và `zen_music_1.wav`.

> **Lưu ý khi thay file nhạc dài hơn (ví dụ 5 - 15 phút):**
> Mở file `server/src/audioPlaylist.ts` và cập nhật thuộc tính `durationSeconds` khớp với độ dài thực (tính bằng giây) của file âm thanh mới để bộ đếm thời gian đồng bộ Radio của Server chuyển bài và tính vị trí phát chính xác dưới 1 giây.

### 2. Kênh Hiệu ứng âm thanh - SFX (`client/src/audio/sfx.ts`)
- `assets/audio/sfx_bell.wav` — Tiếng Đại Hồng Chung (chuông chùa trầm ấm).
- `assets/audio/sfx_mo.wav` — Tiếng mõ gỗ tụng kinh khi nhân vật thực hiện động tác Lạy.
- `assets/audio/sfx_bead.wav` — Tiếng hạt gỗ va nhẹ mỗi khi người chơi kéo qua 1 hạt trên Tràng hạt.
