import * as THREE from 'three';
import {
  HALL_LENGTH,
  HALL_WIDTH,
  WALL_HEIGHT,
  HALL_MIN_X,
  HALL_MAX_X,
  HALL_MIN_Z,
  HALL_MAX_Z,
  COURTYARD_MIN_X,
  COURTYARD_MAX_X,
  COURTYARD_MAX_Z,
  DOORWAY_HALF_WIDTH
} from '../../../shared/constants';

export interface TempleEnvironment {
  group: THREE.Group;
  floorMeshes: THREE.Object3D[];
}

function createTerracottaTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Nền gạch tàu đỏ trầm truyền thống
  ctx.fillStyle = '#7c2f1e';
  ctx.fillRect(0, 0, 256, 256);

  // Vân gạch tự nhiên
  const tiles = 4;
  const step = 256 / tiles;
  for (let r = 0; r < tiles; r++) {
    for (let c = 0; c < tiles; c++) {
      const shade = (r + c) % 2 === 0 ? '#843321' : '#752b1b';
      ctx.fillStyle = shade;
      ctx.fillRect(c * step + 2, r * step + 2, step - 4, step - 4);
    }
  }

  // Mạch vữa xám nâu
  ctx.strokeStyle = '#4a2016';
  ctx.lineWidth = 4;
  for (let i = 0; i <= tiles; i++) {
    const pos = i * step;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, 256);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(256, pos);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 15);
  return texture;
}

function createBrocadeCarpetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8f1b16';
  ctx.fillRect(0, 0, 256, 512);

  // Viền kim tuyến vàng 2 bên mép thảm
  ctx.fillStyle = '#e5b842';
  ctx.fillRect(8, 0, 10, 512);
  ctx.fillRect(238, 0, 10, 512);
  ctx.strokeStyle = '#ffd97d';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 4, 208, 504);

  // Họa tiết hoa văn chữ Vạn & Hoa Sen vàng dọc thảm
  for (let y = 64; y < 512; y += 128) {
    ctx.strokeStyle = 'rgba(255, 215, 110, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, y, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 220, 120, 0.35)';
    ctx.beginPath();
    ctx.arc(128, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  return tex;
}

function createLatticeWindowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Nền lụa vàng ấm xuyên sáng từ ngoài sân
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 150);
  grad.addColorStop(0, '#fff2bd');
  grad.addColorStop(0.6, '#ffd275');
  grad.addColorStop(1, '#d99638');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Khung gỗ chạm chữ Thọ / song cửa chùa cổ
  ctx.strokeStyle = '#4a1d0d';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 244, 244);
  ctx.lineWidth = 6;
  for (let i = 48; i < 256; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  ctx.strokeStyle = '#6b2912';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(128, 128, 62, 0, Math.PI * 2);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

function createHorizontalPlaqueTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6b140e';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#f2c649';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 472, 120);

  ctx.fillStyle = '#ffe57f';
  ctx.font = 'bold 46px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 82);

  return new THREE.CanvasTexture(canvas);
}

