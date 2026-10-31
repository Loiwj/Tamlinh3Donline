import * as THREE from 'three';
import {
  PLAYER_SPEED,
  PLAYER_RADIUS,
  NET_SEND_INTERVAL_MS,
  HALL_MIN_X,
  HALL_MAX_X,
  HALL_MIN_Z,
  HALL_MAX_Z,
  COURTYARD_MIN_X,
  COURTYARD_MAX_X,
  COURTYARD_MAX_Z,
  DOORWAY_HALF_WIDTH,
  OBSTACLE_BOXES,
  AABB2D,
  PlayerAction
} from '../../../shared/constants';
import { CharacterInstance } from './character';

export interface WaypointTask {
  waypoints: THREE.Vector2[];
  finalRotation?: number;
  onArrive?: () => void;
}

export class PlayerMovementController {
  private localPlayer: CharacterInstance;
  private keysPressed = new Set<string>();
  private currentTask: WaypointTask | null = null;
  private lastNetSendTime = 0;
  private lastSentX = 0;
  private lastSentZ = 0;
  private lastSentRot = 0;
  private lastSentAction: PlayerAction = 'idle';
  private clickMarker: THREE.Mesh;
  private joystickX = 0;
  private joystickZ = 0;

  // Khi đang đứng chắp tay 2 giây để cắm nhang thì khóa di chuyển tự động
  public isPrayingForIncense = false;

  public setJoystickVector(jx: number, jz: number): void {
    this.joystickX = jx;
    this.joystickZ = jz;
  }

