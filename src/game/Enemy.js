import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

let ENEMY_SERIAL = 1;
const FLIGHT_BOUNDS = {
  minX: -1400,
  maxX: 1400,
  minY: 0,
  maxY: 420,
};

export class Enemy {
  constructor({ type, mesh, health = 1, speed = 0, behavior = {}, canFire = true }) {
    this.id = ENEMY_SERIAL++;
    this.type = type;
    this.mesh = mesh;
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.cooldown = Math.random() * 2;
    this.alive = true;
    this.phase = Math.random() * Math.PI * 2;
    this.bankBias = (Math.random() - 0.5) * 0.45;
    this.behavior = {
      engageTime: behavior.engageTime ?? 0,
      spreadWeight: behavior.spreadWeight ?? 0,
      spreadPoint: behavior.spreadPoint ?? null,
      preferredRange: behavior.preferredRange ?? 260,
      rangeTolerance: behavior.rangeTolerance ?? 70,
    };
    this.canFire = canFire;
    this.elapsed = 0;

    if (this.type === 'fighter') {
      this.velocity = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(this.mesh.quaternion)
        .normalize()
        .multiplyScalar(this.speed);
      this.flightProfile = {
        minSpeed: Math.max(52, this.speed * 0.9),
        maxSpeed: this.speed * 1.45,
        accel: 30,
        maxTurnRate: 1.18,
        maxPitchRate: 0.68,
        cruiseAltitude: Math.max(this.mesh.position.y + 90, 260),
        cruiseBand: 90,
        passDistance: 200,
      };
      this.passOffset = (Math.random() - 0.5) * 0.7;
    }

    if (this.type === 'ship') {
      const initialHeading = this.mesh.rotation.y + Math.PI;
      this.shipProfile = {
        heading: initialHeading,
        baseY: this.mesh.position.y,
        bobAmplitude: 0.9 + Math.random() * 0.7,
        bobFrequency: 0.9 + Math.random() * 0.45,
        rollAmplitude: 0.09 + Math.random() * 0.05,
        pitchAmplitude: 0.045 + Math.random() * 0.03,
        turnRate: 0.26 + Math.random() * 0.14,
        driftAmplitude: 4 + Math.random() * 3,
      };
      this.wavePhase = Math.random() * Math.PI * 2;
    }
  }

  getWeaponProfile(distanceToPlayer) {
    if (this.type === 'fighter') {
      if (distanceToPlayer > 210) {
        return { key: 'enemyMissile', speed: 150, damage: 32, radius: 2.6, cooldown: 4.8 };
      }
      return { key: 'enemyMachineGun', speed: 128, damage: 8, radius: 1.3, cooldown: 0.2 };
    }

    if (this.type === 'ship') {
      return { key: 'enemyCannon', speed: 78, damage: 20, radius: 3.4, cooldown: 2.8 };
    }

    if (this.type === 'turret') {
      if (distanceToPlayer > 250) {
        return { key: 'enemyMissile', speed: 140, damage: 30, radius: 2.8, cooldown: 4.2 };
      }
      return { key: 'enemyCannon', speed: 88, damage: 18, radius: 3, cooldown: 1.9 };
    }

    return { key: 'enemyMachineGun', speed: 90, damage: 8, radius: 1.4, cooldown: 0.35 };
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

      const rangeOffset = (distanceToPlayer - this.behavior.preferredRange) / Math.max(this.behavior.rangeTolerance, 1);
      const rangeBlend = THREE.MathUtils.clamp((rangeOffset + 1) * 0.5, 0, 1);
      const standoffDir = toPlayer.clone().normalize().multiplyScalar(-1);
      const spacingDir = standoffDir.clone().lerp(toPlayer.clone().normalize(), rangeBlend).normalize();

      const leadTarget = playerPos.clone().add(new THREE.Vector3(this.passOffset * 70, 0, 0));
      const pursuitDir = leadTarget
        .sub(this.mesh.position.clone().add(forward.clone().multiplyScalar(profile.passDistance * 0.35)))
        .normalize();

      const desiredDir = approachDir
        .lerp(spacingDir, 0.72)
        .lerp(pursuitDir, THREE.MathUtils.clamp(distanceToPlayer / 420, 0.08, 0.45))
        .normalize();

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
        this.speed + (distanceToPlayer > this.behavior.preferredRange ? 18 : -6),
        profile.minSpeed,
        profile.maxSpeed,
      );
      const currentSpeed = this.velocity.length();
      const adjustedSpeed = THREE.MathUtils.damp(currentSpeed, targetSpeed, profile.accel, dt);
      this.velocity.setLength(adjustedSpeed);
      this.mesh.position.addScaledVector(this.velocity, dt);

