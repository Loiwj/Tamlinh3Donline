# ⛩️ Chùa Online — Không Gian Chánh Điện 3D Nhiều Người Chơi

**Chùa Online** là ứng dụng web 3D nhiều người chơi mô phỏng không gian chùa cổ Việt Nam chạy trực tiếp trên trình duyệt Desktop và Mobile (không cần cài đặt ứng dụng). Nhiều người chơi có thể cùng vào một phòng, đi dạo trong chánh điện và sân chùa, chắp tay lễ Phật, quỳ lạy trên 12 bồ đoàn, kéo lần tràng hạt 108 hạt, dâng nhang lên lư đồng (cháy trong 30 phút với khói trầm bay lên), trò chuyện và cùng nghe một kênh âm thanh Radio đồng bộ theo chủ đề phòng.

---

## 1. Nguyên Tắc Bản Quyền & Nguồn Tài Sản (CC0 / Open-Source)

Dự án tuân thủ nghiêm ngặt nguyên tắc bản quyền: **Không sao chép bất kỳ mã nguồn, hình ảnh, mô hình 3D, tên nhân vật hay âm thanh nào từ `sansatemple.com` hoặc bất kỳ trò chơi nào khác.**

1. **Kiến trúc 3D & Nhân vật (`client/src/scene/`, `client/src/player/`)**:
   - Toàn bộ không gian Chánh điện (`30m x 18m x 6m`), mái cong chồng diêm đầu đao, Cổng Tam Quan, Tượng Phật lớn trên đài sen, Bàn thờ ngũ quả & nến, Lư hương đồng, 12 Bồ đoàn, Đèn lồng, Cây Bồ Đề, Gác Chuông chùa và Nhân vật Chú tiểu / Phật tử (`cao 1,7m`, áo nâu hoặc áo lam) đều là **sáng tạo gốc 100%** được dựng bằng hình học Low-Poly (Procedural Geometry) trên Three.js.
   - Tổng số đa giác toàn cảnh chỉ khoảng **~8.500 đa giác** (thấp hơn rất nhiều so với giới hạn 200.000 đa giác), đảm bảo tốc độ 60 FPS trên Desktop và >= 30 FPS trên Mobile ngay cả khi phòng đủ 50 người.
2. **Âm thanh Radio & Hiệu ứng (`assets/audio/`)**:
   - Các file âm thanh `.wav` đi kèm trong `assets/audio/` được tổng hợp trực tiếp bằng thuật toán sóng âm ngũ cung & chuông thiền (**Giấy phép CC0 - Public Domain**), do chính mã nguồn dự án khởi tạo.
