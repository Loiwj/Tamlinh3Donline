# Thư mục Mô hình 3D (`assets/models/`)

## Trạng thái hiện tại
Để đảm bảo hiệu năng tối đa (< 15.000 đa giác cho toàn bộ cảnh, tải trang tức thì và tuân thủ 100% nguyên tắc bản quyền sáng tạo gốc), toàn bộ mô hình 3D trong phiên bản hiện tại đang được khởi tạo trực tiếp bằng hình học Low-Poly (Procedural Geometry) trong Three.js tại:
- `client/src/scene/temple.ts`: Kiến trúc Chánh điện 30m x 18m x 6m, mái cong chồng diêm 2 tầng 8 mái kiểu chùa cổ Việt Nam, hàng cột gỗ lim, sân gạch tàu.
- `client/src/scene/props.ts`: Cổng Tam Quan, Tượng Phật lớn ngồi trên đài sen, Bàn thờ ngũ quả & nến, Lư hương đồng lớn, 12 Bồ đoàn, Đèn lồng treo trần, Cây Bồ Đề và Gác Chuông chùa.
- `client/src/player/character.ts`: Nhân vật chú tiểu / phật tử cao 1,7m (áo nâu hoặc áo lam).

## Hướng dẫn thay thế bằng file mô hình 3D thật (`.glb` / `.gltf`)
Nếu bạn muốn thay thế bằng mô hình `.glb` / `.gltf` thiết kế riêng từ Blender:
1. Đặt các file `.glb` vào thư mục `assets/models/` này:
   - `assets/models/buddha_statue.glb` (Tượng Phật)
   - `assets/models/incense_burner.glb` (Lư hương đồng)
   - `assets/models/tam_quan_gate.glb` (Cổng Tam Quan)
   - `assets/models/monk_character.glb` (Nhân vật có xương Rigging)
2. Trong `client/src/scene/props.ts` hoặc `client/src/player/character.ts`, sử dụng `GLTFLoader` từ `three/examples/jsm/loaders/GLTFLoader.js` để tải `/models/<ten_file>.glb` (Vite đã cấu hình `publicDir: '../assets'` nên mọi file trong `assets/models/` được phục vụ tại đường dẫn `/models/...`).
3. Lưu ý giữ tổng số đa giác toàn cảnh dưới `200.000 triangles` để đảm bảo tốc độ 60 FPS trên Desktop và 30 FPS trên Mobile khi phòng có đủ 50 người.
