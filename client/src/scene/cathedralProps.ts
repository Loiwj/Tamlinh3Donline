import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  CUSHION_POSITIONS,
  INCENSE_BURNER_POS,
  MAX_SMOKE_PARTICLES
} from '../../../shared/constants';

export interface SyncedIncenseData {
  id: string;
  ownerId: string;
  ownerName: string;
  slotIndex: number;
  expiresAt: number;
}

export interface SacredShrineTarget {
  id: string;
  name: string;
  prayerText: string;
  speechText: string;
  standX: number;
  standZ: number;
  faceRotationY: number;
  mesh: THREE.Object3D;
}

export interface TemplePropsManager {
  burnerMesh: THREE.Object3D;
  bellMesh: THREE.Object3D;
  bodhiTreeMesh: THREE.Object3D;
  fortuneCylinderMesh: THREE.Object3D;
  cushionMeshes: THREE.Mesh[];
  incensePickables: THREE.Object3D[];
  shrineTargets?: SacredShrineTarget[];
  syncIncenseSticks(sticks: SyncedIncenseData[]): void;
  setHaloSacredActive(active: boolean): void;
  triggerHaloPulse(durationSeconds?: number): void;
  addWishingRibbonToTree(): void;
  update(dt: number, elapsedSeconds: number): void;
}

function createShrineNameplateSprite(
  title: string,
  subtitle: string,
  borderColor = '#ffd700'
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(20, 30, 52, 0.88)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, 18);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#fff5c2';
  ctx.fillText(title, 256, 46);

  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#99d6ff';
  ctx.fillText(subtitle, 256, 86);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.8, 0.7, 1);
  return sprite;
}

function createSignboardTexture(title: string, subtitle?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1f293d';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#e5c158';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.fillStyle = '#fff3c4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
  ctx.fillText(title, 256, subtitle ? 48 : 64);

  if (subtitle) {
    ctx.font = '24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffd97d';
    ctx.fillText(subtitle, 256, 92);
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * Vẽ Texture Hào Quang Thánh Giá & Chúa Kitô Vua 24 tia sáng thiên đàng
 */
function createDivineHaloRaysTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  const bgGrad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 250);
  bgGrad.addColorStop(0, 'rgba(255, 253, 235, 0.96)');
  bgGrad.addColorStop(0.35, 'rgba(255, 226, 115, 0.68)');
  bgGrad.addColorStop(0.7, 'rgba(255, 185, 55, 0.25)');
  bgGrad.addColorStop(1, 'rgba(255, 160, 20, 0.0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.save();
  ctx.translate(cx, cy);
  const rayCount = 24;
  for (let i = 0; i < rayCount; i++) {
    ctx.rotate((Math.PI * 2) / rayCount);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-13, -246);
    ctx.lineTo(13, -246);
    ctx.closePath();
    const rayGrad = ctx.createLinearGradient(0, 0, 0, -246);
    rayGrad.addColorStop(0, 'rgba(255, 255, 240, 0.88)');
    rayGrad.addColorStop(0.6, 'rgba(255, 220, 90, 0.45)');
    rayGrad.addColorStop(1, 'rgba(255, 195, 30, 0.0)');
    ctx.fillStyle = rayGrad;
    ctx.fill();
  }
  ctx.restore();

  for (const r of [95, 145, 195]) {
    ctx.strokeStyle = 'rgba(255, 240, 165, 0.58)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * Vẽ Texture hạt khói trầm & ánh sáng nến cầu nguyện bay lên
 */
function createSmokeParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 248, 225, 0.92)');
  grad.addColorStop(0.45, 'rgba(245, 232, 200, 0.55)');
  grad.addColorStop(0.8, 'rgba(220, 205, 175, 0.2)');
  grad.addColorStop(1, 'rgba(200, 190, 165, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

interface DivineHaloController {
  setSacredActive(active: boolean): void;
  triggerPulse(durationSeconds?: number): void;
  update(dt: number, elapsedSeconds: number): void;
}

export function buildTempleProps(scene: THREE.Scene): TemplePropsManager {
  const propsGroup = new THREE.Group();
  propsGroup.name = 'CathedralProps';

  // 1. Cổng Vòm Đá Thánh Đường ở lối vào quảng trường (Z = 26.2)
  buildCathedralArchGate(propsGroup);

  // 2. Tượng Chúa Giêsu Vua Tình Yêu & Thánh Giá Chúa Chịu Nạn lớn + Hào Quang Thánh (Z = -11.5)
  const { haloController, christShrineTarget } = buildSanctuaryChristStatueAndHalo(propsGroup);

  // 3. Bàn Thờ Thánh Thể, Nhà Tạm, Hoa Huệ Trắng & Hộp Rút Lộc Thánh Lời Chúa (X = 0, Z = -7.2)
  const { candleFlames, fortuneCylinderMesh } = buildHolyAltarWithTabernacle(propsGroup);

  // 4. Giàn Nến Cầu Nguyện (X = 0, Z = -3.8) + Hệ thống ly nến & làn hương nguyện cầu
  const { burnerMesh, incenseGroup, smokeSystem, defaultBurnerTips } =
    buildVotiveCandleStandAndSmoke(propsGroup);

  // 5. 12 Ghế Quỳ Gỗ Sồi (Pews & Kneelers) xếp thành 2 dãy trang nghiêm
  const cushionMeshes = buildChurchPewKneelers(propsGroup);

  // 6. Đèn chùm pha lê treo dọc trần nhà thờ
  const lanternMeshes = buildCrystalChandeliers(propsGroup);

  // 7. Hang Đá Đức Mẹ La Vang & Cây Thông Nguyện Ước ở sân trái (X = -7.2, Z = 20.5)
  const { bodhiTreeMesh, addWishingRibbonToTree, grottoShrineTarget } =
    buildMarianGrottoAndWishingTree(propsGroup);

  // 8. Tháp Chuông Nhà Thờ ở sân phải (X = +7.2, Z = 20.5)
  const bellMesh = buildChurchBellTower(propsGroup);

  // 9. Các Đài Thánh Phụng Thờ hai bên Thánh Đường: Đức Mẹ Maria, Thánh Cả Giuse, Lòng Chúa Thương Xót, Thánh Micae
  const sideShrines = buildCathedralSacredSideShrines(propsGroup);
  const shrineTargets: SacredShrineTarget[] = [
    christShrineTarget,
    ...sideShrines,
    grottoShrineTarget
  ];

  scene.add(propsGroup);

  // Quản lý các ly nến cầu nguyện của giáo dân đang cháy trên giàn nến
  const stickMap = new Map<string, THREE.Group>();
  const incensePickables: THREE.Object3D[] = [];
  let activeTipPositions: THREE.Vector3[] = [];

  function syncIncenseSticks(sticks: SyncedIncenseData[]): void {
    const incomingIds = new Set(sticks.map((s) => s.id));

    for (const [id, obj] of stickMap.entries()) {
      if (!incomingIds.has(id)) {
        incenseGroup.remove(obj);
        stickMap.delete(id);
      }
    }

    incensePickables.length = 0;
    activeTipPositions = [];

    for (const stick of sticks) {
      let stickObj = stickMap.get(stick.id);
      if (!stickObj) {
        stickObj = createSingleVotiveCandleMesh(stick);
        stickMap.set(stick.id, stickObj);
        incenseGroup.add(stickObj);
      }
      const hitbox = stickObj.getObjectByName('IncenseHitbox');
      if (hitbox) {
        hitbox.userData.incenseInfo = stick;
        incensePickables.push(hitbox);
      }
      const tipWorld = new THREE.Vector3();
      const tipObj = stickObj.getObjectByName('IncenseGlowTip');
      if (tipObj) {
        tipObj.getWorldPosition(tipWorld);
        activeTipPositions.push(tipWorld);
      }
    }
  }

  return {
    burnerMesh,
    bellMesh,
    bodhiTreeMesh,
    fortuneCylinderMesh,
    cushionMeshes,
    incensePickables,
    shrineTargets,
    syncIncenseSticks,
    setHaloSacredActive(active: boolean) {
      haloController.setSacredActive(active);
    },
    triggerHaloPulse(durationSeconds = 12) {
      haloController.triggerPulse(durationSeconds);
    },
    addWishingRibbonToTree,
    update(dt: number, elapsedSeconds: number) {
      haloController.update(dt, elapsedSeconds);

      for (let i = 0; i < candleFlames.length; i++) {
        const s = 1 + Math.sin(elapsedSeconds * 8 + i * 2) * 0.12;
        candleFlames[i].scale.set(1, s, 1);
      }

      for (let i = 0; i < lanternMeshes.length; i++) {
        lanternMeshes[i].rotation.z = Math.sin(elapsedSeconds * 1.1 + i) * 0.018;
      }

      const allTips =
        activeTipPositions.length > 0
          ? [...defaultBurnerTips, ...activeTipPositions]
          : defaultBurnerTips;
      smokeSystem.update(dt, allTips);
    }
  };
}

function buildCathedralArchGate(parent: THREE.Group): void {
  const gate = new THREE.Group();
  gate.name = 'CathedralArchGate';
  gate.position.set(0, 0, 26.2);

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0xd8d2c6 });
  const darkStoneMat = new THREE.MeshLambertMaterial({ color: 0x606878 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3b485e });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd559,
    roughness: 0.25,
    metalness: 0.8,
    emissive: 0x4a3506
  });

  const pillarXs = [-5.6, -2.0, 2.0, 5.6];
  for (const x of pillarXs) {
    const isInner = Math.abs(x) < 3;
    const h = isInner ? 5.6 : 4.5;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.82, h, 0.82), stoneMat);
    pillar.position.set(x, h / 2, 0);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    gate.add(pillar);

    const spireTop = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 4), roofMat);
    spireTop.rotation.y = Math.PI / 4;
    spireTop.position.set(x, h + 0.55, 0);
    gate.add(spireTop);
  }

  const centerBeam = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.78, 0.9), darkStoneMat);
  centerBeam.position.set(0, 4.45, 0);
  gate.add(centerBeam);

  const leftBeam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.58, 0.78), darkStoneMat);
  leftBeam.position.set(-3.8, 3.6, 0);
  gate.add(leftBeam);

  const rightBeam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.58, 0.78), darkStoneMat);
  rightBeam.position.set(3.8, 3.6, 0);
  gate.add(rightBeam);

  // Mái nhọn Gothic trên cổng chính + Thánh Giá Vàng
  const mainGable = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.7, 4), roofMat);
  mainGable.rotation.y = Math.PI / 4;
  mainGable.scale.set(1.35, 1, 0.55);
  mainGable.position.set(0, 5.65, 0);
  gate.add(mainGable);

  const gateCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.25, 0.14), goldMat);
  gateCrossV.position.set(0, 6.95, 0);
  gate.add(gateCrossV);
  const gateCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.14), goldMat);
  gateCrossH.position.set(0, 7.12, 0);
  gate.add(gateCrossH);

  const signTex = createSignboardTexture('NHÀ THỜ LỚN BÌNH AN', 'THÁNH ĐƯỜNG CÔNG GIÁO');
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.82, 0.14), signMat);
  signBoard.position.set(0, 4.48, -0.45);
  gate.add(signBoard);

  const signBoardFront = signBoard.clone();
  signBoardFront.position.set(0, 4.48, 0.45);
  gate.add(signBoardFront);

  parent.add(gate);
}

