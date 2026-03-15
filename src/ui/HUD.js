export class HUD {
  constructor(root, actions, settings = {}) {
    this.root = root;
    this.actions = actions;
    this.elements = {};
    this.stick = { active: false, x: 0, y: 0 };
    this.throttleActive = false;
    this.controlsEnabled = true;
    this.settings = settings;
  }

  mount() {

    this.root.style.setProperty('--pilot-ui-offset-x', `${this.settings.pilotUiOffsetX ?? 0}px`);
    this.root.style.setProperty('--pilot-ui-offset-y', `${this.settings.pilotUiOffsetY ?? 0}px`);
    this.root.style.setProperty('--weapon-ui-offset-x', `${this.settings.weaponUiOffsetX ?? 0}px`);
    this.root.style.setProperty('--weapon-ui-offset-y', `${this.settings.weaponUiOffsetY ?? 0}px`);

    this.root.innerHTML = `
      <div class="hud top-right-menu">
        <button id="homeBtn" class="menu-btn" aria-label="一時停止メニューを開く">ホーム</button>
      </div>
      <div class="hud top-status">
        <div>装甲: <span id="armorText">100%</span></div>
        <div>ミサイル: <span id="missiles">5</span>/5</div>
        <div>機関銃: <span id="mgAmmo">100</span>/100</div>
        <div>速度: <span id="speed">0</span> km/h</div>
        <div>高度: <span id="altitude">0</span> m</div>
        <div>燃料: <span id="fuel">100</span>%</div>
        <div>G: <span id="gforce">1.0</span></div>
        <div>昇降率: <span id="verticalSpeed">0</span> m/s</div>
      </div>
      <div class="hud armor-gauge"><div id="armorGaugeFill" class="armor-gauge-fill"></div></div>
      <div class="hud left-top radar-wrap"><canvas id="radar" width="96" height="96"></canvas></div>
      <div class="aim-reticle" id="aimReticle">
        <div class="reticle-ring"></div>
        <div class="reticle-h"></div>
        <div class="reticle-v"></div>
      </div>
      <div class="lock-guide hidden" id="lockGuide"></div>
      <div id="enemyGaugeLayer" class="enemy-gauge-layer"></div>
      <div class="hud-corner hud-corner-left controls-panel">
        <div id="stick-zone" class="stick-zone">
          <div id="stick-knob" class="stick-knob"></div>
        </div>
      </div>
      <div class="hud-corner hud-corner-right controls-panel">
        <div class="control-row">
          <button id="fireBtn" class="missile-fire-btn" aria-label="ミサイル発射">
            <span class="missile-icon" aria-hidden="true"></span>
          </button>
          <button id="gunBtn" class="gun-fire-btn" aria-label="機関銃連射">
            <span class="gun-icon" aria-hidden="true"></span>
          </button>
          <div id="throttleBar" class="throttle-bar" aria-label="速度バー">
            <div class="throttle-bar-center"></div>
            <div id="throttleFill" class="throttle-fill"></div>
          </div>
        </div>
        <div class="throttle-label">スロットル: <span id="throttle">45</span>%</div>
      </div>
    `;

    this.elements = {
      speed: this.root.querySelector('#speed'),
      altitude: this.root.querySelector('#altitude'),
      fuel: this.root.querySelector('#fuel'),
      gforce: this.root.querySelector('#gforce'),
      verticalSpeed: this.root.querySelector('#verticalSpeed'),
      missiles: this.root.querySelector('#missiles'),
      mgAmmo: this.root.querySelector('#mgAmmo'),
      armorText: this.root.querySelector('#armorText'),
      armorGaugeFill: this.root.querySelector('#armorGaugeFill'),
      throttle: this.root.querySelector('#throttle'),
      throttleBar: this.root.querySelector('#throttleBar'),
      throttleFill: this.root.querySelector('#throttleFill'),
      radar: this.root.querySelector('#radar'),
      fireBtn: this.root.querySelector('#fireBtn'),
      gunBtn: this.root.querySelector('#gunBtn'),
      homeBtn: this.root.querySelector('#homeBtn'),
      stickZone: this.root.querySelector('#stick-zone'),
      stickKnob: this.root.querySelector('#stick-knob'),
      aimReticle: this.root.querySelector('#aimReticle'),
      lockGuide: this.root.querySelector('#lockGuide'),
      enemyGaugeLayer: this.root.querySelector('#enemyGaugeLayer'),
    };

    this.bindTouchControls();
    this.elements.fireBtn.addEventListener('click', () => {
      if (!this.controlsEnabled) return;
      this.actions.onFire();
    });
    this.bindGunButton();
    this.elements.homeBtn.addEventListener('click', this.actions.onMenu);
    this.bindThrottleBar();
  }

  bindGunButton() {
    const gun = this.elements.gunBtn;
    const stop = () => this.actions.onGunStop();
    gun.addEventListener('pointerdown', (e) => {
      if (!this.controlsEnabled) return;
      gun.setPointerCapture(e.pointerId);
      this.actions.onGunStart();
    });
    gun.addEventListener('pointerup', stop);
    gun.addEventListener('pointercancel', stop);
    gun.addEventListener('pointerleave', (e) => {
      if (e.buttons === 0) stop();
    });
  }

  bindTouchControls() {
    const zone = this.elements.stickZone;
    const knob = this.elements.stickKnob;
    zone.addEventListener('pointerdown', (e) => {
      if (!this.controlsEnabled) return;
      this.stick.active = true;
      zone.setPointerCapture(e.pointerId);
      this.updateStick(e, zone, knob);
    });
    zone.addEventListener('pointermove', (e) => this.stick.active && this.controlsEnabled && this.updateStick(e, zone, knob));
    zone.addEventListener('pointerup', () => {
      this.stick.active = false;
      this.actions.onStick(0, 0);
      knob.style.transform = 'translate(0px, 0px)';
    });
  }

  bindThrottleBar() {
    const bar = this.elements.throttleBar;
    const stopThrottle = () => {
      this.throttleActive = false;
      this.actions.onThrottle(0);
    };
    bar.addEventListener('pointerdown', (e) => {
      if (!this.controlsEnabled) return;
      this.throttleActive = true;
      bar.setPointerCapture(e.pointerId);
      this.updateThrottleInput(e, bar);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!this.controlsEnabled || !this.throttleActive) return;
      this.updateThrottleInput(e, bar);
    });
    bar.addEventListener('pointerup', stopThrottle);
    bar.addEventListener('pointercancel', stopThrottle);
    bar.addEventListener('pointerleave', (e) => {
      if (e.buttons === 0) stopThrottle();
    });
  }

  updateThrottleInput(event, bar) {
    const rect = bar.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    const deadZone = 0.1;
    if (ratio < 0.5 - deadZone) {
      this.actions.onThrottle(1);
    } else if (ratio > 0.5 + deadZone) {
      this.actions.onThrottle(-1);
    } else {
      this.actions.onThrottle(0);
    }
  }

  updateStick(e, zone, knob) {
    const rect = zone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let x = (e.clientX - cx) / (rect.width / 2);
    let y = (e.clientY - cy) / (rect.height / 2);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    knob.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
    this.actions.onStick(x, y);
  }

  update(state) {
    this.elements.speed.textContent = Math.round(state.speed);
    this.elements.altitude.textContent = Math.round(state.altitude);
    this.elements.fuel.textContent = `${Math.round(state.fuelRatio * 100)}`;
    this.elements.gforce.textContent = state.gForce.toFixed(1);
    this.elements.verticalSpeed.textContent = Math.round(state.verticalSpeed);
    this.elements.missiles.textContent = state.missiles;
    this.elements.mgAmmo.textContent = state.machineGunAmmo;
    const armorRatio = state.armor / Math.max(1, state.armorMax);
    this.elements.armorText.textContent = `${Math.round(armorRatio * 100)}%`;
    this.elements.armorGaugeFill.style.width = `${Math.round(armorRatio * 100)}%`;
    const throttlePercent = Math.round(state.throttle * 100);
    this.elements.throttle.textContent = throttlePercent;
    this.elements.throttleFill.style.height = `${throttlePercent}%`;
    this.drawRadar(state.radar);
    this.updateLockGuide(state.lockGuide);
    this.drawEnemyGauges(state.enemyGauges ?? []);
  }

  setControlsEnabled(enabled) {
    this.controlsEnabled = enabled;
    this.root.classList.toggle('hud-input-disabled', !enabled);
    if (!enabled) {
      this.stick.active = false;
      this.throttleActive = false;
      this.actions.onGunStop();
      this.actions.onThrottle(0);
      this.actions.onStick(0, 0);
      this.elements.stickKnob.style.transform = 'translate(0px, 0px)';
    }
  }


  updateLockGuide(lockGuide) {
    if (!lockGuide) {
      this.elements.lockGuide.classList.add('hidden');
      return;
    }
    this.elements.lockGuide.classList.remove('hidden');
    this.elements.lockGuide.style.left = `${lockGuide.x}px`;
    this.elements.lockGuide.style.top = `${lockGuide.y}px`;
  }

  drawEnemyGauges(enemyGauges) {
    const layer = this.elements.enemyGaugeLayer;
    layer.innerHTML = '';
    enemyGauges.forEach((gauge) => {
      const wrap = document.createElement('div');
      wrap.className = 'enemy-gauge';
      wrap.style.left = `${gauge.x}px`;
      wrap.style.top = `${gauge.y}px`;

      const fill = document.createElement('div');
      fill.className = 'enemy-gauge-fill';
      fill.style.width = `${Math.round(gauge.ratio * 100)}%`;
      wrap.appendChild(fill);
      layer.appendChild(wrap);
    });
  }

  drawRadar(radarState) {
    const canvas = this.elements.radar;
    const c = canvas.getContext('2d');
    const radius = canvas.width / 2;
    c.clearRect(0, 0, canvas.width, canvas.height);

    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.beginPath();
    c.arc(radius, radius, radius - 1, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = '#62f5ff';
    c.beginPath();
    c.arc(radius, radius, radius - 1, 0, Math.PI * 2);
    c.stroke();

    c.fillStyle = '#00ff8f';
    c.beginPath();
    c.arc(radius, radius, 3, 0, Math.PI * 2);
    c.fill();

    radarState.forEach((obj) => {
      c.fillStyle = obj.kind === 'enemy' ? '#ff5151' : obj.kind === 'ally' ? '#4db7ff' : '#ffe97a';
      const targetX = radius + obj.x * 0.6;
      const targetY = radius + obj.y * 0.6;
      if (Math.hypot(targetX - radius, targetY - radius) > radius - 3) return;
      c.beginPath();
      c.arc(targetX, targetY, 2.4, 0, Math.PI * 2);
      c.fill();
    });
  }
}
