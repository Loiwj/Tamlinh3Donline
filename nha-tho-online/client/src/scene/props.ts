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

function createTempleShrineNameplateSprite(
  title: string,
  subtitle: string,
  borderColor = '#ffd700'
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(42, 18, 8, 0.90)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, 18);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#ffe599';
  ctx.fillText(title, 256, 46);

  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#8ef5c0';
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

  ctx.fillStyle = '#3b1608';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#e5b842';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.fillStyle = '#ffd966';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
  ctx.fillText(title, 256, subtitle ? 48 : 64);

  if (subtitle) {
    ctx.font = '24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffefb3';
    ctx.fillText(subtitle, 256, 92);
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * Vẽ Texture Hào Quang Phật 24 tia sáng vàng kim & vòng hoa sen
 */
function createBuddhaHaloRaysTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  // Nền hào quang vàng ấm tỏa tròn
  const bgGrad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 250);
  bgGrad.addColorStop(0, 'rgba(255, 250, 210, 0.95)');
  bgGrad.addColorStop(0.32, 'rgba(255, 215, 80, 0.65)');
  bgGrad.addColorStop(0.68, 'rgba(255, 165, 20, 0.25)');
  bgGrad.addColorStop(1, 'rgba(255, 140, 0, 0.0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // 24 tia hào quang rực rỡ
  ctx.save();
  ctx.translate(cx, cy);
  const rayCount = 24;
  for (let i = 0; i < rayCount; i++) {
    ctx.rotate((Math.PI * 2) / rayCount);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, -245);
    ctx.lineTo(14, -245);
    ctx.closePath();
    const rayGrad = ctx.createLinearGradient(0, 0, 0, -245);
    rayGrad.addColorStop(0, 'rgba(255, 255, 220, 0.85)');
    rayGrad.addColorStop(0.6, 'rgba(255, 210, 60, 0.45)');
    rayGrad.addColorStop(1, 'rgba(255, 180, 0, 0.0)');
    ctx.fillStyle = rayGrad;
    ctx.fill();
  }
  ctx.restore();

  // Vòng tròn kim quang đồng tâm
  for (const r of [95, 145, 195]) {
    ctx.strokeStyle = 'rgba(255, 235, 130, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * Vẽ Texture hạt khói nhang rõ nét, mềm mại như khói trầm hương
 */
function createSmokeParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(248, 245, 238, 0.92)');
  grad.addColorStop(0.45, 'rgba(225, 220, 210, 0.55)');
  grad.addColorStop(0.8, 'rgba(195, 190, 180, 0.2)');
  grad.addColorStop(1, 'rgba(180, 175, 165, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

interface BuddhaHaloController {
  setSacredActive(active: boolean): void;
  triggerPulse(durationSeconds?: number): void;
  update(dt: number, elapsedSeconds: number): void;
}

export function buildTempleProps(scene: THREE.Scene): TemplePropsManager {
  const propsGroup = new THREE.Group();
  propsGroup.name = 'TempleProps';

  // 1. Cổng Tam Quan ở lối vào sân chùa (Z = 26.2)
  buildTamQuanGate(propsGroup);

  // 2. Tượng Phật 3D lớn (`/models/buddha.glb`) trên đài sen cao + Hào Quang Phật rực rỡ
  const { haloController, mainBuddhaTarget } = buildGreatBuddhaStatueAndHalo(propsGroup);

  // 3. Bàn thờ với hoa quả, nến và Ống Xăm Tre (X = 0, Z = -7.2)
  const { candleFlames, fortuneCylinderMesh } = buildAltarWithOfferings(propsGroup);

  // 4. Lư hương đồng lớn đặt giữa điện (X = 0, Z = -3.8) + Hệ thống nhang & khói trầm rõ đẹp
  const { burnerMesh, incenseGroup, smokeSystem, defaultBurnerTips } =
    buildIncenseBurnerAndSmoke(propsGroup);

  // 5. 12 Bồ đoàn xếp thành 2 hàng đối diện tượng Phật
  const cushionMeshes = buildBowingCushions(propsGroup);

  // 6. Đèn lồng treo trần
  const lanternMeshes = buildCeilingLanterns(propsGroup);

  // 7. Cây bồ đề ước nguyện ở sân ngoài (X = -7.2, Z = 20.5)
  const { bodhiTreeMesh, addWishingRibbonToTree } = buildBodhiTree(propsGroup);

  // 8. Chuông chùa (Đại Hồng Chung) ở góc sân (X = +7.2, Z = 20.5)
  const bellMesh = buildTempleBellPavilion(propsGroup);

  // 9. Các Bảo Đài Tôn Tượng Chư Phật & Bồ Tát trong Chùa: A Di Đà, Quan Thế Âm, Địa Tạng Vương, Di Lặc, Hộ Pháp Vi Đà
  const sideShrines = buildBuddhistSacredSideShrines(propsGroup);
  const shrineTargets: SacredShrineTarget[] = [mainBuddhaTarget, ...sideShrines];

  scene.add(propsGroup);

  // Quản lý các nén nhang của người chơi đang cháy trong lư hương
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
        stickObj = createSingleIncenseStickMesh(stick);
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
      // Cập nhật Hào Quang Phật (bừng sáng rực rỡ khi Lạy hoặc Đốt nhang)
      haloController.update(dt, elapsedSeconds);

      // Ngọn nến trên bàn thờ lung linh nhẹ
      for (let i = 0; i < candleFlames.length; i++) {
        const s = 1 + Math.sin(elapsedSeconds * 8 + i * 2) * 0.12;
        candleFlames[i].scale.set(1, s, 1);
      }

      // Đèn lồng đung đưa nhẹ
      for (let i = 0; i < lanternMeshes.length; i++) {
        lanternMeshes[i].rotation.z = Math.sin(elapsedSeconds * 1.2 + i) * 0.025;
      }

      // Luôn có khói trầm hương bay lên từ 3 nén hương chủ lễ + toàn bộ nhang người chơi cắm
      const allTips =
        activeTipPositions.length > 0
          ? [...defaultBurnerTips, ...activeTipPositions]
          : defaultBurnerTips;
      smokeSystem.update(dt, allTips);
    }
  };
}

