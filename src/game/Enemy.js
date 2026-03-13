import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

let ENEMY_SERIAL = 1;

export class Enemy {
  constructor({ type, mesh, health = 1, speed = 0 }) {
    this.id = ENEMY_SERIAL++;
    this.type = type;
    this.mesh = mesh;
    this.health = health;
    this.speed = speed;
    this.cooldown = Math.random() * 2;
    this.alive = true;
    this.phase = Math.random() * Math.PI * 2;
    this.weaveAmp = 0.35 + Math.random() * 0.7;
    this.weaveSpeed = 0.75 + Math.random() * 0.9;
    this.verticalAmp = 1.8 + Math.random() * 2.6;
    this.verticalSpeed = 1.3 + Math.random() * 1.6;
    this.bankBias = (Math.random() - 0.5) * 0.9;
  }

  update(dt, playerPos, bullets) {
    if (!this.alive) return;

    if (this.type === 'fighter') {
      const toPlayer = playerPos.clone().sub(this.mesh.position).normalize();
      const swirl = new THREE.Vector3(
        Math.sin(this.phase * this.weaveSpeed),
        Math.sin(this.phase * this.verticalSpeed) * 0.35,
        Math.cos(this.phase * (this.weaveSpeed * 0.9) + this.bankBias),
      ).multiplyScalar(this.weaveAmp);
      const dir = toPlayer.add(swirl).normalize();
      this.mesh.position.addScaledVector(dir, this.speed * dt);
      this.mesh.position.y += Math.sin(this.phase * this.verticalSpeed + this.bankBias) * dt * this.verticalAmp;
      this.mesh.lookAt(this.mesh.position.clone().add(dir));
      this.mesh.rotateZ((Math.sin(this.phase * 2.4) * 0.3 + this.bankBias) * dt);
      this.phase += dt * (0.8 + this.weaveSpeed * 0.45);
    }

    if (this.type === 'ship') {
      this.mesh.position.x += Math.sin(this.phase) * dt * 2;
      this.phase += dt * 0.3;
    }

    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      this.cooldown = this.type === 'fighter' ? 3.6 : 4.6;
      const dir = playerPos.clone().sub(this.mesh.position).normalize();
      bullets.push({
        pos: this.mesh.position.clone(),
        vel: dir.multiplyScalar(this.type === 'fighter' ? 78 : 58),
        radius: 2,
      });
    }
  }

  applyDamage(dmg) {
    this.health -= dmg;
    if (this.health <= 0) this.alive = false;
  }
}