3. **Danh sách từ cấm tiếng Việt (`server/src/profanity.ts`)**:
   - Sử dụng từ điển từ ngữ phản cảm tiếng Việt mã nguồn mở từ:
     - [blue-eyes-vn/vietnamese-offensive-words](https://github.com/blue-eyes-vn/vietnamese-offensive-words) (Community Vietnamese Offensive Words Dataset)
     - [Eris-js/vn-badwords](https://github.com/Eris-js/vn-badwords) (MIT License)
   - **Lưu ý về kiểm duyệt nội dung (Mục 8)**: Bộ lọc từ tự động kết hợp chuẩn hóa chuỗi (hạ chữ thường, bỏ dấu tiếng Việt, chuyển số/ký hiệu leetspeak `0->o, 1->i, 3->e, 4->a...`, xóa ký tự đặc biệt và gom khoảng trắng chèn giữa các chữ) nhưng **không một bộ lọc tự động nào có thể chặn được 100% mọi kiểu lách luật ngữ cảnh**. Do đó, nút **⚑ Báo cáo** trên từng dòng tin nhắn ở khung Chat (Mục 7) đóng vai trò là **lớp bảo vệ thứ hai**: khi người chơi bấm Báo cáo, tin nhắn đó lập tức bị ẩn khỏi màn hình người báo cáo và được ghi log chi tiết tại máy chủ (`/api/moderation-logs`) để quản trị viên xử lý.

---

## 2. Cấu Trúc Thư Mục Dự Án

```text
D:\Game\
├── client/
│   ├── index.html
│   └── src/
│       ├── main.ts                  # Khởi tạo ứng dụng, vòng lặp render & điều phối sự kiện
│       ├── scene/
│       │   ├── temple.ts            # Chánh điện 30x18m, tường cao 6m, mái cong chùa Việt, Camera kẹp tường
│       │   ├── lighting.ts          # Ánh sáng vàng ấm từ cửa chính & đèn lồng, bóng đổ nhẹ, sương khói mờ
│       │   └── props.ts             # Tam quan, tượng Phật, bàn thờ, lư hương + 200 hạt khói, 12 bồ đoàn, bồ đề, chuông
│       ├── player/
│       │   ├── character.ts         # Nhân vật cao 1.7m, áo nâu/áo lam, bảng tên chữ trắng viền đen đọc rõ ở 15m
│       │   ├── movement.ts          # Di chuyển 3.5m/s, WASD + Click/Chạm sàn, đi vòng tránh hộp bao AABB, gửi mạng <=10Hz
│       │   └── animations.ts        # 5 animation: Đứng yên thở nhẹ, Đi bộ, Chắp tay, Lạy, Lần hạt
│       ├── ui/
│       │   ├── lobby.ts             # Màn hình đặt biệt danh (lọc từ tục) + Sảnh phòng + Tạo phòng / Mã 6 ký tự
│       │   ├── hud.ts               # Thanh công cụ dưới, thông tin phòng, giao diện kéo Tràng hạt 108 hạt, tooltip nhang
│       │   ├── chat.ts              # Khung chat 50 tin, chống spam 2s, giới hạn 200 ký tự, nút Báo cáo
│       │   └── settings.ts          # Âm lượng nhạc/kinh, âm lượng hiệu ứng, tắt tiếng, ẩn chat, rời phòng
│       ├── audio/
│       │   ├── roomRadio.ts         # Đồng bộ Radio theo (now - startTime) % duration với độ lệch < 1 giây
│       │   └── sfx.ts               # Âm thanh hiệu ứng chuông chùa, tiếng mõ khi lạy, tiếng hạt gỗ
│       └── net/
│           └── client.ts            # Kết nối WebSocket Colyseus, tự động kết nối lại trong 30 giây khi rớt mạng
├── server/
│   └── src/
│       ├── index.ts                 # Khởi chạy Colyseus Server (cổng 2567) & tạo 3 phòng mẫu ban đầu
│       ├── schema.ts                # Định nghĩa Colyseus State Schema
│       ├── profanity.ts             # Chuẩn hóa tiếng Việt & lọc từ tục cho tên người dùng, tên phòng, chat
│       ├── audioPlaylist.ts         # Quản lý playlist theo 3 chủ đề phòng & đồng hồ phát liên tục
│       └── rooms/
│           ├── LobbyRoom.ts         # Quản lý danh sách phòng đang mở, tạo phòng & xác thực mã riêng 6 ký tự
│           └── TempleRoom.ts        # Xử lý phòng chùa, trùng tên (_2), 12 bồ đoàn, đốt nhang 30 phút, chat & report
├── shared/
│   └── constants.ts                 # Hằng số giới hạn, tốc độ 3.5m/s, thời gian 30 phút, tọa độ vật cản & bồ đoàn
└── assets/
    ├── models/                      # Placeholder & README hướng dẫn thay thế model .glb/.gltf thật
    └── audio/                       # Các file âm thanh mẫu .wav (CC0) & README hướng dẫn thay file nhạc/kinh thật
```

---

## 3. Hướng Dẫn Cài Đặt & Chạy Dự Án Từng Bước

### Yêu cầu hệ thống
- **Node.js**: phiên bản `>= 18.x` (khuyến nghị `v20` hoặc `v24`).
- **Trình duyệt**: Chrome, Edge, Firefox hoặc Safari (Desktop & Mobile).

### Bước 1: Cài đặt thư viện
Mở cửa sổ dòng lệnh (Terminal / PowerShell) tại thư mục gốc `D:\Game` và chạy:

```bash
npm run install:all
```
*(Hoặc chạy riêng `cd server && npm install` và `cd client && npm install`).*

### Bước 2: Chạy Server (Colyseus)
Mở Terminal thứ nhất tại `D:\Game` và chạy:

```bash
npm run dev:server
```
Server sẽ khởi động tại địa chỉ `ws://localhost:2567` và khởi tạo sẵn 3 phòng mẫu tương ứng với 3 chủ đề (`Tụng kinh sáng`, `Thiền`, `Chung`).

### Bước 3: Chạy Client (Vite + Three.js)
Mở Terminal thứ hai tại `D:\Game` và chạy:

```bash
npm run dev:client
```
Client sẽ chạy tại địa chỉ: **`http://localhost:5173`**

---

## 4. Hướng Dẫn Mở 2 Tab Trình Duyệt Kiểm Thử 2 Người Chung Phòng

1. Mở trình duyệt ở **Tab 1**, truy cập `http://localhost:5173`:
   - Nhập biệt danh (ví dụ: `Tâm An`), chọn **Áo Nâu**, bấm **Vào Sảnh Chùa**.
   - Tại màn hình Sảnh, bấm nút **Vào** ở phòng *"Chánh Điện Tụng Kinh Sáng"* (hoặc bấm **+ Tạo Phòng Mới**).
2. Mở trình duyệt ở **Tab 2** (hoặc cửa sổ Ẩn danh / thiết bị khác trong mạng LAN), truy cập `http://localhost:5173`:
   - Nhập cùng biệt danh `Tâm An` (để kiểm tra tính năng tự động thêm hậu tố thành `Tâm An_2`), chọn **Áo Lam**, bấm **Vào Sảnh Chùa**.
   - Bấm nút **Vào** cùng phòng *"Chánh Điện Tụng Kinh Sáng"*.
3. **Kiểm tra trực quan 7 tiêu chí nghiệm thu**:
   - **Di chuyển & Hành động**: Dùng phím `WASD` / mũi tên hoặc click chuột xuống sàn gạch ở Tab 1 -> nhân vật ở Tab 2 di chuyển mượt mà và tự đi vòng qua lư hương/bàn thờ. Bấm **Chắp tay**, **Lạy**, **Tràng hạt** ở Tab 1 -> Tab 2 nhìn thấy đúng động tác tương ứng.
   - **Tràng hạt 108 hạt**: Bấm nút **Tràng hạt** -> dùng chuột hoặc ngón tay kéo vòng hạt gỗ đi xuống qua vạch vàng, mỗi hạt đếm `+1` kèm tiếng hạt gỗ, đủ 108 hạt hiện thông báo `"Đã lần xong 1 vòng"`. Tab bên kia chỉ thấy nhân vật đang lần hạt chứ không bị hiện bảng chuỗi hạt.
   - **Đốt nhang 30 phút**: Bấm nút **Dâng nhang** (hoặc click thẳng vào lư hương đồng ở giữa điện) -> nhân vật tự đi tới trước lư hương, đứng chắp tay khấn 2 giây rồi cắm 1 nén nhang có đốm lửa đỏ và khói bay lên. Rê chuột vào nén nhang trong lư sẽ hiện **Tên người dâng** và **Thời gian còn lại** (`29:59`).
   - **Chat & Lọc từ tục**: Gửi tin nhắn ở khung chat góc phải -> Tab kia nhận ngay. Gửi 2 tin liên tiếp dưới 2 giây sẽ báo `"Bạn gửi quá nhanh, chờ 2 giây"`. Gõ thử từ không phù hợp (kể cả viết không dấu, chèn dấu chấm `d.m` hay thay số `l0n`) sẽ bị chặn với thông báo `"Tin nhắn chứa từ không phù hợp"`.
   - **Kênh Radio đồng bộ < 1 giây**: Cả 2 tab cùng phát một đoạn kinh/nhạc thiền trùng khớp vị trí phát (độ lệch dưới 1 giây) ngay từ cú click nút **Vào** đầu tiên.
   - **Phòng riêng mã 6 ký tự**: Bấm **+ Tạo Phòng Mới**, tích chọn *"Phòng riêng (Vào bằng mã 6 ký tự)"* -> dùng mã 6 ký tự đó ở Tab 2 để vào phòng.

---

## 5. Hướng Dẫn Thay Thế Tài Sản Thật (Nhạc/Kinh & Model 3D)

- **Thay file Nhạc nền / Kinh tụng thật**:
  - Xem chi tiết tại [`assets/audio/README.md`](./assets/audio/README.md).
  - Bạn chỉ cần chép file `.wav` hoặc `.mp3` có bản quyền hợp lệ vào `assets/audio/` và cập nhật tên bài + thời lượng (`durationSeconds`) trong `server/src/audioPlaylist.ts`.
- **Thay file Model 3D `.glb` / `.gltf` thật**:
  - Xem chi tiết tại [`assets/models/README.md`](./assets/models/README.md).

# Tamlinh3Donline
