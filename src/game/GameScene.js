import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { Player } from './Player.js';
import { ENEMY_DURABILITY, StageManager } from './StageManager.js';
import { Enemy } from './Enemy.js';
import { HUD } from '../ui/HUD.js';
import { AudioManager } from '../audio/AudioManager.js';

const COMBAT_SPEED_SCALE = 0.6;
const DIFFICULTY_ALLY_COUNT = { easy: 3, normal: 1, hard: 0 };
const TOTAL_WAR_DEFAULT_ALLY_FIGHTERS = 4;
const TOTAL_WAR_DEFAULT_ALLY_FLEET = [
  { role: 'carrier', offsetX: -210, offsetZ: -230, speed: 7.5 },
  { role: 'cruiser', offsetX: -320, offsetZ: -320, speed: 9.5 },
  { role: 'destroyer', offsetX: 230, offsetZ: -250, speed: 11.5 },
  { role: 'frigate', offsetX: 340, offsetZ: -340, speed: 12.2 },
];
const TOTAL_WAR_MAX_ACTIVE_REINFORCEMENTS = {
  ship: 14,
  fighter: 24,
};
const LANDING_MAX_APPROACH_SPEED = 98;
const LANDING_MAX_CLIMB_ANGLE = 0.22;
const LANDING_TOUCHDOWN_HEIGHT_TOLERANCE = 5.2;
const LANDING_HEAL_PER_SECOND = 8;
const CARRIER_DECK_HEIGHT_OFFSET = 9.4;
const CARRIER_LANDING_HALF_EXTENTS = { x: 21, z: 61 };
const CARRIER_LAUNCH_COOLDOWN = 1.45;
const ALLY_FLIGHT_BOUNDS = {
  minX: -320,
  maxX: 320,
  minY: 40,
  maxY: 430,
};

const PLAYER_HORIZONTAL_BOUNDS = {
  air: 900,
  sea: 1200,
  base: 1100,
  totalWar: 1650,
  ayanishiRecapture: 1650,
  hokkaiNavalBattle: 1750,
};
const PLAYER_COLLISION_RADIUS = 2.6;
const ALLIED_OPERATION_STAGES = new Set(['totalWar', 'ayanishiRecapture', 'hokkaiNavalBattle']);
const HQ_OBJECTIVE_STAGES = new Set(['totalWar', 'ayanishiRecapture']);

