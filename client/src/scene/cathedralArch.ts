import * as THREE from 'three';
import {
  HALL_WIDTH,
  HALL_LENGTH,
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
  root: THREE.Group;
  floorMeshes: THREE.Object3D[];
}

/**
 * Tạo texture sàn đá cẩm thạch kẻ ô sáng trang nhã của Nhà Thờ Lớn
 */
function createMarbleTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ddd5c7';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillRect(128, 128, 128, 128);

  ctx.fillStyle = '#c8bfb0';
  ctx.fillRect(128, 0, 128, 128);
  ctx.fillRect(0, 128, 128, 128);

  ctx.strokeStyle = '#a89f91';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 128, 128);
  ctx.strokeRect(128, 0, 128, 128);
  ctx.strokeRect(0, 128, 128, 128);
  ctx.strokeRect(128, 128, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 15);
  return texture;
}

/**
 * Tạo texture Cửa Sổ Kính Màu (Stained Glass Window) rực rỡ của Nhà Thờ Công Giáo
 */
function createStainedGlassTexture(seedIndex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const palettes = [
    ['#1e5aa8', '#d93829', '#f2b705', '#2a8c55'],
    ['#6a2c91', '#e67e22', '#2980b9', '#f1c40f'],
    ['#16a085', '#c0392b', '#8e44ad', '#f39c12']
  ];
  const pal = palettes[seedIndex % palettes.length];

  ctx.fillStyle = '#1a1412';
  ctx.fillRect(0, 0, 128, 256);

  // Các ô kính màu ghép nghệ thuật
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = pal[(row + col + seedIndex) % pal.length];
      ctx.fillRect(col * 30 + 6, row * 30 + 10, 26, 26);
    }
  }

  // Biểu tượng Thánh Giá vàng ở tâm khung kính
  ctx.fillStyle = '#fff2a6';
  ctx.fillRect(56, 68, 16, 110);
  ctx.fillRect(32, 96, 64, 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Tạo texture Cửa Sổ Hoa Hồng (Rose Window) tròn rực rỡ trên mặt tiền Thánh Đường
 */
function createRoseWindowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const cx = 128;
  const cy = 128;

  ctx.fillStyle = '#1e1624';
  ctx.fillRect(0, 0, 256, 256);

  const colors = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#2ecc71', '#e67e22'];
  const petals = 12;
  for (let i = 0; i < petals; i++) {
    const a1 = (i / petals) * Math.PI * 2;
    const a2 = ((i + 1) / petals) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 116, a1, a2);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#221a15';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, Math.PI * 2);
  ctx.fillStyle = '#fff3b0';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Xây dựng không gian 3D Thánh Đường Nhà Thờ Công Giáo (30m dài x 18m rộng x 6m tường):
 * - Tường đá kem trắng, cột cẩm thạch Gothic, mái vòm cuốn nhọn cao vút, Cửa sổ Kính Màu & Hoa Hồng
 */
export function buildTempleArchitecture(scene: THREE.Scene): TempleEnvironment {
  const root = new THREE.Group();
  root.name = 'ChurchArchitecture';
  const floorMeshes: THREE.Object3D[] = [];

  // 1. Sàn đá cẩm thạch trong lòng Nhà Thờ 18m x 30m
  const floorGeo = new THREE.PlaneGeometry(HALL_WIDTH, HALL_LENGTH);
  const floorMat = new THREE.MeshLambertMaterial({
    map: createMarbleTileTexture()
  });
  const hallFloor = new THREE.Mesh(floorGeo, floorMat);
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.set(0, 0, 0);
  hallFloor.receiveShadow = true;
  hallFloor.name = 'HallFloor';
  root.add(hallFloor);
  floorMeshes.push(hallFloor);

  // Thảm đỏ trang nghiêm dẫn từ cửa chính lên Cung Thánh
  const carpetGeo = new THREE.PlaneGeometry(3.4, 24.5);
  const carpetMat = new THREE.MeshLambertMaterial({ color: 0x8b1a1a });
  const carpet = new THREE.Mesh(carpetGeo, carpetMat);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.012, 1.5);
  carpet.receiveShadow = true;
  root.add(carpet);
  floorMeshes.push(carpet);

  // Viền vàng hai bên thảm đỏ
  const trimMat = new THREE.MeshBasicMaterial({ color: 0xe6b84c });
  for (const side of [-1.65, 1.65]) {
    const trim = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 24.5), trimMat);
    trim.rotation.x = -Math.PI / 2;
    trim.position.set(side, 0.015, 1.5);
    root.add(trim);
  }

  // 2. Sân đá khuôn viên Nhà Thờ phía trước (Z từ 15m đến 28m)
  const yardGeo = new THREE.PlaneGeometry(28, 14);
  const yardMat = new THREE.MeshLambertMaterial({ color: 0x8b867e });
  const courtyardFloor = new THREE.Mesh(yardGeo, yardMat);
  courtyardFloor.rotation.x = -Math.PI / 2;
  courtyardFloor.position.set(0, -0.01, 21.5);
  courtyardFloor.receiveShadow = true;
  courtyardFloor.name = 'CourtyardFloor';
  root.add(courtyardFloor);
  floorMeshes.push(courtyardFloor);

  // Bậc tam cấp dẫn vào cửa chính Thánh Đường
  const stepMat = new THREE.MeshLambertMaterial({ color: 0xcfc7ba });
  const entranceStep = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.14, 1.5), stepMat);
  entranceStep.position.set(0, 0.04, 15.2);
  entranceStep.receiveShadow = true;
  root.add(entranceStep);
  floorMeshes.push(entranceStep);

  // 3. Tường Đá Kem Trắng cao 6m
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xebe3d5 });
  const stoneTrimMat = new THREE.MeshLambertMaterial({ color: 0xc7bba8 });
  const wallThickness = 0.45;

  // Tường hậu Cung Thánh (Z = -15)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(HALL_WIDTH + wallThickness, WALL_HEIGHT, wallThickness),
    wallMat
  );
  backWall.position.set(0, WALL_HEIGHT / 2, -HALL_LENGTH / 2);
  backWall.receiveShadow = true;
  backWall.castShadow = true;
  root.add(backWall);

  // Tường bên Trái (X = -9) & Phải (X = +9)
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, WALL_HEIGHT, HALL_LENGTH),
    wallMat
  );
  leftWall.position.set(-HALL_WIDTH / 2, WALL_HEIGHT / 2, 0);
  leftWall.receiveShadow = true;
  leftWall.castShadow = true;
  root.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, WALL_HEIGHT, HALL_LENGTH),
    wallMat
  );
  rightWall.position.set(HALL_WIDTH / 2, WALL_HEIGHT / 2, 0);
  rightWall.receiveShadow = true;
  rightWall.castShadow = true;
  root.add(rightWall);

  // 8 Khung Cửa Sổ Kính Màu (Stained Glass Windows) dọc 2 bức tường bên
  const windowZPositions = [-9.5, -3.5, 2.5, 8.5];
  windowZPositions.forEach((wz, idx) => {
    const glassTex = createStainedGlassTexture(idx);
    const glassMat = new THREE.MeshBasicMaterial({ map: glassTex });

    for (const side of [-1, 1]) {
      const winFrame = new THREE.Group();
      winFrame.position.set(side * (HALL_WIDTH / 2 - 0.24), 3.35, wz);
      winFrame.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;

      const archBorder = new THREE.Mesh(new THREE.BoxGeometry(1.65, 3.3, 0.08), stoneTrimMat);
      winFrame.add(archBorder);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 2.95), glassMat);
      glassPane.position.z = 0.05;
      winFrame.add(glassPane);

      root.add(winFrame);
    }
  });

  // Tường mặt tiền phía Nam (Z = +15) có cổng vòm lớn rộng 8.4m ở giữa
  const frontSideSegmentWidth = (HALL_WIDTH - DOORWAY_HALF_WIDTH * 2) / 2;
  const frontLeftWall = new THREE.Mesh(
    new THREE.BoxGeometry(frontSideSegmentWidth, WALL_HEIGHT, wallThickness),
    wallMat
  );
  frontLeftWall.position.set(
    -HALL_WIDTH / 2 + frontSideSegmentWidth / 2,
    WALL_HEIGHT / 2,
    HALL_LENGTH / 2
  );
  frontLeftWall.castShadow = true;
  frontLeftWall.receiveShadow = true;
  root.add(frontLeftWall);

  const frontRightWall = new THREE.Mesh(
    new THREE.BoxGeometry(frontSideSegmentWidth, WALL_HEIGHT, wallThickness),
    wallMat
  );
  frontRightWall.position.set(
    HALL_WIDTH / 2 - frontSideSegmentWidth / 2,
    WALL_HEIGHT / 2,
    HALL_LENGTH / 2
  );
  frontRightWall.castShadow = true;
  frontRightWall.receiveShadow = true;
  root.add(frontRightWall);

  const frontTopBeam = new THREE.Mesh(
    new THREE.BoxGeometry(DOORWAY_HALF_WIDTH * 2, 1.35, wallThickness),
    wallMat
  );
  frontTopBeam.position.set(0, WALL_HEIGHT - 0.675, HALL_LENGTH / 2);
  root.add(frontTopBeam);

  // Cửa Sổ Hoa Hồng (Rose Window) tròn rực rỡ trên mặt tiền & phía trên Cung Thánh
  const roseMat = new THREE.MeshBasicMaterial({
    map: createRoseWindowTexture(),
    side: THREE.DoubleSide
  });
  const frontRoseWindow = new THREE.Mesh(new THREE.CircleGeometry(1.55, 24), roseMat);
  frontRoseWindow.position.set(0, 7.2, HALL_LENGTH / 2 + 0.25);
  root.add(frontRoseWindow);

  const backRoseWindow = new THREE.Mesh(new THREE.CircleGeometry(1.75, 24), roseMat);
  backRoseWindow.position.set(0, 4.45, -HALL_LENGTH / 2 + 0.26);
  root.add(backRoseWindow);

  // 4. Hàng 8 Cột Trụ Đá Cẩm Thạch Trắng & Vòm Cuốn Gothic
  const pillarGeo = new THREE.CylinderGeometry(0.36, 0.42, WALL_HEIGHT, 14);
  const pillarCapGeo = new THREE.CylinderGeometry(0.56, 0.42, 0.36, 12);
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xf4efe6 });
  const archRibMat = new THREE.MeshLambertMaterial({ color: 0xd9cfc1 });

  const pillarZList = [-10.0, -3.0, 4.0, 11.0];
  for (const pz of pillarZList) {
    for (const px of [-6.4, 6.4]) {
      const pGroup = new THREE.Group();
      pGroup.position.set(px, 0, pz);

      const base = new THREE.Mesh(pillarCapGeo, stoneTrimMat);
      base.position.y = 0.18;
      base.receiveShadow = true;
      pGroup.add(base);

      const col = new THREE.Mesh(pillarGeo, pillarMat);
      col.position.y = WALL_HEIGHT / 2;
      col.castShadow = true;
      col.receiveShadow = true;
      pGroup.add(col);

      const cap = new THREE.Mesh(pillarCapGeo, stoneTrimMat);
      cap.position.y = WALL_HEIGHT - 0.18;
      pGroup.add(cap);

      root.add(pGroup);
    }

    // Vòm cuốn Gothic nối ngang hai hàng cột trên trần
    const leftVault = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.26, 0.32), archRibMat);
    leftVault.position.set(-3.1, WALL_HEIGHT + 0.65, pz);
    leftVault.rotation.z = 0.22;
    root.add(leftVault);

    const rightVault = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.26, 0.32), archRibMat);
    rightVault.position.set(3.1, WALL_HEIGHT + 0.65, pz);
    rightVault.rotation.z = -0.22;
    root.add(rightVault);
  }

  // 5. Mái Nhà Thờ Chóp Nhọn Gothic & Thánh Giá Vàng Trên Đỉnh
  buildCathedralRoof(root);

  scene.add(root);
  return { root, floorMeshes };
}