function buildSanctuaryChristStatueAndHalo(parent: THREE.Group): {
  haloController: DivineHaloController;
  christShrineTarget: SacredShrineTarget;
} {
  const statueGroup = new THREE.Group();
  statueGroup.name = 'SanctuaryChristStatue';
  statueGroup.position.set(0, 0, -11.5);

  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xf4f1ea,
    roughness: 0.3,
    metalness: 0.08
  });
  const royalMantleMat = new THREE.MeshStandardMaterial({
    color: 0x9e1b24,
    roughness: 0.42,
    metalness: 0.15
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd252,
    roughness: 0.22,
    metalness: 0.82,
    emissive: 0x4f3205
  });
  const crossWoodMat = new THREE.MeshStandardMaterial({
    color: 0x5c2e14,
    roughness: 0.45,
    metalness: 0.15
  });

  // Bệ đá cẩm thạch trắng tam cấp nơi Cung Thánh
  const baseStep1 = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.55, 4.2), marbleMat);
  baseStep1.position.set(0, 0.275, 0);
  baseStep1.receiveShadow = true;
  baseStep1.castShadow = true;
  statueGroup.add(baseStep1);

  const baseStep2 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.65, 3.2), marbleMat);
  baseStep2.position.set(0, 0.85, 0);
  baseStep2.castShadow = true;
  statueGroup.add(baseStep2);

  // Bệ trụ tròn chạm khắc vàng nâng Tượng Chúa Kitô Vua
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.85, 24), marbleMat);
  pedestal.position.set(0, 1.58, 0.2);
  statueGroup.add(pedestal);

  const pedestalGoldRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 10, 24), goldMat);
  pedestalGoldRing.rotation.x = Math.PI / 2;
  pedestalGoldRing.position.set(0, 1.98, 0.2);
  statueGroup.add(pedestalGoldRing);

  // Thánh Giá lớn uy nghiêm phía sau Cung Thánh + Tượng Chúa Chịu Nạn 3D (/models/crucifix_christ.glb) & bảng INRI
  const crossGroup = new THREE.Group();
  crossGroup.position.set(0, 4.4, -0.75);
  const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.42, 5.4, 0.28), crossWoodMat);
  crossVert.castShadow = true;
  crossGroup.add(crossVert);
  const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.42, 0.28), crossWoodMat);
  crossHoriz.position.set(0, 1.15, 0);
  crossHoriz.castShadow = true;
  crossGroup.add(crossHoriz);

  // Viền vàng & Bảng INRI trên đỉnh Thánh Giá
  const crossGoldV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 5.1, 0.31), goldMat);
  crossGroup.add(crossGoldV);
  const crossGoldH = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.14, 0.31), goldMat);
  crossGroup.add(crossGoldH);
  crossGoldH.position.set(0, 1.15, 0);

  const inriPlaque = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.24, 0.06), goldMat);
  inriPlaque.position.set(0, 2.25, 0.18);
  crossGroup.add(inriPlaque);

  const gltfLoader = new GLTFLoader();
  gltfLoader.load('/models/crucifix_christ.glb', (gltf) => {
    const corpus = gltf.scene.clone(true);
    corpus.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.material = goldMat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(corpus);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    corpus.scale.setScalar(2.45 / Math.max(0.001, sz.y));
    const sb = new THREE.Box3().setFromObject(corpus);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    corpus.position.set(-sc.x, 0.85 - sc.y, 0.24 - sc.z);
    crossGroup.add(corpus);
  });

  statueGroup.add(crossGroup);

  // Tượng Chúa Giêsu Kitô Cứu Thế 3D thật (/models/cristo.glb — Christ the Redeemer) dang tay ban phép lành
  const christFigure = new THREE.Group();
  christFigure.position.set(0, 2.0, 0.35);

  const christIvoryMat = new THREE.MeshStandardMaterial({
    color: 0xfaf6ee,
    roughness: 0.26,
    metalness: 0.12,
    emissive: 0x241c10
  });

  gltfLoader.load('/models/cristo.glb', (gltf) => {
    const cristoModel = gltf.scene.clone(true);
    cristoModel.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.geometry.computeVertexNormals();
        m.material = christIvoryMat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(cristoModel);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    const s = 3.25 / Math.max(0.001, sz.y);
    cristoModel.scale.setScalar(s);
    const sb = new THREE.Box3().setFromObject(cristoModel);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    cristoModel.position.set(-sc.x, -sb.min.y, -sc.z);
    christFigure.add(cristoModel);
  });

  statueGroup.add(christFigure);

  const christPlaque = createShrineNameplateSprite(
    '👑 CHÚA GIÊSU KITÔ VUA',
    'Chạm vào Tượng Chúa để Quỳ Cầu Nguyện (+20 Ân Sủng)',
    '#ffd700'
  );
  christPlaque.position.set(0, 6.2, 0.5);
  statueGroup.add(christPlaque);

  // ============================================================================
  // HỆ THỐNG HÀO QUANG THÁNH ĐA TẦNG (Bừng sáng rực rỡ khi Quỳ Lễ & Thắp Nến)
  // ============================================================================
  const haloGroup = new THREE.Group();
  haloGroup.name = 'BuddhaSacredHalo';
  haloGroup.position.set(0, 4.65, -0.35);
  statueGroup.add(haloGroup);

  const raysTex = createDivineHaloRaysTexture();

  const mainHaloMat = new THREE.MeshBasicMaterial({
    map: raysTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const mainHaloDisc = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.8), mainHaloMat);
  haloGroup.add(mainHaloDisc);

  const outerHaloMat = new THREE.MeshBasicMaterial({
    map: raysTex,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const outerHaloDisc = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), outerHaloMat);
  outerHaloDisc.position.z = -0.08;
  haloGroup.add(outerHaloDisc);

  const headRingMat = new THREE.MeshBasicMaterial({
    color: 0xffeb99,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const headRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.34, 32), headRingMat);
  headRing.position.set(0, 0.25, 0.08);
  haloGroup.add(headRing);

  const auraParticleCount = 48;
  const auraPositions = new Float32Array(auraParticleCount * 3);
  const auraSpeeds = new Float32Array(auraParticleCount);
  for (let i = 0; i < auraParticleCount; i++) {
    const angle = (i / auraParticleCount) * Math.PI * 2;
    const r = 1.2 + Math.random() * 1.9;
    auraPositions[i * 3] = Math.cos(angle) * r;
    auraPositions[i * 3 + 1] = (Math.random() - 0.5) * 3.4;
    auraPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    auraSpeeds[i] = 0.4 + Math.random() * 0.6;
  }
  const auraGeo = new THREE.BufferGeometry();
  auraGeo.setAttribute('position', new THREE.BufferAttribute(auraPositions, 3));
  const auraMat = new THREE.PointsMaterial({
    color: 0xffe680,
    size: 0.16,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const auraPoints = new THREE.Points(auraGeo, auraMat);
  haloGroup.add(auraPoints);

  const haloLight = new THREE.PointLight(0xffd866, 1.6, 24, 1.2);
  haloLight.position.set(0, 0.4, 0.9);
  haloGroup.add(haloLight);

  parent.add(statueGroup);

  let isSacredActive = false;
  let pulseRemainingSec = 0;
  let currentBoost = 0;

  const haloController: DivineHaloController = {
    setSacredActive(active: boolean) {
      isSacredActive = active;
    },
    triggerPulse(durationSeconds = 12) {
      pulseRemainingSec = Math.max(pulseRemainingSec, durationSeconds);
    },
    update(dt: number, elapsedSeconds: number) {
      if (pulseRemainingSec > 0) {
        pulseRemainingSec = Math.max(0, pulseRemainingSec - dt);
      }

      const shouldBoost = isSacredActive || pulseRemainingSec > 0;
      const targetBoost = shouldBoost ? 1.0 : 0.0;
      currentBoost += (targetBoost - currentBoost) * Math.min(1, dt * 3.5);

      const rotSpeed = 0.2 + currentBoost * 0.65;
      mainHaloDisc.rotation.z += rotSpeed * dt;
      outerHaloDisc.rotation.z -= rotSpeed * 0.75 * dt;

      const pulseWave = Math.sin(elapsedSeconds * (3.0 + currentBoost * 3.0)) * 0.08;
      const scaleVal = 1.0 + currentBoost * 0.38 + pulseWave;
      mainHaloDisc.scale.setScalar(scaleVal);
      outerHaloDisc.scale.setScalar(1.0 + currentBoost * 0.45 - pulseWave * 0.5);
      headRing.scale.setScalar(1.0 + currentBoost * 0.22 + pulseWave);

      mainHaloMat.opacity = 0.38 + currentBoost * 0.58;
      outerHaloMat.opacity = 0.2 + currentBoost * 0.55;
      headRingMat.opacity = 0.52 + currentBoost * 0.48;
      auraMat.opacity = 0.18 + currentBoost * 0.82;
      auraMat.size = 0.14 + currentBoost * 0.14;
      haloLight.intensity = 1.5 + currentBoost * 4.4 + pulseWave * 2.0;

      const posAttr = auraGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < auraParticleCount; i++) {
        let y = posAttr.getY(i) + auraSpeeds[i] * (1 + currentBoost * 1.8) * dt;
        if (y > 2.3) y = -1.8;
        const x = posAttr.getX(i) + Math.sin(elapsedSeconds * 2 + i) * 0.004;
        posAttr.setXYZ(i, x, y, posAttr.getZ(i));
      }
      posAttr.needsUpdate = true;
    }
  };

  return {
    haloController,
    christShrineTarget: {
      id: 'shrine_christ_king',
      name: 'Chúa Giêsu Kitô Vua',
      prayerText: '👑 Lạy Chúa Giêsu Kitô Vua Tình Yêu, con thờ lạy và tín thác vào Chúa!',
      speechText: 'Lạy Chúa Giêsu Kitô Vua Tình Yêu, con thờ lạy và tín thác vào Chúa',
      standX: 0,
      standZ: -5.4,
      faceRotationY: 0,
      mesh: statueGroup
    }
  };
}