  constructor(localPlayer: CharacterInstance, scene: THREE.Scene) {
    this.localPlayer = localPlayer;
    this.lastSentX = localPlayer.root.position.x;
    this.lastSentZ = localPlayer.root.position.z;
    this.lastSentRot = localPlayer.root.rotation.y;

    // Vòng tròn sáng đánh dấu điểm click dưới sàn
    const markerGeo = new THREE.RingGeometry(0.2, 0.34, 24);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffd966,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.clickMarker = new THREE.Mesh(markerGeo, markerMat);
    this.clickMarker.rotation.x = -Math.PI / 2;
    this.clickMarker.position.y = 0.025;
    this.clickMarker.visible = false;
    scene.add(this.clickMarker);

    this.bindKeyboard();
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      const code = e.code;
      if (
        code === 'KeyW' ||
        code === 'KeyA' ||
        code === 'KeyS' ||
        code === 'KeyD' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight'
      ) {
        this.keysPressed.add(code);
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keysPressed.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keysPressed.clear();
    });
  }

  /**
   * Thiết lập đường đi tự động tới điểm (targetX, targetZ),
   * tự tránh vật cản đơn giản bằng cách đi vòng qua hộp bao (AABB) của vật thể.
   */
  public navigateToPoint(
    targetX: number,
    targetZ: number,
    finalRotation?: number,
    onArrive?: () => void
  ): void {
    if (this.isPrayingForIncense) return;

    const clamped = this.clampToWalkableBounds(targetX, targetZ);
    const safeTarget = this.pushOutOfObstacles(clamped.x, clamped.z);

    const start = new THREE.Vector2(
      this.localPlayer.root.position.x,
      this.localPlayer.root.position.z
    );
    const end = new THREE.Vector2(safeTarget.x, safeTarget.z);

    const waypoints = this.computeObstacleAvoidancePath(start, end);

    this.currentTask = {
      waypoints,
      finalRotation,
      onArrive
    };

    this.clickMarker.position.set(safeTarget.x, 0.025, safeTarget.z);
    this.clickMarker.visible = true;
  }

  public cancelNavigation(): void {
    this.currentTask = null;
    this.clickMarker.visible = false;
  }

  /**
   * Tìm đường đi vòng qua các hộp bao vật cản (AABB) trên mặt phẳng XZ
   */
  private computeObstacleAvoidancePath(start: THREE.Vector2, end: THREE.Vector2): THREE.Vector2[] {
    const waypoints: THREE.Vector2[] = [];
    let current = start.clone();
    const margin = PLAYER_RADIUS + 0.22;

    // Lặp tối đa 4 lần tách điểm rẽ nếu đường thẳng cắt qua hộp bao của vật thể
    for (let step = 0; step < 4; step++) {
      const blockingBox = this.findFirstIntersectingBox(current, end, margin);
      if (!blockingBox) {
        break;
      }

      // 4 góc mở rộng của hộp bao vật cản
      const corners = [
        new THREE.Vector2(blockingBox.minX - margin, blockingBox.minZ - margin),
        new THREE.Vector2(blockingBox.maxX + margin, blockingBox.minZ - margin),
        new THREE.Vector2(blockingBox.minX - margin, blockingBox.maxZ + margin),
        new THREE.Vector2(blockingBox.maxX + margin, blockingBox.maxZ + margin)
      ];

      // Chọn góc hợp lệ giúp đi vòng qua hộp bao ngắn nhất
      let bestCorner: THREE.Vector2 | null = null;
      let bestScore = Infinity;

      for (const c of corners) {
        const clampedC = this.clampToWalkableBounds(c.x, c.y);
        if (Math.hypot(clampedC.x - current.x, clampedC.z - current.y) < 0.15) continue;
        const score = current.distanceTo(c) + c.distanceTo(end);
        if (score < bestScore) {
          bestScore = score;
          bestCorner = c;
        }
      }

      if (bestCorner) {
        waypoints.push(bestCorner);
        current = bestCorner;
      } else {
        break;
      }
    }

    waypoints.push(end);
    return waypoints;
  }

  private findFirstIntersectingBox(
    p1: THREE.Vector2,
    p2: THREE.Vector2,
    margin: number
  ): AABB2D | null {
    let closestBox: AABB2D | null = null;
    let closestT = Infinity;

    for (const box of OBSTACLE_BOXES) {
      const minX = box.minX - margin;
      const maxX = box.maxX + margin;
      const minZ = box.minZ - margin;
      const maxZ = box.maxZ + margin;

      const tHit = this.segmentIntersectsAABB(p1.x, p1.y, p2.x, p2.y, minX, maxX, minZ, maxZ);
      if (tHit !== null && tHit < closestT) {
        closestT = tHit;
        closestBox = box;
      }
    }

    return closestBox;
  }

  private segmentIntersectsAABB(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number
  ): number | null {
    const dx = x2 - x1;
    const dz = z2 - z1;
    let tMin = 0;
    let tMax = 1;

    if (Math.abs(dx) < 1e-6) {
      if (x1 < minX || x1 > maxX) return null;
    } else {
      const invDx = 1 / dx;
      let t1 = (minX - x1) * invDx;
      let t2 = (maxX - x1) * invDx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }

    if (Math.abs(dz) < 1e-6) {
      if (z1 < minZ || z1 > maxZ) return null;
    } else {
      const invDz = 1 / dz;
      let t1 = (minZ - z1) * invDz;
      let t2 = (maxZ - z1) * invDz;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }

    return tMin;
  }

  private clampToWalkableBounds(x: number, z: number): { x: number; z: number } {
    const margin = PLAYER_RADIUS + 0.15;
    const clampedZ = Math.max(HALL_MIN_Z + margin, Math.min(COURTYARD_MAX_Z - margin, z));
    let clampedX = x;

    if (clampedZ <= HALL_MAX_Z) {
      clampedX = Math.max(HALL_MIN_X + margin, Math.min(HALL_MAX_X - margin, x));
    } else {
      clampedX = Math.max(COURTYARD_MIN_X + margin, Math.min(COURTYARD_MAX_X - margin, x));
    }

    return { x: clampedX, z: clampedZ };
  }

  private pushOutOfObstacles(x: number, z: number): { x: number; z: number } {
    let outX = x;
    let outZ = z;
    const pad = PLAYER_RADIUS;

    for (const box of OBSTACLE_BOXES) {
      const minX = box.minX - pad;
      const maxX = box.maxX + pad;
      const minZ = box.minZ - pad;
      const maxZ = box.maxZ + pad;

      if (outX > minX && outX < maxX && outZ > minZ && outZ < maxZ) {
        const dLeft = outX - minX;
        const dRight = maxX - outX;
        const dBack = outZ - minZ;
        const dFront = maxZ - outZ;
        const minPen = Math.min(dLeft, dRight, dBack, dFront);

        if (minPen === dLeft) outX = minX;
        else if (minPen === dRight) outX = maxX;
        else if (minPen === dBack) outZ = minZ;
        else outZ = maxZ;
      }
    }

    return this.clampToWalkableBounds(outX, outZ);
  }

  /**
   * Cập nhật vị trí nhân vật mỗi khung hình (tốc độ 3.5 m/giây)
   * và gửi gói tin lên server tối đa 10 lần/giây khi đang di chuyển.
   */
  public update(
    dt: number,
    nowMs: number,
    cameraYawAngle: number,
    sendMovePacket: (x: number, z: number, rotation: number, action: PlayerAction) => void
  ): void {
    if (this.isPrayingForIncense) {
      return;
    }

    let moveX = this.joystickX;
    let moveZ = this.joystickZ;

    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) moveZ -= 1;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) moveZ += 1;
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) moveX -= 1;
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) moveX += 1;

    const pos = this.localPlayer.root.position;
    let isMoving = false;

    if (Math.hypot(moveX, moveZ) > 0.08) {
      // Nếu người chơi bấm phím WASD/Mũi tên hoặc kéo Joystick điện thoại, hủy đường đi click chuột
      this.cancelNavigation();

      const len = Math.hypot(moveX, moveZ);
      const speedScale = Math.min(1, len);
      const normX = moveX / len;
      const normZ = moveZ / len;

      // Chuyển hướng di chuyển theo góc nhìn camera hiện tại
      const cos = Math.cos(cameraYawAngle);
      const sin = Math.sin(cameraYawAngle);
      const worldDirX = normX * cos + normZ * sin;
      const worldDirZ = -normX * sin + normZ * cos;

      const nextX = pos.x + worldDirX * PLAYER_SPEED * speedScale * dt;
      const nextZ = pos.z + worldDirZ * PLAYER_SPEED * speedScale * dt;
      const resolved = this.pushOutOfObstacles(nextX, nextZ);

      pos.x = resolved.x;
      pos.z = resolved.z;

      // Mặt trước nhân vật là trục -Z nên góc xoay y = atan2(-dx, -dz)
      this.localPlayer.root.rotation.y = Math.atan2(-worldDirX, -worldDirZ);
      this.localPlayer.action = 'walk';
      isMoving = true;
    } else if (this.currentTask && this.currentTask.waypoints.length > 0) {
      const target = this.currentTask.waypoints[0];
      const dx = target.x - pos.x;
      const dz = target.y - pos.z;
      const dist = Math.hypot(dx, dz);
      const stepDist = PLAYER_SPEED * dt;

      if (dist <= Math.max(0.08, stepDist)) {
        pos.x = target.x;
        pos.z = target.y;
        this.currentTask.waypoints.shift();

        if (this.currentTask.waypoints.length === 0) {
          const finishedTask = this.currentTask;
          this.cancelNavigation();
          if (finishedTask.finalRotation !== undefined) {
            this.localPlayer.root.rotation.y = finishedTask.finalRotation;
          }
          if (finishedTask.onArrive) {
            finishedTask.onArrive();
          } else {
            this.localPlayer.action = 'idle';
          }
          // Gửi ngay trạng thái dừng cuối cùng
          sendMovePacket(
            pos.x,
            pos.z,
            this.localPlayer.root.rotation.y,
            this.localPlayer.action
          );
          this.lastNetSendTime = nowMs;
          this.lastSentX = pos.x;
          this.lastSentZ = pos.z;
          this.lastSentRot = this.localPlayer.root.rotation.y;
          this.lastSentAction = this.localPlayer.action;
          return;
        }
      } else {
        const dirX = dx / dist;
        const dirZ = dz / dist;
        const nextX = pos.x + dirX * stepDist;
        const nextZ = pos.z + dirZ * stepDist;
        const resolved = this.pushOutOfObstacles(nextX, nextZ);

        pos.x = resolved.x;
        pos.z = resolved.z;
        this.localPlayer.root.rotation.y = Math.atan2(-dirX, -dirZ);
        this.localPlayer.action = 'walk';
        isMoving = true;
      }
    } else {
      // Nếu vừa thả phím khi đang đi bộ thì chuyển về đứng yên
      if (this.localPlayer.action === 'walk') {
        this.localPlayer.action = 'idle';
        sendMovePacket(pos.x, pos.z, this.localPlayer.root.rotation.y, 'idle');
        this.lastSentAction = 'idle';
      }
    }

    // Chỉ gửi vị trí lên server tối đa 10 lần/giây (mỗi 100ms) và chỉ khi nhân vật đang di chuyển
    if (isMoving && nowMs - this.lastNetSendTime >= NET_SEND_INTERVAL_MS) {
      const movedDist = Math.hypot(pos.x - this.lastSentX, pos.z - this.lastSentZ);
      const rotDiff = Math.abs(this.localPlayer.root.rotation.y - this.lastSentRot);

      if (movedDist > 0.005 || rotDiff > 0.01 || this.localPlayer.action !== this.lastSentAction) {
        sendMovePacket(pos.x, pos.z, this.localPlayer.root.rotation.y, this.localPlayer.action);
        this.lastNetSendTime = nowMs;
        this.lastSentX = pos.x;
        this.lastSentZ = pos.z;
        this.lastSentRot = this.localPlayer.root.rotation.y;
        this.lastSentAction = this.localPlayer.action;
      }
    }
  }
}

/**
 * Nội suy vị trí và góc xoay mượt mà cho nhân vật của những người chơi khác
 */
export function interpolateRemotePlayer(remote: CharacterInstance, dt: number): void {
  const pos = remote.root.position;
  const dx = remote.targetX - pos.x;
  const dz = remote.targetZ - pos.z;
  const dist = Math.hypot(dx, dz);

  if (dist > 0.002) {
    const lerpFactor = Math.min(1, dt * 11.5);
    pos.x += dx * lerpFactor;
    pos.z += dz * lerpFactor;
  } else {
    pos.x = remote.targetX;
    pos.z = remote.targetZ;
  }

  // Nội suy góc xoay ngắn nhất
  let angleDiff = remote.targetRotation - remote.root.rotation.y;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  remote.root.rotation.y += angleDiff * Math.min(1, dt * 14);
}
