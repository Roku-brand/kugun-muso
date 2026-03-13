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
    if (stage === 'totalWar') this.createTotalWarBattle();
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

  scalePoint([x, y, z], scaleXZ, scaleY = 1) {
    return [x * scaleXZ, y * scaleY, z * scaleXZ];
  }

  scaleFleetSpecs(fleetSpecs, scaleXZ) {
    return fleetSpecs.map((spec) => ({
      ...spec,
      x: spec.x * scaleXZ,
      z: spec.z * scaleXZ,
    }));
  }

  createAirBattle() {
    const areaScale = 1.35;
    this.createSkyCommon();
    const sea = new THREE.Mesh(
      new THREE.CircleGeometry(6000 * areaScale, 96),
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
    ].map((point) => this.scalePoint(point, areaScale, 1.06));

    const spreadTargets = [
      [-620, 340, -520],
      [-500, 400, -920],
      [-180, 280, -460],
      [120, 420, -540],
      [360, 290, -700],
      [620, 380, -920],
      [-540, 440, -1220],
      [560, 310, -1180],
    ].map((point) => this.scalePoint(point, areaScale, 1.06));

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
    const areaScale = 1.45;
    this.createSkyCommon();
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(8000 * areaScale, 8000 * areaScale, 50, 50),
      new THREE.MeshStandardMaterial({ color: 0x0d3452, metalness: 0.3, roughness: 0.6 }),
    );
    sea.rotation.x = -Math.PI / 2;
    this.scene.add(sea);
    this.stageObjects.push(sea);

    const fleetSpecs = this.scaleFleetSpecs([
      { role: 'destroyer', x: -360, z: -360, health: 2, speed: 13, radius: 26 },
      { role: 'frigate', x: -130, z: -530, health: 2, speed: 12, radius: 24 },
      { role: 'carrier', x: 160, z: -680, health: 4, speed: 8, radius: 42 },
      { role: 'cruiser', x: 360, z: -860, health: 3, speed: 10, radius: 32 },
      { role: 'destroyer', x: -260, z: -1030, health: 2, speed: 12, radius: 26 },
      { role: 'frigate', x: 90, z: -1210, health: 2, speed: 11, radius: 24 },
      { role: 'carrier', x: -420, z: -1380, health: 4, speed: 7, radius: 42 },
      { role: 'cruiser', x: 300, z: -1540, health: 3, speed: 9, radius: 32 },
    ], areaScale);

    fleetSpecs.forEach((spec, index) => {
      const ship = this.makeShip(spec.role);
      ship.position.set(spec.x, 6, spec.z);
      ship.rotation.y = (Math.sin(index * 1.3) * 0.08);
      this.scene.add(ship);
      this.enemies.push(new Enemy({ type: 'ship', mesh: ship, health: spec.health, speed: spec.speed }));
      this.targets.push({ mesh: ship, radius: spec.radius, type: spec.role });
    });
  }



  createTotalWarBattle() {
    const areaScale = 1.3;
    this.createSkyCommon();

    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(12000 * areaScale, 12000 * areaScale, 80, 80),
      new THREE.MeshStandardMaterial({ color: 0x0b2f4a, metalness: 0.32, roughness: 0.58 }),
    );
    sea.rotation.x = -Math.PI / 2;
    this.scene.add(sea);
    this.stageObjects.push(sea);

    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(380 * areaScale, 460 * areaScale, 46, 36),
      new THREE.MeshStandardMaterial({ color: 0x425f3d, roughness: 0.88, metalness: 0.08 }),
    );
    island.position.set(0, 23, -1180 * areaScale);
    this.scene.add(island);
    this.stageObjects.push(island);

    const harborRing = this.makeHarborRing();
    harborRing.position.set(0, 24, -1180 * areaScale);
    this.scene.add(harborRing);
    this.stageObjects.push(harborRing);

    const fortress = this.makeFortressComplex();
    fortress.position.set(0, 66, -1180 * areaScale);
    this.scene.add(fortress);
    this.stageObjects.push(fortress);

    const reinforcedWalls = this.makeReinforcedWallRing();
    reinforcedWalls.position.set(0, 67, -1180 * areaScale);
    this.scene.add(reinforcedWalls);
    this.stageObjects.push(reinforcedWalls);

    const fortressVanguard = this.makeFortressVanguardHarbor();
    fortressVanguard.position.set(0, 54, -1060 * areaScale);
    this.scene.add(fortressVanguard);
    this.stageObjects.push(fortressVanguard);

    const rearRunway = this.makeRearWingRunwayComplex();
    rearRunway.position.set(0, 56, -1310 * areaScale);
    this.scene.add(rearRunway);
    this.enemies.push(new Enemy({ type: 'turret', mesh: rearRunway, health: 7, canFire: false }));
    this.targets.push({
      mesh: rearRunway,
      radius: 265,
      type: 'building',
      objective: 'runwaySpawner',
      collisionHalfExtents: { x: 300, y: 30, z: 95 },
    });

    const hq = this.makeHeadquarters();
    hq.position.set(0, 74, -1240 * areaScale);
    hq.scale.setScalar(1.35);
    this.scene.add(hq);
    this.enemies.push(new Enemy({ type: 'turret', mesh: hq, health: 16 }));
    this.targets.push({ mesh: hq, radius: 56, type: 'building', objective: 'hq' });

    const port = this.makeMegaPortFacility();
    port.position.set(-240 * areaScale, 52, -1090 * areaScale);
    this.scene.add(port);
    this.enemies.push(new Enemy({ type: 'turret', mesh: port, health: 5, canFire: false }));
    this.targets.push({
      mesh: port,
      radius: 180,
      type: 'building',
      objective: 'portSpawner',
      collisionHalfExtents: { x: 165, y: 34, z: 80 },
    });

    const runway = this.makeAirfieldRunway();
    runway.position.set(132 * areaScale, 49, -1110 * areaScale);
    this.scene.add(runway);
    this.enemies.push(new Enemy({ type: 'turret', mesh: runway, health: 5, canFire: false }));
    this.targets.push({
      mesh: runway,
      radius: 210,
      type: 'building',
      objective: 'runwaySpawner',
      collisionHalfExtents: { x: 230, y: 26, z: 70 },
    });

    const airportSupport = this.makeAirportSupportFacilities();
    airportSupport.position.set(180 * areaScale, 50, -1210 * areaScale);
    this.scene.add(airportSupport);
    this.enemies.push(new Enemy({ type: 'turret', mesh: airportSupport, health: 6, canFire: false }));
    this.targets.push({
      mesh: airportSupport,
      radius: 170,
      type: 'building',
      objective: 'runwaySpawner',
      collisionHalfExtents: { x: 150, y: 34, z: 110 },
    });

    const defensePositions = [
      [-220, 64, -1190],
      [-130, 64, -1320],
      [130, 64, -1325],
      [230, 64, -1190],
      [-40, 64, -1360],
      [50, 64, -980],
      [-280, 65, -1240],
      [-180, 65, -980],
      [185, 65, -980],
      [285, 65, -1240],
      [-20, 65, -1460],
      [30, 65, -900],
    ].map((point) => this.scalePoint(point, areaScale));

    defensePositions.forEach((pos) => {
      const turret = this.makeGroundTurret();
      turret.position.set(...pos);
      this.scene.add(turret);
      this.enemies.push(new Enemy({ type: 'turret', mesh: turret, health: 2 }));
      this.targets.push({ mesh: turret, radius: 14, type: 'building' });
    });

    const samPositions = [
      [-210, 66, -1040],
      [-140, 66, -980],
      [120, 66, -980],
      [220, 66, -1040],
      [-100, 66, -1360],
      [110, 66, -1360],
      [-250, 66, -1140],
      [250, 66, -1140],
      [-150, 66, -1420],
      [155, 66, -1420],
    ].map((point) => this.scalePoint(point, areaScale));

    samPositions.forEach((pos) => {
      const sam = this.makeSamBattery();
      sam.position.set(...pos);
      this.scene.add(sam);
      this.enemies.push(new Enemy({ type: 'turret', mesh: sam, health: 1 }));
      this.targets.push({ mesh: sam, radius: 11, type: 'building' });
    });

    const guardTowerPositions = [
      [-310, 68, -1060],
      [320, 68, -1060],
      [-310, 68, -1320],
      [320, 68, -1320],
    ].map((point) => this.scalePoint(point, areaScale));

    guardTowerPositions.forEach((pos) => {
      const tower = this.makeWatchTower();
      tower.position.set(...pos);
      tower.scale.setScalar(1.08);
      this.scene.add(tower);
      this.enemies.push(new Enemy({ type: 'turret', mesh: tower, health: 3 }));
      this.targets.push({ mesh: tower, radius: 18, type: 'building' });
    });

    const fleetSpecs = this.scaleFleetSpecs([
      { role: 'carrier', x: -520, z: -960, health: 5, speed: 8, radius: 48 },
      { role: 'cruiser', x: -700, z: -1160, health: 3, speed: 10, radius: 34 },
      { role: 'destroyer', x: -520, z: -1360, health: 2, speed: 13, radius: 26 },
      { role: 'carrier', x: 520, z: -980, health: 5, speed: 8, radius: 48 },
      { role: 'cruiser', x: 680, z: -1180, health: 3, speed: 10, radius: 34 },
      { role: 'destroyer', x: 500, z: -1380, health: 2, speed: 13, radius: 26 },
      { role: 'frigate', x: 0, z: -1600, health: 2, speed: 12, radius: 24 },
      { role: 'cruiser', x: 0, z: -820, health: 3, speed: 9, radius: 34 },
    ], areaScale);

    fleetSpecs.forEach((spec, index) => {
      const ship = this.makeShip(spec.role);
      ship.position.set(spec.x, 6, spec.z);
      ship.rotation.y = Math.sin(index * 1.5) * 0.12;
      this.scene.add(ship);
      this.enemies.push(new Enemy({ type: 'ship', mesh: ship, health: spec.health, speed: spec.speed }));
      this.targets.push({ mesh: ship, radius: spec.radius, type: spec.role });
    });

    const playerStart = new THREE.Vector3(0, 220, 120);
    const fighterSpawns = [
      [-760, 320, -1700],
      [-610, 370, -1500],
      [-450, 340, -1870],
      [-260, 390, -1600],
      [-80, 350, -1760],
      [120, 400, -1660],
      [280, 330, -1820],
      [460, 360, -1530],
      [620, 310, -1680],
      [780, 350, -1860],
      [-340, 420, -1450],
      [350, 420, -1430],
    ].map((point) => this.scalePoint(point, areaScale, 1.05));

    fighterSpawns.forEach((spawn, index) => {
      const mesh = this.makeFighter();
      mesh.position.set(...spawn);
      mesh.lookAt(playerStart);
      this.scene.add(mesh);
      const spreadPoint = new THREE.Vector3(
        spawn[0] * 0.48,
        280 + (index % 4) * 40,
        (-1020 - (index % 5) * 120) * areaScale,
      );
      this.enemies.push(new Enemy({
        type: 'fighter',
        mesh,
        health: 1,
        speed: 78 + Math.random() * 20,
        behavior: {
          engageTime: 3.8 + index * 0.22,
          spreadWeight: 0.72 + (index % 3) * 0.08,
          spreadPoint,
          preferredRange: 300 + (index % 4) * 24,
          rangeTolerance: 90,
        },
      }));
    });
  }
  createBaseBattle() {
    const areaScale = 1.35;
    this.createSkyCommon();
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(9000 * areaScale, 9000 * areaScale),
      new THREE.MeshStandardMaterial({ color: 0x103b58 }),
    );
    sea.rotation.x = -Math.PI / 2;
    this.scene.add(sea);
    this.stageObjects.push(sea);

    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(220 * areaScale, 300 * areaScale, 70, 24),
      new THREE.MeshStandardMaterial({ color: 0x3f5a3a }),
    );
    island.position.set(0, 35, -900 * areaScale);
    this.scene.add(island);
    this.stageObjects.push(island);
    const hq = this.makeHeadquarters();
    hq.position.set(0, 82, -930 * areaScale);
    this.scene.add(hq);
    this.enemies.push(new Enemy({ type: 'turret', mesh: hq, health: 4 }));
    this.targets.push({ mesh: hq, radius: 42, type: 'building' });

    const port = this.makePortFacility();
    port.position.set(0, 70, -790 * areaScale);
    this.scene.add(port);
    this.targets.push({
      mesh: port,
      radius: 130,
      type: 'building',
      collisionHalfExtents: { x: 116, y: 26, z: 46 },
    });

    const towerPositions = [
      [-155, 74, -855],
      [160, 74, -870],
      [-145, 74, -1020],
      [150, 74, -1015],
    ].map((point) => this.scalePoint(point, areaScale));

    towerPositions.forEach((pos) => {
      const tower = this.makeWatchTower();
      tower.position.set(...pos);
      this.scene.add(tower);
      this.enemies.push(new Enemy({ type: 'turret', mesh: tower, health: 2 }));
      this.targets.push({ mesh: tower, radius: 16, type: 'building' });
    });

    for (let i = 0; i < 4; i++) {
      const turret = this.makeGroundTurret();
      turret.position.set((-88 + i * 56) * areaScale, 74, (-925 + (i % 2) * 76) * areaScale);
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
    ].map((point) => this.scalePoint(point, areaScale));

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



  makeFortressComplex() {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x787f87, roughness: 0.72, metalness: 0.18 });
    const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x676f78, roughness: 0.66, metalness: 0.22 });

    const outerWall = new THREE.Mesh(new THREE.BoxGeometry(420, 26, 320), wallMat);
    outerWall.position.y = 13;
    const innerCut = new THREE.Mesh(new THREE.BoxGeometry(340, 28, 240), wallMat);
    innerCut.position.y = 14;
    innerCut.material = new THREE.MeshStandardMaterial({ color: 0x425f3d, roughness: 0.9, metalness: 0.02 });

    const bunkerL = new THREE.Mesh(new THREE.BoxGeometry(64, 24, 52), bunkerMat);
    bunkerL.position.set(-140, 12, 95);
    const bunkerR = bunkerL.clone();
    bunkerR.position.x = 140;
    const center = new THREE.Mesh(new THREE.BoxGeometry(92, 30, 70), bunkerMat);
    center.position.set(0, 15, -70);

    group.add(outerWall, innerCut, bunkerL, bunkerR, center);
    return group;
  }

  makeReinforcedWallRing() {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x656d76, roughness: 0.74, metalness: 0.2 });
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x4f5861, roughness: 0.62, metalness: 0.34 });

    const northWall = new THREE.Mesh(new THREE.BoxGeometry(500, 18, 22), wallMat);
    northWall.position.set(0, 9, -182);
    const southWall = northWall.clone();
    southWall.position.z = 182;

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(22, 18, 350), wallMat);
    westWall.position.set(-260, 9, 0);
    const eastWall = westWall.clone();
    eastWall.position.x = 260;

    const northGate = new THREE.Mesh(new THREE.BoxGeometry(100, 16, 18), gateMat);
    northGate.position.set(0, 8, -182);
    const southGate = northGate.clone();
    southGate.position.z = 182;

    const hedgeMounds = [
      [-165, 6, -138],
      [165, 6, -138],
      [-165, 6, 138],
      [165, 6, 138],
      [0, 6, -120],
      [0, 6, 120],
    ];

    hedgeMounds.forEach(([x, y, z]) => {
      const mound = new THREE.Mesh(
        new THREE.CylinderGeometry(20, 25, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x4a6542, roughness: 0.9, metalness: 0.04 }),
      );
      mound.position.set(x, y, z);
      group.add(mound);
    });

    group.add(northWall, southWall, westWall, eastWall, northGate, southGate);
    return group;
  }

  makeMegaPortFacility() {
    const group = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x6f7882, roughness: 0.76, metalness: 0.12 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8e99a3, roughness: 0.52, metalness: 0.36 });
    const hull = new THREE.MeshStandardMaterial({ color: 0x2f3c48, roughness: 0.48, metalness: 0.45 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xa7b0b8, roughness: 0.5, metalness: 0.32 });
    const containerColors = [0xb2583f, 0x496aa3, 0x7b8f55, 0x8a5b95, 0x6d757d];

    const mainPier = new THREE.Mesh(new THREE.BoxGeometry(320, 8, 52), concrete);
    mainPier.position.y = 4;
    const sidePier = new THREE.Mesh(new THREE.BoxGeometry(150, 6, 26), concrete);
    sidePier.position.set(-105, 7, -34);

    const dockedShip = new THREE.Mesh(new THREE.BoxGeometry(108, 14, 24), hull);
    dockedShip.position.set(62, 10, 18);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(8, 16, 6), hull);
    bow.rotation.z = Math.PI / 2;
    bow.scale.set(1, 0.88, 1.5);
    bow.position.set(116, 10, 18);
    const sternDeck = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 22), trim);
    sternDeck.position.set(14, 17, 18);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 16), trim);
    bridge.position.set(28, 24, 18);

    const craneBase = new THREE.Mesh(new THREE.BoxGeometry(18, 14, 18), steel);
    craneBase.position.set(-120, 10, 2);
    const craneArm = new THREE.Mesh(new THREE.BoxGeometry(72, 3.2, 4), steel);
    craneArm.position.set(-90, 30, 2);
    craneArm.rotation.z = -0.28;

    const craneCabin = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 7), trim);
    craneCabin.position.set(-110, 24, 1);
    const craneHookCable = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 20, 8), steel);
    craneHookCable.position.set(-62, 19, 2);
    const craneHook = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), trim);
    craneHook.position.set(-62, 9, 2);

    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const container = new THREE.Mesh(
          new THREE.BoxGeometry(16, 6, 6),
          new THREE.MeshStandardMaterial({
            color: containerColors[(row * 5 + col) % containerColors.length],
            roughness: 0.62,
            metalness: 0.26,
          }),
        );
        container.position.set(-10 + col * 20, 11 + row * 6.2, -12);
        group.add(container);
      }
    }

    const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 14, 18), concrete);
    fuelTank.rotation.z = Math.PI / 2;
    fuelTank.position.set(-138, 12, -24);
    const serviceRoad = new THREE.Mesh(new THREE.BoxGeometry(300, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.8, metalness: 0.08 }));
    serviceRoad.position.set(0, 8.4, -25);

    group.add(
      mainPier,
      sidePier,
      dockedShip,
      bow,
      sternDeck,
      bridge,
      craneBase,
      craneArm,
      craneCabin,
      craneHookCable,
      craneHook,
      fuelTank,
      serviceRoad,
    );
    return group;
  }


  makeHarborRing() {
    const group = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x7a838c, roughness: 0.74, metalness: 0.14 });
    const deck = new THREE.MeshStandardMaterial({ color: 0x8d969f, roughness: 0.62, metalness: 0.2 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x6c757e, roughness: 0.5, metalness: 0.42 });

    const segments = [
      { w: 500, d: 34, x: 0, z: -274 },
      { w: 500, d: 34, x: 0, z: 274 },
      { w: 34, d: 500, x: -274, z: 0 },
      { w: 34, d: 500, x: 274, z: 0 },
    ];

    segments.forEach(({ w, d, x, z }) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 16, d), concrete);
      wall.position.set(x, 8, z);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 3, d * 0.94), deck);
      cap.position.set(x, 16, z);
      group.add(wall, cap);
    });

    for (let i = 0; i < 8; i += 1) {
      const craneBase = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), steel);
      craneBase.position.set(-210 + i * 60, 21, -276);
      const craneArm = new THREE.Mesh(new THREE.BoxGeometry(26, 2.5, 3), steel);
      craneArm.position.set(-200 + i * 60, 27, -276);
      craneArm.rotation.z = -0.22;
      group.add(craneBase, craneArm);
    }

    return group;
  }

  makeAirportSupportFacilities() {
    const group = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x7a828c, roughness: 0.72, metalness: 0.18 });
    const wall = new THREE.MeshStandardMaterial({ color: 0x666f79, roughness: 0.62, metalness: 0.22 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x96b2c9, roughness: 0.18, metalness: 0.3, transparent: true, opacity: 0.75 });

    const warehouseA = new THREE.Mesh(new THREE.BoxGeometry(96, 24, 44), concrete);
    warehouseA.position.set(-35, 12, 0);
    const warehouseB = new THREE.Mesh(new THREE.BoxGeometry(84, 22, 38), concrete);
    warehouseB.position.set(54, 11, -12);

    const controlBase = new THREE.Mesh(new THREE.CylinderGeometry(12, 14, 26, 16), wall);
    controlBase.position.set(88, 13, 48);
    const controlCabin = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 10, 16), wall);
    controlCabin.position.set(88, 31, 48);
    const controlGlass = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 9.4, 4.6, 16), glass);
    controlGlass.position.set(88, 36, 48);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 10, 10), wall);
    antenna.position.set(88, 43, 48);

    const apron = new THREE.Mesh(new THREE.BoxGeometry(230, 1.5, 120), new THREE.MeshStandardMaterial({ color: 0x4b5057, roughness: 0.84, metalness: 0.08 }));
    apron.position.set(30, 0.8, 22);

    group.add(
      apron,
      warehouseA,
      warehouseB,
      controlBase,
      controlCabin,
      controlGlass,
      antenna,
    );
    return group;
  }

  makeAirfieldRunway() {
    const group = new THREE.Group();
    const tarmac = new THREE.MeshStandardMaterial({ color: 0x3b4047, roughness: 0.82, metalness: 0.1 });
    const paint = new THREE.MeshStandardMaterial({ color: 0xd7d9dc, roughness: 0.36, metalness: 0.18 });
    const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xe8c85f, roughness: 0.44, metalness: 0.14 });
    const concrete = new THREE.MeshStandardMaterial({ color: 0x747b84, roughness: 0.7, metalness: 0.16 });

    const runway = new THREE.Mesh(new THREE.BoxGeometry(360, 2.8, 92), tarmac);
    runway.position.y = 1.4;
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(372, 1.6, 112), concrete);
    shoulder.position.y = 0.8;

    for (let i = -8; i <= 8; i += 1) {
      if (i === 0) continue;
      const centerlineDash = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 2.2), paint);
      centerlineDash.position.set(i * 18, 2.95, 0);
      group.add(centerlineDash);
    }

    for (let i = 0; i < 4; i += 1) {
      const leftThreshold = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 2), paint);
      leftThreshold.position.set(-157 + i * 5.2, 2.95, -18 + i * 12);
      const rightThreshold = leftThreshold.clone();
      rightThreshold.position.x = 157 - i * 5.2;
      group.add(leftThreshold, rightThreshold);
    }

    for (let i = -7; i <= 7; i += 1) {
      if (Math.abs(i) < 2) continue;
      const edgeLightL = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshStandardMaterial({ color: 0x9dd7ff, emissive: 0x2f5f8b, emissiveIntensity: 0.8 }));
      edgeLightL.position.set(i * 22, 3.3, -43);
      const edgeLightR = edgeLightL.clone();
      edgeLightR.position.z = 43;
      group.add(edgeLightL, edgeLightR);
    }

    const taxiway = new THREE.Mesh(new THREE.BoxGeometry(130, 1.4, 26), tarmac);
    taxiway.position.set(-106, 1.1, -57);
    const taxiLine = new THREE.Mesh(new THREE.BoxGeometry(122, 0.24, 1.4), yellowPaint);
    taxiLine.position.set(-106, 2.0, -57);
    const blastPad = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 88), concrete);
    blastPad.position.set(176, 2.0, 0);

    const hangarL = new THREE.Mesh(new THREE.BoxGeometry(58, 18, 30), new THREE.MeshStandardMaterial({ color: 0x6d737c, roughness: 0.66, metalness: 0.2 }));
    hangarL.position.set(-118, 9, -42);
    const hangarR = hangarL.clone();
    hangarR.position.x = 116;

    const shelterL = new THREE.Mesh(new THREE.BoxGeometry(28, 9, 16), concrete);
    shelterL.position.set(-156, 4.5, 39);
    const shelterR = shelterL.clone();
    shelterR.position.x = 156;

    const parkedJet = this.makeFighter();
    parkedJet.scale.setScalar(1.08);
    parkedJet.rotation.y = Math.PI;
    parkedJet.position.set(-88, 5.5, -56);

    const parkedJet2 = this.makeFighter();
    parkedJet2.scale.setScalar(1.04);
    parkedJet2.rotation.y = Math.PI * 0.92;
    parkedJet2.position.set(-128, 5.4, -56);

    group.add(
      shoulder,
      runway,
      taxiway,
      taxiLine,
      blastPad,
      hangarL,
      hangarR,
      shelterL,
      shelterR,
      parkedJet,
      parkedJet2,
    );
    return group;
  }

  makeFortressVanguardHarbor() {
    const group = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x7f8790, roughness: 0.72, metalness: 0.14 });
    const dockTop = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.62, metalness: 0.2 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x666f78, roughness: 0.48, metalness: 0.4 });

    const basin = new THREE.Mesh(new THREE.BoxGeometry(480, 14, 160), concrete);
    basin.position.set(0, 0, 0);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(450, 3.2, 128), dockTop);
    quay.position.set(0, 8.6, 0);

    const leftBreakwater = new THREE.Mesh(new THREE.BoxGeometry(38, 18, 210), concrete);
    leftBreakwater.position.set(-210, 3, 0);
    const rightBreakwater = leftBreakwater.clone();
    rightBreakwater.position.x = 210;

    const centerBunker = new THREE.Mesh(new THREE.BoxGeometry(124, 16, 34), concrete);
    centerBunker.position.set(0, 11, 38);

    for (let i = -4; i <= 4; i += 1) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 5, 10), steel);
      bollard.position.set(i * 48, 11.5, -55);
      group.add(bollard);
    }

    group.add(basin, quay, leftBreakwater, rightBreakwater, centerBunker);
    return group;
  }

  makeRearWingRunwayComplex() {
    const group = new THREE.Group();
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x3b4047, roughness: 0.82, metalness: 0.1 });
    const concrete = new THREE.MeshStandardMaterial({ color: 0x747b84, roughness: 0.7, metalness: 0.16 });
    const marking = new THREE.MeshStandardMaterial({ color: 0xe3e6e9, roughness: 0.38, metalness: 0.18 });

    const runwayBase = new THREE.Mesh(new THREE.BoxGeometry(620, 3.2, 96), asphalt);
    runwayBase.position.y = 1.6;
    const runwayShoulder = new THREE.Mesh(new THREE.BoxGeometry(650, 1.6, 128), concrete);
    runwayShoulder.position.y = 0.8;

    for (let i = -13; i <= 13; i += 1) {
      if (i === 0) continue;
      const dash = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 2.1), marking);
      dash.position.set(i * 22, 3.35, 0);
      group.add(dash);
    }

    const wingPadLeft = new THREE.Mesh(new THREE.BoxGeometry(188, 1.2, 66), concrete);
    wingPadLeft.position.set(-210, 1.1, -86);
    const wingPadRight = wingPadLeft.clone();
    wingPadRight.position.x = 210;

    const rearHangarL = new THREE.Mesh(new THREE.BoxGeometry(70, 18, 28), concrete);
    rearHangarL.position.set(-250, 10, 86);
    const rearHangarR = rearHangarL.clone();
    rearHangarR.position.x = 250;

    group.add(runwayShoulder, runwayBase, wingPadLeft, wingPadRight, rearHangarL, rearHangarR);
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

  makeShip(role = 'destroyer') {
    const group = new THREE.Group();

    const hullMat = new THREE.MeshStandardMaterial({ color: 0x56606b, metalness: 0.3, roughness: 0.66 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x79838d, metalness: 0.2, roughness: 0.72 });
    const superMat = new THREE.MeshStandardMaterial({ color: 0x98a3ad, metalness: 0.28, roughness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x323941, metalness: 0.35, roughness: 0.56 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x7ea6c4, metalness: 0.45, roughness: 0.15 });

    if (role === 'carrier') {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(42, 10, 124), hullMat);
      hull.position.y = 2;
      const bow = new THREE.Mesh(new THREE.ConeGeometry(12, 18, 5), hullMat);
      bow.rotation.x = Math.PI / 2;
      bow.rotation.y = Math.PI;
      bow.position.set(0, 2, -70);

      const flightDeck = new THREE.Mesh(new THREE.BoxGeometry(46, 2.4, 136), deckMat);
      flightDeck.position.y = 8;
      const runwayStripe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 112), new THREE.MeshStandardMaterial({ color: 0xe7e9eb }));
      runwayStripe.position.set(0, 9.4, -2);

      const island = new THREE.Mesh(new THREE.BoxGeometry(11, 17, 20), superMat);
      island.position.set(12, 17, 16);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 13), superMat);
      bridge.position.set(14, 24, 15);
      const windows = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.1, 13.4), glassMat);
      windows.position.set(14, 24.6, 15);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 13, 8), darkMat);
      mast.position.set(14.5, 31, 14);

      for (let i = 0; i < 3; i++) {
        const ciws = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 1.6, 10), darkMat);
        ciws.position.set((i - 1) * 13, 9.8, 50 - i * 38);
        group.add(ciws);
      }

      group.add(hull, bow, flightDeck, runwayStripe, island, bridge, windows, mast);
      return group;
    }

    const hullLength = role === 'cruiser' ? 94 : role === 'frigate' ? 78 : 84;
    const hullWidth = role === 'frigate' ? 19 : 22;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(hullWidth, 8.5, hullLength), hullMat);
    hull.position.y = 1.5;

    const bow = new THREE.Mesh(new THREE.ConeGeometry(hullWidth * 0.28, 13, 6), hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI;
    bow.position.set(0, 1.6, -hullLength * 0.52);

    const sternDeck = new THREE.Mesh(new THREE.BoxGeometry(hullWidth - 3, 1.8, 20), deckMat);
    sternDeck.position.set(0, 6.2, hullLength * 0.24);
    const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(hullWidth - 2, 1.7, hullLength - 14), deckMat);
    mainDeck.position.set(0, 6.1, -2);

    const bridgeBase = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 14), superMat);
    bridgeBase.position.set(0, 10.8, -10);
    const bridgeTop = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 10), superMat);
    bridgeTop.position.set(0, 16.5, -9);
    const bridgeWindows = new THREE.Mesh(new THREE.BoxGeometry(9.2, 1.7, 10.2), glassMat);
    bridgeWindows.position.set(0, 17.3, -8.8);

    const funnel = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 6), darkMat);
    funnel.position.set(0, 13.2, 8);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 11, 8), darkMat);
    mast.position.set(0, 19.4, -2);

    const turretMat = new THREE.MeshStandardMaterial({ color: 0x4f5861, metalness: 0.35, roughness: 0.55 });
    const turretLayout = role === 'cruiser'
      ? [-34, -16, 16, 34]
      : [-28, -12, 18];

    turretLayout.forEach((zPos) => {
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3, 2.2, 12), turretMat);
      turret.position.set(0, 8.3, zPos);
      const gunL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8, 8), darkMat);
      gunL.rotation.x = Math.PI / 2;
      gunL.position.set(-0.8, 8.9, zPos - 4);
      const gunR = gunL.clone();
      gunR.position.x = 0.8;
      group.add(turret, gunL, gunR);
    });

    const aaGunL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.8), darkMat);
    aaGunL.position.set(-hullWidth * 0.35, 8, 2);
    const aaGunR = aaGunL.clone();
    aaGunR.position.x = hullWidth * 0.35;

    group.add(
      hull,
      bow,
      sternDeck,
      mainDeck,
      bridgeBase,
      bridgeTop,
      bridgeWindows,
      funnel,
      mast,
      aaGunL,
      aaGunR,
    );
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