function buildHolyAltarWithTabernacle(parent: THREE.Group): {
  candleFlames: THREE.Mesh[];
  fortuneCylinderMesh: THREE.Object3D;
} {
  const altarGroup = new THREE.Group();
  altarGroup.name = 'HolyAltarWithTabernacle';
  altarGroup.position.set(0, 0, -7.2);

  const marbleMat = new THREE.MeshLambertMaterial({ color: 0xf4f0e6 });
  const clothMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const redVelvetMat = new THREE.MeshLambertMaterial({ color: 0x991b22 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xe6b83a,
    roughness: 0.25,
    metalness: 0.78
  });

  // Bàn Thờ Đá Cẩm Thạch Trắng
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 1.75), marbleMat);
  tableTop.position.set(0, 1.25, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  altarGroup.add(tableTop);

  const altarBody = new THREE.Mesh(new THREE.BoxGeometry(4.7, 1.15, 1.42), marbleMat);
  altarBody.position.set(0, 0.6, 0);
  altarBody.castShadow = true;
  altarBody.receiveShadow = true;
  altarGroup.add(altarBody);

  // Khăn phủ bàn thờ nhung đỏ & diềm vàng có biểu tượng Thánh Giá
  const frontAntependium = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.95, 1.46), redVelvetMat);
  frontAntependium.position.set(0, 0.68, 0);
  altarGroup.add(frontAntependium);

  const crossEmblemV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.04), goldMat);
  crossEmblemV.position.set(0, 0.68, 0.74);
  altarGroup.add(crossEmblemV);
  const crossEmblemH = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.04), goldMat);
  crossEmblemH.position.set(0, 0.74, 0.74);
  altarGroup.add(crossEmblemH);

  // Nhà Tạm Bằng Vàng (Golden Tabernacle) ở chính giữa bàn thờ
  const tabernacleGroup = new THREE.Group();
  tabernacleGroup.position.set(0, 1.36, -0.15);
  const tabBody = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.68, 0.58), goldMat);
  tabBody.position.y = 0.34;
  tabernacleGroup.add(tabBody);
  const tabDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    goldMat
  );
  tabDome.position.y = 0.68;
  tabernacleGroup.add(tabDome);
  const tabCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), goldMat);
  tabCrossV.position.y = 1.15;
  tabernacleGroup.add(tabCrossV);
  const tabCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.05), goldMat);
  tabCrossH.position.y = 1.19;
  tabernacleGroup.add(tabCrossH);
  altarGroup.add(tabernacleGroup);

  // Bình Hoa Huệ Trắng hai bên Nhà Tạm
  const vaseMat = new THREE.MeshLambertMaterial({ color: 0xf7f5f0 });
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x2e6b34 });
  const lilyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  for (const vx of [-1.25, 1.25]) {
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.55, 10), vaseMat);
    vase.position.set(vx, 1.62, -0.1);
    altarGroup.add(vase);

    for (const offset of [-0.08, 0, 0.08]) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), stemMat);
      stem.position.set(vx + offset, 2.0, -0.1);
      altarGroup.add(stem);

      const lily = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 6), lilyMat);
      lily.rotation.x = Math.PI;
      lily.position.set(vx + offset, 2.26, -0.1);
      altarGroup.add(lily);
    }
  }

  // Chân nến đồng trên bàn thờ
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  const candleFlames: THREE.Mesh[] = [];

  for (const cx of [-2.15, -1.75, 1.75, 2.15]) {
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.34, 10), goldMat);
    holder.position.set(cx, 1.52, 0.08);
    altarGroup.add(holder);

    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10), clothMat);
    candle.position.set(cx, 1.95, 0.08);
    altarGroup.add(candle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 8), flameMat);
    flame.position.set(cx, 2.31, 0.08);
    altarGroup.add(flame);
    candleFlames.push(flame);
  }

  // Hộp Rút Lộc Thánh Lời Chúa (FortuneCylinderMesh) đặt trên bàn thờ để giáo dân click rút Lộc Thánh
  const scriptureBoxGroup = new THREE.Group();
  scriptureBoxGroup.name = 'FortuneCylinderMesh';
  scriptureBoxGroup.position.set(0.82, 1.38, 0.42);
  const crimsonBoxMat = new THREE.MeshLambertMaterial({ color: 0x9e1b24 });
  const scrollMat = new THREE.MeshLambertMaterial({ color: 0xfff5d6 });

  const boxBase = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.28), crimsonBoxMat);
  boxBase.position.y = 0.11;
  scriptureBoxGroup.add(boxBase);

  const goldBorder = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.3), goldMat);
  goldBorder.position.y = 0.2;
  scriptureBoxGroup.add(goldBorder);

  for (let i = 0; i < 9; i++) {
    const col = (i % 3) - 1;
    const row = Math.floor(i / 3) - 1;
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 8), scrollMat);
    scroll.position.set(col * 0.08, 0.28, row * 0.06);
    scroll.rotation.z = col * 0.12;
    scroll.rotation.x = row * 0.12;
    scriptureBoxGroup.add(scroll);
  }
  altarGroup.add(scriptureBoxGroup);

  parent.add(altarGroup);
  return { candleFlames, fortuneCylinderMesh: scriptureBoxGroup };
}