function buildTamQuanGate(parent: THREE.Group): void {
  const gate = new THREE.Group();
  gate.name = 'TamQuanGate';
  gate.position.set(0, 0, 26.2);

  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xc99e5a });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5c2612 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x822417 });
  const goldMat = new THREE.MeshLambertMaterial({ color: 0xe6b83a });

  const pillarXs = [-5.6, -1.9, 1.9, 5.6];
  for (const x of pillarXs) {
    const isInner = Math.abs(x) < 3;
    const h = isInner ? 5.4 : 4.4;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.75, h, 0.75), pillarMat);
    pillar.position.set(x, h / 2, 0);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    gate.add(pillar);

    const lotusTop = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.65, 8), goldMat);
    lotusTop.position.set(x, h + 0.32, 0);
    gate.add(lotusTop);
  }

  const centerBeam = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.7, 0.85), woodMat);
  centerBeam.position.set(0, 4.3, 0);
  gate.add(centerBeam);

  const leftBeam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.55, 0.75), woodMat);
  leftBeam.position.set(-3.75, 3.5, 0);
  gate.add(leftBeam);

  const rightBeam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.55, 0.75), woodMat);
  rightBeam.position.set(3.75, 3.5, 0);
  gate.add(rightBeam);

  const mainRoof1 = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.2, 4), roofMat);
  mainRoof1.rotation.y = Math.PI / 4;
  mainRoof1.scale.set(1.35, 1, 0.55);
  mainRoof1.position.set(0, 5.2, 0);
  gate.add(mainRoof1);

  const mainRoof2 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.1, 4), roofMat);
  mainRoof2.rotation.y = Math.PI / 4;
  mainRoof2.scale.set(1.35, 1, 0.55);
  mainRoof2.position.set(0, 6.2, 0);
  gate.add(mainRoof2);

  for (const sideX of [-3.75, 3.75]) {
    const sideRoof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.0, 4), roofMat);
    sideRoof.rotation.y = Math.PI / 4;
    sideRoof.scale.set(1.25, 1, 0.55);
    sideRoof.position.set(sideX, 4.25, 0);
    gate.add(sideRoof);
  }

  const signTex = createSignboardTexture('CHÙA VIỆT TỊNH TÂM', 'CỔNG TAM QUAN');
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.78, 0.14), signMat);
  signBoard.position.set(0, 4.35, -0.42);
  gate.add(signBoard);

  const signBoardFront = signBoard.clone();
  signBoardFront.position.set(0, 4.35, 0.42);
  gate.add(signBoardFront);

  parent.add(gate);
}

