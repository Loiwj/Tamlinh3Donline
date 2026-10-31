import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  NAME_TAG_MAX_DISTANCE,
  PlayerAction,
  RobeColor,
  ReligionMode,
  getMilestoneInfo,
  getLevelFromExp
} from '../../../shared/constants';
import { updateCharacterAnimation } from './animations';

const avatarGltfLoader = new GLTFLoader();
avatarGltfLoader.setMeshoptDecoder(MeshoptDecoder);
const avatarCache = new Map<string, Promise<GLTF>>();

function loadAvatarTemplate(url: string): Promise<GLTF> {
  let p = avatarCache.get(url);
  if (!p) {
    p = new Promise<GLTF>((resolve, reject) => {
      avatarGltfLoader.load(url, resolve, undefined, reject);
    });
    avatarCache.set(url, p);
  }
  return p;
}

function getAvatarModelUrl(robeColor: RobeColor, mode: ReligionMode): string {
  if (mode === 'catholic') {
    return robeColor === 'brown' ? '/models/avatar_female.glb' : '/models/avatar_suit.glb';
  }
  return robeColor === 'brown' ? '/models/avatar_brown.glb' : '/models/avatar_male.glb';
}

function createAngelicWingsCanvasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 256);

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(256 + side * 32, 148);
    ctx.scale(side, 1);

    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.rotate((-0.25 - i * 0.16));
      const len = 185 - i * 16;
      const grad = ctx.createLinearGradient(0, 0, len, 0);
      grad.addColorStop(0, 'rgba(255, 248, 210, 0.85)');
      grad.addColorStop(0.6, 'rgba(255, 225, 130, 0.45)');
      grad.addColorStop(1, 'rgba(255, 210, 90, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(len * 0.5, 0, len * 0.5, 16 - i * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface CharacterInstance {
  id: string;
  name: string;
  robeColor: RobeColor;
  religionMode: ReligionMode;
  level: number;
  exp: number;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  gltfAvatarRoot?: THREE.Group;
  gltfBones?: Record<string, THREE.Object3D>;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  leftForeArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  rightForeArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightLegPivot: THREE.Group;
  rightKneePivot: THREE.Group;
  beadsRing: THREE.Group;
  handIncenseMesh: THREE.Group;
  nameSprite: THREE.Sprite;
  chatBubbleSprite: THREE.Sprite;
  chatBubbleExpiresAt: number;
  action: PlayerAction;
  animTime: number;
  lastBowCycle: number;
  targetX: number;
  targetZ: number;
  targetRotation: number;
  connected: boolean;
  disconnectedAt: number;
  materials: THREE.MeshStandardMaterial[];
  updateNameTag: (newName: string) => void;
  setReligionMode: (mode: ReligionMode) => void;
  setLevelAndExp: (level: number, exp: number, mode?: ReligionMode) => void;
  triggerLevelUpBurst: () => void;
  updateMilestoneVisuals: (dt: number) => void;
  showChatBubble: (text: string, isChant?: boolean, durationMs?: number) => void;
  updateChatBubble: (nowMs: number) => void;
  updateVisibilityByDistance: (cameraPos: THREE.Vector3) => void;
  setOpacity: (opacity: number) => void;
  dispose: () => void;
}

/**
 * Tạo texture họa tiết vải Áo Tràng Phật Tử (Chùa) hoặc Lễ Phục Giáo Dân / Ca Đoàn (Nhà Thờ)
 */