interface SmokeParticleSystem {
  points: THREE.Points;
  update(dt: number, activeTips: THREE.Vector3[]): void;
}

function buildVotiveCandleStandAndSmoke(parent: THREE.Group): {
  burnerMesh: THREE.Object3D;
  incenseGroup: THREE.Group;
  smokeSystem: SmokeParticleSystem;
  defaultBurnerTips: THREE.Vector3[];
} {
  const standContainer = new THREE.Group();
  standContainer.name = 'IncenseBurnerContainer';
  standContainer.position.set(INCENSE_BURNER_POS.x, 0, INCENSE_BURNER_POS.z);

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc89d3c,
    roughness: 0.3,
    metalness: 0.78
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x2c303a,
    roughness: 0.45,
    metalness: 0.6
  });
  const velvetTrayMat = new THREE.MeshLambertMaterial({ color: 0x7a1c22 });

  // Chân đế sắt mỹ thuật & đồng của Giàn Nến Cầu Nguyện
  for (const [lx, lz] of [
    [-0.62, -0.52],
    [0.62, -0.52],
    [-0.62, 0.52],
    [0.62, 0.52]
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.15, 8), darkIronMat);
    leg.position.set(lx, 0.575, lz);
    leg.castShadow = true;
    standContainer.add(leg);
  }

  // Bàn khay tròn lớn đựng các ly nến cầu nguyện
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.85, 0.28, 24), brassMat);
  body.position.set(0, 1.18, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = 'IncenseBurnerBody';
  body.userData.isIncenseBurner = true;
  standContainer.add(body);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 8, 24), brassMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 1.33, 0);
  rim.userData.isIncenseBurner = true;
  standContainer.add(rim);

  const traySurface = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 20), velvetTrayMat);
  traySurface.position.set(0, 1.31, 0);
  traySurface.userData.isIncenseBurner = true;
  standContainer.add(traySurface);

  // Đặt sẵn 3 cây nến chủ lễ lớn ở trung tâm giàn nến
  const defaultBurnerTips: THREE.Vector3[] = [];
  for (const offset of [-0.14, 0, 0.14]) {
    const cupMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.038, 0.22, 10),
      new THREE.MeshLambertMaterial({ color: 0xd92626 })
    );
    cupMesh.position.set(offset, 1.43, 0);
    standContainer.add(cupMesh);

    const flameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.028, 0.09, 8),
      new THREE.MeshBasicMaterial({ color: 0xffdf59 })
    );
    flameMesh.position.set(offset, 1.59, 0);
    standContainer.add(flameMesh);

    defaultBurnerTips.push(
      new THREE.Vector3(INCENSE_BURNER_POS.x + offset, 1.62, INCENSE_BURNER_POS.z)
    );
  }

  const incenseGroup = new THREE.Group();
  incenseGroup.name = 'PlantedIncenseSticks';
  standContainer.add(incenseGroup);

  parent.add(standContainer);

  // Hệ thống hạt ánh sáng & hương nguyện cầu bay lên
  const positions = new Float32Array(MAX_SMOKE_PARTICLES * 3);
  const ages = new Float32Array(MAX_SMOKE_PARTICLES);
  const lifetimes = new Float32Array(MAX_SMOKE_PARTICLES);
  const driftSeeds = new Float32Array(MAX_SMOKE_PARTICLES);

  for (let i = 0; i < MAX_SMOKE_PARTICLES; i++) {
    const tip = defaultBurnerTips[i % defaultBurnerTips.length];
    ages[i] = Math.random() * 3.6;
    lifetimes[i] = 2.6 + Math.random() * 1.8;
    driftSeeds[i] = Math.random() * Math.PI * 2;
    positions[i * 3] = tip.x + (Math.random() - 0.5) * 0.08;
    positions[i * 3 + 1] = tip.y + ages[i] * 0.55;
    positions[i * 3 + 2] = tip.z + (Math.random() - 0.5) * 0.08;
  }

  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const smokeMat = new THREE.PointsMaterial({
    map: createSmokeParticleTexture(),
    size: 0.55,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const smokePoints = new THREE.Points(smokeGeo, smokeMat);
  smokePoints.name = 'IncenseSmokeParticles';
  smokePoints.frustumCulled = false;
  parent.add(smokePoints);

  const smokeSystem: SmokeParticleSystem = {
    points: smokePoints,
    update(dt: number, activeTips: THREE.Vector3[]) {
      const posAttr = smokeGeo.getAttribute('position') as THREE.BufferAttribute;
      const countTips = activeTips.length;
      const activeParticleBudget = Math.min(MAX_SMOKE_PARTICLES, Math.max(85, countTips * 28));

      for (let i = 0; i < MAX_SMOKE_PARTICLES; i++) {
        if (i >= activeParticleBudget || countTips === 0) {
          posAttr.setXYZ(i, 0, -100, 0);
          continue;
        }

        ages[i] += dt;
        if (ages[i] >= lifetimes[i] || posAttr.getY(i) < 0) {
          const tip = activeTips[i % countTips];
          ages[i] = 0;
          posAttr.setXYZ(
            i,
            tip.x + (Math.random() - 0.5) * 0.05,
            tip.y + 0.02,
            tip.z + (Math.random() - 0.5) * 0.05
          );
        } else {
          const progress = ages[i] / lifetimes[i];
          const swirlRadius = 0.1 + progress * 0.24;
          const curX =
            posAttr.getX(i) + Math.sin(ages[i] * 2.4 + driftSeeds[i]) * swirlRadius * dt;
          const curY = posAttr.getY(i) + (0.45 + progress * 0.2) * dt;
          const curZ =
            posAttr.getZ(i) + Math.cos(ages[i] * 2.1 + driftSeeds[i]) * swirlRadius * dt;
          posAttr.setXYZ(i, curX, curY, curZ);
        }
      }
      posAttr.needsUpdate = true;
    }
  };

  return {
    burnerMesh: standContainer,
    incenseGroup,
    smokeSystem,
    defaultBurnerTips
  };
}

/**
 * Tạo 1 Ly Nến Cầu Nguyện Đỏ Ánh Vàng khi giáo dân thắp nến
 */
function createSingleVotiveCandleMesh(stick: SyncedIncenseData): THREE.Group {
  const g = new THREE.Group();
  g.name = `VotiveCandle_${stick.id}`;

  const idx = stick.slotIndex % 50;
  const goldenAngle = idx * 2.39996;
  const radius = Math.min(0.75, 0.22 + Math.sqrt(idx / 50) * 0.55);
  const localX = Math.cos(goldenAngle) * radius;
  const localZ = Math.sin(goldenAngle) * radius;

  g.position.set(localX, 1.33, localZ);

  // Ly thủy tinh đỏ đựng nến
  const cupMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.034, 0.15, 10),
    new THREE.MeshLambertMaterial({ color: 0xd42222 })
  );
  cupMesh.position.set(0, 0.075, 0);
  g.add(cupMesh);

  // Sáp nến trắng bên trong
  const waxMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.032, 0.12, 8),
    new THREE.MeshLambertMaterial({ color: 0xfff8e7 })
  );
  waxMesh.position.set(0, 0.08, 0);
  g.add(waxMesh);

  // Ngọn lửa nến lung linh
  const glowTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.024, 0.075, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe055 })
  );
  glowTip.name = 'IncenseGlowTip';
  glowTip.position.set(0, 0.19, 0);
  g.add(glowTip);

  const hitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.35, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.name = 'IncenseHitbox';
  hitbox.position.set(0, 0.15, 0);
  hitbox.userData.incenseInfo = stick;
  g.add(hitbox);

  return g;
}