function buildGreatBuddhaStatueAndHalo(parent: THREE.Group): {
  haloController: BuddhaHaloController;
  mainBuddhaTarget: SacredShrineTarget;
} {
  const statueGroup = new THREE.Group();
  statueGroup.name = 'GreatBuddhaStatue';
  statueGroup.position.set(0, 0, -11.5);

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x7c5a3f });
  const lotusPetalMat = new THREE.MeshStandardMaterial({
    color: 0xd96b70,
    roughness: 0.42,
    metalness: 0.22
  });
  const goldBuddhaMat = new THREE.MeshStandardMaterial({
    color: 0xffd252,
    roughness: 0.22,
    metalness: 0.78,
    emissive: 0x4f3205
  });

  // Bệ đá tam cấp cao trang nghiêm
  const baseStep1 = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.6, 4.4), stoneMat);
  baseStep1.position.set(0, 0.3, 0);
  baseStep1.receiveShadow = true;
  baseStep1.castShadow = true;
  statueGroup.add(baseStep1);

  const baseStep2 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.7, 3.4), stoneMat);
  baseStep2.position.set(0, 0.95, 0);
  baseStep2.castShadow = true;
  statueGroup.add(baseStep2);

  // Đài sen lớn trên bệ
  const lotusCore = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.38, 0.55, 20), goldBuddhaMat);
  lotusCore.position.set(0, 1.55, 0);
  statueGroup.add(lotusCore);

  const petalCount = 16;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.78, 6), lotusPetalMat);
    petal.position.set(Math.cos(angle) * 1.68, 1.64, Math.sin(angle) * 1.68);
    petal.rotation.x = 0.38 * Math.sin(angle);
    petal.rotation.z = -0.38 * Math.cos(angle);
    statueGroup.add(petal);
  }

  // Nạp mô hình Tượng Phật Tọa Thiền 3D điêu khắc thật (/models/elizondo_buddha.glb) đặt trên đài sen
  const loader = new GLTFLoader();
  loader.load('/models/elizondo_buddha.glb', (gltf) => {
    const buddhaModel = gltf.scene.clone(true);
    buddhaModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = goldBuddhaMat;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    // Tự động tính toán hộp bao để căn giữa và đặt cao 2.95m ngay trên đài sen (Y = 1.82m)
    const box = new THREE.Box3().setFromObject(buddhaModel);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const desiredHeight = 2.95;
    const scale = desiredHeight / Math.max(0.0001, size.y);
    buddhaModel.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(buddhaModel);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    buddhaModel.position.set(
      -scaledCenter.x,
      1.82 - scaledBox.min.y,
      -scaledCenter.z + 0.1
    );

    statueGroup.add(buddhaModel);
  });

  // ============================================================================
  // HỆ THỐNG HÀO QUANG PHẬT ĐA TẦNG (Rực rỡ khi Lạy và khi Đốt nhang)
  // ============================================================================
  const haloGroup = new THREE.Group();
  haloGroup.name = 'BuddhaSacredHalo';
  haloGroup.position.set(0, 3.85, -0.75);
  statueGroup.add(haloGroup);

  const raysTex = createBuddhaHaloRaysTexture();

  // Lớp 1: Đĩa hào quang chính 24 tia xoay thuận chiều kim đồng hồ
  const mainHaloMat = new THREE.MeshBasicMaterial({
    map: raysTex,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const mainHaloDisc = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), mainHaloMat);
  haloGroup.add(mainHaloDisc);

  // Lớp 2: Đĩa hào quang ngoại vi xoay ngược chiều tạo hiệu ứng kim quang lấp lánh
  const outerHaloMat = new THREE.MeshBasicMaterial({
    map: raysTex,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const outerHaloDisc = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 6.0), outerHaloMat);
  outerHaloDisc.position.z = -0.08;
  haloGroup.add(outerHaloDisc);

  // Lớp 3: Vòng kim luân rực sáng sau đầu Đức Phật
  const headRingMat = new THREE.MeshBasicMaterial({
    color: 0xffe57f,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const headRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.32, 32), headRingMat);
  headRing.position.set(0, 0.55, 0.05);
  haloGroup.add(headRing);

  // Lớp 4: Các hạt kim quang bay tỏa quanh tượng Phật khi Lạy / Đốt nhang
  const auraParticleCount = 48;
  const auraPositions = new Float32Array(auraParticleCount * 3);
  const auraSpeeds = new Float32Array(auraParticleCount);
  for (let i = 0; i < auraParticleCount; i++) {
    const angle = (i / auraParticleCount) * Math.PI * 2;
    const r = 1.2 + Math.random() * 1.8;
    auraPositions[i * 3] = Math.cos(angle) * r;
    auraPositions[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
    auraPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    auraSpeeds[i] = 0.4 + Math.random() * 0.6;
  }
  const auraGeo = new THREE.BufferGeometry();
  auraGeo.setAttribute('position', new THREE.BufferAttribute(auraPositions, 3));
  const auraMat = new THREE.PointsMaterial({
    color: 0xffdf66,
    size: 0.16,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const auraPoints = new THREE.Points(auraGeo, auraMat);
  haloGroup.add(auraPoints);

  // Lớp 5: Đèn PointLight chiếu sáng hào quang vàng kim
  const haloLight = new THREE.PointLight(0xffcf40, 1.5, 22, 1.2);
  haloLight.position.set(0, 0.5, 0.8);
  haloGroup.add(haloLight);

  const mainBuddhaPlaque = createTempleShrineNameplateSprite(
    '🪷 ĐỨC PHẬT THÍCH CA MÂU NI',
    'Chạm vào Tượng Phật để Lễ Lạy (+20 Công Đức)',
    '#ffd700'
  );
  mainBuddhaPlaque.position.set(0, 5.85, 0.5);
  statueGroup.add(mainBuddhaPlaque);

  parent.add(statueGroup);

  let isSacredActive = false;
  let pulseRemainingSec = 0;
  let currentBoost = 0; // 0 = bình thường dịu nhẹ, 1 = rực rỡ khi Lạy / Đốt nhang

  const haloController: BuddhaHaloController = {
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

      // Tốc độ xoay và độ rực rỡ tăng mạnh khi người chơi Lạy hoặc Đốt nhang
      const rotSpeed = 0.22 + currentBoost * 0.65;
      mainHaloDisc.rotation.z += rotSpeed * dt;
      outerHaloDisc.rotation.z -= rotSpeed * 0.75 * dt;

      const pulseWave = Math.sin(elapsedSeconds * (3.0 + currentBoost * 3.0)) * 0.08;
      const scaleVal = 1.0 + currentBoost * 0.38 + pulseWave;
      mainHaloDisc.scale.setScalar(scaleVal);
      outerHaloDisc.scale.setScalar(1.0 + currentBoost * 0.45 - pulseWave * 0.5);
      headRing.scale.setScalar(1.0 + currentBoost * 0.22 + pulseWave);

      mainHaloMat.opacity = 0.35 + currentBoost * 0.6;
      outerHaloMat.opacity = 0.18 + currentBoost * 0.55;
      headRingMat.opacity = 0.5 + currentBoost * 0.5;
      auraMat.opacity = 0.15 + currentBoost * 0.85;
      auraMat.size = 0.14 + currentBoost * 0.14;
      haloLight.intensity = 1.4 + currentBoost * 4.2 + pulseWave * 2.0;

      // Hạt kim quang bay lên quanh Đức Phật
      const posAttr = auraGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < auraParticleCount; i++) {
        let y = posAttr.getY(i) + auraSpeeds[i] * (1 + currentBoost * 1.8) * dt;
        if (y > 2.2) y = -1.8;
        const x = posAttr.getX(i) + Math.sin(elapsedSeconds * 2 + i) * 0.004;
        posAttr.setXYZ(i, x, y, posAttr.getZ(i));
      }
      posAttr.needsUpdate = true;
    }
  };

  return {
    haloController,
    mainBuddhaTarget: {
      id: 'shrine_shakyamuni_buddha',
      name: 'Đức Phật Bổn Sư Thích Ca Mâu Ni',
      prayerText: '🪷 Nam Mô Bổn Sư Thích Ca Mâu Ni Phật 🙏',
      speechText: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
      standX: 0,
      standZ: -5.4,
      faceRotationY: 0,
      mesh: statueGroup
    }
  };
}

