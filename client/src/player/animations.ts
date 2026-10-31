import * as THREE from 'three';
import { CharacterInstance } from './character';

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

function rotateLocalBone(
  bones: Record<string, THREE.Object3D>,
  boneName: string,
  rx: number,
  ry: number,
  rz: number
): void {
  const bone = bones[boneName];
  if (!bone || !bone.userData.restQuat) return;
  _euler.set(rx, ry, rz, 'XYZ');
  _quat.setFromEuler(_euler);
  bone.quaternion.copy(bone.userData.restQuat).multiply(_quat);
}

function resetGltfBones(avatarRoot: THREE.Object3D, bones: Record<string, THREE.Object3D>): void {
  avatarRoot.position.set(0, 0, 0);
  avatarRoot.rotation.set(0, 0, 0);
  for (const key in bones) {
    const b = bones[key];
    if (b.userData.restQuat) b.quaternion.copy(b.userData.restQuat);
    if (b.userData.restPos) b.position.copy(b.userData.restPos);
  }
}

/**
 * Cập nhật animation cho nhân vật 3D (.glb skeleton + fallback):
 * - idle: Đứng trang nghiêm, nhịp thở nhẹ
 * - walk: Bước đi khoan thai, gập khớp gối & đánh tay tự nhiên
 * - pray: Chắp tay trước ngực (Hợp chưởng / Nguyện cầu)
 * - bow: Quỳ xuống đệm / bàn quỳ và cúi lạy trang nghiêm (chu kỳ 4.0 giây)
 * - beads: Hai tay lần chuỗi tràng hạt / Mân Côi
 */
