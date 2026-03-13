export class HUD {
  constructor(root, actions) {
    this.root = root;
    this.actions = actions;
    this.elements = {};
    this.stick = { active: false, x: 0, y: 0 };
  }

  mount() {
    this.root.innerHTML = `
      <div class="hud left-top"><canvas id="radar" width="160" height="160"></canvas></div>
      <div class="hud right-top">
        <div>速度: <span id="speed">0</span> km/h</div>
        <div>高度: <span id="altitude">0</span> m</div>
      </div>
      <div class="hud right-mid">
        <div>残弾: <span id="ammo">20</span></div>
        <div>体力: <span id="hp">❤❤❤</span></div>
      </div>
      <div class="hud left-bottom">
        <div id="stick-zone" class="stick-zone">
          <div id="stick-knob" class="stick-knob"></div>
        </div>
        <p>W/S: ピッチ A/D: ヨー Q/E: ロール</p>
      </div>
      <div class="hud right-bottom">
        <button id="fireBtn">ミサイル発射</button>
        <div class="throttle-row">
          <button id="accelBtn">加速</button>
          <button id="decelBtn">減速</button>
        </div>
        <div>スロットル: <span id="throttle">45</span>%</div>
      </div>
    `;

    this.elements = {
      speed: this.root.querySelector('#speed'),
      altitude: this.root.querySelector('#altitude'),
      ammo: this.root.querySelector('#ammo'),
      hp: this.root.querySelector('#hp'),
      throttle: this.root.querySelector('#throttle'),
      radar: this.root.querySelector('#radar'),
      fireBtn: this.root.querySelector('#fireBtn'),
      accelBtn: this.root.querySelector('#accelBtn'),
      decelBtn: this.root.querySelector('#decelBtn'),
      stickZone: this.root.querySelector('#stick-zone'),
      stickKnob: this.root.querySelector('#stick-knob'),
    };

    this.bindTouchControls();
    this.elements.fireBtn.addEventListener('click', this.actions.onFire);
    this.elements.accelBtn.addEventListener('pointerdown', () => this.actions.onThrottle(1));
    this.elements.decelBtn.addEventListener('pointerdown', () => this.actions.onThrottle(-1));
    this.elements.accelBtn.addEventListener('pointerup', () => this.actions.onThrottle(0));
    this.elements.decelBtn.addEventListener('pointerup', () => this.actions.onThrottle(0));
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
    this.elements.throttle.textContent = Math.round(state.throttle * 100);
    this.drawRadar(state.radar);
  }

  drawRadar(radarState) {
    const canvas = this.elements.radar;
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = '#62f5ff';
    c.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    c.fillStyle = '#00ff8f';
    c.beginPath();
    c.arc(80, 80, 4, 0, Math.PI * 2);
    c.fill();

    radarState.forEach((obj) => {
      c.fillStyle = obj.kind === 'enemy' ? '#ff5151' : '#ffe97a';
      c.beginPath();
      c.arc(80 + obj.x, 80 + obj.y, 3, 0, Math.PI * 2);
      c.fill();
    });
  }
}