export class GameScene {
  constructor({ canvas, hudRoot, overlayRoot, stage, settings, onExit, onEnemyDestroyed, onBattleFinished }) {
    this.canvas = canvas;
    this.hudRoot = hudRoot;
    this.overlayRoot = overlayRoot;
    this.stage = stage;
    this.settings = settings;
    this.onExit = onExit;
    this.onEnemyDestroyed = onEnemyDestroyed;
    this.onBattleFinished = onBattleFinished;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: settings.quality !== 'low' });
    this.renderer.setPixelRatio(settings.quality === 'high' ? window.devicePixelRatio : 1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b7ff);
    this.scene.fog = new THREE.Fog(0x87b7ff, 350, 2600);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 12000);
    this.player = new Player(this.camera, settings);
    this.player.setHorizontalBound(PLAYER_HORIZONTAL_BOUNDS[stage] ?? 900);

    this.stageManager = new StageManager(this.scene);
    this.enemies = this.stageManager.createStage(stage);
    this.playerMesh = this.createPlayerVisual();
    this.player.setVisual(this.playerMesh);
    this.scene.add(this.playerMesh);
    this.playerShadow = this.createAltitudeShadow();
    this.scene.add(this.playerShadow);

    this.audio = new AudioManager(settings);
    this.hud = new HUD(
      hudRoot,
      {
        onFire: () => this.fireMissile(),
        onGunStart: () => (this.touchGunHeld = true),
        onGunStop: () => (this.touchGunHeld = false),
        onThrottle: (v) => (this.touchThrottle = v),
        onStick: (x, y) => (this.touchStick = { x, y }),
        onMenu: () => this.togglePauseMenu(),
      },
      settings,
    );

    this.keys = {};
    this.touchThrottle = 0;
    this.touchStick = { x: 0, y: 0 };
    this.missiles = [];
    this.playerBullets = [];
    this.allyBullets = [];
    this.allyFleetBullets = [];
    this.allyFleet = [];
    this.missileLockDistance = 360;
    this.enemyBullets = [];
    this.effects = [];
    this.lockOnTimer = 0;
    this.finished = false;
    this.paused = false;
    this.gunTriggerHeld = false;
    this.touchGunHeld = false;
    this.machineGunCooldown = 0;
    this.spawnerTimers = { port: 0, runway: 0 };
    this.pendingCarrierLaunches = 0;
    this.carrierLaunchCooldown = 0;
    this.activeLandingZone = null;
    this.lastDamageCause = null;
    this.lastCollisionCause = null;
    this.lowAltitudeThreshold = 10;
    this.lowAltitudeWarningCooldown = 0;
    this.last = performance.now();
    this.initAllies();
    this.bindEvents();
  }

  start() {
    this.audio.init();
    this.hud.mount();
    this.loop();
  }

  bindEvents() {
    this.onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    this.onDown = (e) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'x'].includes(key)) e.preventDefault();
      this.keys[key] = true;
    };
    this.onUp = (e) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'x'].includes(key)) e.preventDefault();
      this.keys[key] = false;
    };
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
  }

  readInput(dt) {
    const yaw = (this.keys['arrowright'] ? 1 : 0) + (this.keys['arrowleft'] ? -1 : 0);
    const pitch = (this.keys['arrowup'] ? 1 : 0) + (this.keys['arrowdown'] ? -1 : 0);
    const throttle = (this.keys['shift'] ? 1 : 0) + (this.keys['control'] ? -1 : 0) + this.touchThrottle;
    this.player.setInput({ yaw: yaw + this.touchStick.x, pitch: pitch - this.touchStick.y, throttle });

    if (this.keys[' ']) {
      this.fireMissile();
      this.keys[' '] = false;
    }

    this.gunTriggerHeld = Boolean(this.keys.x || this.touchGunHeld);

    this.lockOnTimer += dt;
    if (this.lockOnTimer > 1.8 && this.nearestEnemyDistance() < 420) {
      this.audio.lockOn();
      this.lockOnTimer = 0;
    }
  }

  fireMissile() {
    if (this.finished || !this.player.consumeMissile()) return;
    const lockTarget = this.getLockCandidate(this.player.position, this.player.forward);
    const pos = this.player.position
      .clone()
      .add(this.player.forward.clone().multiplyScalar(7))
      .add(this.player.right.clone().multiplyScalar(0.8))
      .add(this.player.worldUp.clone().multiplyScalar(-1.9));
    const vel = this.player.forward.clone().multiplyScalar(240);
    const missileMesh = this.makeMissileMesh();
    this.missiles.push({
      pos,
      vel,
      life: 7,
      mesh: missileMesh.group,
      flame: missileMesh.flame,
      homing: Boolean(lockTarget),
      targetId: lockTarget?.id ?? null,
      targetRef: lockTarget ?? null,
    });
    this.scene.add(this.missiles.at(-1).mesh);
    this.audio.missile();
  }

  fireMachineGun(dt) {
    this.machineGunCooldown -= dt;
    if (!this.gunTriggerHeld || this.machineGunCooldown > 0 || !this.player.consumeMachineGun()) return;
    this.machineGunCooldown = 0.08;

    const pos = this.player.position
      .clone()
      .add(this.player.forward.clone().multiplyScalar(9))
      .add(this.player.right.clone().multiplyScalar(-0.35 + Math.random() * 0.7))
      .add(this.player.worldUp.clone().multiplyScalar(-1.2 + Math.random() * 0.3));
    const spread = this.player.right.clone().multiplyScalar((Math.random() - 0.5) * 0.12)
      .add(this.player.worldUp.clone().multiplyScalar((Math.random() - 0.5) * 0.08));
    const vel = this.player.forward.clone().add(spread).normalize().multiplyScalar(380);
    const bullet = {
      pos,
      vel,
      life: 1.8,
      damage: 10,
      mesh: this.makePlayerMachineGunMesh(),
    };
    this.playerBullets.push(bullet);
    bullet.mesh.position.copy(bullet.pos);
    this.audio.machineGun();
  }

  makeMissileMesh() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.28, 3.3, 16),
      new THREE.MeshStandardMaterial({ color: this.settings.missileColor, metalness: 0.8, roughness: 0.3 }),
    );
    body.rotation.z = Math.PI / 2;

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.95, 16),
      new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 0.8, roughness: 0.25 }),
    );
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 2.1;

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.205, 0.205, 0.3, 16),
      new THREE.MeshStandardMaterial({ color: 0xe84a5f, metalness: 0.4, roughness: 0.55 }),
    );
    stripe.rotation.z = Math.PI / 2;
    stripe.position.x = 0.9;

    const finMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.65, roughness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.045, 0.32), finMat);
      fin.position.x = -1.25;
      fin.rotation.x = (Math.PI / 2) * i;
      group.add(fin);
    }

    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 0.25, 10),
      new THREE.MeshStandardMaterial({ color: 0x232323, metalness: 0.4, roughness: 0.6 }),
    );
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.x = -1.8;

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.9, 12),
      new THREE.MeshBasicMaterial({ color: 0xff9e2f, transparent: true, opacity: 0.85 }),
    );
    flame.rotation.z = Math.PI / 2;
    flame.position.x = -2.35;

    group.add(body, nose, stripe, exhaust, flame);
    return { group, flame };
  }

  loop = () => {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.03);
    this.last = now;

    if (!this.finished && !this.paused) {
      const combatDt = dt * COMBAT_SPEED_SCALE;
      this.readInput(combatDt);
      this.player.update(combatDt);
      this.fireMachineGun(combatDt);
      this.updateWorld(combatDt);
      this.checkGameState();
      this.updateHUD();
    }

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  };

  togglePauseMenu() {
    if (this.finished) return;
    this.paused = !this.paused;
    this.hud.setControlsEnabled(!this.paused);
    if (this.paused) {
      this.showPauseMenu();
    } else {
      this.hideOverlay();
      this.last = performance.now();
    }
  }

  showPauseMenu() {
    this.overlayRoot.classList.remove('hidden');
    this.overlayRoot.innerHTML = `
      <div class="result-panel pause">
        <h2>一時停止</h2>
        <p>ゲームを再開するかホームへ戻るか選択してください。</p>
        <button id="resume">再開</button>
        <button id="back">ホームへ戻る</button>
      </div>
    `;
    this.overlayRoot.querySelector('#resume').addEventListener('click', () => {
      this.paused = false;
      this.hud.setControlsEnabled(true);
      this.hideOverlay();
      this.last = performance.now();
    });
    this.overlayRoot.querySelector('#back').addEventListener('click', () => {
      this.paused = false;
      this.onExit();
    });
  }

  hideOverlay() {
    this.overlayRoot.classList.add('hidden');
    this.overlayRoot.innerHTML = '';
  }

  initAllies() {
    const difficultyAllyCount = DIFFICULTY_ALLY_COUNT[this.settings.difficulty] ?? DIFFICULTY_ALLY_COUNT.normal;
    const defaultMissionAllies = this.isAlliedOperationStage() ? TOTAL_WAR_DEFAULT_ALLY_FIGHTERS : 0;
    const allyCount = defaultMissionAllies + difficultyAllyCount;
    this.allies = Array.from({ length: allyCount }, (_, index) => ({
      index,
      cooldown: 0.5 + index * 0.2,
      speed: 82 + Math.random() * 16,
      turnRate: 1.1 + Math.random() * 0.3,
      chaseWeight: 0.7 + Math.random() * 0.15,
      driftSeed: Math.random() * Math.PI * 2,
      velocity: new THREE.Vector3(),
      mesh: this.stageManager.makeFighter(),
    }));

    this.allies.forEach((ally) => {
      const side = ally.index % 2 === 0 ? -1 : 1;
      const spawnPos = this.player.position
        .clone()
        .add(this.player.right.clone().multiplyScalar(side * (40 + ally.index * 7)))
        .add(this.player.worldUp.clone().multiplyScalar(16 + (ally.index % 2) * 6))
        .add(this.player.forward.clone().multiplyScalar(-80 - ally.index * 16));
      ally.mesh.position.copy(spawnPos);

      ally.mesh.scale.setScalar(0.75);
      ally.mesh.traverse((part) => {
        if (!part.isMesh || !part.material?.color) return;
        const hex = part.material.color.getHex();
        if (hex === 0x89b2d6) {
          part.material = part.material.clone();
          part.material.color.setHex(0x7ddcff);
          part.material.opacity = 0.7;
          return;
        }
        part.material = part.material.clone();
        part.material.color.offsetHSL(0.08, 0.2, 0.15);
      });

      const initialDir = this.player.forward
        .clone()
        .add(this.player.right.clone().multiplyScalar(side * 0.1))
        .add(this.player.worldUp.clone().multiplyScalar(0.05))
        .normalize();
      ally.velocity.copy(initialDir.multiplyScalar(ally.speed));
      ally.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), ally.velocity.clone().normalize());

      this.scene.add(ally.mesh);
    });

    this.initAllyFleet();
  }

  initAllyFleet() {
    if (!this.isAlliedOperationStage()) {
      this.allyFleet = [];
      return;
    }

    this.allyFleet = TOTAL_WAR_DEFAULT_ALLY_FLEET.map((spec, index) => {
      const ship = this.stageManager.makeShip(spec.role);
      ship.position.set(spec.offsetX, 6, 200 + spec.offsetZ);
      ship.rotation.y = (Math.PI * 0.96) + (index - 1.5) * 0.05;
      ship.traverse((part) => {
        if (!part.isMesh || !part.material?.color) return;
        part.material = part.material.clone();
        part.material.color.offsetHSL(0.08, 0.18, 0.12);
      });
      this.scene.add(ship);
      return {
        mesh: ship,
        role: spec.role,
        speed: spec.speed,
        cooldown: 0.6 + index * 0.35,
        fireRange: 460 + index * 45,
        heading: ship.rotation.y + Math.PI,
        baseY: ship.position.y,
        phase: Math.random() * Math.PI * 2,
        bobAmplitude: 0.8 + Math.random() * 0.5,
        bobFrequency: 0.85 + Math.random() * 0.35,
        rollAmplitude: 0.08 + Math.random() * 0.04,
        pitchAmplitude: 0.04 + Math.random() * 0.025,
        turnRate: 0.34 + Math.random() * 0.1,
      };
    });
  }

  updateAllies(dt) {
    if (!this.allies.length) return;

    this.allies.forEach((ally) => {
      const target = this.getClosestLivingEnemy(ally.mesh.position);
      const toPlayer = this.player.position.clone().sub(ally.mesh.position);
      const distanceToPlayer = toPlayer.length();
      const returnDir = distanceToPlayer > 190 ? toPlayer.normalize() : null;
      const wander = new THREE.Vector3(
        Math.sin((this.last * 0.0015) + ally.driftSeed),
        Math.sin((this.last * 0.0011) + ally.driftSeed * 1.9) * 0.6,
        Math.cos((this.last * 0.0017) + ally.driftSeed),
      ).normalize();

      let desiredDir = this.player.forward.clone().multiplyScalar(0.4).add(wander.clone().multiplyScalar(0.6));
      if (returnDir) desiredDir = desiredDir.lerp(returnDir, 0.7);
      if (target) {
        const chaseDir = target.mesh.position.clone().sub(ally.mesh.position).normalize();
        desiredDir = desiredDir.lerp(chaseDir, ally.chaseWeight);
      }

      desiredDir.normalize();
      const currentDir = ally.velocity.clone().normalize();
      const lerpedDir = currentDir.lerp(desiredDir, Math.min(1, ally.turnRate * dt)).normalize();
      ally.velocity.copy(lerpedDir.multiplyScalar(ally.speed));

      ally.mesh.position.addScaledVector(ally.velocity, dt);
      ally.mesh.position.x = THREE.MathUtils.clamp(ally.mesh.position.x, ALLY_FLIGHT_BOUNDS.minX, ALLY_FLIGHT_BOUNDS.maxX);
      ally.mesh.position.y = THREE.MathUtils.clamp(ally.mesh.position.y, ALLY_FLIGHT_BOUNDS.minY, ALLY_FLIGHT_BOUNDS.maxY);
      ally.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), ally.velocity.clone().normalize());
    });

    this.allies.forEach((ally, idx) => {
      const target = this.getClosestLivingEnemy(ally.mesh.position);
      if (!target) return;

      ally.cooldown -= dt;
      if (ally.cooldown > 0) return;
      ally.cooldown = 0.24 + idx * 0.02;

      const shootPos = ally.mesh.position.clone().add(ally.velocity.clone().normalize().multiplyScalar(4));

      const aim = target.mesh.position.clone().sub(shootPos).normalize();
      const bullet = {
        pos: shootPos,
        vel: aim.multiplyScalar(340),
        life: 1.8,
        damage: 8,
        mesh: this.makeAllyMachineGunMesh(),
      };
      this.allyBullets.push(bullet);
      bullet.mesh.position.copy(bullet.pos);
    });
  }

  updateAllyFleet(dt) {
    if (!this.allyFleet?.length) return;

    this.allyFleet.forEach((ship) => {
      const target = this.getClosestLivingEnemy(ship.mesh.position, (enemy) => enemy.type !== 'fighter');
      const desiredPoint = target?.mesh?.position
        ? target.mesh.position.clone()
        : this.player.position.clone().add(new THREE.Vector3(0, 0, -520));
      desiredPoint.y = ship.mesh.position.y;
      const toObjective = desiredPoint.sub(ship.mesh.position);
      const desiredHeading = toObjective.lengthSq() > 1
        ? Math.atan2(toObjective.x, toObjective.z)
        : ship.heading;
      const angleDelta = Math.atan2(Math.sin(desiredHeading - ship.heading), Math.cos(desiredHeading - ship.heading));
      ship.heading += angleDelta * Math.min(1, ship.turnRate * dt);

      const advance = ship.speed * dt * (0.86 + 0.14 * Math.sin(ship.phase * 0.6));
      ship.mesh.position.x += Math.sin(ship.heading) * advance;
      ship.mesh.position.z += Math.cos(ship.heading) * advance;
      ship.mesh.position.y = ship.baseY + Math.sin(ship.phase * ship.bobFrequency) * ship.bobAmplitude;

      ship.mesh.rotation.y = ship.heading;
      ship.mesh.rotation.z = Math.sin(ship.phase * 1.3 + ship.baseY) * ship.rollAmplitude;
      ship.mesh.rotation.x = Math.sin(ship.phase * 1.05 + ship.baseY * 0.8) * ship.pitchAmplitude;
      ship.phase += dt;

      ship.cooldown -= dt;
      if (target && ship.cooldown <= 0 && ship.mesh.position.distanceTo(target.mesh.position) < ship.fireRange) {
        ship.cooldown = 1.3;
        const muzzleOffset = new THREE.Vector3(0, 5.8, -6.5)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), ship.mesh.rotation.y - Math.PI);
        const shootPos = ship.mesh.position.clone().add(muzzleOffset);
        const aim = target.mesh.position.clone().sub(shootPos).normalize();
        const navalShot = {
          pos: shootPos,
          vel: aim.multiplyScalar(270),
          life: 3.2,
          damage: 20,
          mesh: this.makeAllyNavalShellMesh(),
        };
        this.allyFleetBullets.push(navalShot);
        navalShot.mesh.position.copy(navalShot.pos);
      }

      if (ship.mesh.position.z < -2400 || ship.mesh.position.z > 380 || Math.abs(ship.mesh.position.x) > 1100) {
        ship.mesh.position.set(
          THREE.MathUtils.clamp(ship.mesh.position.x, -620, 620),
          ship.baseY,
          240,
        );
        ship.heading = Math.PI;
      }
    });
  }

  updateWorld(dt) {
    this.updateAltitudeShadow();
    this.updateAllyFleet(dt);
    this.lowAltitudeWarningCooldown = Math.max(0, this.lowAltitudeWarningCooldown - dt);
    this.enemies.forEach((enemy) => enemy.update(dt, this.player.position, this.enemyBullets, (kind) => this.makeEnemyBulletMesh(kind)));
    this.updateTotalWarSpawners(dt);
    this.updateCarrierLaunches(dt);
    this.updateLanding(dt);

    this.missiles.forEach((m) => {
      if (m.homing) {
        const target = this.resolveMissileTarget(m);
        if (target) {
          const desired = target.mesh.position.clone().sub(m.pos).normalize().multiplyScalar(240);
          m.vel.lerp(desired, 0.04);
        }
      }
      m.pos.addScaledVector(m.vel, dt);
      m.life -= dt;
      m.mesh.position.copy(m.pos);
      m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), m.vel.clone().normalize());
      if (m.flame) {
        const flicker = 0.65 + Math.random() * 0.5;
        m.flame.scale.set(flicker, flicker, flicker);
        m.flame.material.opacity = 0.6 + Math.random() * 0.35;
      }
    });

    this.enemyBullets.forEach((b) => {
      b.pos.addScaledVector(b.vel, dt);
      if (b.mesh) b.mesh.position.copy(b.pos);
    });

    this.playerBullets.forEach((b) => {
      b.pos.addScaledVector(b.vel, dt);
      b.life -= dt;
      if (b.mesh) {
        b.mesh.position.copy(b.pos);
        b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), b.vel.clone().normalize());
      }
    });
    this.allyBullets.forEach((b) => {
      b.pos.addScaledVector(b.vel, dt);
      b.life -= dt;
      if (b.mesh) {
        b.mesh.position.copy(b.pos);
        b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), b.vel.clone().normalize());
      }
    });
    this.allyFleetBullets.forEach((b) => {
      b.pos.addScaledVector(b.vel, dt);
      b.life -= dt;
      if (b.mesh) {
        b.mesh.position.copy(b.pos);
        b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), b.vel.clone().normalize());
      }
    });
    this.updateEffects(dt);
    this.handleCollisions(dt);

    this.missiles = this.missiles.filter((m) => {
      if (m.life <= 0) {
        this.scene.remove(m.mesh);
        return false;
      }
      return true;
    });

    this.enemyBullets = this.enemyBullets.filter((b) => {
      const keep = b.pos.distanceTo(this.player.position) < 2500;
      if (!keep && b.mesh) this.scene.remove(b.mesh);
      return keep;
    });

    this.playerBullets = this.playerBullets.filter((b) => {
      const keep = b.life > 0;
      if (!keep && b.mesh) this.scene.remove(b.mesh);
      return keep;
    });

    this.allyBullets = this.allyBullets.filter((b) => {
      const keep = b.life > 0;
      if (!keep && b.mesh) this.scene.remove(b.mesh);
      return keep;
    });
    this.allyFleetBullets = this.allyFleetBullets.filter((b) => {
      const keep = b.life > 0;
      if (!keep && b.mesh) this.scene.remove(b.mesh);
      return keep;
    });
  }



  updateTotalWarSpawners(dt) {
    if (!this.isHqObjectiveStage()) return;

    const port = this.findObjectiveTarget('portSpawner');
    const runway = this.findObjectiveTarget('runwaySpawner');

    if (port) {
      this.spawnerTimers.port -= dt;
      if (this.spawnerTimers.port <= 0 && this.countLivingEnemiesByType('ship') < TOTAL_WAR_MAX_ACTIVE_REINFORCEMENTS.ship) {
        this.spawnerTimers.port = 6.5;
        this.spawnReinforcementShip(port.mesh.position.clone());
      }
    }

    if (runway) {
      this.spawnerTimers.runway -= dt;
      if (this.spawnerTimers.runway <= 0 && this.countLivingEnemiesByType('fighter') < TOTAL_WAR_MAX_ACTIVE_REINFORCEMENTS.fighter) {
        this.spawnerTimers.runway = 5.2;
        this.spawnReinforcementFighter(runway.mesh.position.clone());
      }
    }
  }

  countLivingEnemiesByType(type) {
    let count = 0;
    this.enemies.forEach((enemy) => {
      if (enemy.alive && enemy.type === type) count += 1;
    });
    return count;
  }

  findObjectiveTarget(objective) {
    return this.stageManager.targets.find((target) => {
      if (target.objective !== objective) return false;
      return this.enemies.some((enemy) => enemy.alive && enemy.mesh === target.mesh);
    });
  }

  getLandingZones() {
    const zones = [];
    this.stageManager.targets.forEach((target) => {
      if (!this.isTargetActive(target)) return;

      if (target.objective === 'runwaySpawner' && target.collisionHalfExtents) {
        zones.push({
          mesh: target.mesh,
          halfX: Math.max(18, target.collisionHalfExtents.x * 0.72),
          halfZ: Math.max(22, target.collisionHalfExtents.z * 0.88),
          deckY: target.mesh.position.y + target.collisionHalfExtents.y,
          kind: 'runway',
        });
      }

      if (target.type === 'carrier') {
        zones.push({
          mesh: target.mesh,
          halfX: CARRIER_LANDING_HALF_EXTENTS.x,
          halfZ: CARRIER_LANDING_HALF_EXTENTS.z,
          deckY: target.mesh.position.y + CARRIER_DECK_HEIGHT_OFFSET,
          kind: 'carrier',
        });
      }
    });

    this.allyFleet?.forEach((allyShip) => {
      if (allyShip.role !== 'carrier') return;
      zones.push({
        mesh: allyShip.mesh,
        halfX: CARRIER_LANDING_HALF_EXTENTS.x,
        halfZ: CARRIER_LANDING_HALF_EXTENTS.z,
        deckY: allyShip.mesh.position.y + CARRIER_DECK_HEIGHT_OFFSET,
        kind: 'carrier',
      });
    });

    return zones;
  }

  getPlayerLandingZone() {
    const zones = this.getLandingZones();
    for (const zone of zones) {
      const local = zone.mesh.worldToLocal(this.player.position.clone());
      const insideDeck = Math.abs(local.x) <= zone.halfX && Math.abs(local.z) <= zone.halfZ;
      if (!insideDeck) continue;
      if (Math.abs(this.player.position.y - zone.deckY) > LANDING_TOUCHDOWN_HEIGHT_TOLERANCE) continue;
      if (this.player.speed > LANDING_MAX_APPROACH_SPEED) continue;
      if (this.player.forward.y > LANDING_MAX_CLIMB_ANGLE) continue;
      return zone;
    }
    return null;
  }

  updateLanding(dt) {
    const zone = this.getPlayerLandingZone();
    this.activeLandingZone = zone;
    if (!zone) return;

    const groundedHeight = zone.deckY + PLAYER_COLLISION_RADIUS;
    this.player.position.y = Math.max(this.player.position.y, groundedHeight);
    this.player.armor = Math.min(this.player.maxArmor, this.player.armor + (LANDING_HEAL_PER_SECOND * dt));
  }

  isLandingOnTarget(targetMesh) {
    return this.activeLandingZone?.mesh === targetMesh;
  }

  countAliveEnemyCarriers() {
    return this.stageManager.targets.filter((target) => {
      if (target.type !== 'carrier') return false;
      return this.enemies.some((enemy) => enemy.alive && enemy.mesh === target.mesh);
    }).length;
  }

  updateCarrierLaunches(dt) {
    if (this.pendingCarrierLaunches <= 0) return;
    if (this.countAliveEnemyCarriers() <= 0) {
      this.pendingCarrierLaunches = 0;
      return;
    }

    this.carrierLaunchCooldown -= dt;
    if (this.carrierLaunchCooldown > 0) return;

    const carriers = this.stageManager.targets.filter((target) => target.type === 'carrier'
      && this.enemies.some((enemy) => enemy.alive && enemy.mesh === target.mesh));
    if (!carriers.length) return;

    const carrier = carriers[Math.floor(Math.random() * carriers.length)];
    this.spawnReinforcementFighter(carrier.mesh.position.clone(), {
      launchMesh: carrier.mesh,
      fromCarrier: true,
    });
    this.pendingCarrierLaunches -= 1;
    this.carrierLaunchCooldown = CARRIER_LAUNCH_COOLDOWN;
  }

  spawnReinforcementShip(origin) {
    const ship = this.stageManager.makeShip(Math.random() > 0.5 ? 'destroyer' : 'frigate');
    ship.position.set(origin.x + (Math.random() - 0.5) * 120, 6, origin.z + 160 + Math.random() * 120);
    ship.rotation.y = Math.PI + (Math.random() - 0.5) * 0.3;
    this.scene.add(ship);
    const spawnedShipDurability = Math.random() > 0.5
      ? ENEMY_DURABILITY.shipByRole.destroyer
      : ENEMY_DURABILITY.shipByRole.frigate;
    const enemy = new Enemy({ type: 'ship', mesh: ship, health: spawnedShipDurability, speed: 10 + Math.random() * 3 });
    this.enemies.push(enemy);
    this.stageManager.targets.push({ mesh: ship, radius: 24, type: 'ship' });
  }

  spawnReinforcementFighter(origin, options = {}) {
    const fighter = this.stageManager.makeFighter();
    const { launchMesh = null, fromCarrier = false } = options;
    if (launchMesh) {
      const localLaunchPos = new THREE.Vector3((Math.random() - 0.5) * 5, CARRIER_DECK_HEIGHT_OFFSET + 1.7, -46 + Math.random() * 8);
      fighter.position.copy(launchMesh.localToWorld(localLaunchPos));
      const launchDir = new THREE.Vector3(0, 0, -1).applyQuaternion(launchMesh.quaternion).normalize();
      fighter.lookAt(fighter.position.clone().add(launchDir.multiplyScalar(260)));
    } else {
      fighter.position.set(origin.x + (Math.random() - 0.5) * 90, 92 + Math.random() * 32, origin.z + 10 + Math.random() * 55);
      fighter.lookAt(this.player.position);
    }
    this.scene.add(fighter);

    const spreadPoint = fighter.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 120, fromCarrier ? 40 : 60, -260));
    const enemy = new Enemy({
      type: 'fighter',
      mesh: fighter,
      health: ENEMY_DURABILITY.fighter,
      speed: (fromCarrier ? 90 : 82) + Math.random() * 16,
      behavior: {
        engageTime: (fromCarrier ? 0.8 : 1.5) + Math.random() * 1.2,
        spreadWeight: 0.78,
        spreadPoint,
        preferredRange: fromCarrier ? 250 : 280,
        rangeTolerance: 95,
      },
    });
    this.enemies.push(enemy);
  }
  makeEnemyBulletMesh(kind) {
    const visuals = {
      enemyMissile: { geo: new THREE.CylinderGeometry(0.2, 0.26, 2.8, 10), mat: new THREE.MeshBasicMaterial({ color: 0xff8a5b }) },
      enemyMachineGun: { geo: new THREE.SphereGeometry(0.72, 8, 8), mat: new THREE.MeshBasicMaterial({ color: 0xffd96d }) },
      enemyCannon: { geo: new THREE.SphereGeometry(1.3, 10, 10), mat: new THREE.MeshBasicMaterial({ color: 0xff5238 }) },
    };
    const style = visuals[kind] ?? visuals.enemyMachineGun;
    const mesh = new THREE.Mesh(style.geo, style.mat);
    this.scene.add(mesh);
    if (kind === 'enemyMissile') mesh.rotation.z = Math.PI / 2;
    return mesh;
  }

  makePlayerMachineGunMesh() {
    const tracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 1.8, 8),
      new THREE.MeshBasicMaterial({ color: 0x9ce6ff }),
    );
    tracer.rotation.z = Math.PI / 2;
    this.scene.add(tracer);
    return tracer;
  }

  makeAllyMachineGunMesh() {
    const tracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.6, 8),
      new THREE.MeshBasicMaterial({ color: 0x7fffd4 }),
    );
    tracer.rotation.z = Math.PI / 2;
    this.scene.add(tracer);
    return tracer;
  }

  makeAllyNavalShellMesh() {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x8be4ff }),
    );
    this.scene.add(shell);
    return shell;
  }

  createPlayerVisual() {
    const aircraftModel = this.settings.aircraftModel ?? 'f35';
    let mesh;
    if (aircraftModel === 'f15') {
      mesh = this.createF15Visual();
    } else if (aircraftModel === 'b2') {
      mesh = this.createB2Visual();
    } else {
      mesh = this.createF35Visual();
    }

    const aircraftColor = new THREE.Color(this.settings.aircraftColor ?? '#6cf4ff');
    mesh.traverse((part) => {
      if (!part.isMesh || !part.material) return;
      part.material = part.material.clone();
      if (!part.material.color) return;

      const hsl = {};
      aircraftColor.getHSL(hsl);
      part.material.color.offsetHSL(hsl.h - 0.5, Math.max(-0.2, hsl.s - 0.5) * 0.6, (hsl.l - 0.5) * 0.7 + 0.1);
    });

    mesh.scale.multiplyScalar(0.7);
    return mesh;
  }

  createF35Visual() {
    return this.stageManager.makeFighter();
  }

  createF15Visual() {
    const fighter = this.stageManager.makeFighter();
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x4f5761, metalness: 0.65, roughness: 0.45 });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x656f7a, metalness: 0.6, roughness: 0.42 });

    const twinTailLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 0.16), wingMat);
    twinTailLeft.position.set(-7.15, 2.2, -0.85);
    twinTailLeft.rotation.x = 0.34;

    const twinTailRight = twinTailLeft.clone();
    twinTailRight.position.z = 0.85;
    twinTailRight.rotation.x = -0.34;

    const wingExtensionL = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.12, 7.8), wingMat);
    wingExtensionL.position.set(-1.9, -0.01, -3.75);
    wingExtensionL.rotation.y = -0.26;
    const wingExtensionR = wingExtensionL.clone();
    wingExtensionR.position.z = 3.75;
    wingExtensionR.rotation.y = 0.26;

    const dorsalSpine = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.5, 0.8), spineMat);
    dorsalSpine.position.set(-2.45, 0.86, 0);

    fighter.add(twinTailLeft, twinTailRight, wingExtensionL, wingExtensionR, dorsalSpine);
    return fighter;
  }

  createB2Visual() {
    const bomber = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x414854, metalness: 0.72, roughness: 0.38 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x1f2631, metalness: 0.5, roughness: 0.58 });

    const center = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.05, 4.5), bodyMat);
    center.position.set(0.2, 0.1, 0);

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.45, 9.6), bodyMat);
    wingL.position.set(-2.4, 0, -6.2);
    wingL.rotation.y = -0.3;
    const wingR = wingL.clone();
    wingR.position.z = 6.2;
    wingR.rotation.y = 0.3;

    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.35, 4.2, 4), edgeMat);
    nose.position.set(6.7, 0.08, 0);
    nose.rotation.z = -Math.PI / 2;

    const trailingEdge = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, 15.2), edgeMat);
    trailingEdge.position.set(-8.1, -0.08, 0);

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
      new THREE.MeshStandardMaterial({ color: 0x8eb4d7, transparent: true, opacity: 0.5, metalness: 0.35, roughness: 0.15 }),
    );
    canopy.scale.set(1.4, 0.45, 0.66);
    canopy.position.set(3.35, 0.66, 0);

    const engineGlowL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 1.5), edgeMat);
    engineGlowL.position.set(-2.7, -0.16, -1.8);
    const engineGlowR = engineGlowL.clone();
    engineGlowR.position.z = 1.8;

    bomber.add(center, wingL, wingR, nose, trailingEdge, canopy, engineGlowL, engineGlowR);
    bomber.scale.setScalar(1.35);
    return bomber;
  }

  createAltitudeShadow() {
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(128, 128, 24, 128, 128, 116);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
      gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
    }

    const texture = new THREE.CanvasTexture(shadowCanvas);
    texture.needsUpdate = true;
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
        color: 0x000000,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = 1;
    return shadow;
  }

  updateAltitudeShadow() {
    if (!this.playerShadow) return;

    const altitude = Math.max(0, this.player.position.y);
    const altitudeRatio = THREE.MathUtils.clamp(altitude / 280, 0, 1);
    const shadowScale = 10 + altitude * 0.16;
    this.playerShadow.position.set(this.player.position.x, 0.2, this.player.position.z);
    this.playerShadow.scale.set(shadowScale, shadowScale * (0.75 + altitudeRatio * 0.3), shadowScale);
    this.playerShadow.material.opacity = THREE.MathUtils.lerp(0.52, 0.06, altitudeRatio);
    this.playerShadow.visible = altitude < 900;
  }

  updateEffects(dt) {
    this.effects.forEach((e) => {
      e.life -= dt;
      e.mesh.scale.addScalar(dt * 9);
      e.mesh.material.opacity = Math.max(0, e.life / e.maxLife);
    });
    this.effects = this.effects.filter((e) => {
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        return false;
      }
      return true;
    });
  }

  spawnExplosion(pos, color = 0xff9b5f) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(4, 10, 10),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
    );
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.effects.push({ mesh, life: 0.6, maxLife: 0.6 });
  }

  destroyEnemy(enemy, explosionColor = 0xff9b5f) {
    this.audio.explosion();
    this.spawnExplosion(enemy.mesh.position, explosionColor);
    this.scene.remove(enemy.mesh);
    this.stageManager.targets = this.stageManager.targets.filter((target) => target.mesh !== enemy.mesh);
    if (enemy.type === 'fighter' && this.countAliveEnemyCarriers() > 0) {
      this.pendingCarrierLaunches += 1;
    }
    this.onEnemyDestroyed?.(enemy.type);
  }

  applyEnemyDamage(enemy, damage, { requiresPlayerFinisher = false } = {}) {
    if (!enemy.alive) return false;

    if (requiresPlayerFinisher && damage >= enemy.health) {
      enemy.health = Math.max(1, enemy.health);
      return false;
    }

    enemy.applyDamage(damage);
    return !enemy.alive;
  }

  isTargetActive(target) {
    if (target.type === 'terrain') return true;
    const linkedEnemy = this.enemies.find((enemy) => enemy.mesh === target.mesh);
    if (!linkedEnemy) return true;
    return linkedEnemy.alive;
  }

  triggerPlayerCollision(cause, explosionColor = 0xff8f4d) {
    if (this.player.armor <= 0) return;
    this.lastCollisionCause = cause;
    this.player.armor = 0;
    this.spawnExplosion(this.player.position, explosionColor);
    this.audio.explosion();
  }

  handleCollisions(dt) {
    this.missiles.forEach((m) => {
      this.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (m.pos.distanceTo(enemy.mesh.position) < (enemy.type === 'fighter' ? 10 : 16)) {
          enemy.applyDamage(52);
          m.life = 0;
          this.spawnExplosion(enemy.mesh.position);
          this.audio.explosion();
          if (!enemy.alive) {
            this.destroyEnemy(enemy);
          }
        }
      });
    });

    this.enemyBullets.forEach((b) => {
      if (b.pos.distanceTo(this.player.position) < ((b.radius ?? 3.2) + PLAYER_COLLISION_RADIUS)) {
        b.pos.set(99999, 99999, 99999);
        if (b.mesh) this.scene.remove(b.mesh);
        this.lastDamageCause = { type: 'shot', weapon: b.kind };
        this.player.applyDamage(b.damage ?? 10);
        this.audio.enemyShot(b.kind);
        this.spawnExplosion(this.player.position, 0xff4040);
      }
    });

    this.updateAllies(dt);

    this.playerBullets.forEach((b) => {
      this.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (b.pos.distanceTo(enemy.mesh.position) < (enemy.type === 'fighter' ? 8 : 14)) {
          this.applyEnemyDamage(enemy, b.damage);
          b.life = 0;
          if (!enemy.alive) {
            this.destroyEnemy(enemy, 0xffb777);
          }
        }
      });
    });

    this.allyBullets.forEach((b) => {
      this.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (b.pos.distanceTo(enemy.mesh.position) < (enemy.type === 'fighter' ? 7 : 13)) {
          this.applyEnemyDamage(enemy, b.damage, { requiresPlayerFinisher: true });
          b.life = 0;
          if (!enemy.alive) {
            this.destroyEnemy(enemy, 0x8fffd4);
          }
        }
      });
    });

    this.allyFleetBullets.forEach((b) => {
      this.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (b.pos.distanceTo(enemy.mesh.position) < (enemy.type === 'fighter' ? 6 : 15)) {
          this.applyEnemyDamage(enemy, b.damage, { requiresPlayerFinisher: true });
          b.life = 0;
          if (!enemy.alive) {
            this.destroyEnemy(enemy, 0x9be9ff);
          }
        }
      });
    });

    for (const enemy of this.enemies) {
      const enemyCollisionRadius = enemy.type === 'fighter' ? 6.8 : 8.2;
      if (this.isLandingOnTarget(enemy.mesh)) continue;
      if (enemy.alive && enemy.mesh.position.distanceTo(this.player.position) < (enemyCollisionRadius + PLAYER_COLLISION_RADIUS)) {
        this.triggerPlayerCollision({ type: 'enemy', enemyType: enemy.type }, 0xff7676);
      }
    }

    for (const target of this.stageManager.targets) {
      if (!this.isTargetActive(target)) continue;
      if (this.isLandingOnTarget(target.mesh)) continue;
      const box = target.collisionHalfExtents;
      if (box) {
        const offset = target.collisionOffset ?? { x: 0, y: 0, z: 0 };
        const centerX = target.mesh.position.x + offset.x;
        const centerY = target.mesh.position.y + offset.y;
        const centerZ = target.mesh.position.z + offset.z;
        const dx = Math.abs(this.player.position.x - centerX);
        const dy = Math.abs(this.player.position.y - centerY);
        const dz = Math.abs(this.player.position.z - centerZ);
        if (
          dx < Math.max(0.1, box.x - PLAYER_COLLISION_RADIUS)
          && dy < Math.max(0.1, box.y - PLAYER_COLLISION_RADIUS)
          && dz < Math.max(0.1, box.z - PLAYER_COLLISION_RADIUS)
        ) {
          this.triggerPlayerCollision({ type: 'object', objective: target.objective ?? target.type ?? 'terrain' });
          break;
        }
        continue;
      }

      const radius = target.radius ?? 0;
      const verticalRadius = target.collisionVerticalRadius ?? radius;
      if (radius <= 0 || verticalRadius <= 0) continue;
      const effectiveRadius = Math.max(0.1, radius - PLAYER_COLLISION_RADIUS);
      const effectiveVerticalRadius = Math.max(0.1, verticalRadius - PLAYER_COLLISION_RADIUS);
      const offset = target.collisionOffset ?? { x: 0, y: 0, z: 0 };
      const cx = target.mesh.position.x + offset.x;
      const cy = target.mesh.position.y + offset.y;
      const cz = target.mesh.position.z + offset.z;
      const nx = (this.player.position.x - cx) / effectiveRadius;
      const ny = (this.player.position.y - cy) / effectiveVerticalRadius;
      const nz = (this.player.position.z - cz) / effectiveRadius;
      if ((nx * nx) + (ny * ny) + (nz * nz) < 1) {
        this.triggerPlayerCollision({ type: 'object', objective: target.objective ?? target.type ?? 'terrain' });
        break;
      }
    }
  }

  checkGameState() {
    if (this.player.position.y > 0 && this.player.position.y <= this.lowAltitudeThreshold && this.lowAltitudeWarningCooldown <= 0) {
      this.audio.altitudeWarning();
      this.lowAltitudeWarningCooldown = 0.7;
    }

    if (this.player.position.y <= 0) {
      this.finish(false, 'ゲームオーバー', this.getGameOverReason('crash'));
      return;
    }

    if (this.player.armor <= 0) {
      this.finish(false, 'ゲームオーバー', this.getGameOverReason('armorBreak'));
      return;
    }

    if (this.isHqObjectiveStage()) {
      const hqAlive = this.enemies.some((enemy) => enemy.alive
        && this.stageManager.targets.some((target) => target.objective === 'hq' && target.mesh === enemy.mesh));
      if (!hqAlive) {
        this.finish(true, 'ミッションクリア');
      }
      return;
    }

    if (this.enemies.every((e) => !e.alive)) {
      this.finish(true, 'ステージクリア');
    }
  }

  finish(success, title, detailMessage = null) {
    this.finished = true;
    this.onBattleFinished?.(success);
    this.paused = false;
    this.hud.setControlsEnabled(false);
    this.overlayRoot.classList.remove('hidden');
    this.overlayRoot.innerHTML = `
      <div class="result-panel ${success ? 'clear' : 'over'}">
        <h2>${title}</h2>
        <p>${success ? (this.isHqObjectiveStage() ? '軍事本部を破壊し、作戦目標を達成しました。' : '敵戦力を殲滅しました。') : (detailMessage ?? '任務失敗。機体を喪失しました。')}</p>
        <button id="retry">リトライ</button>
        <button id="back">トップへ戻る</button>
      </div>
    `;
    this.overlayRoot.querySelector('#retry').addEventListener('click', () => {
      this.dispose();
      location.reload();
    });
    this.overlayRoot.querySelector('#back').addEventListener('click', this.onExit);
  }

  isAlliedOperationStage() {
    return ALLIED_OPERATION_STAGES.has(this.stage);
  }

  isHqObjectiveStage() {
    return HQ_OBJECTIVE_STAGES.has(this.stage);
  }


  getGameOverReason(reasonType) {
    if (reasonType === 'crash') {
      return '墜落：高度を維持できず地表へ激突しました。';
    }

    if (this.lastCollisionCause) {
      if (this.lastCollisionCause.type === 'enemy') {
        return `衝突：${this.enemyTypeLabel(this.lastCollisionCause.enemyType)}と空中衝突しました。`;
      }
      return `衝突：${this.objectiveLabel(this.lastCollisionCause.objective)}に接触しました。`;
    }

    if (this.lastDamageCause?.type === 'shot') {
      return `銃撃：${this.weaponLabel(this.lastDamageCause.weapon)}で撃墜されました。`;
    }

    return '機体損壊：敵の攻撃で機体耐久値が尽きました。';
  }

  enemyTypeLabel(type) {
    const labels = {
      fighter: '敵戦闘機',
      ship: '敵艦艇',
      turret: '対空砲台',
    };
    return labels[type] ?? '敵機';
  }

  objectiveLabel(objective) {
    const labels = {
      hq: '軍事本部施設',
      portSpawner: '港湾施設',
      runwaySpawner: '滑走路施設',
      ship: '艦艇',
      terrain: '地形障害物',
    };
    return labels[objective] ?? '構造物';
  }

  weaponLabel(kind) {
    const labels = {
      enemyMissile: '敵ミサイル',
      enemyMachineGun: '敵機銃',
      enemyCannon: '敵艦砲',
    };
    return labels[kind] ?? '敵火器';
  }

  updateHUD() {
    const radarObjects = [];
    this.enemies.filter((e) => e.alive).forEach((obj) => {
      const pos = obj.mesh.position || obj.position;
      const relative = pos.clone().sub(this.player.position);
      const forwardDot = relative.dot(this.player.forward);
      const rightDot = relative.dot(this.player.right);
      const scale = 0.08;
      radarObjects.push({ x: THREE.MathUtils.clamp(rightDot * scale, -72, 72), y: THREE.MathUtils.clamp(-forwardDot * scale, -72, 72), kind: 'enemy' });
    });

    this.allies.forEach((ally) => {
      const relative = ally.mesh.position.clone().sub(this.player.position);
      const forwardDot = relative.dot(this.player.forward);
      const rightDot = relative.dot(this.player.right);
      const scale = 0.08;
      radarObjects.push({ x: THREE.MathUtils.clamp(rightDot * scale, -72, 72), y: THREE.MathUtils.clamp(-forwardDot * scale, -72, 72), kind: 'ally' });
    });

    this.allyFleet?.forEach((allyShip) => {
      const relative = allyShip.mesh.position.clone().sub(this.player.position);
      const forwardDot = relative.dot(this.player.forward);
      const rightDot = relative.dot(this.player.right);
      const scale = 0.08;
      radarObjects.push({ x: THREE.MathUtils.clamp(rightDot * scale, -72, 72), y: THREE.MathUtils.clamp(-forwardDot * scale, -72, 72), kind: 'ally' });
    });

    const lockCandidate = this.getLockCandidate(this.player.position, this.player.forward);
    const enemyGauges = this.enemies
      .filter((enemy) => enemy.alive)
      .map((enemy) => {
        const screen = this.toScreenPoint(enemy.mesh.position.clone().add(new THREE.Vector3(0, 8, 0)));
        if (!screen) return null;
        return {
          x: screen.x,
          y: screen.y,
          ratio: THREE.MathUtils.clamp(enemy.health / Math.max(1, enemy.maxHealth), 0, 1),
        };
      })
      .filter(Boolean);

    this.hud.update({
      speed: this.player.speed,
      altitude: this.player.position.y,
      missiles: this.player.missiles,
      machineGunAmmo: this.player.machineGunAmmo,
      armor: this.player.armor,
      armorMax: this.player.maxArmor,
      throttle: this.player.throttle,
      radar: radarObjects,
      lockGuide: lockCandidate ? this.toScreenPoint(lockCandidate.mesh.position) : null,
      enemyGauges,
    });
  }

  getClosestLivingEnemy(pos, predicate = null) {
    let best = null;
    let bestDist = Infinity;
    this.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      if (predicate && !predicate(enemy)) return;
      const d = enemy.mesh.position.distanceTo(pos);
      if (d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    });
    return best;
  }

  nearestEnemyDistance() {
    const e = this.getClosestLivingEnemy(this.player.position);
    return e ? e.mesh.position.distanceTo(this.player.position) : Infinity;
  }


  getLockCandidate(origin, forward) {
    let best = null;
    let bestScore = -Infinity;
    this.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const toEnemy = enemy.mesh.position.clone().sub(origin);
      const dist = toEnemy.length();
      if (dist > this.missileLockDistance) return;
      const dir = toEnemy.normalize();
      const alignment = dir.dot(forward);
      if (alignment < 0.78) return;
      const score = alignment - dist / this.missileLockDistance;
      if (score > bestScore) {
        bestScore = score;
        best = enemy;
      }
    });
    return best;
  }

  resolveMissileTarget(missile) {
    if (missile.targetRef?.alive) return missile.targetRef;
    if (!missile.targetId) return null;
    const found = this.enemies.find((e) => e.id === missile.targetId && e.alive);
    missile.targetRef = found ?? null;
    return missile.targetRef;
  }

  toScreenPoint(worldPos) {
    const p = worldPos.clone().project(this.camera);
    if (p.z < -1 || p.z > 1) return null;
    return {
      x: (p.x * 0.5 + 0.5) * window.innerWidth,
      y: (-p.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    this.stageManager.cleanup();
    this.missiles.forEach((m) => this.scene.remove(m.mesh));
    this.playerBullets.forEach((b) => b.mesh && this.scene.remove(b.mesh));
    this.allyBullets.forEach((b) => b.mesh && this.scene.remove(b.mesh));
    this.allyFleetBullets.forEach((b) => b.mesh && this.scene.remove(b.mesh));
    this.allies.forEach((ally) => ally.mesh && this.scene.remove(ally.mesh));
    this.allyFleet?.forEach((allyShip) => allyShip.mesh && this.scene.remove(allyShip.mesh));
    this.enemyBullets.forEach((b) => b.mesh && this.scene.remove(b.mesh));
    if (this.playerMesh) this.scene.remove(this.playerMesh);
    if (this.playerShadow) {
      this.scene.remove(this.playerShadow);
      this.playerShadow.geometry?.dispose?.();
      if (this.playerShadow.material?.map) this.playerShadow.material.map.dispose();
      this.playerShadow.material?.dispose?.();
    }
    this.audio.dispose();
    this.renderer.dispose();
  }
}
