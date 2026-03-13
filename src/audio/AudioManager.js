export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.settings.masterVolume;
    this.master.connect(this.ctx.destination);
    this.startEngine();
  }

  updateVolumes(settings) {
    this.settings = settings;
    if (this.master) this.master.gain.value = settings.masterVolume;
  }

  tone({ freq = 440, type = 'sine', duration = 0.1, gain = 0.1 }) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain * this.settings.seVolume;
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.stop(this.ctx.currentTime + duration);
  }

  startEngine() {
    if (!this.ctx || this.engineOsc) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 80;
    g.gain.value = 0.02 * this.settings.bgmVolume;
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    this.engineOsc = { osc, g };
  }

  updateEngine(speedRatio) {
    if (!this.engineOsc) return;
    this.engineOsc.osc.frequency.value = 70 + speedRatio * 130;
    this.engineOsc.g.gain.value = (0.015 + speedRatio * 0.03) * this.settings.bgmVolume;
  }

  missile() {
    this.tone({ freq: 720, type: 'square', duration: 0.08, gain: 0.12 });
  }
  hit() {
    this.tone({ freq: 180, type: 'triangle', duration: 0.2, gain: 0.16 });
  }
  explosion() {
    this.tone({ freq: 90, type: 'sawtooth', duration: 0.3, gain: 0.2 });
  }
  lockOn() {
    this.tone({ freq: 980, type: 'sine', duration: 0.06, gain: 0.1 });
  }

  dispose() {
    if (this.engineOsc) {
      this.engineOsc.osc.stop();
      this.engineOsc = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