      this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, FLIGHT_BOUNDS.minX, FLIGHT_BOUNDS.maxX);
      this.mesh.position.y = THREE.MathUtils.clamp(this.mesh.position.y, FLIGHT_BOUNDS.minY, FLIGHT_BOUNDS.maxY);

      if (
        (this.mesh.position.x <= FLIGHT_BOUNDS.minX && this.velocity.x < 0)
        || (this.mesh.position.x >= FLIGHT_BOUNDS.maxX && this.velocity.x > 0)
      ) {
        this.velocity.x *= -0.35;
      }

      if (
        (this.mesh.position.y <= FLIGHT_BOUNDS.minY && this.velocity.y < 0)
        || (this.mesh.position.y >= FLIGHT_BOUNDS.maxY && this.velocity.y > 0)
      ) {
        this.velocity.y *= -0.35;
      }

      const lookDir = this.velocity.clone().normalize();
      this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), lookDir);

      const yawRate = new THREE.Vector3().crossVectors(forward, lookDir).y;
      const bankAngle = THREE.MathUtils.clamp(-(yawRate * 5.4) + this.bankBias, -0.72, 0.72);
      this.mesh.rotateX(bankAngle);

      this.phase += dt;
    }

    if (this.type === 'ship') {
      const ship = this.shipProfile;
      const toPlayer = playerPos.clone().sub(this.mesh.position);
      toPlayer.y = 0;
      const desiredHeading = toPlayer.lengthSq() > 1
        ? Math.atan2(toPlayer.x, toPlayer.z)
        : ship.heading;
      const angleDelta = Math.atan2(
        Math.sin(desiredHeading - ship.heading),
        Math.cos(desiredHeading - ship.heading),
      );
      ship.heading += angleDelta * Math.min(1, ship.turnRate * dt);

      const speedScale = 0.85 + 0.15 * Math.sin(this.phase * 0.55 + this.wavePhase);
      const forward = new THREE.Vector3(Math.sin(ship.heading), 0, Math.cos(ship.heading));
      this.mesh.position.addScaledVector(forward, this.speed * dt * speedScale);
      this.mesh.position.x += Math.sin(this.phase * 0.75 + this.wavePhase) * ship.driftAmplitude * dt * 0.35;

      this.mesh.position.y = ship.baseY + Math.sin(this.phase * ship.bobFrequency + this.wavePhase) * ship.bobAmplitude;
      this.mesh.rotation.y = ship.heading;
      this.mesh.rotation.z = Math.sin(this.phase * 1.35 + this.wavePhase) * ship.rollAmplitude;
      this.mesh.rotation.x = Math.sin(this.phase * 1.05 + this.wavePhase * 1.6) * ship.pitchAmplitude;

      this.phase += dt;
    }

    if (!this.canFire) return;

    this.cooldown -= dt;
    const shotDistance = playerPos.distanceTo(this.mesh.position);
    const inFiringRange = this.type !== 'fighter' || (shotDistance > 130 && shotDistance < 420);
    if (this.cooldown <= 0 && inFiringRange) {
      const weapon = this.getWeaponProfile(shotDistance);
      this.cooldown = weapon.cooldown;
      const dir = playerPos.clone().sub(this.mesh.position).normalize();
      bullets.push({
        pos: this.mesh.position.clone(),
        vel: dir.multiplyScalar(weapon.speed),
        radius: weapon.radius,
        damage: weapon.damage,
        kind: weapon.key,
        mesh: createBulletMesh ? createBulletMesh(weapon.key) : null,
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
