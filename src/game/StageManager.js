import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { Enemy } from './Enemy.js';

export class StageManager {
  constructor(scene) {
    this.scene = scene;
    this.stageObjects = [];
    this.enemies = [];
    this.targets = [];
  }

  createStage(stage) {
    this.cleanup();
    if (stage === 'air') this.createAirBattle();
    if (stage === 'sea') this.createSeaBattle();
    if (stage === 'base') this.createBaseBattle();
    return this.enemies;
  }

  createSkyCommon() {
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(120, 180, 80);
    this.scene.add(sun);
    this.stageObjects.push(sun);

    const ambient = new THREE.AmbientLight(0x7aa7ff, 0.45);
    this.scene.add(ambient);
    this.stageObjects.push(ambient);

    for (let i = 0; i < 30; i++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(12 + Math.random() * 14, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0xf8fbff, transparent: true, opacity: 0.8 }),
      );
      cloud.position.set((Math.random() - 0.5) * 1200, 200 + Math.random() * 140, (Math.random() - 0.5) * 1200);
      cloud.scale.set(1.8, 0.7, 1.4);
      this.scene.add(cloud);
      this.stageObjects.push(cloud);
    }
  }

  createAirBattle() {
    this.createSkyCommon();
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(6000, 64),
      new THREE.MeshStandardMaterial({ color: 0x42533d }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);
    this.stageObjects.push(ground);

    for (let i = 0; i < 8; i++) {
      const mesh = this.makeFighter(0xff6f6f);
      mesh.position.set((Math.random() - 0.5) * 900, 180 + Math.random() * 160, -400 - Math.random() * 1000);
      this.scene.add(mesh);
      this.enemies.push(new Enemy({ type: 'fighter', mesh, health: 1, speed: 72 + Math.random() * 30 }));
    }
  }

  createSeaBattle() {
    this.createSkyCommon();
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(8000, 8000, 50, 50),
      new THREE.MeshStandardMaterial({ color: 0x0d3452, metalness: 0.3, roughness: 0.6 }),
    );
    sea.rotation.x = -Math.PI / 2;
    this.scene.add(sea);
    this.stageObjects.push(sea);

    for (let i = 0; i < 6; i++) {
      const ship = this.makeShip();
      ship.position.set((Math.random() - 0.5) * 900, 6, -350 - i * 220);
      this.scene.add(ship);
      this.enemies.push(new Enemy({ type: 'ship', mesh: ship, health: 2, speed: 10 }));
      this.targets.push({ mesh: ship, radius: 20, type: 'ship' });
    }
  }

  createBaseBattle() {
    this.createSkyCommon();
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000),
      new THREE.MeshStandardMaterial({ color: 0x103b58 }),
    );
    sea.rotation.x = -Math.PI / 2;
    this.scene.add(sea);
    this.stageObjects.push(sea);

    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(220, 300, 70, 24),
      new THREE.MeshStandardMaterial({ color: 0x3f5a3a }),
    );
    island.position.set(0, 35, -900);
    this.scene.add(island);
    this.stageObjects.push(island);
    this.targets.push({ mesh: island, radius: 240, type: 'island' });

    for (let i = 0; i < 5; i++) {
      const turret = new THREE.Mesh(
        new THREE.BoxGeometry(18, 16, 18),
        new THREE.MeshStandardMaterial({ color: 0x777d87 }),
      );
      turret.position.set(-120 + i * 60, 74, -920 + (i % 2) * 80);
      this.scene.add(turret);
      this.enemies.push(new Enemy({ type: 'turret', mesh: turret, health: 2 }));
      this.targets.push({ mesh: turret, radius: 14, type: 'building' });
    }

    for (let i = 0; i < 4; i++) {
      const sam = new THREE.Mesh(
        new THREE.CylinderGeometry(5, 7, 22, 8),
        new THREE.MeshStandardMaterial({ color: 0x9ba1ab }),
      );
      sam.position.set(-100 + i * 60, 80, -860 - (i % 2) * 70);
      this.scene.add(sam);
      this.enemies.push(new Enemy({ type: 'turret', mesh: sam, health: 1 }));
      this.targets.push({ mesh: sam, radius: 9, type: 'building' });
    }
  }

  makeFighter(color) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.45 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.9, 16, 14), bodyMat);
    body.rotation.z = Math.PI / 2;

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 2.7, 14),
      new THREE.MeshStandardMaterial({ color: 0xd5dae0, metalness: 0.7, roughness: 0.3 }),
    );
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 9;

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x7db4ff, transparent: true, opacity: 0.78, metalness: 0.2, roughness: 0.15 }),
    );
    canopy.scale.set(1.35, 0.7, 0.8);
    canopy.position.set(2.4, 0.8, 0);

    const wingMat = new THREE.MeshStandardMaterial({ color: 0x404a56, metalness: 0.4, roughness: 0.6 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.22, 2.4), wingMat);
    wing.position.x = -1;

    const tailWing = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.16, 1.3), wingMat);
    tailWing.position.set(-6, 0.2, 0);

    const vTailL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.12), wingMat);
    vTailL.position.set(-6.8, 1, -0.7);
    vTailL.rotation.x = 0.45;

    const vTailR = vTailL.clone();
    vTailR.position.z = 0.7;
    vTailR.rotation.x = -0.45;

    const intakeMat = new THREE.MeshStandardMaterial({ color: 0x2b3138, metalness: 0.35, roughness: 0.65 });
    const intakeL = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.2, 10), intakeMat);
    intakeL.rotation.z = Math.PI / 2;
    intakeL.position.set(-0.6, -0.35, -1.1);
    const intakeR = intakeL.clone();
    intakeR.position.z = 1.1;

    group.add(body, nose, canopy, wing, tailWing, vTailL, vTailR, intakeL, intakeR);
    return group;
  }

  makeShip() {
    const group = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(32, 8, 70), new THREE.MeshStandardMaterial({ color: 0x5f6770 }));
    const tower = new THREE.Mesh(new THREE.BoxGeometry(12, 11, 16), new THREE.MeshStandardMaterial({ color: 0x8c949d }));
    tower.position.y = 9;
    group.add(hull, tower);
    return group;
  }

  cleanup() {
    [...this.stageObjects, ...this.enemies.map((e) => e.mesh)].forEach((obj) => {
      this.scene.remove(obj);
    });
    this.stageObjects = [];
    this.enemies = [];
    this.targets = [];
  }
}
