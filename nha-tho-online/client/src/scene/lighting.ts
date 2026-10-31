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
  grad.addColorStop(0, 'rgba(255, 250, 220, 1)');
  grad.addColorStop(0.45, 'rgba(255, 225, 130, 0.55)');
  grad.addColorStop(1, 'rgba(255, 195, 60, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

export function setupTempleLighting(scene: THREE.Scene): TempleLighting {
  const bgColor = new THREE.Color(0x1e283b);
  const fog = new THREE.FogExp2(0x243046, 0.012);
  scene.background = bgColor;
  scene.fog = fog;

  const ambientLight = new THREE.HemisphereLight(0xfff6e5, 0x566075, 1.2);
  ambientLight.position.set(0, 14, 0);
  scene.add(ambientLight);

  const doorSunLight = new THREE.DirectionalLight(0xfff0c8, 1.7);
  doorSunLight.position.set(6, 16, 25);
  doorSunLight.target.position.set(0, 0, -4);
  doorSunLight.castShadow = true;

  doorSunLight.shadow.mapSize.width = 1024;
  doorSunLight.shadow.mapSize.height = 1024;
  doorSunLight.shadow.camera.near = 2;
  doorSunLight.shadow.camera.far = 55;
  const d = 18;
  doorSunLight.shadow.camera.left = -d;
  doorSunLight.shadow.camera.right = d;
  doorSunLight.shadow.camera.top = d;
  doorSunLight.shadow.camera.bottom = -d;
  doorSunLight.shadow.bias = -0.0008;
  scene.add(doorSunLight);
  scene.add(doorSunLight.target);

  const altarLight = new THREE.PointLight(0xffdf8e, 2.75, 24, 1.25);
  altarLight.position.set(0, 5.2, -9.0);
  scene.add(altarLight);

  const centerHallLight = new THREE.PointLight(0xfff0c4, 1.6, 22, 1.3);
  centerHallLight.position.set(0, 5.4, 1.5);
  scene.add(centerHallLight);

  const chandelierCoords: [number, number, number][] = [
    [-4.2, 5.2, -6.5],
    [4.2, 5.2, -6.5],
    [-4.2, 5.2, 2.0],
    [4.2, 5.2, 2.0],
    [0, 5.0, 10.5]
  ];

  const lanternLights: THREE.PointLight[] = [centerHallLight];
  for (const [x, y, z] of chandelierCoords) {
    const pt = new THREE.PointLight(0xffe094, 1.3, 15, 1.5);
    pt.position.set(x, y, z);
    scene.add(pt);
    lanternLights.push(pt);
  }

  const dustCount = 90;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustPhases = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 15;
    dustPositions[i * 3 + 1] = 0.6 + Math.random() * 5.0;
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

  let baseAltarIntensity = 2.75;
  let baseLanternIntensity = 1.35;

  return {
    ambientLight,
    doorSunLight,
    altarLight,
    lanternLights,
    setTimeOfDay(mode: TimeOfDayMode) {
      if (mode === 'morning') {
        bgColor.setHex(0x1e283b);
        fog.color.setHex(0x243046);
        fog.density = 0.012;
        ambientLight.color.setHex(0xfff6e5);
        ambientLight.groundColor.setHex(0x566075);
        ambientLight.intensity = 1.2;
        doorSunLight.color.setHex(0xfff0c8);
        doorSunLight.intensity = 1.7;
        baseAltarIntensity = 2.75;
        baseLanternIntensity = 1.35;
      } else if (mode === 'sunset') {
        bgColor.setHex(0x2b1929);
        fog.color.setHex(0x361e32);
        fog.density = 0.015;
        ambientLight.color.setHex(0xffc99e);
        ambientLight.groundColor.setHex(0x3d2438);
        ambientLight.intensity = 0.98;
        doorSunLight.color.setHex(0xff8c4a);
        doorSunLight.intensity = 1.45;
        baseAltarIntensity = 3.0;
        baseLanternIntensity = 1.65;
      } else {
        bgColor.setHex(0x0c1122);
        fog.color.setHex(0x10182e);
        fog.density = 0.016;
        ambientLight.color.setHex(0x9cb8f5);
        ambientLight.groundColor.setHex(0x222940);
        ambientLight.intensity = 0.72;
        doorSunLight.color.setHex(0x9cb8ff);
        doorSunLight.intensity = 0.65;
        baseAltarIntensity = 3.35;
        baseLanternIntensity = 2.05;
      }
    },
    update(timeSeconds: number) {
      const flicker = Math.sin(timeSeconds * 3.0) * 0.05 + Math.cos(timeSeconds * 5.2) * 0.04;
      altarLight.intensity = baseAltarIntensity + flicker;
      for (let i = 0; i < lanternLights.length; i++) {
        lanternLights[i].intensity =
          baseLanternIntensity + Math.sin(timeSeconds * 2.2 + i * 1.3) * 0.04;
      }

      const posAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < dustCount; i++) {
        const y = posAttr.getY(i) + 0.0035;
        const nextY = y > 5.5 ? 0.6 : y;
        const x = posAttr.getX(i) + Math.sin(timeSeconds * 0.8 + dustPhases[i]) * 0.002;
        posAttr.setXYZ(i, x, nextY, posAttr.getZ(i));
      }
      posAttr.needsUpdate = true;
    }
  };
}