function buildAltarWithOfferings(parent: THREE.Group): {
  candleFlames: THREE.Mesh[];
  fortuneCylinderMesh: THREE.Object3D;
} {
  const altarGroup = new THREE.Group();
  altarGroup.name = 'AltarWithOfferings';
  altarGroup.position.set(0, 0, -7.2);

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x6b2414 });
  const goldTrimMat = new THREE.MeshLambertMaterial({ color: 0xd9a738 });

  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 1.7), woodMat);
  tableTop.position.set(0, 1.25, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  altarGroup.add(tableTop);

  const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.65, 1.4), goldTrimMat);
  frontPanel.position.set(0, 0.85, 0);
  altarGroup.add(frontPanel);

  for (const [lx, lz] of [
    [-2.35, -0.65],
    [2.35, -0.65],
    [-2.35, 0.65],
    [2.35, 0.65]
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.2, 0.24), woodMat);
    leg.position.set(lx, 0.6, lz);
    leg.castShadow = true;
    altarGroup.add(leg);
  }

  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.42, 0.22, 14), goldTrimMat);
  tray.position.set(0, 1.46, 0);
  altarGroup.add(tray);

  const fruits: { x: number; y: number; z: number; r: number; color: number }[] = [
    { x: 0, y: 1.72, z: 0, r: 0.24, color: 0x6aa84f },
    { x: -0.28, y: 1.65, z: 0.16, r: 0.15, color: 0xff9900 },
    { x: 0.28, y: 1.65, z: 0.16, r: 0.15, color: 0xe06666 },
    { x: -0.2, y: 1.65, z: -0.22, r: 0.14, color: 0xf1c232 },
    { x: 0.22, y: 1.65, z: -0.22, r: 0.15, color: 0xd54d79 }
  ];
  for (const f of fruits) {
    const fruitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(f.r, 10, 8),
      new THREE.MeshLambertMaterial({ color: f.color })
    );
    fruitMesh.position.set(f.x, f.y, f.z);
    altarGroup.add(fruitMesh);
  }

  const vaseMat = new THREE.MeshLambertMaterial({ color: 0xdedede });
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x2e6b34 });
  const lotusMat = new THREE.MeshLambertMaterial({ color: 0xf48fb1 });

  for (const vx of [-1.25, 1.25]) {
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.55, 10), vaseMat);
    vase.position.set(vx, 1.62, -0.1);
    altarGroup.add(vase);

    for (const offset of [-0.08, 0, 0.08]) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), stemMat);
      stem.position.set(vx + offset, 2.0, -0.1);
      altarGroup.add(stem);

      const bud = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 7), lotusMat);
      bud.position.set(vx + offset, 2.25, -0.1);
      altarGroup.add(bud);
    }
  }

  const candleStickMat = new THREE.MeshLambertMaterial({ color: 0xcc2929 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  const candleFlames: THREE.Mesh[] = [];

  for (const cx of [-2.05, 2.05]) {
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.35, 10), goldTrimMat);
    holder.position.set(cx, 1.52, 0.1);
    altarGroup.add(holder);

    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 10), candleStickMat);
    candle.position.set(cx, 1.95, 0.1);
    altarGroup.add(candle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), flameMat);
    flame.position.set(cx, 2.31, 0.1);
    altarGroup.add(flame);
    candleFlames.push(flame);
  }

  // Ống Xăm Tre (Gieo Quẻ Quan Âm) đặt trên bàn thờ để người chơi click vào xin xăm
  const fortuneCylinderGroup = new THREE.Group();
  fortuneCylinderGroup.name = 'FortuneCylinderMesh';
  fortuneCylinderGroup.position.set(0.75, 1.38, 0.42);
  const bambooMat = new THREE.MeshLambertMaterial({ color: 0xc8963e });
  const redBandMat = new THREE.MeshLambertMaterial({ color: 0xb82018 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.36, 12), bambooMat);
  tube.position.y = 0.18;
  fortuneCylinderGroup.add(tube);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.08, 12), redBandMat);
  band.position.y = 0.18;
  fortuneCylinderGroup.add(band);
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.44, 0.008), bambooMat);
    stick.position.set(Math.cos(angle) * 0.06, 0.28, Math.sin(angle) * 0.06);
    stick.rotation.z = Math.cos(angle) * 0.14;
    stick.rotation.x = Math.sin(angle) * 0.14;
    fortuneCylinderGroup.add(stick);
  }
  altarGroup.add(fortuneCylinderGroup);

  parent.add(altarGroup);
  return { candleFlames, fortuneCylinderMesh: fortuneCylinderGroup };
}

interface SmokeParticleSystem {
  points: THREE.Points;
  update(dt: number, activeTips: THREE.Vector3[]): void;
}

function buildIncenseBurnerAndSmoke(parent: THREE.Group): {
  burnerMesh: THREE.Object3D;
  incenseGroup: THREE.Group;
  smokeSystem: SmokeParticleSystem;
  defaultBurnerTips: THREE.Vector3[];
} {
  const burnerContainer = new THREE.Group();
  burnerContainer.name = 'IncenseBurnerContainer';
  burnerContainer.position.set(INCENSE_BURNER_POS.x, 0, INCENSE_BURNER_POS.z);

  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x9c6f33,
    roughness: 0.38,
    metalness: 0.65
  });
  const ashMat = new THREE.MeshLambertMaterial({ color: 0xc2b9aa });

  for (const [lx, lz] of [
    [-0.52, -0.52],
    [0.52, -0.52],
    [-0.52, 0.52],
    [0.52, 0.52]
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.72, 8), bronzeMat);
    leg.position.set(lx, 0.36, lz);
    leg.castShadow = true;
    burnerContainer.add(leg);
  }

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.68, 0.78, 18), bronzeMat);
  body.position.set(0, 0.96, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = 'IncenseBurnerBody';
  body.userData.isIncenseBurner = true;
  burnerContainer.add(body);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.08, 8, 20), bronzeMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 1.35, 0);
  rim.userData.isIncenseBurner = true;
  burnerContainer.add(rim);

  const ashSurface = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16), ashMat);
  ashSurface.position.set(0, 1.31, 0);
  ashSurface.userData.isIncenseBurner = true;
  burnerContainer.add(ashSurface);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.25), bronzeMat);
    ear.position.set(side * 0.96, 1.15, 0);
    ear.rotation.z = side * -0.25;
    ear.userData.isIncenseBurner = true;
    burnerContainer.add(ear);
  }

  // Đặt sẵn 3 nén hương tam bảo ở chính giữa lư đồng để khói trầm luôn tỏa lên
  const defaultBurnerTips: THREE.Vector3[] = [];
  for (const offset of [-0.06, 0, 0.06]) {
    const stickMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.52, 6),
      new THREE.MeshLambertMaterial({ color: 0xc93b2b })
    );
    stickMesh.position.set(offset, 1.58, 0);
    burnerContainer.add(stickMesh);

    const tipMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4500 })
    );
    tipMesh.position.set(offset, 1.85, 0);
    burnerContainer.add(tipMesh);

    defaultBurnerTips.push(
      new THREE.Vector3(INCENSE_BURNER_POS.x + offset, 1.85, INCENSE_BURNER_POS.z)
    );
  }

  const incenseGroup = new THREE.Group();
  incenseGroup.name = 'PlantedIncenseSticks';
  burnerContainer.add(incenseGroup);

  parent.add(burnerContainer);

  // Hệ thống hạt khói (Particles): TỐI ĐA 200 HẠT KHÓI cho cả lư hương, hiển thị rõ nét
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
    size: 0.68,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.NormalBlending
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
          const swirlRadius = 0.12 + progress * 0.28;
          const curX =
            posAttr.getX(i) + Math.sin(ages[i] * 2.4 + driftSeeds[i]) * swirlRadius * dt;
          const curY = posAttr.getY(i) + (0.48 + progress * 0.22) * dt;
          const curZ =
            posAttr.getZ(i) + Math.cos(ages[i] * 2.1 + driftSeeds[i]) * swirlRadius * dt;
          posAttr.setXYZ(i, curX, curY, curZ);
        }
      }
      posAttr.needsUpdate = true;
    }
  };

  return {
    burnerMesh: burnerContainer,
    incenseGroup,
    smokeSystem,
    defaultBurnerTips
  };
}

