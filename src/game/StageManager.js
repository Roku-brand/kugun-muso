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
    const sea = new THREE.Mesh(
      new THREE.CircleGeometry(6000, 96),
      new THREE.MeshStandardMaterial({
        color: 0x0f4f7a,
        metalness: 0.38,
        roughness: 0.44,
      }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -4;
    this.scene.add(sea);
    this.stageObjects.push(sea);

    const playerStart = new THREE.Vector3(0, 220, 0);
    const airSpawnPoints = [
      [-420, 320, -1500],
      [-280, 360, -1380],
      [-120, 290, -1260],
      [90, 380, -1520],
      [260, 310, -1340],
      [410, 350, -1450],
      [-360, 400, -1180],
      [340, 280, -1120],
    ];

    const spreadTargets = [
      [-620, 340, -520],
      [-500, 400, -920],
      [-180, 280, -460],
      [120, 420, -540],
      [360, 290, -700],
      [620, 380, -920],
      [-540, 440, -1220],
      [560, 310, -1180],
    ];

    for (let i = 0; i < 8; i++) {
      const mesh = this.makeFighter();
      const [x, y, z] = airSpawnPoints[i];
      mesh.position.set(x, y, z);
      mesh.lookAt(playerStart);
      this.scene.add(mesh);
      const spreadPoint = new THREE.Vector3(...spreadTargets[i]);
      this.enemies.push(new Enemy({
        type: 'fighter',
        mesh,
        health: 1,
        speed: 74 + Math.random() * 18,
        behavior: {
          engageTime: 4.5 + i * 0.4,
          spreadWeight: 0.65 + (i % 3) * 0.1,
          spreadPoint,
          preferredRange: 280 + (i % 3) * 25,
          rangeTolerance: 80,
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

    const hq = this.makeHeadquarters();
    hq.position.set(0, 82, -930);
    this.scene.add(hq);
    this.enemies.push(new Enemy({ type: 'turret', mesh: hq, health: 4 }));
    this.targets.push({ mesh: hq, radius: 42, type: 'building' });

    const port = this.makePortFacility();
    port.position.set(0, 70, -790);
    this.scene.add(port);
    this.targets.push({ mesh: port, radius: 130, type: 'building' });

    const towerPositions = [
      [-155, 74, -855],
      [160, 74, -870],
      [-145, 74, -1020],
      [150, 74, -1015],
    ];

    towerPositions.forEach((pos) => {
      const tower = this.makeWatchTower();
      tower.position.set(...pos);
      this.scene.add(tower);
      this.enemies.push(new Enemy({ type: 'turret', mesh: tower, health: 2 }));
      this.targets.push({ mesh: tower, radius: 16, type: 'building' });
    });

    for (let i = 0; i < 4; i++) {
      const turret = this.makeGroundTurret();
      turret.position.set(-88 + i * 56, 74, -925 + (i % 2) * 76);
      this.scene.add(turret);
      this.enemies.push(new Enemy({ type: 'turret', mesh: turret, health: 2 }));
      this.targets.push({ mesh: turret, radius: 14, type: 'building' });
    }

    const samPositions = [
      [-130, 80, -835],
      [-48, 80, -838],
      [34, 80, -837],
      [116, 80, -836],
      [-92, 80, -1068],
      [86, 80, -1070],
    ];

    samPositions.forEach((pos) => {
      const sam = this.makeSamBattery();
      sam.position.set(...pos);
      this.scene.add(sam);
      this.enemies.push(new Enemy({ type: 'turret', mesh: sam, health: 1 }));
      this.targets.push({ mesh: sam, radius: 11, type: 'building' });
    });
  }

  makeHeadquarters() {
    const group = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: 0.68, metalness: 0.18 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x5f6670, roughness: 0.5, metalness: 0.25 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x89a6bf, roughness: 0.16, metalness: 0.35 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(86, 22, 42), concrete);
    base.position.y = 11;
    const core = new THREE.Mesh(new THREE.BoxGeometry(50, 30, 24), concrete);
    core.position.y = 26;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(54, 4, 28), roofMat);
    roof.position.y = 43;
    const radar = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 12, 12), roofMat);
    radar.position.set(0, 51, 0);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), glass);
    dome.scale.y = 0.6;
    dome.position.set(0, 58, 0);

    const sideWing = new THREE.Mesh(new THREE.BoxGeometry(18, 14, 32), concrete);
    sideWing.position.set(-32, 10, -4);
    const sideWingR = sideWing.clone();
    sideWingR.position.x = 32;

    group.add(base, core, roof, radar, dome, sideWing, sideWingR);
    return group;
  }

  makeWatchTower() {
    const group = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0x727b85, roughness: 0.52, metalness: 0.5 });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x4d5560, roughness: 0.56, metalness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xa9c2d9, roughness: 0.14, metalness: 0.28, transparent: true, opacity: 0.72 });

    const legs = [
      [-5, 18, -5],
      [5, 18, -5],
      [-5, 18, 5],
      [5, 18, 5],
    ];
    legs.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.5, 36, 1.5), steel);
      leg.position.set(x, y, z);
      group.add(leg);
    });

    const platform = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 16), steel);
    platform.position.y = 36;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(11, 8, 11), cabinMat);
    cabin.position.y = 42;
    const windowBand = new THREE.Mesh(new THREE.BoxGeometry(11.6, 3.2, 11.6), glass);
    windowBand.position.y = 43;
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 8, 8), steel);
    antenna.position.set(0, 49, 0);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 10), glass);
    beacon.position.set(0, 53.5, 0);

    group.add(platform, cabin, windowBand, antenna, beacon);
    return group;
  }

  makePortFacility() {
    const group = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x747f89, roughness: 0.7, metalness: 0.16 });
    const hull = new THREE.MeshStandardMaterial({ color: 0x2f3f4d, roughness: 0.52, metalness: 0.36 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x9ea7af, roughness: 0.42, metalness: 0.28 });

    const pier = new THREE.Mesh(new THREE.BoxGeometry(220, 6, 34), concrete);
    pier.position.y = 3;
    const quay = new THREE.Mesh(new THREE.BoxGeometry(140, 4, 18), concrete);
    quay.position.set(0, 5, -26);

    const vessel = new THREE.Mesh(new THREE.BoxGeometry(58, 12, 16), hull);
    vessel.position.set(-58, 9, 19);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 10), trim);
    bridge.position.set(-68, 18, 20);

    const craneBase = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), trim);
    craneBase.position.set(62, 8, -2);
    const craneArm = new THREE.Mesh(new THREE.BoxGeometry(38, 2.8, 3), trim);
    craneArm.position.set(76, 20, -2);
    craneArm.rotation.z = -0.2;

    group.add(pier, quay, vessel, bridge, craneBase, craneArm);
    return group;
  }

  makeGroundTurret() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 12, 8, 12),
      new THREE.MeshStandardMaterial({ color: 0x6f757d, roughness: 0.66, metalness: 0.24 }),
    );
    base.position.y = 4;
    const turret = new THREE.Mesh(
      new THREE.BoxGeometry(18, 8, 13),
      new THREE.MeshStandardMaterial({ color: 0x818894, roughness: 0.54, metalness: 0.31 }),
    );
    turret.position.y = 10;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.4, 15, 10),
      new THREE.MeshStandardMaterial({ color: 0x3c434a, roughness: 0.42, metalness: 0.44 }),
    );
    barrel.position.set(9, 11.2, 0);
    barrel.rotation.z = Math.PI / 2;

    group.add(base, turret, barrel);
    return group;
  }

  makeSamBattery() {
    const group = new THREE.Group();
    const launcherMat = new THREE.MeshStandardMaterial({ color: 0x8d949d, roughness: 0.45, metalness: 0.4 });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 9, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0x676f78, roughness: 0.66, metalness: 0.26 }),
    );
    base.position.y = 3;

    const rack = new THREE.Mesh(new THREE.BoxGeometry(11, 4, 8), launcherMat);
    rack.position.y = 8;

    const missileGeo = new THREE.CylinderGeometry(0.9, 0.9, 11, 8);
    const missileL = new THREE.Mesh(missileGeo, launcherMat);
    missileL.position.set(0, 12.8, -2.1);
    missileL.rotation.z = -0.35;
    const missileR = missileL.clone();
    missileR.position.z = 2.1;

    group.add(base, rack, missileL, missileR);
    return group;
  }

  makeFighter() {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x505863, metalness: 0.7, roughness: 0.34 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.15, 15.2, 16), bodyMat);
    body.rotation.z = Math.PI / 2;

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.58, 4.4, 16),
      new THREE.MeshStandardMaterial({ color: 0x7a838e, metalness: 0.68, roughness: 0.32 }),
    );
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 9.7;

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      new THREE.MeshStandardMaterial({ color: 0x89b2d6, transparent: true, opacity: 0.58, metalness: 0.44, roughness: 0.12 }),
    );
    canopy.scale.set(1.6, 0.54, 0.8);
    canopy.position.set(2.45, 0.88, 0);

    const wingMat = new THREE.MeshStandardMaterial({ color: 0x3c434d, metalness: 0.52, roughness: 0.5 });
    const wingRoot = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 2.3), wingMat);
    wingRoot.position.set(0, 0.04, 0);

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.1, 2.0), wingMat);
    wingL.position.set(-1.1, 0.04, -2.35);
    wingL.rotation.y = 0.48;
    wingL.rotation.z = -0.04;
    const wingR = wingL.clone();
    wingR.position.z = 2.35;
    wingR.rotation.y = -0.48;
    wingR.rotation.z = 0.04;

    const mainWingL = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.13, 1.7), wingMat);
    mainWingL.position.set(-0.6, 0.08, -3.35);
    mainWingL.rotation.y = 0.78;
    const mainWingR = mainWingL.clone();
    mainWingR.position.z = 3.35;
    mainWingR.rotation.y = -0.78;

    const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.34), wingMat);
    wingTipL.position.set(2.6, 0.03, -4.1);
    wingTipL.rotation.y = 0.18;
    const wingTipR = wingTipL.clone();
    wingTipR.position.z = 4.1;
    wingTipR.rotation.y = -0.18;

    const canardL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.55), wingMat);
    canardL.position.set(4.35, 0.3, -0.74);
    canardL.rotation.x = 0.18;
    const canardR = canardL.clone();
    canardR.position.z = 0.74;
    canardR.rotation.x = -0.16;

    const tailWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.2), wingMat);
    tailWing.position.set(-6.3, 0.34, 0);

    const vTailL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 0.09), wingMat);
    vTailL.position.set(-6.65, 1.46, -0.54);
    vTailL.rotation.x = 0.62;

    const vTailR = vTailL.clone();
    vTailR.position.z = 0.54;
    vTailR.rotation.x = -0.62;

    const engineMat = new THREE.MeshStandardMaterial({ color: 0x252c33, metalness: 0.56, roughness: 0.54 });
    const engineL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 2.6, 12), engineMat);
    engineL.rotation.z = Math.PI / 2;
    engineL.position.set(-5.15, -0.24, -0.62);
    const engineR = engineL.clone();
    engineR.position.z = 0.62;

    const intakeL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 1.2, 10), engineMat);
    intakeL.rotation.z = Math.PI / 2;
    intakeL.position.set(-0.7, -0.3, -0.96);
    const intakeR = intakeL.clone();
    intakeR.position.z = 0.96;

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(9.8, 0.02, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x1f242b, metalness: 0.2, roughness: 0.7 }),
    );
    stripe.position.set(1.6, 0.62, 0);

    group.add(
      body,
      nose,
      canopy,
      wingRoot,
      wingL,
      wingR,
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
    group.scale.setScalar(1.5);
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