export function buildTempleArchitecture(scene: THREE.Scene): TempleEnvironment {
  const group = new THREE.Group();
  group.name = 'TempleArchitecture';
  const floorMeshes: THREE.Object3D[] = [];

  const tileTex = createTerracottaTileTexture();

  // 1. Sàn Chánh điện: đúng 30m dài (Z: -15..+15) x 18m rộng (X: -9..+9)
  const hallFloorGeo = new THREE.PlaneGeometry(HALL_WIDTH, HALL_LENGTH);
  const hallFloorMat = new THREE.MeshStandardMaterial({
    map: tileTex,
    roughness: 0.62,
    metalness: 0.08
  });
  const hallFloor = new THREE.Mesh(hallFloorGeo, hallFloorMat);
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.set(0, 0, 0);
  hallFloor.receiveShadow = true;
  hallFloor.name = 'WalkableFloor_Hall';
  group.add(hallFloor);
  floorMeshes.push(hallFloor);

  // Thảm gấm đỏ thêu hoa sen vàng trang nghiêm dọc lối đi chính dẫn lên bàn thờ Phật
  const carpetGeo = new THREE.PlaneGeometry(2.35, 22.0);
  const carpetMat = new THREE.MeshStandardMaterial({
    map: createBrocadeCarpetTexture(),
    roughness: 0.72,
    metalness: 0.05
  });
  const carpet = new THREE.Mesh(carpetGeo, carpetMat);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.014, 3.6);
  carpet.receiveShadow = true;
  group.add(carpet);

  // 2. Sân chùa phía trước (Z: +15 đến +28, X: -12 đến +12)
  const yardWidth = COURTYARD_MAX_X - COURTYARD_MIN_X;
  const yardLength = COURTYARD_MAX_Z - HALL_MAX_Z + 1.0;
  const yardTex = tileTex.clone();
  yardTex.needsUpdate = true;
  yardTex.repeat.set(12, 7);

  const yardFloorGeo = new THREE.PlaneGeometry(yardWidth, yardLength);
  const yardFloorMat = new THREE.MeshStandardMaterial({
    map: yardTex,
    roughness: 0.78,
    metalness: 0.04,
    color: 0xc9ab93
  });
  const yardFloor = new THREE.Mesh(yardFloorGeo, yardFloorMat);
  yardFloor.rotation.x = -Math.PI / 2;
  yardFloor.position.set(0, -0.01, HALL_MAX_Z + yardLength / 2 - 0.2);
  yardFloor.receiveShadow = true;
  yardFloor.name = 'WalkableFloor_Courtyard';
  group.add(yardFloor);
  floorMeshes.push(yardFloor);

  // 3. Tường Chánh điện cao 6m (Vàng hoàng thổ ấm sáng + ốp lamri gỗ lim & phào chỉ vàng)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe6c587,
    roughness: 0.85,
    metalness: 0.02
  });
  const woodTrimMat = new THREE.MeshStandardMaterial({
    color: 0x5c2412,
    roughness: 0.55,
    metalness: 0.08
  });
  const lacquerRedPillarMat = new THREE.MeshStandardMaterial({
    color: 0x7a1f16,
    roughness: 0.35,
    metalness: 0.15
  });
  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xe6b83a,
    roughness: 0.28,
    metalness: 0.75,
    emissive: 0x3b2806
  });
  const wallThickness = 0.4;

  // Tường Bắc (phía sau tượng Phật, Z = -15)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(HALL_WIDTH + wallThickness * 2, WALL_HEIGHT, wallThickness),
    wallMat
  );
  backWall.position.set(0, WALL_HEIGHT / 2, HALL_MIN_Z);
  backWall.receiveShadow = true;
  backWall.castShadow = true;
  group.add(backWall);

  // Phông gỗ son thếp vàng phía sau lưng Phật đài
  const sanctuaryBackdrop = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 5.4, 0.12),
    lacquerRedPillarMat
  );
  sanctuaryBackdrop.position.set(0, 2.8, HALL_MIN_Z + 0.24);
  group.add(sanctuaryBackdrop);

  const sanctuaryGoldFrame = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 5.6, 0.08),
    goldAccentMat
  );
  sanctuaryGoldFrame.position.set(0, 2.8, HALL_MIN_Z + 0.21);
  group.add(sanctuaryGoldFrame);

  // Bức Hoành Phi "ĐẠI HÙNG BỬU ĐIỆN" treo cao trang nghiêm
  const plaqueTex = createHorizontalPlaqueTexture('ĐẠI HÙNG BỬU ĐIỆN');
  const plaqueMesh = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 1.15, 0.14),
    new THREE.MeshBasicMaterial({ map: plaqueTex })
  );
  plaqueMesh.position.set(0, 5.15, -6.5);
  group.add(plaqueMesh);

  // Tường Tây (trái, X = -9) và Tường Đông (phải, X = +9)
  const sideWallGeo = new THREE.BoxGeometry(wallThickness, WALL_HEIGHT, HALL_LENGTH);
  const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
  leftWall.position.set(HALL_MIN_X, WALL_HEIGHT / 2, 0);
  leftWall.receiveShadow = true;
  leftWall.castShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
  rightWall.position.set(HALL_MAX_X, WALL_HEIGHT / 2, 0);
  rightWall.receiveShadow = true;
  rightWall.castShadow = true;
  group.add(rightWall);

  // Ốp gỗ chân tường (Lamri gỗ lim cao 1.25m) & Cửa sổ chữ Thọ phát sáng dọc 2 tường bên
  const windowMat = new THREE.MeshBasicMaterial({ map: createLatticeWindowTexture() });
  for (const side of [-1, 1]) {
    const wainscot = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.25, HALL_LENGTH - 0.4),
      woodTrimMat
    );
    wainscot.position.set(side * (HALL_MAX_X - 0.22), 0.625, 0);
    group.add(wainscot);

    const goldRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, HALL_LENGTH - 0.4),
      goldAccentMat
    );
    goldRail.position.set(side * (HALL_MAX_X - 0.22), 1.28, 0);
    group.add(goldRail);

    for (const wz of [-6.5, 1.0, 8.5]) {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 2.1), woodTrimMat);
      winFrame.position.set(side * (HALL_MAX_X - 0.2), 3.25, wz);
      group.add(winFrame);

      const winPane = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 1.85), windowMat);
      winPane.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
      winPane.position.set(side * (HALL_MAX_X - 0.27), 3.25, wz);
      group.add(winPane);
    }
  }

  // Tường Nam (mặt tiền Z = +15), chừa cửa chính rộng 8.4m ở giữa (X từ -4.2 đến +4.2)
  const frontSideWidth = (HALL_WIDTH - DOORWAY_HALF_WIDTH * 2) / 2; // 4.8m mỗi bên
  const frontWallGeo = new THREE.BoxGeometry(frontSideWidth, WALL_HEIGHT, wallThickness);

  const frontLeftWall = new THREE.Mesh(frontWallGeo, wallMat);
  frontLeftWall.position.set(HALL_MIN_X + frontSideWidth / 2, WALL_HEIGHT / 2, HALL_MAX_Z);
  frontLeftWall.castShadow = true;
  frontLeftWall.receiveShadow = true;
  group.add(frontLeftWall);

  const frontRightWall = new THREE.Mesh(frontWallGeo, wallMat);
  frontRightWall.position.set(HALL_MAX_X - frontSideWidth / 2, WALL_HEIGHT / 2, HALL_MAX_Z);
  frontRightWall.castShadow = true;
  frontRightWall.receiveShadow = true;
  group.add(frontRightWall);

  // Dầm gỗ bức bàn phía trên cửa chính (từ độ cao 4.3m đến 6m)
  const lintelHeight = 1.7;
  const lintelGeo = new THREE.BoxGeometry(DOORWAY_HALF_WIDTH * 2 + 0.4, lintelHeight, wallThickness + 0.08);
  const lintel = new THREE.Mesh(lintelGeo, woodTrimMat);
  lintel.position.set(0, WALL_HEIGHT - lintelHeight / 2, HALL_MAX_Z);
  lintel.castShadow = true;
  group.add(lintel);

  // Khung cửa gỗ lim ở lối vào chánh điện
  for (const xPos of [-DOORWAY_HALF_WIDTH, -1.6, 1.6, DOORWAY_HALF_WIDTH]) {
    const doorPost = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 4.3, 0.48),
      woodTrimMat
    );
    doorPost.position.set(xPos, 2.15, HALL_MAX_Z);
    doorPost.castShadow = true;
    group.add(doorPost);
  }

  // 4. Hàng cột gỗ lim sơn son thếp vàng trong Chánh điện (2 hàng x 4 cột = 8 cột cái)
  const pillarGeo = new THREE.CylinderGeometry(0.36, 0.4, WALL_HEIGHT, 16);
  const baseStoneGeo = new THREE.CylinderGeometry(0.5, 0.58, 0.28, 16);
  const goldRingGeo = new THREE.TorusGeometry(0.39, 0.035, 8, 20);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x858078, roughness: 0.7 });
  const pillarZList = [-10, -3, 5, 12];

  for (const zPos of pillarZList) {
    for (const xPos of [-6.5, 6.5]) {
      const pillar = new THREE.Mesh(pillarGeo, lacquerRedPillarMat);
      pillar.position.set(xPos, WALL_HEIGHT / 2, zPos);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);

      const stoneBase = new THREE.Mesh(baseStoneGeo, stoneMat);
      stoneBase.position.set(xPos, 0.14, zPos);
      group.add(stoneBase);

      // Đai kim tuyến vàng ở chân cột và đỉnh cột
      for (const ringY of [0.32, 4.6, 5.55]) {
        const ring = new THREE.Mesh(goldRingGeo, goldAccentMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(xPos, ringY, zPos);
        group.add(ring);
      }

      // Trướng Liễn / Câu đối đỏ viền vàng treo trước các cột gần Phật đài
      if (zPos === -3 || zPos === 5) {
        const banner = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 3.2, 0.04),
          goldAccentMat
        );
        banner.position.set(xPos, 3.0, zPos + 0.41);
        group.add(banner);

        const bannerInner = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 3.05, 0.05),
          lacquerRedPillarMat
        );
        bannerInner.position.set(xPos, 3.0, zPos + 0.42);
        group.add(bannerInner);
      }
    }

    // Xà ngang (vì kèo) nối 2 cột
    const beam = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.36, 0.36), woodTrimMat);
    beam.position.set(0, WALL_HEIGHT - 0.25, zPos);
    group.add(beam);
  }

  // 5. Mái cong nhiều tầng kiểu chùa Việt (Chồng diêm 2 tầng 8 mái + đầu đao uốn cong)
  buildCurvedVietnameseRoof(group);

  // 6. Tường bao thấp quanh sân chùa phía ngoài
  const lowWallMat = new THREE.MeshLambertMaterial({ color: 0xc29b59 });
  const leftYardWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.5, 13), lowWallMat);
  leftYardWall.position.set(COURTYARD_MIN_X, 0.75, 21.2);
  group.add(leftYardWall);

  const rightYardWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.5, 13), lowWallMat);
  rightYardWall.position.set(COURTYARD_MAX_X, 0.75, 21.2);
  group.add(rightYardWall);

  scene.add(group);
  return { group, floorMeshes };
}