export function updateCharacterAnimation(
  char: CharacterInstance,
  dt: number,
  onBowStrikeMo?: () => void
): void {
  char.animTime += dt;
  const t = char.animTime;

  if (char.gltfAvatarRoot && char.gltfBones) {
    const root = char.gltfAvatarRoot;
    const bones = char.gltfBones;
    resetGltfBones(root, bones);

    switch (char.action) {
      case 'idle': {
        const breath = Math.sin(t * 2.2) * 0.02;
        rotateLocalBone(bones, 'LeftArm', 1.32, 0, 0.06 + breath);
        rotateLocalBone(bones, 'RightArm', 1.32, 0, -0.06 - breath);
        rotateLocalBone(bones, 'LeftForeArm', 0.18, 0, 0.12);
        rotateLocalBone(bones, 'RightForeArm', 0.18, 0, -0.12);
        rotateLocalBone(bones, 'Head', 0, 0, Math.sin(t * 1.4) * 0.025);
        break;
      }

      case 'walk': {
        const speed = 6.8;
        const phase = t * speed;
        const swing = Math.sin(phase);
        const liftL = Math.max(0, Math.cos(phase));
        const liftR = Math.max(0, -Math.cos(phase));

        // Hạ hông rất nhẹ khi sải chân để bàn chân trụ luôn chạm sát mặt sàn
        root.position.y = -0.015 * Math.abs(swing);

        // Chân bước đi tự nhiên: chân trụ duỗi chạm đất, chân đưa tới hơi nâng nhẹ đầu gối
        rotateLocalBone(bones, 'LeftUpLeg', 0, 0, swing * 0.26 + liftL * 0.14);
        rotateLocalBone(bones, 'LeftLeg', 0, 0, -liftL * 0.38 - Math.max(0, -swing) * 0.12);
        rotateLocalBone(bones, 'RightUpLeg', 0, 0, swing * 0.26 - liftR * 0.14);
        rotateLocalBone(bones, 'RightLeg', 0, 0, liftR * 0.38 + Math.max(0, swing) * 0.12);

        // Hạ tay tự nhiên và đánh tay đối xứng nhẹ nhàng theo nhịp bước
        rotateLocalBone(bones, 'LeftArm', 1.30, 0, -swing * 0.18);
        rotateLocalBone(bones, 'LeftForeArm', 0.22, 0, 0.14 + Math.max(0, -swing) * 0.12);

        rotateLocalBone(bones, 'RightArm', 1.30, 0, -swing * 0.18);
        rotateLocalBone(bones, 'RightForeArm', 0.22, 0, -0.14 - Math.max(0, swing) * 0.12);
        break;
      }

      case 'pray': {
        const breath = Math.sin(t * 2.0) * 0.02;
        rotateLocalBone(bones, 'Head', 0, 0, -0.14);

        // Chế độ Nhà Thờ Công Giáo: Trong 2.2 giây đầu thực hiện Làm Dấu Thánh Giá
        // (Trán -> Ngực -> Vai Trái -> Vai Phải -> Chắp hai tay trước ngực)
        if (char.religionMode === 'catholic' && t < 2.2) {
          // Tay trái đặt trang nghiêm trước ngực
          rotateLocalBone(bones, 'LeftArm', 1.10, -0.40, 0.10);
          rotateLocalBone(bones, 'LeftForeArm', 1.40, 0.90, 0.80);

          // 5 điểm mốc của bàn tay phải khi Làm Dấu Thánh Giá
          const keyframes = [
            // 0: Chạm Trán (Nhân danh Cha)
            { time: 0.0, arm: [1.0, 0.0, -0.9], fore: [2.0, -0.6, -1.0] },
            { time: 0.42, arm: [1.0, 0.0, -0.9], fore: [2.0, -0.6, -1.0] },
            // 1: Chạm Ngực (và Con)
            { time: 0.88, arm: [0.8, 0.6, -0.5], fore: [2.2, -0.3, 0.0] },
            // 2: Chạm Vai Trái (và Thánh)
            { time: 1.34, arm: [1.2, -0.3, -0.5], fore: [2.0, -0.3, -0.6] },
            // 3: Chạm Vai Phải (Thần)
            { time: 1.78, arm: [0.4, 0.6, -0.1], fore: [2.0, -0.9, -0.6] },
            // 4: Chắp hai tay trước ngực (Amen)
            { time: 2.20, arm: [1.25, 0.40, -0.25], fore: [1.40, -1.20, -0.60] }
          ];

          let k0 = keyframes[0];
          let k1 = keyframes[keyframes.length - 1];
          for (let i = 0; i < keyframes.length - 1; i++) {
            if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
              k0 = keyframes[i];
              k1 = keyframes[i + 1];
              break;
            }
          }
          const span = Math.max(0.001, k1.time - k0.time);
          const rawP = Math.min(1, Math.max(0, (t - k0.time) / span));
          const ease = rawP * rawP * (3 - 2 * rawP);

          const ax = k0.arm[0] + (k1.arm[0] - k0.arm[0]) * ease;
          const ay = k0.arm[1] + (k1.arm[1] - k0.arm[1]) * ease;
          const az = k0.arm[2] + (k1.arm[2] - k0.arm[2]) * ease;

          const fx = k0.fore[0] + (k1.fore[0] - k0.fore[0]) * ease;
          const fy = k0.fore[1] + (k1.fore[1] - k0.fore[1]) * ease;
          const fz = k0.fore[2] + (k1.fore[2] - k0.fore[2]) * ease;

          rotateLocalBone(bones, 'RightArm', ax, ay, az);
          rotateLocalBone(bones, 'RightForeArm', fx, fy, fz);
          break;
        }

        // Tư thế Chắp Tay Hiệp Chưởng / Cầu Nguyện chuẩn: hai cổ tay khép sát trước ngực, mũi bàn tay hướng lên trên
        rotateLocalBone(bones, 'LeftArm', 1.10, -0.40, 0.10 + breath);
        rotateLocalBone(bones, 'LeftForeArm', 1.40, 0.90, 0.80);

        rotateLocalBone(bones, 'RightArm', 1.25, 0.40, -0.25 - breath);
        rotateLocalBone(bones, 'RightForeArm', 1.40, -1.20, -0.60);
        break;
      }

      case 'bow': {
        const cycleDuration = 4.0;
        const currentCycleIndex = Math.floor(t / cycleDuration);
        const cycle = (t % cycleDuration) / cycleDuration;

        if (cycle > 0.44 && char.lastBowCycle !== currentCycleIndex) {
          char.lastBowCycle = currentCycleIndex;
          if (onBowStrikeMo) {
            onBowStrikeMo();
          }
        }

        let kneelEase = 0;
        let bowCurve = 0;
        if (cycle < 0.22) {
          const p = cycle / 0.22;
          kneelEase = p * p * (3 - 2 * p);
        } else if (cycle < 0.72) {
          kneelEase = 1;
          const sub = (cycle - 0.22) / 0.50;
          bowCurve = Math.sin(sub * Math.PI);
        } else {
          const p = 1 - (cycle - 0.72) / 0.28;
          kneelEase = p * p * (3 - 2 * p);
        }

        // Hạ trọng tâm sao cho hai đầu gối chạm vừa khít lên đệm bồ đoàn / bục quỳ (y = 0.07m)
        root.position.y = -0.44 * kneelEase - 0.02 * bowCurve;
        rotateLocalBone(bones, 'LeftUpLeg', 0, 0, 0.16 * kneelEase);
        rotateLocalBone(bones, 'RightUpLeg', 0, 0, -0.16 * kneelEase);
        rotateLocalBone(bones, 'LeftLeg', 0, 0, -1.65 * kneelEase);
        rotateLocalBone(bones, 'RightLeg', 0, 0, 1.65 * kneelEase);
        rotateLocalBone(bones, 'LeftFoot', 0, 0, -0.50 * kneelEase);
        rotateLocalBone(bones, 'RightFoot', 0, 0, 0.50 * kneelEase);

        // Cúi mình thành kính vừa phải, lưng và cổ thẳng tự nhiên
        rotateLocalBone(bones, 'Spine1', 0, 0, -0.32 * bowCurve);
        rotateLocalBone(bones, 'Head', 0, 0, -0.14 * kneelEase - 0.18 * bowCurve);

        // Hai tay chắp trang nghiêm trước ngực khi quỳ lạy
        rotateLocalBone(bones, 'LeftArm', 1.10, -0.40, 0.10 + 0.16 * bowCurve);
        rotateLocalBone(bones, 'LeftForeArm', 1.40, 0.90, 0.80);

        rotateLocalBone(bones, 'RightArm', 1.25, 0.40, -0.25 - 0.16 * bowCurve);
        rotateLocalBone(bones, 'RightForeArm', 1.40, -1.20, -0.60);
        break;
      }

      case 'beads': {
        const pull = Math.sin(t * 5.0) * 0.07;
        rotateLocalBone(bones, 'Head', 0, 0, -0.14);

        rotateLocalBone(bones, 'LeftArm', 1.12, -0.35, 0.12);
        rotateLocalBone(bones, 'LeftForeArm', 1.35, 0.85, 0.72);

        rotateLocalBone(bones, 'RightArm', 1.22, 0.35, -0.22 - pull);
        rotateLocalBone(bones, 'RightForeArm', 1.35 + pull, -1.10, -0.55);
        break;
      }
    }

    if (char.updateMilestoneVisuals) {
      char.updateMilestoneVisuals(dt);
    }
    return;
  }

  // Fallback khi mô hình GLB đang tải
  char.bodyGroup.position.set(0, 0, 0);
  char.bodyGroup.rotation.set(0, 0, 0);

  char.torso.position.set(0, 0.74, 0);
  char.torso.rotation.set(0, 0, 0);

  char.headGroup.position.set(0, 0.56, 0);
  char.headGroup.rotation.set(0, 0, 0);

  char.leftArmPivot.rotation.set(0, 0, 0);
  char.leftForeArmPivot.rotation.set(0, 0, 0);
  char.rightArmPivot.rotation.set(0, 0, 0);
  char.rightForeArmPivot.rotation.set(0, 0, 0);

  char.leftLegPivot.position.set(-0.115, 0.74, 0);
  char.leftLegPivot.rotation.set(0, 0, 0);
  char.leftKneePivot.rotation.set(0, 0, 0);

  char.rightLegPivot.position.set(0.115, 0.74, 0);
  char.rightLegPivot.rotation.set(0, 0, 0);
  char.rightKneePivot.rotation.set(0, 0, 0);

  char.beadsRing.visible = false;

  switch (char.action) {
    case 'idle': {
      const breath = Math.sin(t * 2.2) * 0.008;
      char.torso.position.y = 0.74 + breath;
      char.headGroup.rotation.x = Math.sin(t * 1.4) * 0.025;

      char.leftArmPivot.rotation.z = 0.06;
      char.leftArmPivot.rotation.x = -0.08 + Math.sin(t * 2.2) * 0.02;
      char.leftForeArmPivot.rotation.x = -0.18;

      char.rightArmPivot.rotation.z = -0.06;
      char.rightArmPivot.rotation.x = -0.08 + Math.sin(t * 2.2) * 0.02;
      char.rightForeArmPivot.rotation.x = -0.18;
      break;
    }

    case 'walk': {
      const speed = 7.8;
      const phase = t * speed;
      const swing = Math.sin(phase);

      char.bodyGroup.position.y = Math.abs(Math.sin(phase)) * 0.032;
      char.torso.rotation.x = 0.04;
      char.torso.rotation.y = -swing * 0.06;

      char.leftLegPivot.rotation.x = swing * 0.48;
      char.leftKneePivot.rotation.x = Math.max(0, -swing * 0.55);

      char.rightLegPivot.rotation.x = -swing * 0.48;
      char.rightKneePivot.rotation.x = Math.max(0, swing * 0.55);

      char.leftArmPivot.rotation.x = -swing * 0.32;
      char.leftArmPivot.rotation.z = 0.06;
      char.leftForeArmPivot.rotation.x = -0.25 - Math.max(0, swing) * 0.2;

      char.rightArmPivot.rotation.x = swing * 0.32;
      char.rightArmPivot.rotation.z = -0.06;
      char.rightForeArmPivot.rotation.x = -0.25 - Math.max(0, -swing) * 0.2;
      break;
    }

    case 'pray': {
      const breath = Math.sin(t * 2.0) * 0.006;
      char.torso.position.y = 0.74 + breath;
      char.headGroup.rotation.x = 0.14;

      char.leftArmPivot.rotation.x = -0.62;
      char.leftArmPivot.rotation.y = 0.42;
      char.leftArmPivot.rotation.z = 0.18;
      char.leftForeArmPivot.rotation.x = -1.25;
      char.leftForeArmPivot.rotation.z = -0.28;

      char.rightArmPivot.rotation.x = -0.62;
      char.rightArmPivot.rotation.y = -0.42;
      char.rightArmPivot.rotation.z = -0.18;
      char.rightForeArmPivot.rotation.x = -1.25;
      char.rightForeArmPivot.rotation.z = 0.28;
      break;
    }

    case 'bow': {
      const cycleDuration = 4.0;
      const currentCycleIndex = Math.floor(t / cycleDuration);
      const cycle = (t % cycleDuration) / cycleDuration;

      if (cycle > 0.44 && char.lastBowCycle !== currentCycleIndex) {
        char.lastBowCycle = currentCycleIndex;
        if (onBowStrikeMo) {
          onBowStrikeMo();
        }
      }

      if (cycle < 0.22) {
        const p = cycle / 0.22;
        const ease = p * p * (3 - 2 * p);

        char.bodyGroup.position.y = -0.30 * ease;
        char.leftKneePivot.rotation.x = 1.52 * ease;
        char.rightKneePivot.rotation.x = 1.52 * ease;

        const raise = Math.sin(p * Math.PI) * 0.22;
        char.leftArmPivot.rotation.set(-0.62 - raise, 0.42, 0.18);
        char.leftForeArmPivot.rotation.set(-1.25, 0, -0.28);
        char.rightArmPivot.rotation.set(-0.62 - raise, -0.42, -0.18);
        char.rightForeArmPivot.rotation.set(-1.25, 0, 0.28);
        char.headGroup.rotation.x = 0.15;
      } else if (cycle < 0.68) {
        const sub = (cycle - 0.22) / 0.46;
        const bowCurve = Math.sin(sub * Math.PI);

        char.bodyGroup.position.y = -0.30 - 0.04 * bowCurve;
        char.leftKneePivot.rotation.x = 1.52;
        char.rightKneePivot.rotation.x = 1.52;

        char.torso.position.z = 0.06 * bowCurve;
        char.torso.rotation.x = 0.56 * bowCurve;
        char.headGroup.rotation.x = 0.16 + 0.24 * bowCurve;

        char.leftArmPivot.rotation.x = -0.62 - 0.55 * bowCurve;
        char.leftArmPivot.rotation.y = 0.42 * (1 - bowCurve * 0.45);
        char.leftForeArmPivot.rotation.x = -1.25 + 0.45 * bowCurve;

        char.rightArmPivot.rotation.x = -0.62 - 0.55 * bowCurve;
        char.rightArmPivot.rotation.y = -0.42 * (1 - bowCurve * 0.45);
        char.rightForeArmPivot.rotation.x = -1.25 + 0.45 * bowCurve;
      } else {
        const p = 1 - (cycle - 0.68) / 0.32;
        const ease = p * p * (3 - 2 * p);

        char.bodyGroup.position.y = -0.30 * ease;
        char.leftKneePivot.rotation.x = 1.52 * ease;
        char.rightKneePivot.rotation.x = 1.52 * ease;

        char.leftArmPivot.rotation.set(-0.62, 0.42, 0.18);
        char.leftForeArmPivot.rotation.set(-1.25, 0, -0.28);
        char.rightArmPivot.rotation.set(-0.62, -0.42, -0.18);
        char.rightForeArmPivot.rotation.set(-1.25, 0, 0.28);
        char.headGroup.rotation.x = 0.14;
      }
      break;
    }

    case 'beads': {
      char.beadsRing.visible = true;
      char.beadsRing.rotation.z = t * 1.8;
      char.headGroup.rotation.x = 0.12;

      char.leftArmPivot.rotation.set(-0.52, 0.35, 0.15);
      char.leftForeArmPivot.rotation.set(-1.05, 0, -0.2);

      const pull = Math.sin(t * 5.5) * 0.09;
      char.rightArmPivot.rotation.set(-0.52 + pull, -0.35, -0.15);
      char.rightForeArmPivot.rotation.set(-1.05 + pull * 1.2, 0, 0.2);
      break;
    }
  }

  if (char.updateMilestoneVisuals) {
    char.updateMilestoneVisuals(dt);
  }
}
