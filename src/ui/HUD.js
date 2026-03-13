export class HUD {
  constructor(root, actions) {
    this.root = root;
    this.actions = actions;
    this.elements = {};
    this.stick = { active: false, x: 0, y: 0 };
  }

  mount() {
    this.root.innerHTML = `
      <div class="hud top-status">
        <div>体力: <span id="hp">❤❤❤</span></div>
        <div>残弾: <span id="ammo">20</span></div>
        <div>速度: <span id="speed">0</span> km/h</div>
        <div>高度: <span id="altitude">0</span> m</div>
      </div>
      <div class="hud left-top radar-wrap"><canvas id="radar" width="96" height="96"></canvas></div>
      <div class="aim-reticle" id="aimReticle">
        <div class="reticle-ring"></div>
        <div class="reticle-h"></div>
        <div class="reticle-v"></div>
      </div>
      <div class="lock-guide hidden" id="lockGuide"></div>
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
      ammo: this.root.querySelector('#ammo'),
      hp: this.root.querySelector('#hp'),
      throttle: this.root.querySelector('#throttle'),
      throttleBar: this.root.querySelector('#throttleBar'),
      throttleFill: this.root.querySelector('#throttleFill'),
      radar: this.root.querySelector('#radar'),
      fireBtn: this.root.querySelector('#fireBtn'),
      stickZone: this.root.querySelector('#stick-zone'),
      stickKnob: this.root.querySelector('#stick-knob'),
      aimReticle: this.root.querySelector('#aimReticle'),
      lockGuide: this.root.querySelector('#lockGuide'),
    };

    this.bindTouchControls();
    this.elements.fireBtn.addEventListener('click', this.actions.onFire);
    this.bindThrottleBar();
  }

  bindTouchControls() {
    const zone = this.elements.stickZone;
    const knob = this.elements.stickKnob;
    zone.addEventListener('pointerdown', (e) => {
      this.stick.active = true;
      zone.setPointerCapture(e.pointerId);
      this.updateStick(e, zone, knob);
    });
    zone.addEventListener('pointermove', (e) => this.stick.active && this.updateStick(e, zone, knob));
    zone.addEventListener('pointerup', () => {
      this.stick.active = false;
      this.actions.onStick(0, 0);
      knob.style.transform = 'translate(0px, 0px)';
    });
  }

  bindThrottleBar() {
    const bar = this.elements.throttleBar;
    const stopThrottle = () => this.actions.onThrottle(0);
    bar.addEventListener('pointerdown', (e) => {
      bar.setPointerCapture(e.pointerId);
      this.updateThrottleInput(e, bar);
    });
    bar.addEventListener('pointermove', (e) => this.updateThrottleInput(e, bar));
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
    this.elements.ammo.textContent = state.ammo;
    this.elements.hp.textContent = '❤'.repeat(state.health) + '・'.repeat(3 - state.health);
    const throttlePercent = Math.round(state.throttle * 100);
    this.elements.throttle.textContent = throttlePercent;
    this.elements.throttleFill.style.height = `${throttlePercent}%`;
    this.drawRadar(state.radar);
    this.updateLockGuide(state.lockGuide);
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
      c.fillStyle = obj.kind === 'enemy' ? '#ff5151' : '#ffe97a';
      const targetX = radius + obj.x * 0.6;
      const targetY = radius + obj.y * 0.6;
      if (Math.hypot(targetX - radius, targetY - radius) > radius - 3) return;
      c.beginPath();
      c.arc(targetX, targetY, 2.4, 0, Math.PI * 2);
      c.fill();
    });
  }
}