function buildCurvedVietnameseRoof(parent: THREE.Group): void {
  const roofGroup = new THREE.Group();
  roofGroup.name = 'VietnameseMultiTierRoof';

  const tileRoofMat = new THREE.MeshLambertMaterial({
    color: 0x7a2318,
    side: THREE.DoubleSide
  });
  const ridgeMat = new THREE.MeshLambertMaterial({ color: 0xd4af37 });
  const ceilingMat = new THREE.MeshLambertMaterial({ color: 0x3b1e0e, side: THREE.DoubleSide });

  // Trần gỗ phía trên chánh điện để giữ không gian ấm cúng và ngăn ánh sáng lọt sai
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HALL_WIDTH + 0.8, HALL_LENGTH + 0.8), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, WALL_HEIGHT + 0.02, 0);
  roofGroup.add(ceiling);

  // Tầng mái 1 (dưới): phủ rộng 21m x 33m
  createRoofTier(roofGroup, 21.2, 33.0, WALL_HEIGHT - 0.1, 2.5, tileRoofMat, ridgeMat);
  // Tầng mái 2 (trên - chồng diêm): phủ rộng 16.5m x 27.5m
  createRoofTier(roofGroup, 16.4, 27.4, WALL_HEIGHT + 2.1, 2.6, tileRoofMat, ridgeMat);

  parent.add(roofGroup);
}

