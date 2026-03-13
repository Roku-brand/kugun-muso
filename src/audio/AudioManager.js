export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.settings.masterVolume;
    this.master.connect(this.ctx.destination);
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

  getNoiseBuffer(duration = 1.5) {
    if (!this.ctx) return null;
    const requiredLength = Math.floor(this.ctx.sampleRate * duration);
    if (this.noiseBuffer && this.noiseBuffer.length >= requiredLength) {
      return this.noiseBuffer;
    }

    const buffer = this.ctx.createBuffer(1, requiredLength, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;

    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.78 + white * 0.22;
      data[i] = previous;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  createNoiseSource(duration) {
    if (!this.ctx) return null;
    const source = this.ctx.createBufferSource();
    source.buffer = this.getNoiseBuffer(duration);
    return source;
  }

  missile() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.3 * this.settings.seVolume, now + 0.04);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    masterGain.connect(this.master);

    const thrust = this.createNoiseSource(1.2);
    const thrustBand = this.ctx.createBiquadFilter();
    thrustBand.type = 'bandpass';
    thrustBand.frequency.setValueAtTime(1400, now);
    thrustBand.frequency.exponentialRampToValueAtTime(260, now + 0.55);
    thrustBand.Q.value = 0.8;
    const thrustGain = this.ctx.createGain();
    thrustGain.gain.setValueAtTime(0.0001, now);
    thrustGain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    thrustGain.gain.exponentialRampToValueAtTime(0.06, now + 0.45);
    thrustGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    thrust.connect(thrustBand);
    thrustBand.connect(thrustGain);
    thrustGain.connect(masterGain);

    const bass = this.ctx.createOscillator();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(180, now);
    bass.frequency.exponentialRampToValueAtTime(58, now + 0.55);
    const bassGain = this.ctx.createGain();
    bassGain.gain.setValueAtTime(0.0001, now);
    bassGain.gain.exponentialRampToValueAtTime(0.24, now + 0.02);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    bass.connect(bassGain);
    bassGain.connect(masterGain);

    const crackle = this.createNoiseSource(0.35);
    const crackleHighPass = this.ctx.createBiquadFilter();
    crackleHighPass.type = 'highpass';
    crackleHighPass.frequency.value = 1800;
    const crackleGain = this.ctx.createGain();
    crackleGain.gain.setValueAtTime(0.0001, now);
    crackleGain.gain.exponentialRampToValueAtTime(0.2, now + 0.008);
    crackleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    crackle.connect(crackleHighPass);
    crackleHighPass.connect(crackleGain);
    crackleGain.connect(masterGain);

    bass.start(now);
    thrust.start(now);
    crackle.start(now);
    bass.stop(now + 1.1);
    thrust.stop(now + 1.1);
    crackle.stop(now + 0.2);
  }
  hit() {
    this.tone({ freq: 180, type: 'triangle', duration: 0.2, gain: 0.16 });
  }
  explosion() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const body = this.ctx.createGain();
    body.gain.setValueAtTime(0.0001, now);
    body.gain.exponentialRampToValueAtTime(0.42 * this.settings.seVolume, now + 0.03);
    body.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    body.connect(this.master);

    const shock = this.ctx.createOscillator();
    shock.type = 'sine';
    shock.frequency.setValueAtTime(130, now);
    shock.frequency.exponentialRampToValueAtTime(38, now + 0.4);
    const shockGain = this.ctx.createGain();
    shockGain.gain.setValueAtTime(0.0001, now);
    shockGain.gain.exponentialRampToValueAtTime(0.35, now + 0.018);
    shockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    shock.connect(shockGain);
    shockGain.connect(body);

    const debris = this.createNoiseSource(2);
    const debrisLow = this.ctx.createBiquadFilter();
    debrisLow.type = 'lowpass';
    debrisLow.frequency.setValueAtTime(2400, now);
    debrisLow.frequency.exponentialRampToValueAtTime(180, now + 1.7);
    const debrisGain = this.ctx.createGain();
    debrisGain.gain.setValueAtTime(0.0001, now);
    debrisGain.gain.exponentialRampToValueAtTime(0.4, now + 0.015);
    debrisGain.gain.exponentialRampToValueAtTime(0.18, now + 0.18);
    debrisGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    debris.connect(debrisLow);
    debrisLow.connect(debrisGain);
    debrisGain.connect(body);

    const tail = this.createNoiseSource(2.2);
    const tailBand = this.ctx.createBiquadFilter();
    tailBand.type = 'bandpass';
    tailBand.frequency.value = 420;
    tailBand.Q.value = 0.7;
    const tailGain = this.ctx.createGain();
    tailGain.gain.setValueAtTime(0.0001, now + 0.08);
    tailGain.gain.exponentialRampToValueAtTime(0.16, now + 0.25);
    tailGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    tail.connect(tailBand);
    tailBand.connect(tailGain);
    tailGain.connect(body);

    shock.start(now);
    debris.start(now);
    tail.start(now + 0.08);
    shock.stop(now + 0.85);
    debris.stop(now + 1.85);
    tail.stop(now + 2.2);
  }
  lockOn() {
    this.tone({ freq: 980, type: 'sine', duration: 0.06, gain: 0.1 });
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
