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
      const dir = playerPos.clone().sub(this.mesh.position).normalize();
      const side = new THREE.Vector3(Math.sin(this.phase), 0, Math.cos(this.phase)).multiplyScalar(0.2);
      dir.add(side).normalize();
      this.mesh.position.addScaledVector(dir, this.speed * dt);
      this.mesh.lookAt(this.mesh.position.clone().add(dir));
      this.phase += dt;
    }

    if (this.type === 'ship') {
      this.mesh.position.x += Math.sin(this.phase) * dt * 2;
      this.phase += dt * 0.3;
    }

    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      this.cooldown = this.type === 'fighter' ? 2.4 : 3.4;
      const dir = playerPos.clone().sub(this.mesh.position).normalize();
      bullets.push({
        pos: this.mesh.position.clone(),
        vel: dir.multiplyScalar(this.type === 'fighter' ? 130 : 90),
        radius: 2,
      });
    }
  }

  applyDamage(dmg) {
    this.health -= dmg;
    if (this.health <= 0) this.alive = false;
  }
}