function createAoTrangTexture(isBrown: boolean, mode: ReligionMode = 'buddhist'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (mode === 'catholic') {
    const baseColor = isBrown ? '#F2EDE2' : '#263B59';
    const trimColor = isBrown ? '#D4AF37' : '#E2C05A';
    const accentColor = isBrown ? '#B8860B' : '#F4E3A3';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = isBrown ? 'rgba(180,150,90,0.06)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 256; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    // Hai dải nẹp lễ phục vàng trang nghiêm
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(106, 15);
    ctx.lineTo(106, 256);
    ctx.moveTo(150, 15);
    ctx.lineTo(150, 256);
    ctx.stroke();

    // Huy hiệu Thánh Giá Vàng thêu bên ngực trái
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(82, 68);
    ctx.lineTo(82, 102);
    ctx.moveTo(69, 80);
    ctx.lineTo(95, 80);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const baseColor = isBrown ? '#8C5835' : '#6D8EA8';
  const trimColor = isBrown ? '#5E381E' : '#4C6B84';
  const accentColor = isBrown ? '#F2CA6B' : '#EBF4FA';

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Vân vải đũi lụa mềm
  ctx.strokeStyle = isBrown ? 'rgba(255,240,210,0.06)' : 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 256; i += 4) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  // Viền vạt áo chéo đặc trưng của Áo Tràng Phật Tử Việt Nam
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(128, 15);
  ctx.lineTo(185, 85);
  ctx.lineTo(185, 256);
  ctx.stroke();

  // Đường chỉ kim tuyến dọc nẹp áo
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(132, 18);
  ctx.lineTo(181, 85);
  ctx.lineTo(181, 256);
  ctx.stroke();

  // Hàng nút vải tết dọc bên phải
  ctx.fillStyle = accentColor;
  for (let y = 88; y <= 220; y += 34) {
    ctx.beginPath();
    ctx.arc(174, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Huy hiệu Hoa Sen Vàng 8 cánh thêu nổi bên ngực trái
  ctx.save();
  ctx.translate(92, 84);
  for (let p = 0; p < 8; p++) {
    ctx.rotate((Math.PI * 2) / 8);
    ctx.beginPath();
    ctx.ellipse(0, -6, 3.2, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE57F';
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function renderNameCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  level = 1,
  mode: ReligionMode = 'buddhist'
): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const milestone = getMilestoneInfo(level);
  const titleText = mode === 'catholic' ? milestone.catholicTitle : milestone.buddhistTitle;
  const topLine = `${milestone.badgeIcon} Lv.${level} • ${titleText}`;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 24px "Segoe UI", Tahoma, sans-serif';
  const topWidth = ctx.measureText(topLine).width;

  ctx.font = 'bold 36px "Segoe UI", Tahoma, sans-serif';
  const nameWidth = ctx.measureText(text).width;

  const padX = 28;
  const boxW = Math.min(canvas.width - 10, Math.max(topWidth, nameWidth) + padX * 2);
  const boxH = 88;
  const boxX = (canvas.width - boxW) / 2;
  const boxY = (canvas.height - boxH) / 2;

  if (level >= 15) {
    ctx.fillStyle = 'rgba(68, 12, 18, 0.90)';
  } else if (level >= 10) {
    ctx.fillStyle = 'rgba(36, 16, 48, 0.86)';
  } else if (level >= 5) {
    ctx.fillStyle = 'rgba(28, 16, 6, 0.82)';
  } else {
    ctx.fillStyle = 'rgba(18, 11, 7, 0.74)';
  }
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 16);
  ctx.fill();

  ctx.strokeStyle = level >= 2 ? milestone.color : 'rgba(255, 215, 130, 0.5)';
  ctx.lineWidth = level >= 10 ? 4.2 : level >= 5 ? 3.5 : 2;
  ctx.stroke();

  // Dòng 1: Huy hiệu Cấp độ & Danh hiệu
  ctx.font = 'bold 23px "Segoe UI", Tahoma, sans-serif';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(topLine, canvas.width / 2, boxY + 26);
  ctx.fillStyle = milestone.color;
  ctx.fillText(topLine, canvas.width / 2, boxY + 26);

  // Dòng 2: Tên người chơi
  ctx.font = 'bold 35px "Segoe UI", Tahoma, sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, canvas.width / 2, boxY + 62);
  ctx.fillStyle = level >= 15 ? '#FFF394' : level >= 5 ? '#FFE875' : '#ffffff';
  ctx.fillText(text, canvas.width / 2, boxY + 62);
}

function renderChatBubbleCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  isChant: boolean
): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = isChant
    ? 'bold 30px "Segoe UI", Tahoma, sans-serif'
    : '600 28px "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxLineWidth = canvas.width - 68;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxLineWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  const displayLines = lines.slice(0, 3);

  let maxMeasuredW = 140;
  for (const l of displayLines) {
    maxMeasuredW = Math.max(maxMeasuredW, ctx.measureText(l).width);
  }

  const lineHeight = 36;
  const boxW = Math.min(canvas.width - 20, maxMeasuredW + 52);
  const boxH = displayLines.length * lineHeight + 32;
  const boxX = (canvas.width - boxW) / 2;
  const boxY = canvas.height - boxH - 24;

  ctx.fillStyle = isChant
    ? 'rgba(72, 34, 10, 0.94)'
    : 'rgba(255, 250, 236, 0.95)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 18);
  ctx.fill();

  ctx.strokeStyle = isChant ? '#ffd966' : '#8b5a2b';
  ctx.lineWidth = isChant ? 4 : 3;
  ctx.stroke();

  // Mũi tên trỏ xuống đầu nhân vật
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 12, boxY + boxH);
  ctx.lineTo(canvas.width / 2, boxY + boxH + 16);
  ctx.lineTo(canvas.width / 2 + 12, boxY + boxH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isChant ? '#ffe885' : '#261408';
  const startY = boxY + 18 + lineHeight / 2;
  displayLines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
  });
}