function createSingleIncenseStickMesh(stick: SyncedIncenseData): THREE.Group {
  const g = new THREE.Group();
  g.name = `IncenseStick_${stick.id}`;

  const idx = stick.slotIndex % 50;
  const goldenAngle = idx * 2.39996;
  const radius = Math.min(0.62, 0.12 + Math.sqrt(idx / 50) * 0.52);
  const localX = Math.cos(goldenAngle) * radius;
  const localZ = Math.sin(goldenAngle) * radius;

  g.position.set(localX, 1.32, localZ);
  g.rotation.x = Math.sin(goldenAngle) * 0.08;
  g.rotation.z = -Math.cos(goldenAngle) * 0.08;

  const stickMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6),
    new THREE.MeshLambertMaterial({ color: 0xc93b2b })
  );
  stickMesh.position.set(0, 0.25, 0);
  g.add(stickMesh);

  const glowTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3b00 })
  );
  glowTip.name = 'IncenseGlowTip';
  glowTip.position.set(0, 0.51, 0);
  g.add(glowTip);

  const hitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.068, 0.6, 6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.name = 'IncenseHitbox';
  hitbox.position.set(0, 0.28, 0);
  hitbox.userData.incenseInfo = stick;
  g.add(hitbox);

  return g;
}

function createLotusCushionTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const cx = 128;
  const cy = 128;

  const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 126);
  grad.addColorStop(0, '#f5d061');
  grad.addColorStop(0.68, '#d49b27');
  grad.addColorStop(0.88, '#9e261b');
  grad.addColorStop(1, '#7a1911');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Vẽ 8 cánh sen vàng thêu nổi trên mặt bồ đoàn
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 8; i++) {
    ctx.rotate((Math.PI * 2) / 8);
    ctx.beginPath();
    ctx.ellipse(0, -52, 18, 42, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 242, 175, 0.55)';
    ctx.fill();
    ctx.strokeStyle = '#7a3e08';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe599';
  ctx.fill();
  ctx.strokeStyle = '#8c4a08';
  ctx.lineWidth = 3;
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

function buildBowingCushions(parent: THREE.Group): THREE.Mesh[] {
  const cushionMeshes: THREE.Mesh[] = [];
  const lotusTex = createLotusCushionTexture();
  const matTop = new THREE.MeshStandardMaterial({
    map: lotusTex,
    roughness: 0.55,
    metalness: 0.08
  });
  const matSide = new THREE.MeshStandardMaterial({
    color: 0x992218,
    roughness: 0.65
  });
  const goldRimMat = new THREE.MeshStandardMaterial({
    color: 0xe6b83a,
    roughness: 0.3,
    metalness: 0.72
  });

  for (const spot of CUSHION_POSITIONS) {
    const cushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.58, 0.14, 24),
      [matSide, matTop, matSide]
    );
    cushion.position.set(spot.x, 0.07, spot.z);
    cushion.receiveShadow = true;
    cushion.castShadow = true;
    cushion.name = `Cushion_${spot.index}`;
    cushion.userData.cushionIndex = spot.index;

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.022, 8, 24), goldRimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.065;
    rim.userData.cushionIndex = spot.index;
    cushion.add(rim);

    parent.add(cushion);
    cushionMeshes.push(cushion);
  }

  return cushionMeshes;
}

function buildCeilingLanterns(parent: THREE.Group): THREE.Group[] {
  const lanternGroups: THREE.Group[] = [];
  const cordMat = new THREE.MeshLambertMaterial({ color: 0x2b1508 });
  const silkMat = new THREE.MeshBasicMaterial({ color: 0xffb84d });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0x6b1d14 });

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
    const lg = new THREE.Group();
    lg.position.set(lx, 6.0, lz);

    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), cordMat);
    cord.position.set(0, -0.45, 0);
    lg.add(cord);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.52, 8), silkMat);
    body.position.set(0, -1.1, 0);
    lg.add(body);

    const capTop = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.18, 8), rimMat);
    capTop.position.set(0, -0.82, 0);
    lg.add(capTop);

    const capBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.18, 0.1, 8), rimMat);
    capBottom.position.set(0, -1.4, 0);
    lg.add(capBottom);

    parent.add(lg);
    lanternGroups.push(lg);
  }

  return lanternGroups;
}