function createRoofTier(
  parent: THREE.Group,
  width: number,
  length: number,
  baseY: number,
  riseHeight: number,
  roofMat: THREE.Material,
  ridgeMat: THREE.Material
): void {
  const halfW = width / 2;
  const halfL = length / 2;

  // Mái dốc 2 bên Đông - Tây
  const slopeWidth = Math.hypot(halfW, riseHeight);
  const slopeAngle = Math.atan2(riseHeight, halfW);

  const leftSlope = new THREE.Mesh(new THREE.PlaneGeometry(slopeWidth, length), roofMat);
  leftSlope.rotation.order = 'YXZ';
  leftSlope.rotation.y = Math.PI / 2;
  leftSlope.rotation.x = Math.PI / 2 - slopeAngle;
  leftSlope.position.set(-halfW / 2, baseY + riseHeight / 2, 0);
  parent.add(leftSlope);

  const rightSlope = new THREE.Mesh(new THREE.PlaneGeometry(slopeWidth, length), roofMat);
  rightSlope.rotation.order = 'YXZ';
  rightSlope.rotation.y = -Math.PI / 2;
  rightSlope.rotation.x = Math.PI / 2 - slopeAngle;
  rightSlope.position.set(halfW / 2, baseY + riseHeight / 2, 0);
  parent.add(rightSlope);

  // Bờ nóc trên đỉnh mái
  const topRidge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, length * 0.86), ridgeMat);
  topRidge.position.set(0, baseY + riseHeight + 0.1, 0);
  parent.add(topRidge);

  // 4 Đầu đao uốn cong vút ở 4 góc mái chùa Việt
  const corners: [number, number][] = [
    [-halfW, -halfL],
    [halfW, -halfL],
    [-halfW, halfL],
    [halfW, halfL]
  ];

  for (const [cx, cz] of corners) {
    const daoGroup = new THREE.Group();
    daoGroup.position.set(cx * 0.94, baseY + 0.15, cz * 0.95);
    const angleOut = Math.atan2(cx, cz);
    daoGroup.rotation.y = angleOut;

    // Thân đầu đao cong vút lên bằng 3 đoạn nối tiếp
    for (let s = 0; s < 3; s++) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(0.28 - s * 0.06, 0.25 + s * 0.12, 0.75),
        ridgeMat
      );
      seg.position.set(0, s * 0.36, s * 0.48);
      seg.rotation.x = -0.38 * (s + 1);
      daoGroup.add(seg);
    }
    parent.add(daoGroup);
  }
}

