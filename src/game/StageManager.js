import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { Enemy } from './Enemy.js';

export const ENEMY_DURABILITY = {
  fighter: 24,
  turret: 38,
  fortress: 46,
  headquarters: 120,
  shipByRole: {
    frigate: 58,
    destroyer: 64,
    cruiser: 74,
    carrier: 86,
  },
};

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
    if (stage === 'land') this.createLandBattle();
    if (stage === 'base') this.createBaseBattle();
    if (stage === 'totalWar') this.createTotalWarBattle();
    if (stage === 'ayanishiRecapture') this.createAyanishiRecaptureBattle();
    if (stage === 'hokkaiNavalBattle') this.createHokkaiNavalBattle();
    if (stage === 'easternFront') this.createEasternFrontBattle();
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
        health: ENEMY_DURABILITY.fighter,
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
      { role: 'destroyer', x: -360, z: -360, health: ENEMY_DURABILITY.shipByRole.destroyer, speed: 13, radius: 26 },
      { role: 'frigate', x: -130, z: -530, health: ENEMY_DURABILITY.shipByRole.frigate, speed: 12, radius: 24 },
      { role: 'carrier', x: 160, z: -680, health: ENEMY_DURABILITY.shipByRole.carrier, speed: 8, radius: 42 },
      { role: 'cruiser', x: 360, z: -860, health: ENEMY_DURABILITY.shipByRole.cruiser, speed: 10, radius: 32 },
      { role: 'destroyer', x: -260, z: -1030, health: ENEMY_DURABILITY.shipByRole.destroyer, speed: 12, radius: 26 },
      { role: 'frigate', x: 90, z: -1210, health: ENEMY_DURABILITY.shipByRole.frigate, speed: 11, radius: 24 },
      { role: 'carrier', x: -420, z: -1380, health: ENEMY_DURABILITY.shipByRole.carrier, speed: 7, radius: 42 },
      { role: 'cruiser', x: 300, z: -1540, health: ENEMY_DURABILITY.shipByRole.cruiser, speed: 9, radius: 32 },
    ], areaScale);

    fleetSpecs.forEach((spec, index) => {
      const ship = this.makeShip(spec.role);
      ship.position.set(spec.x, 6, spec.z);
      ship.rotation.y = (Math.sin(index * 1.3) * 0.08);
      this.scene.add(ship);
      this.enemies.push(new Enemy({ type: 'ship', mesh: ship, health: spec.health, speed: spec.speed }));
      this.targets.push({ mesh: ship, radius: spec.radius, collisionVerticalRadius: spec.collisionVerticalRadius, type: spec.role });
    });
  }



  createTotalWarBattle() {
    const areaScale = 1.3;
    const islandTop = 15;
    this.createSkyCommon();

    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(12000 * areaScale, 12000 * areaScale, 80, 80),
      new THREE.MeshStandardMaterial({ color: 0x0b2f4a, metalness: 0.32, roughness: 0.58 }),
    );
    sea.rotation.x = -Math.PI / 2;
    this.scene.add(sea);
    this.stageObjects.push(sea);

    const islandCore = this.createFortifiedIslandTerrain({
      x: 0,
      z: -1180 * areaScale,
      areaScale,
      radiusX: 420,
      radiusZ: 320,
      height: islandTop,
      seed: 17,
      shorelineTilt: 0.16,
    });
    this.stageObjects.push(...islandCore);
    this.addIslandCollisionTarget({
      x: 0,
      z: -1180 * areaScale,
      areaScale,
      radiusX: 420,
      radiusZ: 320,
      height: islandTop,
    });

    const fortress = this.makeFortressComplex();
    fortress.position.set(0, islandTop, -1180 * areaScale);
    this.scene.add(fortress);
    this.stageObjects.push(fortress);

    const reinforcedWalls = this.makeReinforcedWallRing();
    reinforcedWalls.position.set(0, islandTop + 1, -1180 * areaScale);
    this.scene.add(reinforcedWalls);
    this.stageObjects.push(reinforcedWalls);

    const fortressVanguard = this.makeFortressVanguardHarbor();
    fortressVanguard.position.set(0, islandTop + 1, -1060 * areaScale);
    this.scene.add(fortressVanguard);
    this.stageObjects.push(fortressVanguard);

    const rearRunway = this.makeRearWingRunwayComplex();
    rearRunway.position.set(220 * areaScale, islandTop + 1, -1310 * areaScale);
    this.scene.add(rearRunway);
    this.enemies.push(new Enemy({ type: 'turret', mesh: rearRunway, health: ENEMY_DURABILITY.fortress, canFire: false }));
    this.targets.push({
      mesh: rearRunway,
      radius: 265,
      type: 'building',
      objective: 'runwaySpawner',
      collisionHalfExtents: { x: 300, y: 30, z: 95 },
    });

    const hq = this.makeHeadquarters();
    hq.position.set(0, islandTop + 10, -1240 * areaScale);
    hq.scale.setScalar(1.35);
    this.scene.add(hq);
    this.enemies.push(new Enemy({ type: 'turret', mesh: hq, health: ENEMY_DURABILITY.headquarters }));
    this.targets.push({ mesh: hq, radius: 56, collisionVerticalRadius: 30, type: 'building', objective: 'hq' });

    const port = this.makeMegaPortFacility();
    port.position.set(-240 * areaScale, islandTop + 1, -1090 * areaScale);
    this.scene.add(port);
    this.enemies.push(new Enemy({ type: 'turret', mesh: port, health: ENEMY_DURABILITY.fortress, canFire: false }));
    this.targets.push({
      mesh: port,
      radius: 180,
      type: 'building',
      objective: 'portSpawner',
      collisionHalfExtents: { x: 165, y: 34, z: 80 },
    });

    const runway = this.makeAirfieldRunway();
    runway.position.set(360 * areaScale, islandTop, -1110 * areaScale);
    this.scene.add(runway);
    this.enemies.push(new Enemy({ type: 'turret', mesh: runway, health: ENEMY_DURABILITY.fortress, canFire: false }));
    this.targets.push({
      mesh: runway,
      radius: 210,
      type: 'building',
      objective: 'runwaySpawner',
      collisionHalfExtents: { x: 230, y: 26, z: 70 },
    });

    const airportSupport = this.makeAirportSupportFacilities();
    airportSupport.position.set(430 * areaScale, islandTop, -1210 * areaScale);
    this.scene.add(airportSupport);
    this.enemies.push(new Enemy({ type: 'turret', mesh: airportSupport, health: ENEMY_DURABILITY.fortress, canFire: false }));
    this.targets.push({
      mesh: airportSupport,
      radius: 170,
      type: 'building',
      objective: 'runwaySpawner',
      collisionHalfExtents: { x: 150, y: 34, z: 110 },
    });

    const defensePositions = [
      [-220, islandTop + 1, -1190],
      [-130, islandTop + 1, -1320],
      [130, islandTop + 1, -1325],
      [230, islandTop + 1, -1190],
      [-40, islandTop + 1, -1360],
      [50, islandTop + 1, -980],
      [-280, islandTop + 2, -1240],
      [-180, islandTop + 2, -980],
      [185, islandTop + 2, -980],
      [285, islandTop + 2, -1240],
      [-20, islandTop + 2, -1460],
      [30, islandTop + 2, -900],
    ].map((point) => this.scalePoint(point, areaScale));

    defensePositions.forEach((pos) => {
      const turret = this.makeGroundTurret();
      turret.position.set(...pos);
      this.scene.add(turret);
      this.enemies.push(new Enemy({ type: 'turret', mesh: turret, health: ENEMY_DURABILITY.turret }));
      this.targets.push({ mesh: turret, radius: 14, collisionVerticalRadius: 10, type: 'building' });
    });

    const samPositions = [
      [-210, islandTop + 3, -1040],
      [-140, islandTop + 3, -980],
      [120, islandTop + 3, -980],
      [220, islandTop + 3, -1040],
      [-100, islandTop + 3, -1360],
      [110, islandTop + 3, -1360],
      [-250, islandTop + 3, -1140],
      [250, islandTop + 3, -1140],
      [-150, islandTop + 3, -1420],
      [155, islandTop + 3, -1420],
    ].map((point) => this.scalePoint(point, areaScale));

    samPositions.forEach((pos) => {
      const sam = this.makeSamBattery();
      sam.position.set(...pos);
      this.scene.add(sam);
      this.enemies.push(new Enemy({ type: 'turret', mesh: sam, health: ENEMY_DURABILITY.turret }));
      this.targets.push({ mesh: sam, radius: 11, collisionVerticalRadius: 8, type: 'building' });
    });

    const guardTowerPositions = [
      [-310, islandTop + 5, -1060],
      [320, islandTop + 5, -1060],
      [-310, islandTop + 5, -1320],
      [320, islandTop + 5, -1320],
    ].map((point) => this.scalePoint(point, areaScale));

    guardTowerPositions.forEach((pos) => {
      const tower = this.makeWatchTower();
      tower.position.set(...pos);
      tower.scale.setScalar(1.08);
      this.scene.add(tower);
      this.enemies.push(new Enemy({ type: 'turret', mesh: tower, health: ENEMY_DURABILITY.turret }));
      this.targets.push({ mesh: tower, radius: 18, collisionVerticalRadius: 24, type: 'building' });
    });

    const fleetSpecs = this.scaleFleetSpecs([
      { role: 'carrier', x: -520, z: -960, health: ENEMY_DURABILITY.shipByRole.carrier, speed: 8, radius: 48, collisionVerticalRadius: 20 },
      { role: 'cruiser', x: -700, z: -1160, health: ENEMY_DURABILITY.shipByRole.cruiser, speed: 10, radius: 34, collisionVerticalRadius: 16 },
      { role: 'destroyer', x: -520, z: -1360, health: ENEMY_DURABILITY.shipByRole.destroyer, speed: 13, radius: 26, collisionVerticalRadius: 14 },
      { role: 'carrier', x: 520, z: -980, health: ENEMY_DURABILITY.shipByRole.carrier, speed: 8, radius: 48, collisionVerticalRadius: 20 },
      { role: 'cruiser', x: 680, z: -1180, health: ENEMY_DURABILITY.shipByRole.cruiser, speed: 10, radius: 34, collisionVerticalRadius: 16 },
      { role: 'destroyer', x: 500, z: -1380, health: ENEMY_DURABILITY.shipByRole.destroyer, speed: 13, radius: 26, collisionVerticalRadius: 14 },
      { role: 'frigate', x: 0, z: -1600, health: ENEMY_DURABILITY.shipByRole.frigate, speed: 12, radius: 24, collisionVerticalRadius: 13 },
      { role: 'cruiser', x: 0, z: -820, health: ENEMY_DURABILITY.shipByRole.cruiser, speed: 9, radius: 34, collisionVerticalRadius: 16 },
    ], areaScale);

    fleetSpecs.forEach((spec, index) => {
      const ship = this.makeShip(spec.role);
      ship.position.set(spec.x, 6, spec.z);
      ship.rotation.y = Math.sin(index * 1.5) * 0.12;
      this.scene.add(ship);
      this.enemies.push(new Enemy({ type: 'ship', mesh: ship, health: spec.health, speed: spec.speed }));
      this.targets.push({ mesh: ship, radius: spec.radius, collisionVerticalRadius: spec.collisionVerticalRadius ?? 16, type: spec.role });
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
        health: ENEMY_DURABILITY.fighter,
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

  createAyanishiRecaptureBattle() {
    const areaScale = 1.3;
    this.createTotalWarBattle();

    const hqTarget = this.targets.find((target) => target.objective === 'hq');
    if (hqTarget?.mesh) {
      hqTarget.mesh.position.x = 230 * areaScale;
      hqTarget.mesh.position.z -= 120 * areaScale;
    }

    const additionalDefensePositions = [
      [-360, 52, -1040],
      [-320, 52, -1180],
      [320, 52, -1180],
      [360, 52, -1040],
      [-240, 52, -900],
      [240, 52, -900],
    ].map((point) => this.scalePoint(point, areaScale));

    additionalDefensePositions.forEach((pos) => {
      const turret = this.makeGroundTurret();
      turret.position.set(...pos);
      this.scene.add(turret);
      this.enemies.push(new Enemy({ type: 'turret', mesh: turret, health: ENEMY_DURABILITY.turret }));
      this.targets.push({ mesh: turret, radius: 14, collisionVerticalRadius: 10, type: 'building' });
    });

    const rapidFleetSpecs = this.scaleFleetSpecs([
      { role: 'destroyer', x: -620, z: -820, health: ENEMY_DURABILITY.shipByRole.destroyer, speed: 14, radius: 26, collisionVerticalRadius: 14 },
      { role: 'frigate', x: 620, z: -810, health: ENEMY_DURABILITY.shipByRole.frigate, speed: 13, radius: 24, collisionVerticalRadius: 13 },
      { role: 'cruiser', x: -820, z: -980, health: ENEMY_DURABILITY.shipByRole.cruiser, speed: 11, radius: 32, collisionVerticalRadius: 16 },
      { role: 'destroyer', x: 820, z: -980, health: ENEMY_DURABILITY.shipByRole.destroyer, speed: 14, radius: 26, collisionVerticalRadius: 14 },
    ], areaScale);

    rapidFleetSpecs.forEach((spec, index) => {
      const ship = this.makeShip(spec.role);
      ship.position.set(spec.x, 6, spec.z);
      ship.rotation.y = Math.PI * 0.9 + (index - 1.5) * 0.07;
      this.scene.add(ship);
      this.enemies.push(new Enemy({ type: 'ship', mesh: ship, health: spec.health, speed: spec.speed }));
      this.targets.push({ mesh: ship, radius: spec.radius, collisionVerticalRadius: spec.collisionVerticalRadius ?? 14, type: spec.role });
    });
  }

  createHokkaiNavalBattle() {
    const areaScale = 1.6;
    this.createSkyCommon();
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(9800 * areaScale, 9800 * areaScale, 64, 64),
      new THREE.MeshStandardMaterial({ color: 0x0a3553, metalness: 0.35, roughness: 0.58 }),
    );
    sea.rotation.x = -Math.PI / 2;
    this.scene.add(sea);
    this.stageObjects.push(sea);

    const enemyFleetSpecs = this.scaleFleetSpecs([
      { role: 'carrier', x: -120, z: -760, health: ENEMY_DURABILITY.shipByRole.carrier, speed: 8.2, radius: 42 },
      { role: 'cruiser', x: -360, z: -840, health: ENEMY_DURABILITY.shipByRole.cruiser, speed: 10.6, radius: 32 },
      { role: 'cruiser', x: 130, z: -900, health: ENEMY_DURABILITY.shipByRole.cruiser, speed: 10.2, radius: 32 },
      { role: 'destroyer', x: 380, z: -980, health: ENEMY_DURABILITY.shipByRole.destroyer, speed: 13.8, radius: 26 },
      { role: 'destroyer', x: -440, z: -1030, health: ENEMY_DURABILITY.shipByRole.destroyer, speed: 13.2, radius: 26 },
      { role: 'frigate', x: -40, z: -1120, health: ENEMY_DURABILITY.shipByRole.frigate, speed: 12.8, radius: 24 },
      { role: 'frigate', x: 280, z: -1200, health: ENEMY_DURABILITY.shipByRole.frigate, speed: 12.4, radius: 24 },
      { role: 'destroyer', x: -250, z: -1290, health: ENEMY_DURABILITY.shipByRole.destroyer, speed: 13.5, radius: 26 },
    ], areaScale);

    enemyFleetSpecs.forEach((spec, index) => {
      const ship = this.makeShip(spec.role);
      ship.position.set(spec.x, 6, spec.z);
      ship.rotation.y = (Math.PI * 0.92) + (index - 3.5) * 0.06;
      this.scene.add(ship);
      this.enemies.push(new Enemy({ type: 'ship', mesh: ship, health: spec.health, speed: spec.speed }));
      this.targets.push({ mesh: ship, radius: spec.radius, type: spec.role });
    });

    const playerStart = new THREE.Vector3(0, 180, 120);
    const enemyAirSpecs = [
      { x: -460, y: 260, z: -1220, speed: 80 },
      { x: -260, y: 310, z: -1160, speed: 86 },
      { x: -80, y: 280, z: -1100, speed: 82 },
      { x: 90, y: 330, z: -1240, speed: 88 },
      { x: 280, y: 290, z: -1180, speed: 84 },
      { x: 440, y: 350, z: -1260, speed: 90 },
      { x: -320, y: 370, z: -1380, speed: 92 },
      { x: 340, y: 390, z: -1420, speed: 94 },
      { x: -160, y: 340, z: -1500, speed: 90 },
      { x: 180, y: 300, z: -1540, speed: 87 },
    ];

    enemyAirSpecs.forEach((spec, index) => {
      const fighter = this.makeFighter();
      const [x, y, z] = this.scalePoint([spec.x, spec.y, spec.z], areaScale, 1.05);
      fighter.position.set(x, y, z);
      fighter.lookAt(playerStart);
      this.scene.add(fighter);

      const spreadPoint = new THREE.Vector3(
        x + (index % 2 === 0 ? -90 : 90),
        y + 30 + (index % 3) * 16,
        z + 190 + (index % 4) * 38,
      );
      this.enemies.push(new Enemy({
        type: 'fighter',
        mesh: fighter,
        health: ENEMY_DURABILITY.fighter,
        speed: spec.speed,
        behavior: {
          engageTime: 2.6 + index * 0.24,
          spreadWeight: 0.7 + (index % 3) * 0.06,
          spreadPoint,
          preferredRange: 265 + (index % 4) * 20,
          rangeTolerance: 90,
        },
      }));
    });
  }

  createEasternFrontBattle() {
    const areaScale = 1.45;
    this.createSkyCommon();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(9600 * areaScale, 9600 * areaScale, 96, 96),
      new THREE.MeshStandardMaterial({ color: 0x596944, roughness: 0.92, metalness: 0.05 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    this.stageObjects.push(ground);

    const frontlineRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(780 * areaScale, 3600 * areaScale),
      new THREE.MeshStandardMaterial({ color: 0x505357, roughness: 0.88, metalness: 0.1 }),
    );
    frontlineRoad.rotation.x = -Math.PI / 2;
    frontlineRoad.position.set(0, 0.38, -380 * areaScale);
    this.scene.add(frontlineRoad);
    this.stageObjects.push(frontlineRoad);

    const allyFortress = this.makeFortressComplex();
    allyFortress.position.set(0, 64, 260);
    allyFortress.rotation.y = Math.PI;
    this.scene.add(allyFortress);
    this.stageObjects.push(allyFortress);
    this.targets.push({
      mesh: allyFortress,
      radius: 96,
      collisionVerticalRadius: 52,
      type: 'building',
      objective: 'allyFortress',
    });

    const allyRampart = this.makeReinforcedWallRing();
    allyRampart.position.set(0, 65, 260);
    allyRampart.rotation.y = Math.PI;
    this.scene.add(allyRampart);
    this.stageObjects.push(allyRampart);
    this.targets.push({
      mesh: allyRampart,
      radius: 160,
      collisionVerticalRadius: 40,
      type: 'building',
      objective: 'allyFortressPerimeter',
    });

    const enemyFortress = this.makeFortressComplex();
    enemyFortress.position.set(0, 68, -1380);
    this.scene.add(enemyFortress);
    this.enemies.push(new Enemy({ type: 'turret', mesh: enemyFortress, health: ENEMY_DURABILITY.headquarters + 24 }));
    this.targets.push({
      mesh: enemyFortress,
      radius: 98,
      collisionVerticalRadius: 55,
      type: 'building',
      objective: 'enemyFortress',
    });

    const enemyRampart = this.makeReinforcedWallRing();
    enemyRampart.position.set(0, 69, -1380);
    this.scene.add(enemyRampart);
    this.enemies.push(new Enemy({ type: 'turret', mesh: enemyRampart, health: ENEMY_DURABILITY.fortress + 24, canFire: false }));
    this.targets.push({
      mesh: enemyRampart,
      radius: 166,
      collisionVerticalRadius: 44,
      type: 'building',
      objective: 'enemyFortress',
    });

    const defensePositions = [
      [-260, 68, -1260],
      [260, 68, -1260],
      [-320, 68, -1440],
      [320, 68, -1440],
      [-120, 68, -1510],
      [120, 68, -1510],
    ];

    defensePositions.forEach((pos) => {
      const turret = this.makeGroundTurret();
      turret.position.set(...pos);
      this.scene.add(turret);
      this.enemies.push(new Enemy({ type: 'turret', mesh: turret, health: ENEMY_DURABILITY.turret }));
      this.targets.push({ mesh: turret, radius: 14, collisionVerticalRadius: 10, type: 'building' });
    });

    const enemyGroundColumns = [
      { x: -240, z: -980, speed: 16.8, health: 52, factory: () => this.makeTankUnit(), radius: 18, type: 'tank' },
      { x: -80, z: -1040, speed: 16.1, health: 48, factory: () => this.makeTankUnit(), radius: 18, type: 'tank' },
      { x: 110, z: -1000, speed: 17.2, health: 48, factory: () => this.makeTankUnit(), radius: 18, type: 'tank' },
      { x: 280, z: -1080, speed: 16.7, health: 52, factory: () => this.makeTankUnit(), radius: 18, type: 'tank' },
      { x: -170, z: -850, speed: 13.4, health: 36, factory: () => this.makeInfantryBattalion(), radius: 15, type: 'infantry' },
      { x: 170, z: -860, speed: 13.1, health: 36, factory: () => this.makeInfantryBattalion(), radius: 15, type: 'infantry' },
    ].map((spec) => ({ ...spec, x: spec.x * areaScale, z: spec.z * areaScale }));

    enemyGroundColumns.forEach((spec, index) => {
      const unit = spec.factory();
      unit.position.set(spec.x, 6, spec.z);
      unit.rotation.y = Math.PI + (index - 2.5) * 0.06;
      this.scene.add(unit);
      this.enemies.push(new Enemy({ type: 'ship', mesh: unit, health: spec.health, speed: spec.speed }));
      this.targets.push({ mesh: unit, radius: spec.radius, collisionVerticalRadius: 10, type: spec.type });
    });

    const enemyAirSpecs = [
      { x: -460, y: 280, z: -1340, speed: 86 },
      { x: -320, y: 330, z: -1520, speed: 90 },
      { x: -120, y: 300, z: -1410, speed: 88 },
      { x: 80, y: 360, z: -1500, speed: 92 },
      { x: 250, y: 320, z: -1430, speed: 90 },
      { x: 420, y: 290, z: -1360, speed: 87 },
      { x: -260, y: 390, z: -1650, speed: 93 },
      { x: 260, y: 400, z: -1680, speed: 94 },
    ];
    const playerStart = new THREE.Vector3(0, 170, 150);

    enemyAirSpecs.forEach((spec, index) => {
      const fighter = this.makeFighter();
      const [x, y, z] = this.scalePoint([spec.x, spec.y, spec.z], areaScale, 1.04);
      fighter.position.set(x, y, z);
      fighter.lookAt(playerStart);
      this.scene.add(fighter);

      const spreadPoint = new THREE.Vector3(
        x + (index % 2 === 0 ? -80 : 85),
        y + 26 + (index % 3) * 16,
        z + 210 + (index % 4) * 34,
      );
      this.enemies.push(new Enemy({
        type: 'fighter',
        mesh: fighter,
        health: ENEMY_DURABILITY.fighter,
        speed: spec.speed,
        behavior: {
          engageTime: 2.4 + index * 0.24,
          spreadWeight: 0.68 + (index % 3) * 0.08,
          spreadPoint,
          preferredRange: 270 + (index % 4) * 22,
          rangeTolerance: 90,
        },
      }));
    });
  }

  createLandBattle() {
    const areaScale = 1.4;
    const playerReference = {
      length: 13.2,
      wingspan: 8.4,
    };
    const roadSizing = {
      mainWidth: playerReference.wingspan * 14,
      mainLength: playerReference.length * 340,
      crossWidth: playerReference.wingspan * 8.5,
      crossLength: playerReference.length * 280,
      laneMarkerWidth: playerReference.wingspan * 0.35,
      laneMarkerLength: playerReference.length * 2.5,
      laneMarkerSpacing: playerReference.length * 5.3,
    };
    this.createSkyCommon();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8600 * areaScale, 8600 * areaScale, 96, 96),
      new THREE.MeshStandardMaterial({ color: 0x486837, roughness: 0.95, metalness: 0.04 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    this.stageObjects.push(ground);

    const highwayMain = new THREE.Mesh(
      new THREE.PlaneGeometry(roadSizing.mainWidth * areaScale, roadSizing.mainLength * areaScale),
      new THREE.MeshStandardMaterial({ color: 0x4b4e52, roughness: 0.9, metalness: 0.1 }),
    );
    highwayMain.rotation.x = -Math.PI / 2;
    highwayMain.position.set(0, 0.4, -720 * areaScale);
    this.scene.add(highwayMain);
    this.stageObjects.push(highwayMain);

    const highwayCross = new THREE.Mesh(
      new THREE.PlaneGeometry(roadSizing.crossLength * areaScale, roadSizing.crossWidth * areaScale),
      new THREE.MeshStandardMaterial({ color: 0x505458, roughness: 0.88, metalness: 0.1 }),
    );
    highwayCross.rotation.x = -Math.PI / 2;
    highwayCross.position.set(0, 0.41, -1220 * areaScale);
    this.scene.add(highwayCross);
    this.stageObjects.push(highwayCross);

    const laneMarkMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d39a, roughness: 0.5, metalness: 0.25 });
    const laneMarkCount = Math.floor((roadSizing.mainLength * 0.9) / roadSizing.laneMarkerSpacing);
    for (let i = -laneMarkCount; i <= laneMarkCount; i += 1) {
      if (i % 2 === 0) continue;
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(roadSizing.laneMarkerWidth, roadSizing.laneMarkerLength),
        laneMarkMaterial,
      );
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(0, 0.42, (-720 * areaScale) + i * roadSizing.laneMarkerSpacing);
      this.scene.add(mark);
      this.stageObjects.push(mark);
    }

    const grovePositions = [
      [-920, 0, -460],
      [-760, 0, -1030],
      [-890, 0, -1510],
      [840, 0, -440],
      [940, 0, -980],
      [820, 0, -1540],
      [-420, 0, -1760],
      [420, 0, -1820],
    ].map((point) => this.scalePoint(point, areaScale));

    grovePositions.forEach((pos, index) => {
      const grove = this.makeTreeCluster(7 + (index % 3));
      grove.position.set(...pos);
      this.scene.add(grove);
      this.stageObjects.push(grove);
      this.targets.push({ mesh: grove, radius: 70, collisionVerticalRadius: 46, type: 'terrain' });
    });

    const tankSpecs = [
      { x: -180, z: -1480, speed: 16.5 },
      { x: 0, z: -1540, speed: 17.3 },
      { x: 180, z: -1490, speed: 16.8 },
      { x: -280, z: -1760, speed: 17.6 },
      { x: 300, z: -1730, speed: 17.1 },
      { x: 40, z: -1870, speed: 18.2 },
    ].map((spec) => ({ ...spec, x: spec.x * areaScale, z: spec.z * areaScale }));

    tankSpecs.forEach((spec, index) => {
      const tank = this.makeTankUnit();
      tank.position.set(spec.x, 6, spec.z);
      tank.rotation.y = Math.PI + (index - 2.5) * 0.05;
      this.scene.add(tank);
      this.enemies.push(new Enemy({ type: 'ship', mesh: tank, health: 48, speed: spec.speed }));
      this.targets.push({ mesh: tank, radius: 18, collisionVerticalRadius: 10, type: 'tank' });
    });

    const samPositions = [
      [-350, 12, -1320],
      [330, 12, -1290],
      [-500, 12, -1620],
      [520, 12, -1660],
      [0, 12, -1420],
    ].map((point) => this.scalePoint(point, areaScale));

    samPositions.forEach((pos) => {
      const sam = this.makeSamBattery();
      sam.position.set(...pos);
      this.scene.add(sam);
      this.enemies.push(new Enemy({ type: 'turret', mesh: sam, health: ENEMY_DURABILITY.turret }));
      this.targets.push({ mesh: sam, radius: 11, collisionVerticalRadius: 8, type: 'building' });
    });

    const infantryColumns = [
      { x: -120, z: -1160 },
      { x: 140, z: -1130 },
      { x: -240, z: -1380 },
      { x: 260, z: -1360 },
      { x: 0, z: -1680 },
    ].map((spec) => ({ ...spec, x: spec.x * areaScale, z: spec.z * areaScale }));

    infantryColumns.forEach((spec, index) => {
      const battalion = this.makeInfantryBattalion();
      battalion.position.set(spec.x, 5, spec.z);
      battalion.rotation.y = Math.PI + (index % 2 ? 0.08 : -0.08);
      this.scene.add(battalion);
      this.enemies.push(new Enemy({ type: 'ship', mesh: battalion, health: 34, speed: 12.8 + index * 0.35 }));
      this.targets.push({ mesh: battalion, radius: 16, collisionVerticalRadius: 9, type: 'infantry' });
    });
  }

  createBaseBattle() {
    const areaScale = 1.35;
    const islandTop = 13;
    this.createSkyCommon();
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(9000 * areaScale, 9000 * areaScale),
      new THREE.MeshStandardMaterial({ color: 0x103b58 }),
    );
    sea.rotation.x = -Math.PI / 2;
    this.scene.add(sea);
    this.stageObjects.push(sea);

    const islandCore = this.createFortifiedIslandTerrain({
      x: 0,
      z: -900 * areaScale,
      areaScale,
      radiusX: 430,
      radiusZ: 320,
      height: islandTop,
      seed: 9,
      shorelineTilt: 0.18,
    });
    this.stageObjects.push(...islandCore);
    this.addIslandCollisionTarget({
      x: 0,
      z: -900 * areaScale,
      areaScale,
      radiusX: 430,
      radiusZ: 320,
      height: islandTop,
    });
    const hq = this.makeHeadquarters();
    hq.position.set(0, islandTop + 14, -930 * areaScale);
    this.scene.add(hq);
    this.enemies.push(new Enemy({ type: 'turret', mesh: hq, health: ENEMY_DURABILITY.headquarters }));
    this.targets.push({ mesh: hq, radius: 42, collisionVerticalRadius: 24, type: 'building' });

    const port = this.makePortFacility();
    port.position.set(0, islandTop + 1, -790 * areaScale);
    this.scene.add(port);
    this.targets.push({
      mesh: port,
      radius: 130,
      type: 'building',
      collisionHalfExtents: { x: 116, y: 26, z: 46 },
    });

    const towerPositions = [
      [-155, islandTop + 4, -855],
      [160, islandTop + 4, -870],
      [-145, islandTop + 4, -1020],
      [150, islandTop + 4, -1015],
    ].map((point) => this.scalePoint(point, areaScale));

    towerPositions.forEach((pos) => {
      const tower = this.makeWatchTower();
      tower.position.set(...pos);
      this.scene.add(tower);
      this.enemies.push(new Enemy({ type: 'turret', mesh: tower, health: ENEMY_DURABILITY.turret }));
      this.targets.push({ mesh: tower, radius: 16, collisionVerticalRadius: 22, type: 'building' });
    });

    for (let i = 0; i < 4; i++) {
      const turret = this.makeGroundTurret();
      turret.position.set((-88 + i * 56) * areaScale, islandTop + 4, (-925 + (i % 2) * 76) * areaScale);
      this.scene.add(turret);
      this.enemies.push(new Enemy({ type: 'turret', mesh: turret, health: ENEMY_DURABILITY.turret }));
      this.targets.push({ mesh: turret, radius: 14, collisionVerticalRadius: 10, type: 'building' });
    }

    const samPositions = [
      [-130, islandTop + 8, -835],
      [-48, islandTop + 8, -838],
      [34, islandTop + 8, -837],
      [116, islandTop + 8, -836],
      [-92, islandTop + 8, -1068],
      [86, islandTop + 8, -1070],
    ].map((point) => this.scalePoint(point, areaScale));

    samPositions.forEach((pos) => {
      const sam = this.makeSamBattery();
      sam.position.set(...pos);
      this.scene.add(sam);
      this.enemies.push(new Enemy({ type: 'turret', mesh: sam, health: ENEMY_DURABILITY.turret }));
      this.targets.push({ mesh: sam, radius: 11, collisionVerticalRadius: 8, type: 'building' });
    });
  }


  createFortifiedIslandTerrain({ x, z, areaScale, radiusX, radiusZ, height, seed, shorelineTilt = 0.25 }) {
    const islandAssets = [];
    const contour = [];
    const segments = 64;

    for (let i = 0; i < segments; i += 1) {
      const t = i / segments;
      const angle = t * Math.PI * 2;
      const warp = 1
        + Math.sin(angle * 2.2 + seed) * 0.09
        + Math.sin(angle * 4.6 + seed * 0.73) * 0.05
        + Math.cos(angle * 3.2 + seed * 0.33) * shorelineTilt;
      contour.push(new THREE.Vector2(
        Math.cos(angle) * radiusX * warp * areaScale,
        Math.sin(angle) * radiusZ * warp * areaScale,
      ));
    }

    const shelfDepth = Math.max(height + 11, 20);
    const islandShelf = new THREE.Mesh(
      new THREE.ExtrudeGeometry(new THREE.Shape(contour), {
        depth: shelfDepth,
        bevelEnabled: false,
        bevelSegments: 2,
        bevelSize: 0,
        bevelThickness: 0,
      }),
      new THREE.MeshStandardMaterial({ color: 0x6a7f59, roughness: 0.96, metalness: 0.02 }),
    );
    islandShelf.rotation.x = -Math.PI / 2;
    islandShelf.position.set(x, (height - 1) - shelfDepth, z);
    this.scene.add(islandShelf);
    islandAssets.push(islandShelf);

    const beach = new THREE.Mesh(
      new THREE.ExtrudeGeometry(new THREE.Shape(contour), {
        depth: 2.2,
        bevelEnabled: false,
      }),
      new THREE.MeshStandardMaterial({ color: 0xc3b081, roughness: 0.93, metalness: 0.02 }),
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(x, height - 2.2, z);
    this.scene.add(beach);
    islandAssets.push(beach);

    const inland = contour.map((point) => point.clone().multiplyScalar(0.84));
    const inlandPlateau = new THREE.Mesh(
      new THREE.ExtrudeGeometry(new THREE.Shape(inland), {
        depth: 3.6,
        bevelEnabled: false,
      }),
      new THREE.MeshStandardMaterial({ color: 0x4f6a44, roughness: 0.9, metalness: 0.03 }),
    );
    inlandPlateau.rotation.x = -Math.PI / 2;
    inlandPlateau.position.set(x, height, z);
    this.scene.add(inlandPlateau);
    islandAssets.push(inlandPlateau);

    this.addIslandScatterElements({ x, z, areaScale, radiusX, radiusZ, height: height - 1, islandAssets, seed });
    return islandAssets;
  }

  addIslandCollisionTarget({ x, z, areaScale, radiusX, radiusZ, height }) {
    const collisionAnchor = new THREE.Object3D();
    collisionAnchor.position.set(x, Math.max(18, height * 0.35), z);
    this.stageObjects.push(collisionAnchor);

    this.targets.push({
      mesh: collisionAnchor,
      type: 'terrain',
      collisionHalfExtents: {
        x: radiusX * areaScale * 0.84,
        y: Math.max(20, height * 0.58),
        z: radiusZ * areaScale * 0.84,
      },
    });
  }

  addIslandScatterElements({ x, z, areaScale, radiusX, radiusZ, height, islandAssets, seed }) {
    const road = new THREE.MeshStandardMaterial({ color: 0x676862, roughness: 0.88, metalness: 0.06 });
    const houseWall = new THREE.MeshStandardMaterial({ color: 0xc7c2b6, roughness: 0.78, metalness: 0.06 });
    const houseRoof = new THREE.MeshStandardMaterial({ color: 0x7b4135, roughness: 0.72, metalness: 0.1 });
    const treeLeaf = new THREE.MeshStandardMaterial({ color: 0x3f6d3c, roughness: 0.88, metalness: 0.04 });
    const treeTrunk = new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.9, metalness: 0.04 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7d78, roughness: 0.96, metalness: 0.04 });
    const houseBandRadius = radiusX * areaScale * 0.34;

    const mainRoad = new THREE.Mesh(new THREE.BoxGeometry(radiusX * areaScale * 1.24, 0.4, 8), road);
    mainRoad.position.set(x, height + 0.6, z - radiusZ * areaScale * 0.05);
    this.scene.add(mainRoad);
    islandAssets.push(mainRoad);

    const crossRoad = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, radiusZ * areaScale * 1.16), road);
    crossRoad.position.set(x + radiusX * areaScale * 0.04, height + 0.62, z);
    this.scene.add(crossRoad);
    islandAssets.push(crossRoad);

    for (let i = 0; i < 14; i += 1) {
      const house = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 12), houseWall);
      base.position.y = 4;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(10, 6, 4), houseRoof);
      roof.position.y = 11;
      roof.rotation.y = Math.PI * 0.25;
      house.add(base, roof);
      const angle = (i / 14) * Math.PI * 2 + seed * 0.2;
      const r = houseBandRadius + (i % 4) * 18 * areaScale;
      house.position.set(x + Math.cos(angle) * r, height + 1, z + Math.sin(angle) * r * (radiusZ / radiusX));
      house.rotation.y = -angle + Math.PI * 0.5;
      this.scene.add(house);
      islandAssets.push(house);
    }

    for (let i = 0; i < 44; i += 1) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 7, 6), treeTrunk);
      trunk.position.y = 3.5;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(4.8, 8, 8), treeLeaf);
      crown.position.y = 8.6;
      tree.add(trunk, crown);
      const angle = (i / 44) * Math.PI * 2 + seed * 0.5;
      const radial = (0.38 + (i % 9) * 0.05) * radiusX * areaScale;
      tree.position.set(x + Math.cos(angle) * radial, height + 1, z + Math.sin(angle) * radial * (radiusZ / radiusX));
      this.scene.add(tree);
      islandAssets.push(tree);
    }

    for (let i = 0; i < 20; i += 1) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(4 + (i % 3) * 2, 0),
        rockMat,
      );
      const angle = (i / 20) * Math.PI * 2 + 0.2;
      const ringRadius = (0.7 + (i % 4) * 0.06) * radiusX * areaScale;
      rock.position.set(x + Math.cos(angle) * ringRadius, height + 0.5, z + Math.sin(angle) * ringRadius * (radiusZ / radiusX));
      rock.rotation.set(i * 0.3, i * 0.15, i * 0.2);
      this.scene.add(rock);
      islandAssets.push(rock);
    }

    for (let i = 0; i < 6; i += 1) {
      const coastalGun = this.makeCoastalGunBattery();
      const angle = -Math.PI * 0.18 + i * (Math.PI * 0.11);
      const ringRadius = radiusX * areaScale * 0.73;
      coastalGun.position.set(x + Math.cos(angle) * ringRadius, height + 1, z + Math.sin(angle) * ringRadius * (radiusZ / radiusX));
      coastalGun.rotation.y = -angle + Math.PI * 0.5;
      this.scene.add(coastalGun);
      islandAssets.push(coastalGun);
    }
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
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x76807f, roughness: 0.76, metalness: 0.15 });
    const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x646d6f, roughness: 0.7, metalness: 0.2 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x425f3d, roughness: 0.9, metalness: 0.02 });

    const baseSlab = new THREE.Mesh(new THREE.BoxGeometry(420, 7, 320), slabMat);
    baseSlab.position.y = 3.5;
    const innerField = new THREE.Mesh(new THREE.BoxGeometry(350, 1.8, 250), grassMat);
    innerField.position.y = 7.8;

    const bunkerL = new THREE.Mesh(new THREE.BoxGeometry(66, 14, 48), bunkerMat);
    bunkerL.position.set(-138, 7, 94);
    const bunkerR = bunkerL.clone();
    bunkerR.position.x = 140;
    const center = new THREE.Mesh(new THREE.BoxGeometry(102, 16, 74), bunkerMat);
    center.position.set(0, 8, -72);

    group.add(baseSlab, innerField, bunkerL, bunkerR, center);
    return group;
  }

  makeReinforcedWallRing() {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x687179, roughness: 0.78, metalness: 0.16 });
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x4f5861, roughness: 0.62, metalness: 0.34 });

    const northWall = new THREE.Mesh(new THREE.BoxGeometry(500, 8, 20), wallMat);
    northWall.position.set(0, 4, -182);
    const southWall = northWall.clone();
    southWall.position.z = 182;

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 350), wallMat);
    westWall.position.set(-260, 4, 0);
    const eastWall = westWall.clone();
    eastWall.position.x = 260;

    const northGate = new THREE.Mesh(new THREE.BoxGeometry(100, 7, 18), gateMat);
    northGate.position.set(0, 3.5, -182);
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

  makeCoastalGunBattery() {
    const group = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x74787e, roughness: 0.82, metalness: 0.12 });
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x586068, roughness: 0.58, metalness: 0.32 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 8.2, 2.8, 16), concrete);
    base.position.y = 1.4;
    const turret = new THREE.Mesh(new THREE.BoxGeometry(10, 3.8, 7.6), gunMat);
    turret.position.y = 4.4;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 16, 10), gunMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(8, 5.4, 0);

    group.add(base, turret, barrel);
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

  makeTankUnit() {
    const group = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(16, 5, 9),
      new THREE.MeshStandardMaterial({ color: 0x5d6653, roughness: 0.72, metalness: 0.18 }),
    );
    hull.position.y = 4;
    const turret = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.6, 2.8, 14),
      new THREE.MeshStandardMaterial({ color: 0x6a725f, roughness: 0.66, metalness: 0.2 }),
    );
    turret.rotation.z = Math.PI / 2;
    turret.position.set(2.5, 6.3, 0);
    const cannon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.75, 11, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a4037, roughness: 0.52, metalness: 0.3 }),
    );
    cannon.rotation.z = Math.PI / 2;
    cannon.position.set(8.2, 6.4, 0);

    const trackMat = new THREE.MeshStandardMaterial({ color: 0x383b3b, roughness: 0.78, metalness: 0.15 });
    const trackL = new THREE.Mesh(new THREE.BoxGeometry(15.5, 2.3, 2), trackMat);
    trackL.position.set(0, 2.1, -4.1);
    const trackR = trackL.clone();
    trackR.position.z = 4.1;

    group.add(hull, turret, cannon, trackL, trackR);
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

  makeInfantryBattalion() {
    const group = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x586347, roughness: 0.8, metalness: 0.1 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x3d4337, roughness: 0.78, metalness: 0.08 });
    for (let i = 0; i < 10; i += 1) {
      const soldier = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.8), armorMat);
      body.position.y = 1.7;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), helmetMat);
      head.position.y = 3.2;
      soldier.add(body, head);
      soldier.position.set(((i % 5) - 2) * 1.8, 0, (Math.floor(i / 5) - 0.5) * 2.5);
      group.add(soldier);
    }
    return group;
  }

  makeTreeCluster(treeCount = 8) {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4029, roughness: 0.9, metalness: 0.04 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b35, roughness: 0.86, metalness: 0.05 });
    for (let i = 0; i < treeCount; i += 1) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 12 + (i % 3) * 2, 8), trunkMat);
      trunk.position.y = 6;
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(5.4 + (i % 2), 14 + (i % 3) * 2, 10), leafMat);
      leaves.position.y = 14;
      tree.add(trunk, leaves);
      tree.position.set(
        (Math.random() - 0.5) * 70,
        0,
        (Math.random() - 0.5) * 70,
      );
      tree.rotation.y = Math.random() * Math.PI * 2;
      group.add(tree);
    }
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
    const wingRoot = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 2.6), wingMat);
    wingRoot.position.set(0.3, -0.02, 0);

    // 主翼: 機首(+X)から見て自然な後退翼に調整
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.13, 6.6), wingMat);
    wingL.position.set(-1.2, 0.02, -3.4);
    wingL.rotation.y = -0.34;
    wingL.rotation.x = -0.06;
    const wingR = wingL.clone();
    wingR.position.z = 3.4;
    wingR.rotation.y = 0.34;
    wingR.rotation.x = 0.06;

    const flapL = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.6), wingMat);
    flapL.position.set(-3.8, -0.02, -5.9);
    flapL.rotation.y = -0.28;
    const flapR = flapL.clone();
    flapR.position.z = 5.9;
    flapR.rotation.y = 0.28;

    const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.14), wingMat);
    wingTipL.position.set(-5.2, 0.18, -6.55);
    wingTipL.rotation.x = 0.2;
    const wingTipR = wingTipL.clone();
    wingTipR.position.z = 6.55;
    wingTipR.rotation.x = -0.2;

    const canardL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.55), wingMat);
    canardL.position.set(4.35, 0.3, -0.74);
    canardL.rotation.x = 0.18;
    const canardR = canardL.clone();
    canardR.position.z = 0.74;
    canardR.rotation.x = -0.16;

    const tailWing = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.11, 1.8), wingMat);
    tailWing.position.set(-6.45, 0.32, 0);

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
      flapL,
      flapR,
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
      const deckGuide = new THREE.Mesh(new THREE.BoxGeometry(18, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0xf3f5f7 }));
      deckGuide.position.set(0, 9.42, 42);
      const arrestingZone = new THREE.Mesh(new THREE.BoxGeometry(22, 0.28, 2.2), new THREE.MeshStandardMaterial({ color: 0x31363d }));
      arrestingZone.position.set(0, 9.41, 26);

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
      for (let i = 0; i < 4; i++) {
        const cable = new THREE.Mesh(new THREE.BoxGeometry(22, 0.1, 0.7), darkMat);
        cable.position.set(0, 9.48, 30 - i * 9);
        group.add(cable);
      }

      group.add(hull, bow, flightDeck, runwayStripe, deckGuide, arrestingZone, island, bridge, windows, mast);
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