function buildBodhiTree(parent: THREE.Group): {
  bodhiTreeMesh: THREE.Object3D;
  addWishingRibbonToTree: () => void;
} {
  const tree = new THREE.Group();
  tree.name = 'BodhiTree';
  tree.position.set(-7.2, 0, 20.5);

  const brickMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
  const foliageMat1 = new THREE.MeshLambertMaterial({ color: 0x2e6f40 });
  const foliageMat2 = new THREE.MeshLambertMaterial({ color: 0x3b854f });
  const ribbonRedMat = new THREE.MeshBasicMaterial({ color: 0xd9261c, side: THREE.DoubleSide });
  const ribbonGoldMat = new THREE.MeshBasicMaterial({ color: 0xffd966, side: THREE.DoubleSide });

  const planter = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.45, 8), brickMat);
  planter.position.set(0, 0.225, 0);
  planter.receiveShadow = true;
  tree.add(planter);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.72, 3.6, 9), trunkMat);
  trunk.position.set(0, 1.8, 0);
  trunk.castShadow = true;
  tree.add(trunk);

  const crowns: [number, number, number, number][] = [
    [0, 4.2, 0, 2.1],
    [-1.1, 3.6, 0.6, 1.45],
    [1.1, 3.7, -0.5, 1.45],
    [0.2, 4.9, 0.4, 1.55],
    [-0.5, 3.8, -1.0, 1.35]
  ];

  crowns.forEach(([cx, cy, cz, r], idx) => {
    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r, 1),
      idx % 2 === 0 ? foliageMat1 : foliageMat2
    );
    crown.scale.set(1.15, 0.82, 1.15);
    crown.position.set(cx, cy, cz);
    crown.castShadow = true;
    tree.add(crown);
  });

  const ribbonsGroup = new THREE.Group();
  tree.add(ribbonsGroup);

  let ribbonCount = 0;
  const addWishingRibbonToTree = () => {
    if (ribbonCount >= 36) return;
    const angle = ribbonCount * 1.15 + 0.4;
    const radius = 1.25 + (ribbonCount % 3) * 0.42;
    const yPos = 2.65 + (ribbonCount % 4) * 0.28;
    const rx = Math.cos(angle) * radius;
    const rz = Math.sin(angle) * radius;

    const tag = new THREE.Group();
    tag.position.set(rx, yPos, rz);
    tag.rotation.y = -angle;

    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.34), ribbonRedMat);
    tag.add(card);

    const border = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.12), ribbonGoldMat);
    border.position.set(0, 0.05, 0.004);
    tag.add(border);

    ribbonsGroup.add(tag);
    ribbonCount++;
  };

  // Treo sẵn 8 thẻ cầu an đỏ vàng lung linh trên cành cây Bồ Đề
  for (let i = 0; i < 8; i++) {
    addWishingRibbonToTree();
  }

  parent.add(tree);
  return { bodhiTreeMesh: tree, addWishingRibbonToTree };
}

function buildTempleBellPavilion(parent: THREE.Group): THREE.Object3D {
  const pavilion = new THREE.Group();
  pavilion.name = 'TempleBellPavilion';
  pavilion.position.set(7.2, 0, 20.5);

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4f2311 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x7d2318 });
  const bronzeBellMat = new THREE.MeshStandardMaterial({
    color: 0xb58938,
    roughness: 0.32,
    metalness: 0.75
  });

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.35, 2.6),
    new THREE.MeshLambertMaterial({ color: 0x757067 })
  );
  base.position.set(0, 0.175, 0);
  base.receiveShadow = true;
  pavilion.add(base);

  for (const [px, pz] of [
    [-1.0, -1.0],
    [1.0, -1.0],
    [-1.0, 1.0],
    [1.0, 1.0]
  ]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.2, 8), woodMat);
    post.position.set(px, 1.75, pz);
    post.castShadow = true;
    pavilion.add(post);
  }

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.25, 1.15, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, 3.85, 0);
  roof.castShadow = true;
  pavilion.add(roof);

  const bellGroup = new THREE.Group();
  bellGroup.position.set(0, 2.15, 0);
  bellGroup.name = 'TempleBellMesh';
  bellGroup.userData.isTempleBell = true;

  const bellTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    bronzeBellMat
  );
  bellTop.position.set(0, 0.35, 0);
  bellTop.userData.isTempleBell = true;
  bellGroup.add(bellTop);

  const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.56, 0.95, 14), bronzeBellMat);
  bellBody.position.set(0, -0.12, 0);
  bellBody.castShadow = true;
  bellBody.userData.isTempleBell = true;
  bellGroup.add(bellBody);

  pavilion.add(bellGroup);
  parent.add(pavilion);
  return bellGroup;
}

/**
 * Xây dựng 5 Bảo Đài Chư Phật & Bồ Tát trong Chùa:
 * 1. Bảo Đài Đức Phật A Di Đà (Bên Trái Chánh Điện: X = -5.8, Z = -8.2) — /models/buddha.glb
 * 2. Bảo Đài Quan Thế Âm Bồ Tát (Bên Phải Chánh Điện: X = +5.8, Z = -8.2) — /models/statue.glb
 * 3. Bảo Đài Địa Tạng Vương Bồ Tát (Phía Đông: X = -6.0, Z = 2.2)
 * 4. Bảo Đài Phật Di Lặc Hoan Hỷ (Phía Tây: X = +6.0, Z = 2.2)
 * 5. Bảo Đài Hộ Pháp Vi Đà Tôn Thiên Bồ Tát (X = +4.6, Z = 10.5) — /models/knight.glb
 */
