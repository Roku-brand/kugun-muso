import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { Player } from './Player.js';
import { StageManager } from './StageManager.js';
import { Enemy } from './Enemy.js';
import { HUD } from '../ui/HUD.js';
import { AudioManager } from '../audio/AudioManager.js';

const COMBAT_SPEED_SCALE = 0.6;
const DIFFICULTY_ALLY_COUNT = { easy: 3, normal: 1, hard: 0 };

export class GameScene {
  constructor({ canvas, hudRoot, overlayRoot, stage, settings, onExit }) {
    this.canvas = canvas;
    this.hudRoot = hudRoot;
    this.overlayRoot = overlayRoot;
    this.stage = stage;
    this.settings = settings;
    this.onExit = onExit;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: settings.quality !== 'low' });
    this.renderer.setPixelRatio(settings.quality === 'high' ? window.devicePixelRatio : 1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b7ff);
    this.scene.fog = new THREE.Fog(0x87b7ff, 350, 2600);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 12000);
    this.player = new Player(this.camera, settings);

    this.stageManager = new StageManager(this.scene);
    this.enemies = this.stageManager.createStage(stage);

    this.audio = new AudioManager(settings);
    this.hud = new HUD(hudRoot, {
      onFire: () => this.fireMissile(),
      onGunStart: () => (this.touchGunHeld = true),
      onGunStop: () => (this.touchGunHeld = false),
      onThrottle: (v) => (this.touchThrottle = v),
      onStick: (x, y) => (this.touchStick = { x, y }),
      onMenu: () => this.togglePauseMenu(),
    });

    this.keys = {};
    this.touchThrottle = 0;
    this.touchStick = { x: 0, y: 0 };
    this.missiles = [];
    this.playerBullets = [];
    this.allyBullets = [];
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
    const allyCount = DIFFICULTY_ALLY_COUNT[this.settings.difficulty] ?? DIFFICULTY_ALLY_COUNT.normal;
    this.allies = Array.from({ length: allyCount }, (_, index) => ({
      index,
      cooldown: 0.5 + index * 0.2,
      offset: new THREE.Vector3(20 + index * 6, 6 + (index % 2) * 3, index % 2 === 0 ? -16 : 16),
      mesh: this.stageManager.makeFighter(),
    }));

    this.allies.forEach((ally) => {
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
      this.scene.add(ally.mesh);
    });
  }

  getAllyWorldPosition(ally) {
    const side = ally.index % 2 === 0 ? -1 : 1;
    return this.player.position
      .clone()
      .add(this.player.right.clone().multiplyScalar(ally.offset.x * side))
      .add(this.player.worldUp.clone().multiplyScalar(ally.offset.y))
      .add(this.player.forward.clone().multiplyScalar(ally.offset.z));
  }

  updateAllies(dt) {
    if (!this.allies.length) return;

    this.allies.forEach((ally) => {
      const anchor = this.getAllyWorldPosition(ally);
      ally.mesh.position.copy(anchor);
      const lookTarget = anchor.clone().add(this.player.forward.clone().multiplyScalar(60));
      ally.mesh.lookAt(lookTarget);
    });

    const target = this.getClosestLivingEnemy(this.player.position);
    if (!target) return;

    this.allies.forEach((ally, idx) => {
      ally.cooldown -= dt;
      if (ally.cooldown > 0) return;
      ally.cooldown = 0.24 + idx * 0.02;

      const shootPos = this.getAllyWorldPosition(ally);

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

  updateWorld(dt) {
    this.lowAltitudeWarningCooldown = Math.max(0, this.lowAltitudeWarningCooldown - dt);
    this.enemies.forEach((enemy) => enemy.update(dt, this.player.position, this.enemyBullets, (kind) => this.makeEnemyBulletMesh(kind)));
    this.updateTotalWarSpawners(dt);

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
  }



  updateTotalWarSpawners(dt) {
    if (this.stage !== 'totalWar') return;

    const port = this.findObjectiveTarget('portSpawner');
    const runway = this.findObjectiveTarget('runwaySpawner');

    if (port) {
      this.spawnerTimers.port -= dt;
      if (this.spawnerTimers.port <= 0) {
        this.spawnerTimers.port = 6.5;
        this.spawnReinforcementShip(port.mesh.position.clone());
      }
    }

    if (runway) {
      this.spawnerTimers.runway -= dt;
      if (this.spawnerTimers.runway <= 0) {
        this.spawnerTimers.runway = 5.2;
        this.spawnReinforcementFighter(runway.mesh.position.clone());
      }
    }
  }

  findObjectiveTarget(objective) {
    return this.stageManager.targets.find((target) => {
      if (target.objective !== objective) return false;
      return this.enemies.some((enemy) => enemy.alive && enemy.mesh === target.mesh);
    });
  }

  spawnReinforcementShip(origin) {
    const ship = this.stageManager.makeShip(Math.random() > 0.5 ? 'destroyer' : 'frigate');
    ship.position.set(origin.x + (Math.random() - 0.5) * 120, 6, origin.z + 160 + Math.random() * 120);
    ship.rotation.y = Math.PI + (Math.random() - 0.5) * 0.3;
    this.scene.add(ship);
    const enemy = new Enemy({ type: 'ship', mesh: ship, health: 2, speed: 10 + Math.random() * 3 });
    this.enemies.push(enemy);
    this.stageManager.enemies.push(enemy);
    this.stageManager.targets.push({ mesh: ship, radius: 24, type: 'ship' });
  }

  spawnReinforcementFighter(origin) {
    const fighter = this.stageManager.makeFighter();
    fighter.position.set(origin.x + (Math.random() - 0.5) * 90, 92 + Math.random() * 32, origin.z + 10 + Math.random() * 55);
    fighter.lookAt(this.player.position);
    this.scene.add(fighter);

    const spreadPoint = fighter.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 120, 60, -260));
    const enemy = new Enemy({
      type: 'fighter',
      mesh: fighter,
      health: 1,
      speed: 82 + Math.random() * 16,
      behavior: {
        engageTime: 1.5 + Math.random() * 1.2,
        spreadWeight: 0.78,
        spreadPoint,
        preferredRange: 280,
        rangeTolerance: 95,
      },
    });
    this.enemies.push(enemy);
    this.stageManager.enemies.push(enemy);
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

  handleCollisions(dt) {
    this.missiles.forEach((m) => {
      this.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (m.pos.distanceTo(enemy.mesh.position) < (enemy.type === 'fighter' ? 10 : 16)) {
          enemy.applyDamage(52);
          m.life = 0;
          this.spawnExplosion(enemy.mesh.position);
          this.audio.explosion();
          if (!enemy.alive) this.scene.remove(enemy.mesh);
        }
      });
    });

    this.enemyBullets.forEach((b) => {
      if (b.pos.distanceTo(this.player.position) < 8) {
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
          enemy.applyDamage(b.damage);
          b.life = 0;
          if (!enemy.alive) {
            this.audio.explosion();
            this.spawnExplosion(enemy.mesh.position, 0xffb777);
            this.scene.remove(enemy.mesh);
          }
        }
      });
    });

    this.allyBullets.forEach((b) => {
      this.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (b.pos.distanceTo(enemy.mesh.position) < (enemy.type === 'fighter' ? 7 : 13)) {
          enemy.applyDamage(b.damage);
          b.life = 0;
          if (!enemy.alive) {
            this.audio.explosion();
            this.spawnExplosion(enemy.mesh.position, 0x8fffd4);
            this.scene.remove(enemy.mesh);
          }
        }
      });
    });

    for (const enemy of this.enemies) {
      if (enemy.alive && enemy.mesh.position.distanceTo(this.player.position) < 9) {
        this.lastCollisionCause = { type: 'enemy', enemyType: enemy.type };
        this.player.armor = 0;
      }
    }

    for (const target of this.stageManager.targets) {
      const box = target.collisionHalfExtents;
      if (box) {
        const dx = Math.abs(this.player.position.x - target.mesh.position.x);
        const dy = Math.abs(this.player.position.y - target.mesh.position.y);
        const dz = Math.abs(this.player.position.z - target.mesh.position.z);
        if (dx < box.x && dy < box.y && dz < box.z) {
          this.lastCollisionCause = { type: 'object', objective: target.objective ?? target.type ?? 'terrain' };
          this.player.armor = 0;
        }
        continue;
      }

      if (target.mesh.position.distanceTo(this.player.position) < target.radius) {
        this.lastCollisionCause = { type: 'object', objective: target.objective ?? target.type ?? 'terrain' };
        this.player.armor = 0;
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

    if (this.stage === 'totalWar') {
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
    this.paused = false;
    this.overlayRoot.classList.remove('hidden');
    this.overlayRoot.innerHTML = `
      <div class="result-panel ${success ? 'clear' : 'over'}">
        <h2>${title}</h2>
        <p>${success ? (this.stage === 'totalWar' ? '軍事本部を破壊し、作戦目標を達成しました。' : '敵戦力を殲滅しました。') : (detailMessage ?? '任務失敗。機体を喪失しました。')}</p>
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

  getClosestLivingEnemy(pos) {
    let best = null;
    let bestDist = Infinity;
    this.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
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
    this.allies.forEach((ally) => ally.mesh && this.scene.remove(ally.mesh));
    this.enemyBullets.forEach((b) => b.mesh && this.scene.remove(b.mesh));
    this.audio.dispose();
    this.renderer.dispose();
  }
}
