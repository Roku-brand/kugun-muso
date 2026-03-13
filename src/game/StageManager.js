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
      this.enemies.push(new Enemy({ type: 'fighter', mesh, health: 1, speed: 95 + Math.random() * 45 }));
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
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.8, 14, 8), new THREE.MeshStandardMaterial({ color }));
    body.rotation.z = Math.PI / 2;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0x2f3f50 }));
    group.add(body, wing);
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