export function createCharacter(
  id: string,
  name: string,
  robeColor: RobeColor
): CharacterInstance {
  const root = new THREE.Group();
  root.name = `Player_${id}`;

  // Group xoay 180 độ để mặt trước của nhân vật hướng theo trục -Z (nhìn thẳng về tượng Phật khi rotation.y = 0)
  const facingGroup = new THREE.Group();
  facingGroup.rotation.y = Math.PI;
  root.add(facingGroup);

  const bodyGroup = new THREE.Group();
  bodyGroup.visible = false;
  facingGroup.add(bodyGroup);

  const isBrown = robeColor === 'brown';
  const aoTrangTex = createAoTrangTexture(isBrown);

  const robeMat = new THREE.MeshStandardMaterial({
    map: aoTrangTex,
    roughness: 0.68,
    metalness: 0.06,
    emissive: isBrown ? 0x1a0e06 : 0x0c1622
  });

  const robePlainMat = new THREE.MeshStandardMaterial({
    color: isBrown ? 0x8C5835 : 0x6D8EA8,
    roughness: 0.68,
    metalness: 0.06,
    emissive: isBrown ? 0x1a0e06 : 0x0c1622
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: isBrown ? 0x6E4326 : 0x56748C,
    roughness: 0.75,
    emissive: isBrown ? 0x120904 : 0x081018
  });

  const collarMat = new THREE.MeshStandardMaterial({
    color: isBrown ? 0x5C361D : 0x49657B,
    roughness: 0.65
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xF7D3B2,
    roughness: 0.48,
    emissive: 0x1c100a
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x221C18,
    roughness: 0.62
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x362B22,
    roughness: 0.78
  });

  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xE6B84C,
    roughness: 0.3,
    metalness: 0.65
  });

  const beadMat = new THREE.MeshStandardMaterial({
    color: 0x5C3317,
    roughness: 0.4
  });

  const stickMat = new THREE.MeshStandardMaterial({
    color: 0xB82929,
    roughness: 0.7
  });

  const materials: THREE.MeshStandardMaterial[] = [
    robeMat,
    robePlainMat,
    pantsMat,
    collarMat,
    skinMat,
    hairMat,
    shoeMat,
    pinMat,
    beadMat,
    stickMat
  ];

  const addMesh = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    parent: THREE.Object3D
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ==================== 1. CHÂN & QUẦN ÁO TRÀNG ====================
  const createArticulatedLeg = (xOffset: number) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(xOffset, 0.74, 0);
    bodyGroup.add(hipPivot);

    // Đùi quần ống rộng
    const thighGeo = new THREE.CylinderGeometry(0.105, 0.095, 0.36, 14);
    const thigh = addMesh(thighGeo, pantsMat, hipPivot);
    thigh.position.y = -0.18;

    // Khớp gối
    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.36, 0);
    hipPivot.add(kneePivot);

    // Ống quần dưới
    const shinGeo = new THREE.CylinderGeometry(0.095, 0.088, 0.32, 14);
    const shin = addMesh(shinGeo, pantsMat, kneePivot);
    shin.position.y = -0.16;

    // Cổ chân
    const ankleGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.06, 12);
    const ankle = addMesh(ankleGeo, skinMat, kneePivot);
    ankle.position.y = -0.33;

    // Giày vải đi chùa (hài lam/nâu)
    const shoeGeo = new THREE.CapsuleGeometry(0.058, 0.11, 8, 12);
    const shoe = addMesh(shoeGeo, shoeMat, kneePivot);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.0, 1.0, 0.65);
    shoe.position.set(0, -0.35, 0.035);

    return { hipPivot, kneePivot };
  };

  const leftLeg = createArticulatedLeg(-0.115);
  const rightLeg = createArticulatedLeg(0.115);
  const leftLegPivot = leftLeg.hipPivot;
  const leftKneePivot = leftLeg.kneePivot;
  const rightLegPivot = rightLeg.hipPivot;
  const rightKneePivot = rightLeg.kneePivot;

  // ==================== 2. THÂN ÁO TRÀNG PHẬT TỬ (VẠT DÀI) ====================
  const torso = new THREE.Group();
  torso.position.set(0, 0.74, 0);
  bodyGroup.add(torso);

  // Thân áo tràng dáng suông nhẹ từ vai xuống qua đùi
  const robePoints = [
    new THREE.Vector2(0.01, 0.56),   // cổ áo
    new THREE.Vector2(0.18, 0.54),   // bờ vai
    new THREE.Vector2(0.195, 0.36),  // ngực
    new THREE.Vector2(0.185, 0.16),  // eo
    new THREE.Vector2(0.225, -0.10), // hông áo
    new THREE.Vector2(0.245, -0.32), // tà áo tràng phủ qua đùi
    new THREE.Vector2(0.01, -0.32)
  ];
  const robeGeo = new THREE.LatheGeometry(robePoints, 24);
  const robeMesh = addMesh(robeGeo, robeMat, torso);
  robeMesh.scale.set(1.05, 1.0, 0.78);
  robeMesh.rotation.y = -Math.PI / 2;

  // Cổ áo giao lĩnh (chữ V đắp chéo trang nghiêm)
  const collarLeftGeo = new THREE.BoxGeometry(0.045, 0.22, 0.03);
  const collarLeft = addMesh(collarLeftGeo, collarMat, torso);
  collarLeft.position.set(-0.04, 0.46, 0.138);
  collarLeft.rotation.z = -0.36;
  collarLeft.rotation.x = -0.15;

  const collarRight = addMesh(collarLeftGeo, collarMat, torso);
  collarRight.position.set(0.04, 0.46, 0.144);
  collarRight.rotation.z = 0.36;
  collarRight.rotation.x = -0.15;

  // Đai lưng vải mềm & dải lụa rủ
  const sashGeo = new THREE.CylinderGeometry(0.195, 0.198, 0.055, 20);
  const sash = addMesh(sashGeo, collarMat, torso);
  sash.scale.set(1.04, 1.0, 0.79);
  sash.position.set(0, 0.15, 0);

  // Phụ kiện Phật Tử 3D: Chuỗi Tràng Hạt Gỗ Trầm Đeo Cổ & Huy Hiệu Hoa Sen Vàng
  const buddhistChestOrnament = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const angle = -Math.PI * 0.82 + t * Math.PI * 0.64;
    const bx = Math.sin(angle) * 0.095;
    const by = 0.48 - Math.cos(angle) * 0.14;
    const bz = 0.135 + Math.cos(angle) * 0.028;
    const neckBead = addMesh(new THREE.SphereGeometry(0.012, 8, 8), beadMat, buddhistChestOrnament);
    neckBead.position.set(bx, by, bz);
  }
  const guruPendant = addMesh(new THREE.SphereGeometry(0.017, 10, 10), pinMat, buddhistChestOrnament);
  guruPendant.position.set(0, 0.32, 0.165);
  torso.add(buddhistChestOrnament);

  // Phụ kiện Giáo Dân / Ca Đoàn Công Giáo 3D: Khăn Choàng Phụng Vụ & Dây Chuỗi Mân Côi Thánh Giá Vàng
  const catholicChestOrnament = new THREE.Group();
  catholicChestOrnament.visible = false;
  const stoleMat = new THREE.MeshStandardMaterial({
    color: isBrown ? 0xb5242b : 0xd4af37,
    roughness: 0.4,
    metalness: 0.35
  });
  for (const side of [-1, 1]) {
    const stoleBand = addMesh(
      new THREE.BoxGeometry(0.044, 0.44, 0.016),
      stoleMat,
      catholicChestOrnament
    );
    stoleBand.position.set(side * 0.085, 0.25, 0.152);
  }
  const chestCrossV = addMesh(new THREE.BoxGeometry(0.016, 0.095, 0.014), pinMat, catholicChestOrnament);
  chestCrossV.position.set(0, 0.31, 0.166);
  const chestCrossH = addMesh(new THREE.BoxGeometry(0.062, 0.016, 0.014), pinMat, catholicChestOrnament);
  chestCrossH.position.set(0, 0.328, 0.166);
  torso.add(catholicChestOrnament);

  // ==================== 3. ĐẦU, KHUÔN MẶT THANH TÚ & MÁI TÓC ====================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.56, 0);
  torso.add(headGroup);

  // Cổ
  const neckGeo = new THREE.CylinderGeometry(0.062, 0.072, 0.10, 14);
  const neck = addMesh(neckGeo, skinMat, headGroup);
  neck.position.y = 0.04;

  // Đầu tròn phúc hậu
  const headGeo = new THREE.SphereGeometry(0.155, 28, 24);
  const head = addMesh(headGeo, skinMat, headGroup);
  head.scale.set(0.95, 1.04, 0.96);
  head.position.y = 0.21;

  // Hai tai
  const earGeo = new THREE.SphereGeometry(0.032, 10, 10);
  const leftEar = addMesh(earGeo, skinMat, headGroup);
  leftEar.scale.set(0.5, 1.15, 0.8);
  leftEar.position.set(-0.148, 0.20, 0);

  const rightEar = addMesh(earGeo, skinMat, headGroup);
  rightEar.scale.set(0.5, 1.15, 0.8);
  rightEar.position.set(0.148, 0.20, 0);

  // Mái tóc bồng bềnh tự nhiên + tóc mái trước trán & tóc mai hai bên
  const hairCapGeo = new THREE.SphereGeometry(
    0.162,
    24,
    18,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.60
  );
  const hairCap = addMesh(hairCapGeo, hairMat, headGroup);
  hairCap.scale.set(0.97, 1.05, 0.99);
  hairCap.position.set(0, 0.218, -0.01);
  hairCap.rotation.x = -0.20;

  // Tóc mái mềm mại trước trán & tóc mai hai bên
  for (const side of [-1, 1]) {
    const bangLock = addMesh(new THREE.CapsuleGeometry(0.028, 0.07, 6, 8), hairMat, headGroup);
    bangLock.position.set(side * 0.068, 0.285, 0.125);
    bangLock.rotation.z = side * 0.52;
    bangLock.rotation.x = 0.35;

    const sideLock = addMesh(new THREE.CapsuleGeometry(0.022, 0.095, 6, 8), hairMat, headGroup);
    sideLock.position.set(side * 0.132, 0.205, 0.065);
    sideLock.rotation.z = side * 0.12;
  }

  // Búi tóc Phật tử + Trâm Hoa Sen Ngọc Bích (Chùa)
  const hairBunGeo = new THREE.SphereGeometry(0.068, 16, 16);
  const hairBun = addMesh(hairBunGeo, hairMat, headGroup);
  hairBun.position.set(0, 0.27, -0.145);

  const hairPinGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.20, 8);
  const hairPin = addMesh(hairPinGeo, pinMat, headGroup);
  hairPin.rotation.z = Math.PI / 2;
  hairPin.position.set(0, 0.27, -0.155);

  // Tóc xoăn nhẹ sau gáy & Vòng Cài Tóc Ánh Kim (Nhà Thờ)
  const catholicBackHair = addMesh(
    new THREE.CapsuleGeometry(0.085, 0.11, 8, 12),
    hairMat,
    headGroup
  );
  catholicBackHair.position.set(0, 0.16, -0.115);
  catholicBackHair.visible = false;

  // Chân mày thanh tú
  const browMat = new THREE.MeshBasicMaterial({ color: 0x261C15 });
  const browGeo = new THREE.CapsuleGeometry(0.0065, 0.038, 4, 6);
  const leftBrow = addMesh(browGeo, browMat, headGroup);
  leftBrow.rotation.z = Math.PI / 2 - 0.07;
  leftBrow.position.set(-0.052, 0.258, 0.138);

  const rightBrow = addMesh(browGeo, browMat, headGroup);
  rightBrow.rotation.z = Math.PI / 2 + 0.07;
  rightBrow.position.set(0.052, 0.258, 0.138);

  // Đôi mắt long lanh có lòng trắng, con ngươi và đốm sáng (catchlight)
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e140e });
  const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cheekMat = new THREE.MeshBasicMaterial({
    color: 0xf48fb1,
    transparent: true,
    opacity: 0.36
  });

  for (const side of [-1, 1]) {
    const sclera = addMesh(new THREE.SphereGeometry(0.021, 12, 12), scleraMat, headGroup);
    sclera.scale.set(1.15, 0.92, 0.55);
    sclera.position.set(side * 0.052, 0.218, 0.138);

    const iris = addMesh(new THREE.SphereGeometry(0.0155, 12, 12), eyeMat, headGroup);
    iris.scale.set(1.05, 0.95, 0.6);
    iris.position.set(side * 0.051, 0.218, 0.145);

    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 8), catchlightMat);
    catchlight.position.set(side * 0.051 + 0.005, 0.223, 0.153);
    headGroup.add(catchlight);

    const rosyCheek = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), cheekMat);
    rosyCheek.position.set(side * 0.082, 0.184, 0.138);
    rosyCheek.rotation.y = side * 0.38;
    headGroup.add(rosyCheek);
  }

  // Sống mũi thanh cao
  const noseGeo = new THREE.SphereGeometry(0.015, 10, 10);
  const nose = addMesh(noseGeo, skinMat, headGroup);
  nose.scale.set(0.82, 1.18, 1.0);
  nose.position.set(0, 0.192, 0.153);

  // Nụ cười hiền hòa an lạc
  const smileGeo = new THREE.TorusGeometry(0.024, 0.005, 6, 14, Math.PI);
  const smileMat = new THREE.MeshBasicMaterial({ color: 0xb55d4c });
  const smile = addMesh(smileGeo, smileMat, headGroup);
  smile.rotation.x = Math.PI;
  smile.position.set(0, 0.158, 0.144);

  // ==================== 4. TAY ÁO TRÀNG RỘNG & BÀN TAY BÚP SEN ====================
  const createArticulatedArm = (isLeft: boolean) => {
    const sign = isLeft ? -1 : 1;
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(sign * 0.205, 0.49, 0);
    torso.add(shoulderPivot);

    const shoulderCapGeo = new THREE.SphereGeometry(0.068, 12, 12);
    addMesh(shoulderCapGeo, robePlainMat, shoulderPivot);

    const upperArmGeo = new THREE.CylinderGeometry(0.066, 0.078, 0.24, 14);
    const upperArm = addMesh(upperArmGeo, robePlainMat, shoulderPivot);
    upperArm.position.y = -0.12;

    const foreArmPivot = new THREE.Group();
    foreArmPivot.position.set(0, -0.24, 0);
    shoulderPivot.add(foreArmPivot);

    const sleeveGeo = new THREE.CylinderGeometry(0.076, 0.105, 0.23, 14);
    const sleeve = addMesh(sleeveGeo, robePlainMat, foreArmPivot);
    sleeve.position.y = -0.115;

    const cuffGeo = new THREE.TorusGeometry(0.102, 0.009, 8, 16);
    const cuff = addMesh(cuffGeo, collarMat, foreArmPivot);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.228;

    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.26, 0);
    foreArmPivot.add(handGroup);

    const palmGeo = new THREE.CapsuleGeometry(0.032, 0.055, 8, 10);
    const palm = addMesh(palmGeo, skinMat, handGroup);
    palm.scale.set(0.65, 1.0, 1.15);

    return { shoulderPivot, foreArmPivot };
  };

  const leftArm = createArticulatedArm(true);
  const rightArm = createArticulatedArm(false);
  const leftArmPivot = leftArm.shoulderPivot;
  const leftForeArmPivot = leftArm.foreArmPivot;
  const rightArmPivot = rightArm.shoulderPivot;
  const rightForeArmPivot = rightArm.foreArmPivot;

  // ==================== 5. CHUỖI TRÀNG HẠT & NÉN NHANG TRÊN TAY ====================
  const beadsRing = new THREE.Group();
  const beadGeo = new THREE.SphereGeometry(0.015, 8, 8);
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const b = addMesh(beadGeo, beadMat, beadsRing);
    b.position.set(Math.cos(angle) * 0.065, Math.sin(angle) * 0.065, 0);
  }
  beadsRing.position.set(0, -0.26, 0.05);
  beadsRing.visible = false;
  rightForeArmPivot.add(beadsRing);

  const handIncenseMesh = new THREE.Group();
  const stickGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.34, 6);
  const stick = addMesh(stickGeo, stickMat, handIncenseMesh);
  stick.position.y = 0.17;

  const tipGeo = new THREE.SphereGeometry(0.01, 8, 8);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xFF5500 });
  const tip = addMesh(tipGeo, tipMat, handIncenseMesh);
  tip.position.y = 0.34;

  handIncenseMesh.position.set(0, -0.26, 0.06);
  handIncenseMesh.rotation.x = Math.PI / 3;
  handIncenseMesh.visible = false;
  rightForeArmPivot.add(handIncenseMesh);

  // ==================== 6. HIỆU ỨNG HÀO QUANG CẤP ĐỘ (MILESTONE 3D EFFECTS) ====================
  const milestoneGroup = new THREE.Group();
  milestoneGroup.name = 'MilestoneEffects';
  root.add(milestoneGroup);

  const goldAuraMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide
  });
  const jadeAuraMat = new THREE.MeshBasicMaterial({
    color: 0x4ef5a5,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide
  });
  const cyanAuraMat = new THREE.MeshBasicMaterial({
    color: 0x66dcff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  const wingLightMat = new THREE.MeshBasicMaterial({
    color: 0xfff5c0,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide
  });

  // Mốc Lv.2+: Vòng Pháp Trận Liên Hoa / Vòng Sáng Ân Sủng dưới chân
  const groundAuraGroup = new THREE.Group();
  groundAuraGroup.position.set(0, 0.03, 0);
  groundAuraGroup.visible = false;
  const outerGroundRing = new THREE.Mesh(
    new THREE.RingGeometry(0.48, 0.56, 32),
    jadeAuraMat
  );
  outerGroundRing.rotation.x = -Math.PI / 2;
  groundAuraGroup.add(outerGroundRing);

  const innerGroundRing = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.33, 24),
    goldAuraMat
  );
  innerGroundRing.rotation.x = -Math.PI / 2;
  groundAuraGroup.add(innerGroundRing);

  milestoneGroup.add(groundAuraGroup);

  // Mốc Lv.3+: Vòng Hào Quang Sau Đầu
  const headHaloGroup = new THREE.Group();
  headHaloGroup.position.set(0, 1.55, 0.14);
  headHaloGroup.visible = false;
  const haloRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.012, 10, 32),
    goldAuraMat
  );
  headHaloGroup.add(haloRing);
  const haloInnerGlow = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.23, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfff099,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  headHaloGroup.add(haloInnerGlow);
  milestoneGroup.add(headHaloGroup);

  // Mốc Lv.4+: Vòng Sen Vàng / Vòng Sao Bê-lem phẳng dưới chân (gọn gàng, không chắn nhân vật)
  const lotusPedestalGroup = new THREE.Group();
  lotusPedestalGroup.position.set(0, 0.02, 0);
  lotusPedestalGroup.visible = false;
  const lotusFlatRing = new THREE.Mesh(
    new THREE.RingGeometry(0.34, 0.42, 32),
    goldAuraMat
  );
  lotusFlatRing.rotation.x = -Math.PI / 2;
  lotusPedestalGroup.add(lotusFlatRing);
  milestoneGroup.add(lotusPedestalGroup);

  const starPedestalGroup = new THREE.Group();
  starPedestalGroup.position.set(0, 0.02, 0);
  starPedestalGroup.visible = false;
  const starFlatRing = new THREE.Mesh(
    new THREE.RingGeometry(0.34, 0.42, 32),
    goldAuraMat
  );
  starFlatRing.rotation.x = -Math.PI / 2;
  starPedestalGroup.add(starFlatRing);
  milestoneGroup.add(starPedestalGroup);

  const orbitOrbsGroup = new THREE.Group();
  orbitOrbsGroup.visible = false;
  const orbMeshes: THREE.Group[] = [];

  // Mốc Lv.6+: Pháp Luân Kim Quang (Chùa) hoặc Đôi Cánh Ánh Sáng Thiên Thần (Nhà Thờ)
  const buddhistWheelGroup = new THREE.Group();
  buddhistWheelGroup.position.set(0, 1.15, 0.22);
  buddhistWheelGroup.visible = false;
  const wheelOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.014, 10, 32),
    goldAuraMat
  );
  const wheelInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.01, 8, 24),
    goldAuraMat
  );
  buddhistWheelGroup.add(wheelOuter, wheelInner);
  milestoneGroup.add(buddhistWheelGroup);

  const wingsTex = createAngelicWingsCanvasTexture();
  const wingsPlaneMat = new THREE.MeshBasicMaterial({
    map: wingsTex,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const catholicWingsGroup = new THREE.Group();
  catholicWingsGroup.position.set(0, 1.18, 0.22);
  catholicWingsGroup.visible = false;
  const wingsPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.75), wingsPlaneMat);
  catholicWingsGroup.add(wingsPlane);
  milestoneGroup.add(catholicWingsGroup);

  const crownRibbonGroup = new THREE.Group();
  crownRibbonGroup.visible = false;
  const silkRibbonArc = new THREE.Group();
  const starCrownRing = new THREE.Group();

  // Mốc Lv.8+: Đại Pháp Trận phẳng dưới chân
  const supremeRingGroup = new THREE.Group();
  supremeRingGroup.position.set(0, 0.025, 0);
  supremeRingGroup.visible = false;
  const bigGroundRing = new THREE.Mesh(
    new THREE.RingGeometry(0.64, 0.72, 36),
    cyanAuraMat
  );
  bigGroundRing.rotation.x = -Math.PI / 2;
  supremeRingGroup.add(bigGroundRing);
  milestoneGroup.add(supremeRingGroup);

  const spiritBirdsGroup = new THREE.Group();
  spiritBirdsGroup.visible = false;
  const birdWingPivots: { left: THREE.Mesh; right: THREE.Mesh }[] = [];

  const rainbowOrbsGroup = new THREE.Group();
  rainbowOrbsGroup.visible = false;

  // Mốc Lv.11+: Tam Luân Pháp Giới (Chùa) / Cánh Seraphim (Nhà Thờ)
  const tripleWheelExtraGroup = new THREE.Group();
  tripleWheelExtraGroup.position.set(0, 1.15, 0.24);
  tripleWheelExtraGroup.visible = false;
  const outerWheel2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.012, 10, 36),
    cyanAuraMat
  );
  const outerWheel3 = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.01, 10, 40),
    goldAuraMat
  );
  tripleWheelExtraGroup.add(outerWheel2, outerWheel3);
  milestoneGroup.add(tripleWheelExtraGroup);

  const seraphimExtraWingsGroup = new THREE.Group();
  seraphimExtraWingsGroup.position.set(0, 1.25, 0.24);
  seraphimExtraWingsGroup.visible = false;
  const upperWingsPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.85), wingsPlaneMat);
  upperWingsPlane.position.y = 0.14;
  seraphimExtraWingsGroup.add(upperWingsPlane);
  milestoneGroup.add(seraphimExtraWingsGroup);

  const supremePillarGroup = new THREE.Group();
  supremePillarGroup.visible = false;

  const risingLanternsGroup = new THREE.Group();
  risingLanternsGroup.visible = false;
  const floatingMotes: { mesh: THREE.Mesh; baseAngle: number; speed: number; radius: number; offset: number }[] = [];

  const spiralDragonGroup = new THREE.Group();
  spiralDragonGroup.visible = false;

  // Mốc Lv.15+: Vòng Hào Quang Mặt Trời Sau Lưng
  const ultimateSunGroup = new THREE.Group();
  ultimateSunGroup.position.set(0, 1.18, 0.26);
  ultimateSunGroup.visible = false;
  const sunDisc = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.56, 36),
    new THREE.MeshBasicMaterial({
      color: 0xffea75,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  ultimateSunGroup.add(sunDisc);
  milestoneGroup.add(ultimateSunGroup);

  // Hiệu ứng Bùng Sáng Thăng Cấp (Level-Up Burst)
  const levelUpBurstGroup = new THREE.Group();
  levelUpBurstGroup.visible = false;
  const burstRing = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.55, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfff088,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    })
  );
  burstRing.rotation.x = -Math.PI / 2;
  const burstBeam = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.28, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffdf55,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  burstBeam.rotation.x = -Math.PI / 2;
  burstBeam.position.y = 0.02;
  levelUpBurstGroup.add(burstRing, burstBeam);
  milestoneGroup.add(levelUpBurstGroup);

  let levelUpBurstTimer = 0;

  // ==================== 7. NHÃN TÊN & BONG BÓNG CHAT TRÊN ĐẦU ====================
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 512;
  nameCanvas.height = 112;
  renderNameCanvas(nameCanvas, name, 1, 'buddhist');

  const nameTexture = new THREE.CanvasTexture(nameCanvas);
  nameTexture.minFilter = THREE.LinearFilter;
  const nameSpriteMat = new THREE.SpriteMaterial({
    map: nameTexture,
    transparent: true,
    depthWrite: false
  });
  const nameSprite = new THREE.Sprite(nameSpriteMat);
  nameSprite.position.set(0, 2.02, 0);
  nameSprite.scale.set(2.05, 0.46, 1);
  root.add(nameSprite);

  const bubbleCanvas = document.createElement('canvas');
  bubbleCanvas.width = 640;
  bubbleCanvas.height = 180;
  const bubbleTexture = new THREE.CanvasTexture(bubbleCanvas);
  bubbleTexture.minFilter = THREE.LinearFilter;
  const bubbleMat = new THREE.SpriteMaterial({
    map: bubbleTexture,
    transparent: true,
    depthWrite: false
  });
  const chatBubbleSprite = new THREE.Sprite(bubbleMat);
  chatBubbleSprite.position.set(0, 2.52, 0);
  chatBubbleSprite.scale.set(2.5, 0.72, 1);
  chatBubbleSprite.visible = false;
  root.add(chatBubbleSprite);

  const refreshMilestoneVisibility = (lvl: number, mode: ReligionMode) => {
    groundAuraGroup.visible = lvl >= 2;
    headHaloGroup.visible = lvl >= 3;
    lotusPedestalGroup.visible = lvl >= 4 && mode === 'buddhist';
    starPedestalGroup.visible = lvl >= 4 && mode === 'catholic';
    buddhistWheelGroup.visible = lvl >= 6 && mode === 'buddhist';
    catholicWingsGroup.visible = lvl >= 6 && mode === 'catholic';
    supremeRingGroup.visible = lvl >= 8;
    tripleWheelExtraGroup.visible = lvl >= 11 && mode === 'buddhist';
    seraphimExtraWingsGroup.visible = lvl >= 11 && mode === 'catholic';
    ultimateSunGroup.visible = lvl >= 15;
  };

  const gltfAvatarContainer = new THREE.Group();
  gltfAvatarContainer.name = 'GltfAvatarContainer';
  facingGroup.add(gltfAvatarContainer);

  let currentAvatarLoadId = 0;
  const mountReal3DAvatar = (mode: ReligionMode) => {
    const loadId = ++currentAvatarLoadId;
    const url = getAvatarModelUrl(robeColor, mode);
    loadAvatarTemplate(url)
      .then((gltf) => {
        if (loadId !== currentAvatarLoadId) return;
        while (gltfAvatarContainer.children.length > 0) {
          gltfAvatarContainer.remove(gltfAvatarContainer.children[0]);
        }
        const cloned = SkeletonUtils.clone(gltf.scene) as THREE.Group;
        const bones: Record<string, THREE.Object3D> = {};
        cloned.traverse((obj) => {
          if (obj.name) {
            obj.userData.restQuat = obj.quaternion.clone();
            obj.userData.restPos = obj.position.clone();
            bones[obj.name] = obj;
          }
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            m.frustumCulled = false;
          }
        });
        // Phân biệt rõ vóc dáng Nữ (thon gọn, búi tóc duyên dáng) và Nam (cao lớn, vai rộng)
        gltfAvatarContainer.scale.set(
          isBrown ? 0.95 : 1.03,
          isBrown ? 0.94 : 1.02,
          isBrown ? 0.95 : 1.03
        );
        if (isBrown && bones['Head']) {
          const femaleBunGroup = new THREE.Group();
          femaleBunGroup.position.set(-14.2, 3.6, 0);
          const bunMesh = new THREE.Mesh(
            new THREE.SphereGeometry(4.2, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: 0.75 })
          );
          bunMesh.scale.set(0.95, 1.05, 1.1);
          const bandMesh = new THREE.Mesh(
            new THREE.TorusGeometry(3.2, 0.55, 8, 20),
            new THREE.MeshStandardMaterial({
              color: mode === 'catholic' ? 0xf5e6b3 : 0xd4af37,
              metalness: 0.5,
              roughness: 0.3
            })
          );
          bandMesh.rotation.y = Math.PI / 2;
          bandMesh.position.set(1.5, 0, 0);
          femaleBunGroup.add(bunMesh, bandMesh);
          bones['Head'].add(femaleBunGroup);
        }
        gltfAvatarContainer.add(cloned);
        instance.gltfAvatarRoot = cloned;
        instance.gltfBones = bones;
        bodyGroup.visible = false;
        updateCharacterAnimation(instance, 0);
      })
      .catch(() => {
        bodyGroup.visible = true;
      });
  };

  const instance: CharacterInstance = {
    id,
    name,
    robeColor,
    religionMode: 'buddhist',
    level: 1,
    exp: 0,
    root,
    bodyGroup,
    torso,
    headGroup,
    leftArmPivot,
    leftForeArmPivot,
    rightArmPivot,
    rightForeArmPivot,
    leftLegPivot,
    leftKneePivot,
    rightLegPivot,
    rightKneePivot,
    beadsRing,
    handIncenseMesh,
    nameSprite,
    chatBubbleSprite,
    chatBubbleExpiresAt: 0,
    action: 'idle',
    animTime: 0,
    lastBowCycle: 0,
    targetX: 0,
    targetZ: 0,
    targetRotation: 0,
    connected: true,
    disconnectedAt: 0,
    materials,
    updateNameTag(newName: string) {
      this.name = newName;
      renderNameCanvas(nameCanvas, this.name, this.level, this.religionMode);
      nameTexture.needsUpdate = true;
    },
    setReligionMode(mode: ReligionMode) {
      if (this.religionMode === mode) return;
      this.religionMode = mode;
      mountReal3DAvatar(mode);
      const newTex = createAoTrangTexture(isBrown, mode);
      robeMat.map = newTex;
      robeMat.needsUpdate = true;
      if (mode === 'catholic') {
        robePlainMat.color.setHex(isBrown ? 0xF2EDE2 : 0x263B59);
        pantsMat.color.setHex(isBrown ? 0x2E3540 : 0x1E293B);
        collarMat.color.setHex(isBrown ? 0xD4AF37 : 0xE2C05A);
        hairBun.visible = false;
        hairPin.visible = false;
        catholicBackHair.visible = true;
        buddhistChestOrnament.visible = false;
        catholicChestOrnament.visible = true;
      } else {
        robePlainMat.color.setHex(isBrown ? 0x8C5835 : 0x6D8EA8);
        pantsMat.color.setHex(isBrown ? 0x6E4326 : 0x56748C);
        collarMat.color.setHex(isBrown ? 0x5C361D : 0x49657B);
        hairBun.visible = true;
        hairPin.visible = true;
        catholicBackHair.visible = false;
        buddhistChestOrnament.visible = true;
        catholicChestOrnament.visible = false;
      }
      refreshMilestoneVisibility(this.level, this.religionMode);
      renderNameCanvas(nameCanvas, this.name, this.level, this.religionMode);
      nameTexture.needsUpdate = true;
    },
    setLevelAndExp(level: number, exp: number, mode?: ReligionMode) {
      const nextMode = mode ?? this.religionMode;
      const computedLevel = Math.max(1, level || getLevelFromExp(exp));
      const changed =
        computedLevel !== this.level ||
        exp !== this.exp ||
        nextMode !== this.religionMode;
      const leveledUp = computedLevel > this.level && this.exp > 0;
      this.level = computedLevel;
      this.exp = exp;
      if (mode && mode !== this.religionMode) {
        this.setReligionMode(mode);
      } else if (changed) {
        refreshMilestoneVisibility(this.level, this.religionMode);
        renderNameCanvas(nameCanvas, this.name, this.level, this.religionMode);
        nameTexture.needsUpdate = true;
      }
      if (leveledUp) {
        this.triggerLevelUpBurst();
      }
    },
    triggerLevelUpBurst() {
      levelUpBurstTimer = 2.6;
      levelUpBurstGroup.visible = true;
    },
    updateMilestoneVisuals(dt: number) {
      const t = this.animTime;
      if (groundAuraGroup.visible) {
        groundAuraGroup.rotation.y = t * 0.85;
        const pulse = 1 + Math.sin(t * 3.0) * 0.05;
        groundAuraGroup.scale.set(pulse, 1, pulse);
      }
      if (headHaloGroup.visible) {
        headHaloGroup.rotation.z = t * 0.6;
        const s = 1 + Math.sin(t * 3.5) * 0.06;
        headHaloGroup.scale.set(s, s, 1);
      }
      if (orbitOrbsGroup.visible) {
        orbitOrbsGroup.rotation.y = t * 1.65;
        for (let i = 0; i < orbMeshes.length; i++) {
          const angle = (i / orbMeshes.length) * Math.PI * 2 + t * 1.4;
          const r = 0.44 + Math.sin(t * 2.2 + i) * 0.05;
          orbMeshes[i].position.set(
            Math.cos(angle) * r,
            Math.sin(t * 2.8 + i * 1.5) * 0.28,
            Math.sin(angle) * r
          );
        }
      }
      if (buddhistWheelGroup.visible) {
        buddhistWheelGroup.rotation.z = -t * 1.2;
      }
      if (catholicWingsGroup.visible) {
        const flap = 1 + Math.sin(t * 2.6) * 0.08;
        catholicWingsGroup.scale.set(flap, 1, 1);
      }
      if (supremeRingGroup.visible) {
        supremeRingGroup.rotation.y = -t * 1.1;
      }
      if (lotusPedestalGroup.visible) {
        lotusPedestalGroup.rotation.y = t * 0.45;
      }
      if (starPedestalGroup.visible) {
        starPedestalGroup.rotation.y = -t * 0.45;
      }
      if (crownRibbonGroup.visible) {
        starCrownRing.rotation.y = t * 1.5;
        silkRibbonArc.position.y = 1.18 + Math.sin(t * 2.4) * 0.04;
      }
      if (spiritBirdsGroup.visible) {
        spiritBirdsGroup.rotation.y = t * 1.35;
        const wingAngle = Math.sin(t * 9.0) * 0.45;
        for (const bp of birdWingPivots) {
          bp.left.rotation.z = wingAngle;
          bp.right.rotation.z = -wingAngle;
        }
      }
      if (rainbowOrbsGroup.visible) {
        rainbowOrbsGroup.rotation.y = -t * 2.1;
      }
      if (tripleWheelExtraGroup.visible) {
        outerWheel2.rotation.z = t * 1.6;
        outerWheel3.rotation.z = -t * 0.9;
      }
      if (seraphimExtraWingsGroup.visible) {
        const flap2 = 1 + Math.cos(t * 2.6) * 0.09;
        seraphimExtraWingsGroup.scale.set(flap2, 1, 1);
      }
      if (supremePillarGroup.visible) {
        supremePillarGroup.rotation.y = t * 0.5;
      }
      if (risingLanternsGroup.visible) {
        for (const fm of floatingMotes) {
          const cycle = (t * fm.speed + fm.offset) % 1;
          const a = fm.baseAngle + t * 0.7;
          fm.mesh.position.set(
            Math.cos(a) * fm.radius,
            0.15 + cycle * 2.1,
            Math.sin(a) * fm.radius
          );
          fm.mesh.rotation.y = t * 2.0;
        }
      }
      if (spiralDragonGroup.visible) {
        spiralDragonGroup.rotation.y = t * 2.2;
      }
      if (ultimateSunGroup.visible) {
        ultimateSunGroup.rotation.z = t * 0.75;
        const sunPulse = 1 + Math.sin(t * 3.2) * 0.07;
        ultimateSunGroup.scale.set(sunPulse, sunPulse, 1);
      }
      if (levelUpBurstTimer > 0) {
        levelUpBurstTimer = Math.max(0, levelUpBurstTimer - dt);
        const progress = 1 - levelUpBurstTimer / 2.6;
        const ringScale = 0.8 + progress * 2.8;
        burstRing.scale.set(ringScale, ringScale, 1);
        (burstRing.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          (1 - progress) * 0.9
        );
        (burstBeam.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          (1 - progress) * 0.6
        );
        if (levelUpBurstTimer <= 0) {
          levelUpBurstGroup.visible = false;
        }
      }
    },
    showChatBubble(text: string, isChant = false, durationMs = 6000) {
      renderChatBubbleCanvas(bubbleCanvas, text, isChant);
      bubbleTexture.needsUpdate = true;
      this.chatBubbleSprite.visible = true;
      this.chatBubbleSprite.position.y = 2.52;
      this.chatBubbleExpiresAt = Date.now() + durationMs;
    },
    updateChatBubble(nowMs: number) {
      if (!this.chatBubbleSprite.visible) return;
      const remaining = this.chatBubbleExpiresAt - nowMs;
      if (remaining <= 0) {
        this.chatBubbleSprite.visible = false;
        return;
      }
      const floatWave = Math.sin(nowMs * 0.005) * 0.035;
      this.chatBubbleSprite.position.y = 2.52 + floatWave;
      this.chatBubbleSprite.material.opacity =
        remaining < 600 ? Math.max(0, remaining / 600) : 1;
    },
    updateVisibilityByDistance(cameraPos: THREE.Vector3) {
      const dist = cameraPos.distanceTo(this.root.position);
      this.nameSprite.visible = dist <= NAME_TAG_MAX_DISTANCE;
    },
    setOpacity(opacity: number) {
      const isTransparent = opacity < 0.99;
      for (const m of this.materials) {
        m.transparent = isTransparent;
        m.opacity = opacity;
      }
      this.nameSprite.material.opacity = opacity;
    },
    dispose() {
      nameTexture.dispose();
      nameSpriteMat.dispose();
      bubbleTexture.dispose();
      bubbleMat.dispose();
      aoTrangTex.dispose();
      for (const m of this.materials) {
        m.dispose();
      }
    }
  };

  // Khởi tạo mô hình 3D người thật (.glb) và tư thế đứng trang nghiêm mặc định
  mountReal3DAvatar('buddhist');
  updateCharacterAnimation(instance, 0.016);

  return instance;
}
