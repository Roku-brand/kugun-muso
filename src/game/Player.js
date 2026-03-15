import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const SENS_MAP = { low: 0.6, medium: 1, high: 1.5 };
const MAX_PITCH_ANGLE = 1.05;
const MAX_ALTITUDE = 1082;
const DEFAULT_HORIZONTAL_BOUND = 280;

export class Player {
  constructor(camera, settings) {
    this.camera = camera;
    this.settings = settings;
    this.position = new THREE.Vector3(0, 220, 0);
    this.forward = new THREE.Vector3(0, 0, -1);
    this.right = new THREE.Vector3(1, 0, 0);
    this.worldUp = new THREE.Vector3(0, 1, 0);
    this.yaw = Math.PI;
    this.pitch = 0;
    this.speed = 74;
    this.minSpeed = 42;
    this.maxSpeed = 165;
    this.throttle = 0.45;
    this.horizontalBound = DEFAULT_HORIZONTAL_BOUND;
    this.maxArmor = 100;
    this.armor = this.maxArmor;
    this.maxMissiles = 5;
    this.missiles = this.maxMissiles;
    this.maxMachineGunAmmo = 100;
    this.machineGunAmmo = this.maxMachineGunAmmo;
    this.missileReloadTimer = 0;
    this.machineGunReloadTimer = 0;
    this.input = { yaw: 0, pitch: 0, throttle: 0 };
    this.mesh = null;
    this.syncCamera();
  }

  setVisual(mesh) {
    this.mesh = mesh;
    this.syncVisual();
  }

  setInput(nextInput) {
    this.input = { ...this.input, ...nextInput };
  }

  update(dt) {
    const sens = SENS_MAP[this.settings.controlSensitivity] ?? 1;
    const yawSpeed = 1.25 * sens;
    const pitchSpeed = 0.95 * sens;

    this.yaw -= this.input.yaw * yawSpeed * dt;
    this.pitch += this.input.pitch * pitchSpeed * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -MAX_PITCH_ANGLE, MAX_PITCH_ANGLE);

    const cosPitch = Math.cos(this.pitch);
    this.forward.set(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch,
    ).normalize();
    this.right.crossVectors(this.forward, this.worldUp).normalize();

    this.throttle = THREE.MathUtils.clamp(this.throttle + this.input.throttle * dt * 0.5, 0, 1);
    this.speed = THREE.MathUtils.lerp(this.minSpeed, this.maxSpeed, this.throttle);
    this.position.addScaledVector(this.forward, this.speed * dt);

    this.position.x = THREE.MathUtils.clamp(this.position.x, -this.horizontalBound, this.horizontalBound);
    this.position.y = THREE.MathUtils.clamp(this.position.y, 0, MAX_ALTITUDE);

    this.missileReloadTimer += dt;
    if (this.missiles < this.maxMissiles && this.missileReloadTimer >= 6) {
      this.missiles += 1;
      this.missileReloadTimer = 0;
    }

    this.machineGunReloadTimer += dt;
    if (this.machineGunAmmo < this.maxMachineGunAmmo && this.machineGunReloadTimer >= 0.1) {
      this.machineGunAmmo = Math.min(this.maxMachineGunAmmo, this.machineGunAmmo + 1);
      this.machineGunReloadTimer = 0;
    }

    this.syncCamera();
  }

  setHorizontalBound(bound) {
    this.horizontalBound = Math.max(DEFAULT_HORIZONTAL_BOUND, bound);
    this.position.x = THREE.MathUtils.clamp(this.position.x, -this.horizontalBound, this.horizontalBound);
  }

  syncCamera() {
    const chaseOffset = this.forward.clone().multiplyScalar(-18).add(this.worldUp.clone().multiplyScalar(6.5));
    this.camera.position.copy(this.position.clone().add(chaseOffset));
    const lookAt = this.position.clone().add(this.forward.clone().multiplyScalar(70)).add(this.worldUp.clone().multiplyScalar(1.8));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(lookAt);
    this.syncVisual();
  }

  syncVisual() {
    if (!this.mesh) return;
    this.mesh.position.copy(this.position).add(this.worldUp.clone().multiplyScalar(-1.1));
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), this.forward.clone().normalize());
  }

  canFireMissile() {
    return this.missiles > 0;
  }

  consumeMissile() {
    if (!this.canFireMissile()) return false;
    this.missiles -= 1;
    return true;
  }

  canFireMachineGun() {
    return this.machineGunAmmo > 0;
  }

  consumeMachineGun() {
    if (!this.canFireMachineGun()) return false;
    this.machineGunAmmo -= 1;
    this.machineGunReloadTimer = 0;
    return true;
  }

  applyDamage(power) {
    this.armor = Math.max(0, this.armor - power);
  }
}
