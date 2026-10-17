import type { Severity } from '../sim/types';

/**
 * All sound is synthesised on the fly with the Web Audio API: a slow space drone that darkens
 * as the planet dies, plus short effects for erasing and for events. No audio files.
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private droneFilter!: BiquadFilterNode;
  private droneGain!: GainNode;
  private drones: OscillatorNode[] = [];
  private noiseBuf!: AudioBuffer;
  private lastEvent = 0;
  enabled = false;

  /** Must be called from a user gesture (browsers block autoplay). */
  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.6 : 0;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // Ambient drone: a low fifth plus filtered noise, slowly breathing.
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 600;
    this.droneFilter.Q.value = 0.7;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.08;
    this.droneFilter.connect(this.droneGain).connect(this.master);
    for (const [f, type, g] of [[55, 'sine', 0.5], [82.4, 'triangle', 0.22], [110.3, 'sine', 0.12]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = g;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = g * 0.4;
      lfo.connect(lfoGain).connect(og.gain);
      o.connect(og).connect(this.droneFilter);
      o.start();
      lfo.start();
      this.drones.push(o);
    }
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuf;
    wind.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 400;
    wf.Q.value = 0.6;
    const wg = ctx.createGain();
    wg.gain.value = 0.05;
    wind.connect(wf).connect(wg).connect(this.droneFilter);
    wind.start();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) this.start();
    if (this.ctx) this.master.gain.setTargetAtTime(on ? 0.6 : 0, this.ctx.currentTime, 0.15);
  }

  /** life 0..1 brightens the drone; doom 0..1 detunes and darkens it. */
  mood(life: number, doom: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.droneFilter.frequency.setTargetAtTime(180 + 900 * life, t, 1.5);
    this.drones.forEach((o, i) => o.detune.setTargetAtTime(-doom * (40 + i * 25), t, 2));
  }

  private noise(dur: number, filter: BiquadFilterType, from: number, to: number, gain: number, at = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, at = 0, slideTo?: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** A rubbery eraser scrub. */
  erase() {
    if (!this.ctx || !this.enabled) return;
    this.noise(0.12, 'bandpass', 2600, 1400, 0.5);
    this.noise(0.14, 'bandpass', 2200, 900, 0.45, 0.12);
    this.noise(0.18, 'bandpass', 1800, 600, 0.4, 0.25);
    this.tone(320, 0.5, 'sine', 0.18, 0.05, 90);
  }

  restore() {
    if (!this.ctx || !this.enabled) return;
    this.tone(220, 0.35, 'sine', 0.16, 0, 660);
    this.noise(0.3, 'highpass', 800, 4000, 0.12);
  }

  event(sev: Severity) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    if (now - this.lastEvent < 0.18) return;
    this.lastEvent = now;
    switch (sev) {
      case 'info': this.tone(880, 0.25, 'sine', 0.06); break;
      case 'good': this.tone(523, 0.3, 'sine', 0.1); this.tone(784, 0.4, 'sine', 0.1, 0.12); break;
      case 'warn': this.tone(392, 0.35, 'triangle', 0.08); break;
      case 'bad': this.tone(110, 0.6, 'sine', 0.25, 0, 70); this.noise(0.4, 'lowpass', 600, 120, 0.15); break;
      case 'doom': this.tone(65, 1.8, 'sine', 0.35, 0, 32); this.noise(1.6, 'lowpass', 400, 60, 0.3); break;
    }
  }

  discovery() {
    if (!this.ctx || !this.enabled) return;
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.09, i * 0.09));
  }
}