/**
 * 12 Ghế Quỳ Gỗ Sồi & Đệm Quỳ Nhung Đỏ cho giáo dân quỳ lễ / lần hạt Mân Côi
 */
function buildChurchPewKneelers(parent: THREE.Group): THREE.Mesh[] {
  const cushionMeshes: THREE.Mesh[] = [];
  const oakWoodMat = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
  const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x4a2c18 });
  const redVelvetMat = new THREE.MeshLambertMaterial({ color: 0x8f1d24 });

  for (const spot of CUSHION_POSITIONS) {
    // Đệm quỳ nhung đỏ (Mesh chính để click và đứng/quỳ)
    const kneelerPad = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.12, 0.36),
      redVelvetMat
    );
    kneelerPad.position.set(spot.x, 0.06, spot.z);
    kneelerPad.receiveShadow = true;
    kneelerPad.castShadow = true;
    kneelerPad.name = `Cushion_${spot.index}`;
    kneelerPad.userData.cushionIndex = spot.index;

    // Bàn đọc kinh / Tựa tay gỗ sồi phía trước mặt ghế quỳ (hướng về Cung Thánh -Z)
    const pewDesk = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 0.28), oakWoodMat);
    pewDesk.position.set(0, 0.68, -0.34);
    pewDesk.rotation.x = 0.18;
    pewDesk.castShadow = true;
    pewDesk.userData.cushionIndex = spot.index;
    kneelerPad.add(pewDesk);

    for (const side of [-0.54, 0.54]) {
      const sidePost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.42), darkWoodMat);
      sidePost.position.set(side, 0.32, -0.22);
      sidePost.castShadow = true;
      sidePost.userData.cushionIndex = spot.index;
      kneelerPad.add(sidePost);
    }

    parent.add(kneelerPad);
    cushionMeshes.push(kneelerPad);
  }

  return cushionMeshes;
}

function buildCrystalChandeliers(parent: THREE.Group): THREE.Group[] {
  const chandelierGroups: THREE.Group[] = [];
  const chainMat = new THREE.MeshLambertMaterial({ color: 0xb89334 });
  const crystalMat = new THREE.MeshBasicMaterial({ color: 0xfff0b3 });
  const goldRimMat = new THREE.MeshStandardMaterial({
    color: 0xd9a838,
    roughness: 0.25,
    metalness: 0.8
  });

  const positions: [number, number][] = [
    [-4.2, -8.5],
    [4.2, -8.5],
    [-4.2, -2.5],
    [4.2, -2.5],
    [-4.2, 3.5],
    [4.2, 3.5],
    [-4.2, 9.5],
    [4.2, 9.5]
  ];

  for (const [lx, lz] of positions) {
    const cg = new THREE.Group();
    cg.position.set(lx, 6.2, lz);

    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), chainMat);
    chain.position.set(0, -0.5, 0);
    cg.add(chain);

    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 18), goldRimMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(0, -1.0, 0);
    cg.add(wheel);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), crystalMat);
      bulb.position.set(Math.cos(a) * 0.42, -0.9, Math.sin(a) * 0.42);
      cg.add(bulb);
    }

    parent.add(cg);
    chandelierGroups.push(cg);
  }

  return chandelierGroups;
}

