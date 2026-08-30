/* Tiny WebAudio synth. No samples. Mute is a flag. */
(function (global) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  class Sfx {
    constructor() {
      this.muted = false;
      this.ctx = null;
      this.master = null;
      this.tryLoadMute();
    }

    tryLoadMute() {
      try {
        this.muted = localStorage.getItem("worldseed-mute") === "1";
      } catch (e) {
        this.muted = false;
      }
    }

    setMuted(v) {
      this.muted = !!v;
      try {
        localStorage.setItem("worldseed-mute", this.muted ? "1" : "0");
      } catch (e) {}
    }

    toggle() {
      this.setMuted(!this.muted);
      this.resume();
      return this.muted;
    }

    resume() {
      if (!AudioCtx) return;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    }

    beep(freq, dur, type, gain, slide) {
      if (this.muted) return;
      this.resume();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
      g.gain.setValueAtTime(gain || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    noise(dur, gain) {
      if (this.muted || !this.ctx) {
        this.resume();
        if (this.muted || !this.ctx) return;
      }
      const t = this.ctx.currentTime;
      const n = this.ctx.sampleRate * dur;
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 900;
      g.gain.setValueAtTime(gain || 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t);
    }

    shoot(kind) {
      if (kind === "cinder") this.beep(180, 0.12, "sawtooth", 0.08, 90);
      else if (kind === "rime") this.beep(620, 0.08, "triangle", 0.07, 420);
      else if (kind === "bramble") this.beep(240, 0.07, "square", 0.05, 140);
      else this.beep(520, 0.05, "square", 0.05, 280);
    }

    hit() {
      this.beep(200, 0.04, "square", 0.04, 120);
    }

    kill() {
      this.beep(160, 0.14, "sawtooth", 0.08, 60);
      this.noise(0.08, 0.05);
    }

    hurt() {
      this.beep(90, 0.28, "sawtooth", 0.14, 40);
    }

    place() {
      this.beep(380, 0.1, "triangle", 0.08, 520);
    }

    stage() {
      this.beep(330, 0.18, "triangle", 0.1, 440);
      setTimeout(() => this.beep(440, 0.2, "triangle", 0.1, 660), 140);
      setTimeout(() => this.beep(660, 0.32, "triangle", 0.1, 880), 280);
    }

    wave() {
      this.beep(220, 0.16, "square", 0.08, 330);
    }

    win() {
      [440, 554, 659, 880].forEach((f, i) => {
        setTimeout(() => this.beep(f, 0.28, "triangle", 0.1), i * 140);
      });
    }

    lose() {
      this.beep(220, 0.4, "sawtooth", 0.12, 80);
    }

    ui() {
      this.beep(640, 0.04, "square", 0.04);
    }
  }

  global.WSAudio = new Sfx();
})(window);
