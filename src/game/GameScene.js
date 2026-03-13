import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { Player } from './Player.js';
import { StageManager } from './StageManager.js';
import { HUD } from '../ui/HUD.js';
import { AudioManager } from '../audio/AudioManager.js';

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
      onThrottle: (v) => (this.touchThrottle = v),
      onStick: (x, y) => (this.touchStick = { x, y }),
    });

    this.keys = {};
    this.touchThrottle = 0;
    this.touchStick = { x: 0, y: 0 };
    this.missiles = [];
    this.missileLockDistance = 180;
    this.enemyBullets = [];
    this.effects = [];
    this.lockOnTimer = 0;
    this.finished = false;
    this.last = performance.now();
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
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
      this.keys[key] = true;
    };
    this.onUp = (e) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
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

    this.audio.updateEngine((this.player.speed - this.player.minSpeed) / (this.player.maxSpeed - this.player.minSpeed));
    this.lockOnTimer += dt;
    if (this.lockOnTimer > 1.8 && this.nearestEnemyDistance() < 220) {
      this.audio.lockOn();
      this.lockOnTimer = 0;
    }
  }

  fireMissile() {
    if (this.finished || !this.player.consumeAmmo()) return;
    const lockTarget = this.getLockCandidate(this.player.position, this.player.forward);
    const pos = this.player.position.clone().add(this.player.forward.clone().multiplyScalar(6));
    const vel = this.player.forward.clone().multiplyScalar(240);
    this.missiles.push({
      pos,
      vel,
      life: 4,
      mesh: this.makeMissileMesh(),
      homing: Boolean(lockTarget),
      targetId: lockTarget?.id ?? null,
      targetRef: lockTarget ?? null,
    });
    this.scene.add(this.missiles.at(-1).mesh);
    this.audio.missile();
  }

  makeMissileMesh() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.3, 2.8, 12),
      new THREE.MeshStandardMaterial({ color: this.settings.missileColor, metalness: 0.75, roughness: 0.35 }),
    );
    body.rotation.z = Math.PI / 2;

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 0.8, roughness: 0.25 }),
    );
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 1.7;

    const finMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.65, roughness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.32), finMat);
      fin.position.x = -1.05;
      fin.rotation.x = (Math.PI / 2) * i;
      group.add(fin);
    }

    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 0.25, 10),
      new THREE.MeshStandardMaterial({ color: 0x232323, metalness: 0.4, roughness: 0.6 }),
    );
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.x = -1.5;

    group.add(body, nose, exhaust);
    return group;
  }

  loop = () => {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.03);
    this.last = now;

    if (!this.finished) {
      this.readInput(dt);
      this.player.update(dt);
      this.updateWorld(dt);
      this.checkGameState();
      this.updateHUD();
    }

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  };

  updateWorld(dt) {
    this.enemies.forEach((enemy) => enemy.update(dt, this.player.position, this.enemyBullets));

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
    });

    this.enemyBullets.forEach((b) => b.pos.addScaledVector(b.vel, dt));
    this.updateEffects(dt);
    this.handleCollisions();

    this.missiles = this.missiles.filter((m) => {
      if (m.life <= 0) {
        this.scene.remove(m.mesh);
        return false;
      }
      return true;
    });

    this.enemyBullets = this.enemyBullets.filter((b) => b.pos.distanceTo(this.player.position) < 2500);
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

  handleCollisions() {
    this.missiles.forEach((m) => {
      this.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (m.pos.distanceTo(enemy.mesh.position) < (enemy.type === 'fighter' ? 10 : 16)) {
          enemy.applyDamage(1);
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
        this.player.hit();
        this.audio.hit();
        this.spawnExplosion(this.player.position, 0xff4040);
      }
    });

    for (const enemy of this.enemies) {
      if (enemy.alive && enemy.mesh.position.distanceTo(this.player.position) < 9) {
        this.player.health = 0;
      }
    }

    for (const target of this.stageManager.targets) {
      if (target.mesh.position.distanceTo(this.player.position) < target.radius) {
        this.player.health = 0;
      }
    }
  }

  checkGameState() {
    if (this.player.position.y <= 1 || this.player.health <= 0) {
      this.finish(false, 'ゲームオーバー');
      return;
    }
    if (this.enemies.every((e) => !e.alive)) {
      this.finish(true, 'ステージクリア');
    }
  }

  finish(success, title) {
    this.finished = true;
    this.overlayRoot.classList.remove('hidden');
    this.overlayRoot.innerHTML = `
      <div class="result-panel ${success ? 'clear' : 'over'}">
        <h2>${title}</h2>
        <p>${success ? '敵戦力を殲滅しました。' : '任務失敗。機体を喪失しました。'}</p>
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

  updateHUD() {
    const radarObjects = [];
    [...this.enemies.filter((e) => e.alive), ...this.stageManager.targets].forEach((obj) => {
      const pos = obj.mesh.position || obj.position;
      const relative = pos.clone().sub(this.player.position);
      const forwardDot = relative.dot(this.player.forward);
      const rightDot = relative.dot(this.player.right);
      const scale = 0.08;
      radarObjects.push({ x: THREE.MathUtils.clamp(rightDot * scale, -72, 72), y: THREE.MathUtils.clamp(-forwardDot * scale, -72, 72), kind: 'enemy' });
    });

    const lockCandidate = this.getLockCandidate(this.player.position, this.player.forward);
    this.hud.update({
      speed: this.player.speed,
      altitude: this.player.position.y,
      ammo: this.player.ammo,
      health: this.player.health,
      throttle: this.player.throttle,
      radar: radarObjects,
      lockGuide: lockCandidate ? this.toScreenPoint(lockCandidate.mesh.position) : null,
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
    this.audio.dispose();
    this.renderer.dispose();
  }
}