/**
 * Hang Đá Đức Mẹ Ban Ơn & Cây Thông Nguyện Ước ở sân trái (X = -7.2, Z = 20.5)
 */
function buildMarianGrottoAndWishingTree(parent: THREE.Group): {
  bodhiTreeMesh: THREE.Object3D;
  addWishingRibbonToTree: () => void;
  grottoShrineTarget: SacredShrineTarget;
} {
  const grottoAndTree = new THREE.Group();
  grottoAndTree.name = 'BodhiTree';
  grottoAndTree.position.set(-7.2, 0, 20.5);

  const rockMat = new THREE.MeshLambertMaterial({ color: 0x767b82 });
  const whiteRobeMat = new THREE.MeshLambertMaterial({ color: 0xfafbfc });
  const royalAoDaiMat = new THREE.MeshStandardMaterial({
    color: 0xffd75e,
    roughness: 0.32,
    metalness: 0.55
  });
  const marianBlueMat = new THREE.MeshLambertMaterial({ color: 0x2b72b8 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4f3524 });
  const pineGreenMat1 = new THREE.MeshLambertMaterial({ color: 0x245c36 });
  const pineGreenMat2 = new THREE.MeshLambertMaterial({ color: 0x2e7344 });
  const goldStarMat = new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide });
  const cardWhiteMat = new THREE.MeshBasicMaterial({ color: 0xfff9e6, side: THREE.DoubleSide });

  // Đài Đức Mẹ La Vang bằng đá cẩm thạch trắng + 2 tượng Thiên Thần Chầu từ /models/statue.glb
  const grottoRocks = new THREE.Group();
  grottoRocks.position.set(1.35, 0, -0.3);
  const marblePedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.15, 0.55, 24),
    whiteRobeMat
  );
  marblePedestal.position.set(0, 0.275, 0);
  marblePedestal.castShadow = true;
  marblePedestal.receiveShadow = true;
  grottoRocks.add(marblePedestal);

  // Tượng Đức Mẹ Bế Chúa Hài Đồng 3D thật (/models/madonna_child.glb — Michelangelo's Bruges Madonna)
  const gltfLoader = new GLTFLoader();
  gltfLoader.load('/models/madonna_child.glb', (gltf) => {
    const madonna = gltf.scene.clone(true);
    madonna.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.material = royalAoDaiMat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const b = new THREE.Box3().setFromObject(madonna);
    const sz = new THREE.Vector3();
    b.getSize(sz);
    madonna.scale.setScalar(2.15 / Math.max(0.001, sz.y));
    const sb = new THREE.Box3().setFromObject(madonna);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    madonna.position.set(-sc.x, 0.55 - sb.min.y, -sc.z);
    grottoRocks.add(madonna);
  });

  const maryHalo = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.36, 24), goldStarMat);
  maryHalo.position.set(0, 2.45, -0.12);
  grottoRocks.add(maryHalo);

  // Nạp 2 Tượng Thiên Thần Chầu hai bên từ /models/statue.glb
  gltfLoader.load('/models/statue.glb', (gltf) => {
    const leftAngel = gltf.scene.getObjectByName('GirlLeftPosed1');
    const rightAngel = gltf.scene.getObjectByName('GirlRightPosed1');
    [
      { node: leftAngel, x: -0.78 },
      { node: rightAngel, x: 0.78 }
    ].forEach(({ node, x }) => {
      if (!node) return;
      const c = node.clone(true);
      c.traverse((ch) => {
        if ((ch as THREE.Mesh).isMesh) {
          (ch as THREE.Mesh).material = whiteRobeMat;
        }
      });
      const b = new THREE.Box3().setFromObject(c);
      const sz = new THREE.Vector3();
      b.getSize(sz);
      c.scale.setScalar(1.25 / Math.max(0.001, sz.y));
      const sb = new THREE.Box3().setFromObject(c);
      const sc = new THREE.Vector3();
      sb.getCenter(sc);
      c.position.set(x - sc.x, 0.55 - sb.min.y, 0.15 - sc.z);
      grottoRocks.add(c);
    });
  });

  const grottoPlaque = createShrineNameplateSprite(
    '👑 ĐÀI ĐỨC MẸ LA VANG',
    'Chạm để Cầu Nguyện cùng Đức Mẹ (+20 Ân Sủng)',
    '#7fb3ff'
  );
  grottoPlaque.position.set(0, 3.55, 0.3);
  grottoRocks.add(grottoPlaque);
  grottoAndTree.add(grottoRocks);

  // Cây Thông Nguyện Ước nơi giáo dân treo Thẻ Ý Nguyện Vàng
  const planter = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.48, 0.42, 10), rockMat);
  planter.position.set(-0.2, 0.21, 0.2);
  grottoAndTree.add(planter);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 3.2, 9), trunkMat);
  trunk.position.set(-0.2, 1.6, 0.2);
  trunk.castShadow = true;
  grottoAndTree.add(trunk);

  const tiers: [number, number, number][] = [
    [2.3, 1.8, 1.8],
    [3.3, 1.45, 1.6],
    [4.2, 1.05, 1.4]
  ];
  tiers.forEach(([ty, rad, h], idx) => {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(rad, h, 10),
      idx % 2 === 0 ? pineGreenMat1 : pineGreenMat2
    );
    cone.position.set(-0.2, ty, 0.2);
    cone.castShadow = true;
    grottoAndTree.add(cone);
  });

  // Ngôi sao Bethlehem trên đỉnh cây nguyện ước
  const topStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), goldStarMat);
  topStar.position.set(-0.2, 5.05, 0.2);
  grottoAndTree.add(topStar);

  const ribbonsGroup = new THREE.Group();
  ribbonsGroup.position.set(-0.2, 0, 0.2);
  grottoAndTree.add(ribbonsGroup);

  let ribbonCount = 0;
  const addWishingRibbonToTree = () => {
    if (ribbonCount >= 36) return;
    const angle = ribbonCount * 1.15 + 0.4;
    const tierIdx = ribbonCount % 3;
    const radius = 1.45 - tierIdx * 0.28;
    const yPos = 2.0 + tierIdx * 0.85;
    const rx = Math.cos(angle) * radius;
    const rz = Math.sin(angle) * radius;

    const tag = new THREE.Group();
    tag.position.set(rx, yPos, rz);
    tag.rotation.y = -angle;

    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.28), goldStarMat);
    tag.add(card);

    const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.2), cardWhiteMat);
    inner.position.set(0, 0, 0.004);
    tag.add(inner);

    ribbonsGroup.add(tag);
    ribbonCount++;
  };

  for (let i = 0; i < 8; i++) {
    addWishingRibbonToTree();
  }

  parent.add(grottoAndTree);
  return {
    bodhiTreeMesh: grottoAndTree,
    addWishingRibbonToTree,
    grottoShrineTarget: {
      id: 'shrine_our_lady_lavang',
      name: 'Đức Mẹ La Vang',
      prayerText: '👑 Lạy Đức Mẹ La Vang, xin che chở và cầu bầu cho gia đình chúng con!',
      speechText: 'Lạy Đức Mẹ La Vang, xin che chở và cầu bầu cho gia đình chúng con',
      standX: -6.1,
      standZ: 22.6,
      faceRotationY: 0,
      mesh: grottoRocks
    }
  };
}

