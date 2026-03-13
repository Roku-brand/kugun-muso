import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

export class Enemy {
  constructor({ type, mesh, health = 1, speed = 0 }) {
    this.type = type;
    this.mesh = mesh;
    this.health = health;
    this.speed = speed;
    this.cooldown = Math.random() * 2;
    this.alive = true;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt, playerPos, bullets) {
    if (!this.alive) return;

    if (this.type === 'fighter') {
      const toPlayer = playerPos.clone().sub(this.mesh.position).normalize();
      const swirl = new THREE.Vector3(Math.sin(this.phase), Math.sin(this.phase * 1.8) * 0.4, Math.cos(this.phase)).multiplyScalar(0.28);
      const dir = toPlayer.add(swirl).normalize();
      this.mesh.position.addScaledVector(dir, this.speed * dt);
      this.mesh.position.y += Math.sin(this.phase * 2.1) * dt * 3.4;
      this.mesh.lookAt(this.mesh.position.clone().add(dir));
      this.mesh.rotateZ(Math.sin(this.phase * 2.4) * dt * 0.45);
      this.phase += dt * 1.05;
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
