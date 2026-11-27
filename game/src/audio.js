// GOBBLE RUN — all sound is synthesized with WebAudio, no audio files.
// One clear job: tiny synth voices (gobble, chirp, thud, alarm, fanfare)
// behind one small API the game calls; nothing here knows about the game.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.alarmOn = false;
    this.alarmNodes = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggleMute() { this.muted = !this.muted; if (this.muted) this.stopAlarm(); return this.muted; }

  // A short oscillator blip with a pitch slide and a volume envelope.
  blip(freqFrom, freqTo, seconds, type, volume) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), t0 + seconds);
    gain.gain.setValueAtTime(volume || 0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + seconds + 0.02);
  }

  // The turkey's gobble: three quick low "gob" pulses, pitch wobbling down.
  gobble() {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    for (let i = 0; i < 3; i++) {
      const t0 = ctx.currentTime + i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220 - i * 30, t0);
      osc.frequency.exponentialRampToValueAtTime(140 - i * 20, t0 + 0.08);
      gain.gain.setValueAtTime(0.14, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + 0.1);
    }
  }

  jump() { this.blip(300, 620, 0.14, 'sine', 0.14); }
  dash() { this.blip(700, 180, 0.16, 'sawtooth', 0.08); }
  corn() { this.blip(880, 1320, 0.1, 'sine', 0.14); this.blip(1320, 1760, 0.08, 'sine', 0.08); }
  hurt() { this.blip(220, 60, 0.3, 'sawtooth', 0.18); }
  hide() { this.blip(500, 240, 0.2, 'triangle', 0.1); }

  // A low two-note alarm loop while the farmer is close behind.
  startAlarm() {
    if (this.muted || this.alarmOn) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.alarmOn = true;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.value = 196;
    lfo.type = 'square'; lfo.frequency.value = 3.2;
    lfoGain.gain.value = 40;
    gain.gain.value = 0.05;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); lfo.start();
    this.alarmNodes = { osc, lfo, gain };
  }

  stopAlarm() {
    if (!this.alarmOn || !this.alarmNodes) return;
    try { this.alarmNodes.osc.stop(); this.alarmNodes.lfo.stop(); } catch { /* already stopped */ }
    this.alarmNodes = null;
    this.alarmOn = false;
  }

  // Escape fanfare: a rising little major arpeggio.
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.blip(f, f, 0.22, 'triangle', 0.16), i * 110);
    });
  }

  // Caught sting: a descending sad trombone-ish slide.
  caughtSting() { this.blip(392, 98, 0.7, 'sawtooth', 0.16); }
}