/**
 * Xây dựng 4 Đài Thánh Phụng Thờ hai bên lòng Nhà Thờ:
 * 1. Đài Đức Mẹ Maria Ban Ơn (X = -5.8, Z = -8.2)
 * 2. Đài Thánh Cả Giuse Bảo Trợ Gia Đình (X = +5.8, Z = -8.2)
 * 3. Đài Chúa Giêsu Lòng Thương Xót (X = -6.0, Z = 2.2)
 * 4. Đài Tổng Lãnh Thiên Thần Micae (X = +6.0, Z = 2.2)
 */
function buildCathedralSacredSideShrines(parent: THREE.Group): SacredShrineTarget[] {
  const targets: SacredShrineTarget[] = [];
  const loader = new GLTFLoader();

  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xf7f5f0,
    roughness: 0.28,
    metalness: 0.08
  });
  const marianBlueMat = new THREE.MeshStandardMaterial({
    color: 0x2b75c9,
    roughness: 0.35,
    metalness: 0.12
  });
  const josephRobeMat = new THREE.MeshStandardMaterial({
    color: 0x6b442a,
    roughness: 0.45
  });
  const josephMantleMat = new THREE.MeshStandardMaterial({
    color: 0xd99b38,
    roughness: 0.38,
    metalness: 0.2
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd559,
    roughness: 0.22,
    metalness: 0.82,
    emissive: 0x4f3205
  });

  // =========================================================================
  // 1. ĐÀI ĐỨC MẸ MARIA BAN ƠN (BÊN TRÁI CUNG THÁNH: X = -5.8, Z = -8.2)
  // =========================================================================
  const maryShrine = new THREE.Group();
  maryShrine.name = 'ShrineVirginMary';
  maryShrine.position.set(-5.8, 0, -8.2);

  const maryPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 1.15, 24), marbleMat);
  maryPedestal.position.y = 0.58;
  maryPedestal.castShadow = true;
  maryShrine.add(maryPedestal);

  // Trăng lưỡi liềm bạc & Hoa hồng trắng dưới chân Đức Mẹ
  const crescentMoon = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.08, 10, 24, Math.PI * 1.15),
    new THREE.MeshStandardMaterial({ color: 0xe8f1fc, metalness: 0.65, roughness: 0.2 })
  );
  crescentMoon.position.set(0, 1.25, 0.1);
  crescentMoon.rotation.z = Math.PI * 0.92;
  maryShrine.add(crescentMoon);

  for (let r = 0; r < 8; r++) {
    const a = (r / 8) * Math.PI * 2;
    const rose = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.085, 0),
      new THREE.MeshLambertMaterial({ color: r % 2 === 0 ? 0xffffff : 0xffbfd3 })
    );
    rose.position.set(Math.cos(a) * 0.52, 1.18, Math.sin(a) * 0.52);
    maryShrine.add(rose);
  }

  const maryFigure = new THREE.Group();
  maryFigure.position.set(0, 1.15, 0);

  const marianStatueMat = new THREE.MeshStandardMaterial({
    color: 0xf2f7ff,
    roughness: 0.25,
    metalness: 0.12,
    emissive: 0x102238
  });

  // Nạp mô hình điêu khắc 3D thật của Đức Mẹ Maria từ /models/virgin_mary.glb
  loader.load('/models/virgin_mary.glb', (gltf) => {
    const model = gltf.scene.clone(true);
    model.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.material = marianStatueMat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    model.scale.setScalar(2.35 / Math.max(0.001, sz.y));
    const sb = new THREE.Box3().setFromObject(model);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    model.position.set(-sc.x, -sb.min.y, -sc.z);
    maryFigure.add(model);
  });

  // Triều thiên 12 Ngôi Sao Vàng quanh đầu Đức Mẹ
  const starHaloGroup = new THREE.Group();
  starHaloGroup.position.set(0, 2.15, -0.12);
  for (let s = 0; s < 12; s++) {
    const sa = (s / 12) * Math.PI * 2;
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.042, 0),
      new THREE.MeshBasicMaterial({ color: 0xffe566 })
    );
    star.position.set(Math.cos(sa) * 0.45, Math.sin(sa) * 0.45, 0);
    starHaloGroup.add(star);
  }
  maryFigure.add(starHaloGroup);
  maryShrine.add(maryFigure);

  const maryPlaque = createShrineNameplateSprite(
    '🌹 ĐỨC MẸ MARIA BAN ƠN',
    'Chạm để Cầu Nguyện cùng Đức Mẹ (+20 Ân Sủng)',
    '#66ccff'
  );
  maryPlaque.position.set(0, 4.15, 0.2);
  maryShrine.add(maryPlaque);
  parent.add(maryShrine);

  targets.push({
    id: 'shrine_virgin_mary',
    name: 'Đức Mẹ Maria Ban Ơn',
    prayerText: '🌹 Kính mừng Maria đầy ơn phúc, xin Đức Mẹ ban ơn bình an cho chúng con!',
    speechText: 'Kính mừng Maria đầy ơn phúc, xin Đức Mẹ ban ơn bình an cho chúng con',
    standX: -5.8,
    standZ: -6.0,
    faceRotationY: 0,
    mesh: maryShrine
  });

  // =========================================================================
  // 2. ĐÀI THÁNH CẢ GIUSE (BÊN PHẢI CUNG THÁNH: X = +5.8, Z = -8.2)
  // =========================================================================
  const josephShrine = new THREE.Group();
  josephShrine.name = 'ShrineSaintJoseph';
  josephShrine.position.set(5.8, 0, -8.2);

  const josephPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.15, 1.15, 24),
    marbleMat
  );
  josephPedestal.position.y = 0.58;
  josephPedestal.castShadow = true;
  josephShrine.add(josephPedestal);

  const josephFigure = new THREE.Group();
  josephFigure.position.set(0, 1.15, 0);

  const josephBronzeMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf3e8d2,
    roughness: 0.28,
    metalness: 0.22,
    emissive: 0x261a08
  });

  // Nạp mô hình điêu khắc 3D thật của Thánh Cả Giuse từ /models/saint_joseph.glb
  loader.load('/models/saint_joseph.glb', (gltf) => {
    const model = gltf.scene.clone(true);
    model.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.material = josephBronzeMarbleMat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    model.scale.setScalar(2.45 / Math.max(0.001, sz.y));
    const sb = new THREE.Box3().setFromObject(model);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    model.position.set(-sc.x, -sb.min.y, -sc.z);
    josephFigure.add(model);
  });

  const jHalo = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 24), goldMat);
  jHalo.position.set(0, 2.22, -0.12);
  josephFigure.add(jHalo);

  josephShrine.add(josephFigure);

  const josephPlaque = createShrineNameplateSprite(
    '⚜️ THÁNH CẢ GIUSE',
    'Chạm để Cầu Nguyện cùng Thánh Cả (+20 Ân Sủng)',
    '#ffd700'
  );
  josephPlaque.position.set(0, 4.15, 0.2);
  josephShrine.add(josephPlaque);
  parent.add(josephShrine);

  targets.push({
    id: 'shrine_saint_joseph',
    name: 'Thánh Cả Giuse',
    prayerText: '⚜️ Lạy Thánh Cả Giuse, Đấng bảo trợ gia đình, xin cầu cho chúng con!',
    speechText: 'Lạy Thánh Cả Giuse, Đấng bảo trợ gia đình, xin cầu cho chúng con',
    standX: 5.8,
    standZ: -6.0,
    faceRotationY: 0,
    mesh: josephShrine
  });

  // =========================================================================
  // 3. ĐÀI CHÚA GIÊSU LÒNG THƯƠNG XÓT (X = -6.0, Z = 2.2)
  // =========================================================================
  const mercyShrine = new THREE.Group();
  mercyShrine.name = 'ShrineDivineMercy';
  mercyShrine.position.set(-6.0, 0, 2.2);
  mercyShrine.rotation.y = Math.PI / 2;

  const mercyBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.05, 1.6), marbleMat);
  mercyBase.position.y = 0.525;
  mercyBase.castShadow = true;
  mercyShrine.add(mercyBase);

  const mercyFigure = new THREE.Group();
  mercyFigure.position.set(0, 1.05, 0);

  // Nạp mô hình điêu khắc 3D thật của Chúa Giêsu Phục Sinh (Michelangelo's Risen Christ) từ /models/risen_christ.glb
  loader.load('/models/risen_christ.glb', (gltf) => {
    const model = gltf.scene.clone(true);
    model.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.material = marbleMat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    model.scale.setScalar(2.45 / Math.max(0.001, sz.y));
    const sb = new THREE.Box3().setFromObject(model);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    model.position.set(-sc.x, -sb.min.y, -sc.z);
    mercyFigure.add(model);
  });

  const mHalo = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 24), goldMat);
  mHalo.position.set(0, 2.2, -0.12);
  mercyFigure.add(mHalo);

  mercyShrine.add(mercyFigure);

  const mercyPlaque = createShrineNameplateSprite(
    '❤️ LÒNG CHÚA THƯƠNG XÓT',
    'Lạy Chúa Giêsu, Con Tín Thác Vào Chúa (+20 Ân Sủng)',
    '#ff6666'
  );
  mercyPlaque.position.set(0, 4.05, 0);
  mercyShrine.add(mercyPlaque);
  parent.add(mercyShrine);

  targets.push({
    id: 'shrine_divine_mercy',
    name: 'Chúa Giêsu Lòng Thương Xót',
    prayerText: '❤️ Lạy Chúa Giêsu Lòng Thương Xót, con tín thác vào Chúa!',
    speechText: 'Lạy Chúa Giêsu Lòng Thương Xót, con tín thác vào Chúa',
    standX: -4.2,
    standZ: 2.2,
    faceRotationY: Math.PI / 2,
    mesh: mercyShrine
  });

  // =========================================================================
  // 4. ĐÀI THÁNH MICAE TỔNG LÃNH THIÊN THẦN (X = +6.0, Z = 2.2) — Mô hình 3D /models/knight.glb
  // =========================================================================
  const michaelShrine = new THREE.Group();
  michaelShrine.name = 'ShrineArchangelMichael';
  michaelShrine.position.set(6.0, 0, 2.2);
  michaelShrine.rotation.y = -Math.PI / 2;

  const michaelBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.05, 1.6), marbleMat);
  michaelBase.position.y = 0.525;
  michaelBase.castShadow = true;
  michaelShrine.add(michaelBase);

  const michaelFigure = new THREE.Group();
  michaelFigure.position.set(0, 1.05, 0);

  const mHaloRing = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 24), goldMat);
  mHaloRing.position.set(0, 2.15, -0.1);
  michaelFigure.add(mHaloRing);

  // Nạp mô hình 3D chiến binh giáp vàng từ /models/knight.glb cho Thánh Micae Tổng Lãnh Thiên Thần
  loader.load('/models/knight.glb', (gltf) => {
    const model = gltf.scene.clone(true);
    model.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const mesh = ch as THREE.Mesh;
        mesh.material = goldMat;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    model.scale.setScalar(2.35 / Math.max(0.001, sz.y));
    const sb = new THREE.Box3().setFromObject(model);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    model.position.set(-sc.x, -sb.min.y, -sc.z);
    michaelFigure.add(model);
  });

  michaelShrine.add(michaelFigure);

  const michaelPlaque = createShrineNameplateSprite(
    '⚔️ THÁNH MICAE TỔNG LÃNH',
    'Chạm để Xin Thánh Micae Bảo Vệ (+20 Ân Sủng)',
    '#ffd700'
  );
  michaelPlaque.position.set(0, 4.05, 0);
  michaelShrine.add(michaelPlaque);
  parent.add(michaelShrine);

  targets.push({
    id: 'shrine_saint_michael',
    name: 'Thánh Micae Tổng Lãnh Thiên Thần',
    prayerText: '⚔️ Lạy Thánh Micae Tổng Lãnh Thiên Thần, xin bảo vệ chúng con trong chiến trận thiêng liêng!',
    speechText: 'Lạy Thánh Micae Tổng Lãnh Thiên Thần, xin bảo vệ chúng con',
    standX: 4.2,
    standZ: 2.2,
    faceRotationY: -Math.PI / 2,
    mesh: michaelShrine
  });

  return targets;
}

