import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const SENS_MAP = { low: 0.6, medium: 1, high: 1.5 };

export class Player {
  constructor(camera, settings) {
    this.camera = camera;
    this.settings = settings;
    this.position = new THREE.Vector3(0, 220, 0);
    this.forward = new THREE.Vector3(0, 0, -1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.right = new THREE.Vector3(1, 0, 0);
    this.speed = 180;
    this.minSpeed = 110;
    this.maxSpeed = 360;
    this.throttle = 0.45;
    this.health = 3;
    this.ammo = 20;
    this.ammoTimer = 0;
    this.input = { pitch: 0, yaw: 0, roll: 0, throttle: 0 };
    this.syncCamera();
  }

  setInput(nextInput) {
    this.input = { ...this.input, ...nextInput };
  }

  update(dt) {
    const sens = SENS_MAP[this.settings.controlSensitivity] ?? 1;
    const pitch = this.input.pitch * sens * dt;
    const yaw = this.input.yaw * sens * dt;
    const roll = this.input.roll * sens * dt;

    this.forward.applyAxisAngle(this.right, pitch).normalize();
    this.forward.applyAxisAngle(this.up, yaw).normalize();
    this.up.applyAxisAngle(this.forward, roll).normalize();
    this.right.crossVectors(this.forward, this.up).normalize();
    this.up.crossVectors(this.right, this.forward).normalize();

    this.throttle = THREE.MathUtils.clamp(this.throttle + this.input.throttle * dt * 0.5, 0, 1);
    this.speed = THREE.MathUtils.lerp(this.minSpeed, this.maxSpeed, this.throttle);
    this.position.addScaledVector(this.forward, this.speed * dt);

    if (this.position.y < 4) this.position.y = 4;

    this.ammoTimer += dt;
    if (this.ammo < 20 && this.ammoTimer >= 3) {
      this.ammo += 1;
      this.ammoTimer = 0;
    }

    this.syncCamera();
  }

  syncCamera() {
    this.camera.position.copy(this.position);
    const lookAt = this.position.clone().add(this.forward.clone().multiplyScalar(40));
    this.camera.up.copy(this.up);
    this.camera.lookAt(lookAt);
  }

  canShoot() {
    return this.ammo > 0;
  }

  consumeAmmo() {
    if (!this.canShoot()) return false;
    this.ammo -= 1;
    return true;
  }

  hit() {
    this.health -= 1;
  }
}