function buildBuddhistSacredSideShrines(parent: THREE.Group): SacredShrineTarget[] {
  const targets: SacredShrineTarget[] = [];
  const loader = new GLTFLoader();

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x7c5a3f });
  const goldBuddhaMat = new THREE.MeshStandardMaterial({
    color: 0xffd252,
    roughness: 0.22,
    metalness: 0.8,
    emissive: 0x4f3205
  });
  const whiteJadeMat = new THREE.MeshStandardMaterial({
    color: 0xf6fbf9,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0x162922
  });
  const pinkLotusMat = new THREE.MeshStandardMaterial({
    color: 0xe87a90,
    roughness: 0.38,
    metalness: 0.2
  });
  const kasayaRedMat = new THREE.MeshStandardMaterial({
    color: 0xa8231c,
    roughness: 0.42,
    metalness: 0.2
  });

  // =========================================================================
  // 1. BẢO ĐÀI ĐỨC PHẬT A DI ĐÀ (BÊN TRÁI CHÁNH ĐIỆN: X = -5.8, Z = -8.2)
  // =========================================================================
  const amitabhaShrine = new THREE.Group();
  amitabhaShrine.name = 'ShrineAmitabhaBuddha';
  amitabhaShrine.position.set(-5.8, 0, -8.2);

  const aBase = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.28, 0.95, 20), stoneMat);
  aBase.position.y = 0.475;
  aBase.castShadow = true;
  amitabhaShrine.add(aBase);

  const aLotus = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.78, 0.38, 16), goldBuddhaMat);
  aLotus.position.y = 1.12;
  amitabhaShrine.add(aLotus);
  for (let p = 0; p < 12; p++) {
    const a = (p / 12) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.48, 5), pinkLotusMat);
    petal.position.set(Math.cos(a) * 0.92, 1.2, Math.sin(a) * 0.92);
    petal.rotation.x = 0.35 * Math.sin(a);
    petal.rotation.z = -0.35 * Math.cos(a);
    amitabhaShrine.add(petal);
  }

  loader.load('/models/buddha.glb', (gltf) => {
    const model = gltf.scene.clone(true);
    model.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.material = goldBuddhaMat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    model.scale.setScalar(2.45 / Math.max(0.0001, sz.y));
    const sb = new THREE.Box3().setFromObject(model);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    model.position.set(-sc.x, 1.3 - sb.min.y, -sc.z);
    amitabhaShrine.add(model);
  });

  const aHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.92, 28),
    new THREE.MeshBasicMaterial({ color: 0xffe57f, side: THREE.DoubleSide })
  );
  aHalo.position.set(0, 2.75, -0.35);
  amitabhaShrine.add(aHalo);

  const amitabhaPlaque = createTempleShrineNameplateSprite(
    '🙏 ĐỨC PHẬT A DI ĐÀ',
    'Chạm để Lễ Phật A Di Đà (+20 Công Đức)',
    '#ffd700'
  );
  amitabhaPlaque.position.set(0, 4.15, 0.2);
  amitabhaShrine.add(amitabhaPlaque);
  parent.add(amitabhaShrine);

  targets.push({
    id: 'shrine_amitabha_buddha',
    name: 'Đức Phật A Di Đà',
    prayerText: '🙏 Nam Mô A Di Đà Phật — Cầu xin Tiếp Dẫn Tây Phương Cực Lạc!',
    speechText: 'Nam Mô A Di Đà Phật',
    standX: -5.8,
    standZ: -6.0,
    faceRotationY: 0,
    mesh: amitabhaShrine
  });

  // =========================================================================
  // 2. BẢO ĐÀI QUAN THẾ ÂM BỒ TÁT (BÊN PHẢI CHÁNH ĐIỆN: X = +5.8, Z = -8.2)
  // =========================================================================
  const guanyinShrine = new THREE.Group();
  guanyinShrine.name = 'ShrineGuanyinBodhisattva';
  guanyinShrine.position.set(5.8, 0, -8.2);

  const gBase = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.28, 0.95, 20), stoneMat);
  gBase.position.y = 0.475;
  gBase.castShadow = true;
  guanyinShrine.add(gBase);

  const gLotus = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.72, 0.35, 16), pinkLotusMat);
  gLotus.position.y = 1.1;
  guanyinShrine.add(gLotus);

  const guanyinFigure = new THREE.Group();
  guanyinFigure.position.set(0, 1.25, 0);

  // Nạp thân tượng Bạch Ngọc điêu khắc 3D nguyên khối từ /models/virgin_mary.glb
  loader.load('/models/virgin_mary.glb', (gltf) => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.material = whiteJadeMat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(cloned);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    cloned.scale.setScalar(2.35 / Math.max(0.001, sz.y));
    const sb = new THREE.Box3().setFromObject(cloned);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    cloned.position.set(-sc.x, -sb.min.y, -sc.z);
    guanyinFigure.add(cloned);
  });

  const gHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.42, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff099, side: THREE.DoubleSide })
  );
  gHalo.position.set(0, 2.15, -0.18);
  guanyinFigure.add(gHalo);

  guanyinShrine.add(guanyinFigure);

  const guanyinPlaque = createTempleShrineNameplateSprite(
    '🌿 QUAN THẾ ÂM BỒ TÁT',
    'Chạm để Cầu Bình An & Cứu Khổ (+20 Công Đức)',
    '#4ef5a5'
  );
  guanyinPlaque.position.set(0, 4.15, 0.2);
  guanyinShrine.add(guanyinPlaque);
  parent.add(guanyinShrine);

  targets.push({
    id: 'shrine_guanyin_bodhisattva',
    name: 'Quan Thế Âm Bồ Tát',
    prayerText: '🌿 Nam Mô Đại Bi Quán Thế Âm Bồ Tát — Xin từ bi gia hộ bình an!',
    speechText: 'Nam Mô Đại Bi Quán Thế Âm Bồ Tát',
    standX: 5.8,
    standZ: -6.0,
    faceRotationY: 0,
    mesh: guanyinShrine
  });

  // =========================================================================
  // 3. BẢO ĐÀI ĐỊA TẠNG VƯƠNG BỒ TÁT (PHÍA ĐÔNG: X = -6.0, Z = 2.2)
  // =========================================================================
  const ksitigarbhaShrine = new THREE.Group();
  ksitigarbhaShrine.name = 'ShrineKsitigarbha';
  ksitigarbhaShrine.position.set(-6.0, 0, 2.2);
  ksitigarbhaShrine.rotation.y = Math.PI / 2;

  const kBase = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.18, 0.95, 20), stoneMat);
  kBase.position.y = 0.475;
  ksitigarbhaShrine.add(kBase);

  const kFigure = new THREE.Group();
  kFigure.position.set(0, 0.95, 0);

  // Nạp tượng Phật / Bồ Tát 3D nguyên vẹn từ /models/buddha.glb
  loader.load('/models/buddha.glb', (gltf) => {
    const model = gltf.scene.clone(true);
    model.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.material = goldBuddhaMat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    model.scale.setScalar(2.45 / Math.max(0.0001, sz.y));
    const sb = new THREE.Box3().setFromObject(model);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    model.position.set(-sc.x, -sb.min.y, -sc.z);
    kFigure.add(model);
  });

  ksitigarbhaShrine.add(kFigure);

  const kPlaque = createTempleShrineNameplateSprite(
    '🔱 ĐỊA TẠNG VƯƠNG BỒ TÁT',
    'Chạm để Cầu Siêu & Báo Hiếu Cha Mẹ (+20 Công Đức)',
    '#ffaa44'
  );
  kPlaque.position.set(0, 4.05, 0);
  ksitigarbhaShrine.add(kPlaque);
  parent.add(ksitigarbhaShrine);

  targets.push({
    id: 'shrine_ksitigarbha',
    name: 'Địa Tạng Vương Bồ Tát',
    prayerText: '🔱 Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát — Cầu nguyện hiếu đạo viên thành!',
    speechText: 'Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát',
    standX: -4.2,
    standZ: 2.2,
    faceRotationY: Math.PI / 2,
    mesh: ksitigarbhaShrine
  });

  // =========================================================================
  // 4. BẢO ĐÀI PHẬT DI LẶC HOAN HỶ (PHÍA TÂY: X = +6.0, Z = 2.2)
  // =========================================================================
  const maitreyaShrine = new THREE.Group();
  maitreyaShrine.name = 'ShrineMaitreyaBuddha';
  maitreyaShrine.position.set(6.0, 0, 2.2);
  maitreyaShrine.rotation.y = -Math.PI / 2;

  const mBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.32, 0.95, 20), stoneMat);
  mBase.position.y = 0.475;
  maitreyaShrine.add(mBase);

  const mFigure = new THREE.Group();
  mFigure.position.set(0, 0.95, 0);

  // Nạp tượng Phật Tọa Thiền 3D thật từ /models/elizondo_buddha.glb (đã chuẩn hóa trục đứng Y-up)
  loader.load('/models/elizondo_buddha.glb', (gltf) => {
    const model = gltf.scene.clone(true);
    model.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.material = goldBuddhaMat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    model.scale.setScalar(2.15 / Math.max(0.001, sz.y));
    const sb = new THREE.Box3().setFromObject(model);
    const sc = new THREE.Vector3();
    sb.getCenter(sc);
    model.position.set(-sc.x, -sb.min.y, -sc.z);
    mFigure.add(model);
  });

  maitreyaShrine.add(mFigure);

  const mPlaque = createTempleShrineNameplateSprite(
    '😊 PHẬT DI LẶC HOAN HỶ',
    'Chạm để Cầu Hỷ Lạc & Tài Lộc (+20 Công Đức)',
    '#ffe055'
  );
  mPlaque.position.set(0, 3.85, 0);
  maitreyaShrine.add(mPlaque);
  parent.add(maitreyaShrine);

  targets.push({
    id: 'shrine_maitreya_buddha',
    name: 'Phật Di Lặc Hoan Hỷ',
    prayerText: '😊 Nam Mô Đương Lai Hạ Sinh Di Lặc Tôn Phật — Nguyện cầu hoan hỷ, cát tường!',
    speechText: 'Nam Mô Đương Lai Hạ Sinh Di Lặc Tôn Phật',
    standX: 4.2,
    standZ: 2.2,
    faceRotationY: -Math.PI / 2,
    mesh: maitreyaShrine
  });

  // =========================================================================
  // 5. BẢO ĐÀI HỘ PHÁP VI ĐÀ TÔN THIÊN BỒ TÁT (X = +5.4, Z = 10.2) — /models/saint_joseph.glb
  // =========================================================================
  const skandaShrine = new THREE.Group();
  skandaShrine.name = 'ShrineSkandaGuardian';
  skandaShrine.position.set(5.4, 0, 10.2);
  skandaShrine.rotation.y = -Math.PI / 2;

  const sBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 1.5), stoneMat);
  sBase.position.y = 0.475;
  skandaShrine.add(sBase);

  const sFigure = new THREE.Group();
  sFigure.position.set(0, 0.95, 0);

  loader.load('/models/saint_joseph.glb', (gltf) => {
    const model = gltf.scene.clone(true);
    model.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = ch as THREE.Mesh;
        m.material = goldBuddhaMat;
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
    sFigure.add(model);
  });

  skandaShrine.add(sFigure);

  const sPlaque = createTempleShrineNameplateSprite(
    '🛡️ HỘ PHÁP VI ĐÀ BỒ TÁT',
    'Chạm để Đảnh Lễ Hộ Pháp (+20 Công Đức)',
    '#ffd700'
  );
  sPlaque.position.set(0, 3.95, 0);
  skandaShrine.add(sPlaque);
  parent.add(skandaShrine);

  targets.push({
    id: 'shrine_skanda_guardian',
    name: 'Hộ Pháp Vi Đà Tôn Thiên Bồ Tát',
    prayerText: '🛡️ Nam Mô Hộ Pháp Vi Đà Tôn Thiên Bồ Tát — Hộ trì đạo tràng thanh tịnh!',
    speechText: 'Nam Mô Hộ Pháp Vi Đà Tôn Thiên Bồ Tát',
    standX: 3.6,
    standZ: 10.2,
    faceRotationY: -Math.PI / 2,
    mesh: skandaShrine
  });

  return targets;
}