function buildChurchBellTower(parent: THREE.Group): THREE.Object3D {
  const tower = new THREE.Group();
  tower.name = 'ChurchBellTower';
  tower.position.set(7.2, 0, 20.5);

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0xd6d0c4 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x364257 });
  const bronzeBellMat = new THREE.MeshStandardMaterial({
    color: 0xc99c38,
    roughness: 0.28,
    metalness: 0.78
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.4, 2.7), stoneMat);
  base.position.set(0, 0.2, 0);
  base.receiveShadow = true;
  tower.add(base);

  for (const [px, pz] of [
    [-1.05, -1.05],
    [1.05, -1.05],
    [-1.05, 1.05],
    [1.05, 1.05]
  ]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 0.32), stoneMat);
    post.position.set(px, 2.0, pz);
    post.castShadow = true;
    tower.add(post);
  }

  const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(2.15, 2.2, 4), roofMat);
  spireRoof.rotation.y = Math.PI / 4;
  spireRoof.position.set(0, 4.85, 0);
  spireRoof.castShadow = true;
  tower.add(spireRoof);

  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), bronzeBellMat);
  crossV.position.set(0, 6.2, 0);
  tower.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.08), bronzeBellMat);
  crossH.position.set(0, 6.32, 0);
  tower.add(crossH);

  const bellGroup = new THREE.Group();
  bellGroup.position.set(0, 2.45, 0);
  bellGroup.name = 'TempleBellMesh';
  bellGroup.userData.isTempleBell = true;

  const bellTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    bronzeBellMat
  );
  bellTop.position.set(0, 0.32, 0);
  bellTop.userData.isTempleBell = true;
  bellGroup.add(bellTop);

  const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.62, 0.88, 16), bronzeBellMat);
  bellBody.position.set(0, -0.12, 0);
  bellBody.castShadow = true;
  bellBody.userData.isTempleBell = true;
  bellGroup.add(bellBody);

  tower.add(bellGroup);
  parent.add(tower);
  return bellGroup;
}
