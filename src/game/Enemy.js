import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

let ENEMY_SERIAL = 1;

export class Enemy {
  constructor({ type, mesh, health = 1, speed = 0, behavior = {} }) {
    this.id = ENEMY_SERIAL++;
    this.type = type;
    this.mesh = mesh;
    this.health = health;
    this.speed = speed;
    this.cooldown = Math.random() * 2;
    this.alive = true;
    this.phase = Math.random() * Math.PI * 2;
    this.bankBias = (Math.random() - 0.5) * 0.45;
    this.behavior = {
      engageTime: behavior.engageTime ?? 0,
      spreadWeight: behavior.spreadWeight ?? 0,
      spreadPoint: behavior.spreadPoint ?? null,
    };
    this.elapsed = 0;

    if (this.type === 'fighter') {
      this.velocity = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(this.mesh.quaternion)
        .normalize()
        .multiplyScalar(this.speed);
      this.flightProfile = {
        minSpeed: Math.max(38, this.speed * 0.78),
        maxSpeed: this.speed * 1.28,
        accel: 26,
        maxTurnRate: 1.18,
        maxPitchRate: 0.68,
        cruiseAltitude: this.mesh.position.y,
        cruiseBand: 90,
        passDistance: 120,
      };
      this.passOffset = (Math.random() - 0.5) * 0.7;
    }
  }

  update(dt, playerPos, bullets, createBulletMesh) {
    if (!this.alive) return;
    this.elapsed += dt;

    if (this.type === 'fighter') {
      const profile = this.flightProfile;
      const forward = this.velocity.clone().normalize();
      const toPlayer = playerPos.clone().sub(this.mesh.position);
      const distanceToPlayer = Math.max(toPlayer.length(), 1);

      const engageRatio = this.behavior.engageTime > 0
        ? THREE.MathUtils.clamp(this.elapsed / this.behavior.engageTime, 0, 1)
        : 1;
      const spreadDir = this.behavior.spreadPoint
        ? this.behavior.spreadPoint.clone().sub(this.mesh.position).normalize()
        : forward.clone();
      const approachDir = spreadDir.clone().lerp(toPlayer.clone().normalize(), engageRatio).normalize();

      const leadTarget = playerPos.clone().add(new THREE.Vector3(this.passOffset * 70, 0, 0));
      const pursuitDir = leadTarget
        .sub(this.mesh.position.clone().add(forward.clone().multiplyScalar(profile.passDistance * 0.35)))
        .normalize();

      const desiredDir = approachDir.lerp(pursuitDir, THREE.MathUtils.clamp(distanceToPlayer / 420, 0.2, 0.85)).normalize();

      const turnAxis = new THREE.Vector3().crossVectors(forward, desiredDir);
      const turnMag = turnAxis.length();
      if (turnMag > 1e-4) {
        const turnRate = Math.min(profile.maxTurnRate * dt, Math.asin(Math.min(1, turnMag)));
        this.velocity.applyAxisAngle(turnAxis.normalize(), turnRate);
      }

      const nextForward = this.velocity.clone().normalize();
      const altitudeError = profile.cruiseAltitude - this.mesh.position.y;
      const altitudeControl = THREE.MathUtils.clamp(altitudeError / profile.cruiseBand, -1, 1);
      const pitchRate = profile.maxPitchRate * altitudeControl;
      const right = new THREE.Vector3(0, 1, 0).cross(nextForward).normalize();
      if (right.lengthSq() > 0.01) this.velocity.applyAxisAngle(right, pitchRate * dt);

      const targetSpeed = THREE.MathUtils.clamp(
        this.speed + (distanceToPlayer > 220 ? 10 : -4),
        profile.minSpeed,
        profile.maxSpeed,
      );
      const currentSpeed = this.velocity.length();
      const adjustedSpeed = THREE.MathUtils.damp(currentSpeed, targetSpeed, profile.accel, dt);
      this.velocity.setLength(adjustedSpeed);
      this.mesh.position.addScaledVector(this.velocity, dt);

      const lookDir = this.velocity.clone().normalize();
      this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), lookDir);

      const yawRate = new THREE.Vector3().crossVectors(forward, lookDir).y;
      const bankAngle = THREE.MathUtils.clamp(-(yawRate * 5.4) + this.bankBias, -0.72, 0.72);
      this.mesh.rotateX(bankAngle);

      this.phase += dt;
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
        mesh: createBulletMesh ? createBulletMesh() : null,
      });
      const bullet = bullets.at(-1);
      if (bullet.mesh) bullet.mesh.position.copy(bullet.pos);
    }
  }

  applyDamage(dmg) {
    this.health -= dmg;
    if (this.health <= 0) this.alive = false;
  }
}