/**
 * Bộ điều khiển Camera góc nhìn thứ ba:
 * - Kéo chuột / vuốt để xoay quanh nhân vật
 * - Lăn chuột để zoom gần/xa
 * - Tự động kẹp tọa độ (clamp) không xuyên tường chánh điện và không chui xuống sàn
 */
export class ThirdPersonCameraController {
  private camera: THREE.PerspectiveCamera;
  private yaw = 0; // Nhìn từ phía sau nhân vật về hướng -Z (yaw = 0 đặt camera ở +Z nhìn về -Z)
  private pitch = 0.38;
  private distance = 5.6;
  private activePointers = new Map<number, { x: number; y: number; startX: number; startY: number }>();
  private lastPinchDist = 0;
  public wasDragGesture = false;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.bindEvents(domElement);
  }

  public zoomBy(delta: number): void {
    this.distance = Math.max(2.3, Math.min(10.5, this.distance + delta));
  }

  private bindEvents(domElement: HTMLElement): void {
    domElement.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      this.activePointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY
      });
      if (this.activePointers.size === 1) {
        this.wasDragGesture = false;
      } else if (this.activePointers.size === 2) {
        this.wasDragGesture = true;
        const pts = Array.from(this.activePointers.values());
        this.lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      const pt = this.activePointers.get(e.pointerId);
      if (!pt) return;

      const dx = e.clientX - pt.x;
      const dy = e.clientY - pt.y;
      pt.x = e.clientX;
      pt.y = e.clientY;

      if (Math.hypot(e.clientX - pt.startX, e.clientY - pt.startY) > 7) {
        this.wasDragGesture = true;
      }

      if (this.activePointers.size === 1) {
        // 1 ngón hoặc chuột: xoay camera quanh nhân vật
        const sensitivity = e.pointerType === 'touch' ? 0.0085 : 0.0065;
        this.yaw -= dx * sensitivity;
        this.pitch = Math.max(0.08, Math.min(1.18, this.pitch + dy * 0.006));
      } else if (this.activePointers.size === 2) {
        // 2 ngón trên điện thoại: Pinch-to-Zoom gần/xa mượt mà
        const pts = Array.from(this.activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (this.lastPinchDist > 0) {
          const pinchDelta = this.lastPinchDist - dist;
          this.distance = Math.max(2.3, Math.min(10.5, this.distance + pinchDelta * 0.018));
        }
        this.lastPinchDist = dist;
      }
    });

    const removePointer = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);
      if (this.activePointers.size < 2) {
        this.lastPinchDist = 0;
      }
    };

    window.addEventListener('pointerup', removePointer);
    window.addEventListener('pointercancel', removePointer);

    domElement.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        this.distance = Math.max(2.3, Math.min(10.5, this.distance + e.deltaY * 0.004));
      },
      { passive: false }
    );
  }

  public update(targetPosition: THREE.Vector3): void {
    const lookTarget = new THREE.Vector3(targetPosition.x, targetPosition.y + 1.35, targetPosition.z);

    const horizDist = this.distance * Math.cos(this.pitch);
    const vertDist = this.distance * Math.sin(this.pitch);

    let desiredX = lookTarget.x + Math.sin(this.yaw) * horizDist;
    let desiredY = lookTarget.y + vertDist;
    let desiredZ = lookTarget.z + Math.cos(this.yaw) * horizDist;

    // Kẹp không xuyên sàn và trần
    desiredY = Math.max(0.65, Math.min(WALL_HEIGHT - 0.35, desiredY));

    const wallMargin = 0.48;
    const playerInsideHall = targetPosition.z <= HALL_MAX_Z - 0.1;

    if (playerInsideHall) {
      // Kẹp camera trong giới hạn 4 bức tường chánh điện (trừ khoảng mở cửa chính)
      desiredX = Math.max(HALL_MIN_X + wallMargin, Math.min(HALL_MAX_X - wallMargin, desiredX));
      desiredZ = Math.max(HALL_MIN_Z + wallMargin, desiredZ);

      // Nếu tia nhìn cắt qua tường mặt tiền (Z = 15) ngoài phạm vi cửa chính (-4.2..4.2), kẹp Z trong điện
      if (desiredZ > HALL_MAX_Z - wallMargin && Math.abs(desiredX) > DOORWAY_HALF_WIDTH - 0.3) {
        desiredZ = HALL_MAX_Z - wallMargin;
      }
    } else {
      // Khi nhân vật ở ngoài sân chùa: không để camera lùi xuyên qua tường mặt tiền vào trong điện
      desiredX = Math.max(COURTYARD_MIN_X + wallMargin, Math.min(COURTYARD_MAX_X - wallMargin, desiredX));
      desiredZ = Math.min(COURTYARD_MAX_Z - wallMargin, desiredZ);
      if (desiredZ < HALL_MAX_Z + wallMargin && Math.abs(desiredX) > DOORWAY_HALF_WIDTH - 0.3) {
        desiredZ = HALL_MAX_Z + wallMargin;
      }
    }

    this.camera.position.set(desiredX, desiredY, desiredZ);
    this.camera.lookAt(lookTarget);
  }
}

export function countSceneTriangles(scene: THREE.Scene): number {
  let triangles = 0;
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      const geo = obj.geometry;
      if (geo.index) {
        triangles += geo.index.count / 3;
      } else if (geo.attributes.position) {
        triangles += geo.attributes.position.count / 3;
      }
    }
  });
  return Math.round(triangles);
}
