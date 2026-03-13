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
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const boomGain = this.ctx.createGain();
    boomGain.gain.setValueAtTime(0.0001, now);
    boomGain.gain.exponentialRampToValueAtTime(0.26 * this.settings.seVolume, now + 0.03);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    boomGain.connect(this.master);

    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(120, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.45);
    sub.connect(boomGain);

    const mid = this.ctx.createOscillator();
    mid.type = 'sawtooth';
    mid.frequency.setValueAtTime(280, now);
    mid.frequency.exponentialRampToValueAtTime(90, now + 0.35);
    mid.connect(boomGain);

    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.9, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(420, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(120, now + 0.8);
    noise.connect(noiseFilter);
    noiseFilter.connect(boomGain);

    sub.start(now);
    mid.start(now);
    noise.start(now);
    sub.stop(now + 0.8);
    mid.stop(now + 0.8);
    noise.stop(now + 0.8);
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
