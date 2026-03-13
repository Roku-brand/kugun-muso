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

    const playerStart = new THREE.Vector3(0, 220, 0);
    const airSpawnPoints = [
      [-420, 210, -1500],
      [-280, 250, -1380],
      [-120, 180, -1260],
      [90, 270, -1520],
      [260, 200, -1340],
      [410, 240, -1450],
      [-360, 290, -1180],
      [340, 170, -1120],
    ];

    const spreadTargets = [
      [-620, 220, -520],
      [-500, 280, -920],
      [-180, 160, -460],
      [120, 300, -540],
      [360, 170, -700],
      [620, 260, -920],
      [-540, 330, -1220],
      [560, 190, -1180],
    ];

    for (let i = 0; i < 8; i++) {
      const mesh = this.makeFighter(0xff6f6f);
      const [x, y, z] = airSpawnPoints[i];
      mesh.position.set(x, y, z);
      mesh.lookAt(playerStart);
      this.scene.add(mesh);
      const spreadPoint = new THREE.Vector3(...spreadTargets[i]);
      this.enemies.push(new Enemy({
        type: 'fighter',
        mesh,
        health: 1,
        speed: 42 + Math.random() * 14,
        behavior: {
          engageTime: 4.5 + i * 0.4,
          spreadWeight: 0.65 + (i % 3) * 0.1,
          spreadPoint,
        },
      }));
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

    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.62, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.28, 15.8, 18), bodyMat);
    body.rotation.z = Math.PI / 2;

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.72, 3.3, 18),
      new THREE.MeshStandardMaterial({ color: 0xe4e8ee, metalness: 0.75, roughness: 0.25 }),
    );
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 9.45;

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      new THREE.MeshStandardMaterial({ color: 0x86bcff, transparent: true, opacity: 0.74, metalness: 0.3, roughness: 0.1 }),
    );
    canopy.scale.set(1.45, 0.76, 0.92);
    canopy.position.set(2.8, 0.96, 0);

    const wingMat = new THREE.MeshStandardMaterial({ color: 0x36414f, metalness: 0.45, roughness: 0.55 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.2, 3.7), wingMat);
    wing.position.set(-0.6, 0.05, 0);

    const mainWingL = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.16, 2.3), wingMat);
    mainWingL.position.set(-1.0, 0.04, -2.4);
    mainWingL.rotation.y = 0.18;
    const mainWingR = mainWingL.clone();
    mainWingR.position.z = 2.4;
    mainWingR.rotation.y = -0.18;

    const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.42), wingMat);
    wingTipL.position.set(2.2, -0.03, -3.45);
    wingTipL.rotation.y = 0.08;
    const wingTipR = wingTipL.clone();
    wingTipR.position.z = 3.45;
    wingTipR.rotation.y = -0.08;

    const canardL = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.9), wingMat);
    canardL.position.set(4.7, 0.35, -0.95);
    canardL.rotation.x = 0.16;
    const canardR = canardL.clone();
    canardR.position.z = 0.95;
    canardR.rotation.x = -0.16;

    const tailWing = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 1.8), wingMat);
    tailWing.position.set(-6.05, 0.42, 0);

    const vTailL = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.36, 0.11), wingMat);
    vTailL.position.set(-6.7, 1.26, -0.66);
    vTailL.rotation.x = 0.5;

    const vTailR = vTailL.clone();
    vTailR.position.z = 0.66;
    vTailR.rotation.x = -0.5;

    const engineMat = new THREE.MeshStandardMaterial({ color: 0x262d35, metalness: 0.5, roughness: 0.58 });
    const engineL = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.38, 2.4, 12), engineMat);
    engineL.rotation.z = Math.PI / 2;
    engineL.position.set(-5.4, -0.28, -0.7);
    const engineR = engineL.clone();
    engineR.position.z = 0.7;

    const intakeL = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.0, 10), engineMat);
    intakeL.rotation.z = Math.PI / 2;
    intakeL.position.set(-0.9, -0.4, -1.1);
    const intakeR = intakeL.clone();
    intakeR.position.z = 1.1;

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.02, 0.46),
      new THREE.MeshStandardMaterial({ color: 0x11161c, metalness: 0.22, roughness: 0.68 }),
    );
    stripe.position.set(2.05, 0.72, 0);

    group.add(
      body,
      nose,
      canopy,
      wing,
      mainWingL,
      mainWingR,
      wingTipL,
      wingTipR,
      canardL,
      canardR,
      tailWing,
      vTailL,
      vTailR,
      engineL,
      engineR,
      intakeL,
      intakeR,
      stripe,
    );
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
