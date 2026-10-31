import * as THREE from 'three';

export type TimeOfDayMode = 'morning' | 'sunset' | 'night';

export interface TempleLighting {
  ambientLight: THREE.HemisphereLight;
  doorSunLight: THREE.DirectionalLight;
  altarLight: THREE.PointLight;
  lanternLights: THREE.PointLight[];
  setTimeOfDay(mode: TimeOfDayMode): void;
  update(timeSeconds: number): void;
}

function createGoldenDustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  grad.addColorStop(0, 'rgba(255, 245, 190, 1)');
  grad.addColorStop(0.45, 'rgba(255, 215, 100, 0.55)');
  grad.addColorStop(1, 'rgba(255, 180, 40, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

export function setupTempleLighting(scene: THREE.Scene): TempleLighting {
  const bgColor = new THREE.Color(0x2d1f14);
  const fog = new THREE.FogExp2(0x362417, 0.013);
  scene.background = bgColor;
  scene.fog = fog;

  // Ánh sáng bán cầu ấm áp phủ đều toàn bộ Chánh Điện & nhân vật
  const ambientLight = new THREE.HemisphereLight(0xfff0d1, 0x6b4830, 1.15);
  ambientLight.position.set(0, 14, 0);
  scene.add(ambientLight);

  // Ánh nắng vàng ấm chiếu xiên từ sân chùa qua cửa Chánh Điện
  const doorSunLight = new THREE.DirectionalLight(0xffe6b0, 1.65);
  doorSunLight.position.set(6, 15, 24);
  doorSunLight.target.position.set(0, 0, -4);
  doorSunLight.castShadow = true;

  doorSunLight.shadow.mapSize.width = 1024;
  doorSunLight.shadow.mapSize.height = 1024;
  doorSunLight.shadow.camera.near = 2;
  doorSunLight.shadow.camera.far = 52;
  const d = 18;
  doorSunLight.shadow.camera.left = -d;
  doorSunLight.shadow.camera.right = d;
  doorSunLight.shadow.camera.top = d;
  doorSunLight.shadow.camera.bottom = -d;
  doorSunLight.shadow.bias = -0.0008;
  scene.add(doorSunLight);
  scene.add(doorSunLight.target);

  // Đèn chiếu sáng khu vực Phật đài & Bàn thờ
  const altarLight = new THREE.PointLight(0xffcf6e, 2.6, 22, 1.25);
  altarLight.position.set(0, 5.0, -8.8);
  scene.add(altarLight);

  // Đèn trung tâm chiếu sáng khu vực 12 Bồ đoàn để nhân vật luôn sáng rõ, tươi đẹp
  const centerHallLight = new THREE.PointLight(0xffe2a8, 1.55, 20, 1.3);
  centerHallLight.position.set(0, 5.2, 1.5);
  scene.add(centerHallLight);

  const lanternCoords: [number, number, number][] = [
    [-4.5, 4.8, -6.5],
    [4.5, 4.8, -6.5],
    [-4.5, 4.8, 2.0],
    [4.5, 4.8, 2.0],
    [0, 4.6, 11.0]
  ];

  const lanternLights: THREE.PointLight[] = [centerHallLight];
  for (const [x, y, z] of lanternCoords) {
    const pt = new THREE.PointLight(0xffbe55, 1.25, 15, 1.45);
    pt.position.set(x, y, z);
    scene.add(pt);
    lanternLights.push(pt);
  }

  // Hệ thống hạt bụi vàng (Kim Quang) lơ lửng trong nắng Chánh Điện
  const dustCount = 90;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustPhases = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 15;
    dustPositions[i * 3 + 1] = 0.6 + Math.random() * 4.8;
    dustPositions[i * 3 + 2] = -11 + Math.random() * 25;
    dustPhases[i] = Math.random() * Math.PI * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    map: createGoldenDustTexture(),
    size: 0.22,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.name = 'SacredGoldenDust';
  scene.add(dustPoints);

  let baseAltarIntensity = 2.6;
  let baseLanternIntensity = 1.3;

  return {
    ambientLight,
    doorSunLight,
    altarLight,
    lanternLights,
    setTimeOfDay(mode: TimeOfDayMode) {
      if (mode === 'morning') {
        bgColor.setHex(0x2d1f14);
        fog.color.setHex(0x362417);
        fog.density = 0.013;
        ambientLight.color.setHex(0xfff0d1);
        ambientLight.groundColor.setHex(0x6b4830);
        ambientLight.intensity = 1.15;
        doorSunLight.color.setHex(0xffe6b0);
        doorSunLight.intensity = 1.65;
        baseAltarIntensity = 2.6;
        baseLanternIntensity = 1.3;
      } else if (mode === 'sunset') {
        bgColor.setHex(0x2c151c);
        fog.color.setHex(0x381b22);
        fog.density = 0.015;
        ambientLight.color.setHex(0xffc294);
        ambientLight.groundColor.setHex(0x4a242b);
        ambientLight.intensity = 0.98;
        doorSunLight.color.setHex(0xff8847);
        doorSunLight.intensity = 1.45;
        baseAltarIntensity = 2.9;
        baseLanternIntensity = 1.55;
      } else {
        // Đêm Hoa Đăng
        bgColor.setHex(0x0d1021);
        fog.color.setHex(0x141830);
        fog.density = 0.016;
        ambientLight.color.setHex(0x9cb8f5);
        ambientLight.groundColor.setHex(0x2b2233);
        ambientLight.intensity = 0.72;
        doorSunLight.color.setHex(0x9bb8ff);
        doorSunLight.intensity = 0.65;
        baseAltarIntensity = 3.2;
        baseLanternIntensity = 1.95;
      }
    },
    update(timeSeconds: number) {
      const flicker = Math.sin(timeSeconds * 3.2) * 0.06 + Math.cos(timeSeconds * 5.7) * 0.04;
      altarLight.intensity = baseAltarIntensity + flicker;
      for (let i = 0; i < lanternLights.length; i++) {
        lanternLights[i].intensity =
          baseLanternIntensity + Math.sin(timeSeconds * 2.5 + i * 1.3) * 0.05;
      }

      const posAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < dustCount; i++) {
        const y = posAttr.getY(i) + 0.0035;
        const nextY = y > 5.4 ? 0.6 : y;
        const x = posAttr.getX(i) + Math.sin(timeSeconds * 0.8 + dustPhases[i]) * 0.002;
        posAttr.setXYZ(i, x, nextY, posAttr.getZ(i));
      }
      posAttr.needsUpdate = true;
    }
  };
}