function buildCathedralRoof(parent: THREE.Group): void {
  const roofGroup = new THREE.Group();
  roofGroup.name = 'CathedralGothicRoof';

  const roofMat = new THREE.MeshLambertMaterial({
    color: 0x3a4856,
    side: THREE.DoubleSide
  });
  const gableMat = new THREE.MeshLambertMaterial({
    color: 0xe3dacb,
    side: THREE.DoubleSide
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    roughness: 0.25,
    metalness: 0.85,
    emissive: 0x553b00
  });

  const halfW = 9.8;
  const riseH = 4.2;
  const length = 31.6;
  const slopeWidth = Math.hypot(halfW, riseH);
  const slopeAngle = Math.atan2(riseH, halfW);

  const leftSlope = new THREE.Mesh(new THREE.PlaneGeometry(slopeWidth, length), roofMat);
  leftSlope.rotation.order = 'YXZ';
  leftSlope.rotation.y = Math.PI / 2;
  leftSlope.rotation.x = Math.PI / 2 - slopeAngle;
  leftSlope.position.set(-halfW / 2, WALL_HEIGHT + riseH / 2, 0);
  roofGroup.add(leftSlope);

  const rightSlope = new THREE.Mesh(new THREE.PlaneGeometry(slopeWidth, length), roofMat);
  rightSlope.rotation.order = 'YXZ';
  rightSlope.rotation.y = -Math.PI / 2;
  rightSlope.rotation.x = Math.PI / 2 - slopeAngle;
  rightSlope.position.set(halfW / 2, WALL_HEIGHT + riseH / 2, 0);
  roofGroup.add(rightSlope);

  // Tường tam giác mặt tiền (Gable) phía trên cổng chính
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-halfW, 0);
  gableShape.lineTo(halfW, 0);
  gableShape.lineTo(0, riseH);
  gableShape.closePath();
  const gableGeo = new THREE.ShapeGeometry(gableShape);
  const frontGable = new THREE.Mesh(gableGeo, gableMat);
  frontGable.position.set(0, WALL_HEIGHT, HALL_LENGTH / 2);
  roofGroup.add(frontGable);

  const backGable = new THREE.Mesh(gableGeo, gableMat);
  backGable.position.set(0, WALL_HEIGHT, -HALL_LENGTH / 2);
  roofGroup.add(backGable);

  // Tháp Chóp Nhọn Trung Tâm (Spire) & Thánh Giá Vàng Rực Sáng trên Đỉnh Mặt Tiền
  const spireBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.2, 2.2, 8),
    gableMat
  );
  spireBase.position.set(0, WALL_HEIGHT + riseH + 0.6, HALL_LENGTH / 2 - 0.6);
  roofGroup.add(spireBase);

  const spireCone = new THREE.Mesh(
    new THREE.ConeGeometry(1.05, 3.2, 8),
    roofMat
  );
  spireCone.position.set(0, WALL_HEIGHT + riseH + 3.2, HALL_LENGTH / 2 - 0.6);
  roofGroup.add(spireCone);

  // Thánh Giá Vàng trên đỉnh tháp Nhà Thờ
  const crossGroup = new THREE.Group();
  crossGroup.position.set(0, WALL_HEIGHT + riseH + 5.3, HALL_LENGTH / 2 - 0.6);
  const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 0.18), goldMat);
  const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.18), goldMat);
  hBar.position.y = 0.25;
  crossGroup.add(vBar, hBar);
  roofGroup.add(crossGroup);

  parent.add(roofGroup);
}

export class ThirdPersonCameraController {
  private camera: THREE.PerspectiveCamera;
  private yaw = 0;
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
        const sensitivity = e.pointerType === 'touch' ? 0.0085 : 0.0065;
        this.yaw -= dx * sensitivity;
        this.pitch = Math.max(0.08, Math.min(1.18, this.pitch + dy * 0.006));
      } else if (this.activePointers.size === 2) {
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

    desiredY = Math.max(0.65, Math.min(WALL_HEIGHT - 0.35, desiredY));

    const wallMargin = 0.48;
    const playerInsideHall = targetPosition.z <= HALL_MAX_Z - 0.1;

    if (playerInsideHall) {
      desiredX = Math.max(HALL_MIN_X + wallMargin, Math.min(HALL_MAX_X - wallMargin, desiredX));
      desiredZ = Math.max(HALL_MIN_Z + wallMargin, desiredZ);

      if (desiredZ > HALL_MAX_Z - wallMargin && Math.abs(desiredX) > DOORWAY_HALF_WIDTH - 0.3) {
        desiredZ = HALL_MAX_Z - wallMargin;
      }
    } else {
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
