/**
 * Professional Sound Engine
 * Subtle, adult-appropriate UI sounds via Web Audio API
 * No cartoon / silly effects — soft, clean, low-volume tones
 */
(function (global) {
  "use strict";

  const SoundEngine = {
    ctx: null,
    enabled: true,
    masterGain: null,
    volume: 0.28,

    init() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.ctx.destination);

        const saved = localStorage.getItem("tm_sound");
        if (saved === "0") this.enabled = false;
      } catch (e) {
        console.warn("Audio init failed", e);
      }
    },

    resume() {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    },

    setEnabled(on) {
      this.enabled = !!on;
      localStorage.setItem("tm_sound", on ? "1" : "0");
    },

    toggle() {
      this.setEnabled(!this.enabled);
      return this.enabled;
    },

    /**
     * Soft click — filter change / button press
     */
    click() {
      this._tone({
        type: "sine",
        freq: 620,
        freqEnd: 480,
        duration: 0.045,
        gain: 0.18,
        attack: 0.002,
        release: 0.04,
      });
    },

    /**
     * Soft whoosh — screen / modal open
     */
    open() {
      this._noiseBurst({
        duration: 0.18,
        gain: 0.12,
        filterFreq: 1800,
        filterQ: 0.7,
      });
      this._tone({
        type: "sine",
        freq: 280,
        freqEnd: 420,
        duration: 0.22,
        gain: 0.09,
        attack: 0.02,
        release: 0.18,
      });
    },

    /**
     * Soft close / dismiss
     */
    close() {
      this._tone({
        type: "sine",
        freq: 400,
        freqEnd: 220,
        duration: 0.14,
        gain: 0.1,
        attack: 0.01,
        release: 0.12,
      });
    },

    /**
     * Success — password OK / enter app / data loaded
     */
    success() {
      this._tone({
        type: "sine",
        freq: 523.25,
        duration: 0.09,
        gain: 0.14,
        attack: 0.01,
        release: 0.07,
      });
      setTimeout(() => {
        this._tone({
          type: "sine",
          freq: 659.25,
          duration: 0.12,
          gain: 0.12,
          attack: 0.01,
          release: 0.1,
        });
      }, 70);
    },

    /**
     * Error — wrong password / blocked
     */
    error() {
      this._tone({
        type: "triangle",
        freq: 180,
        freqEnd: 140,
        duration: 0.2,
        gain: 0.15,
        attack: 0.01,
        release: 0.16,
      });
    },

    /**
     * Subtle confirm — totals update / filter complete
     */
    confirm() {
      this._tone({
        type: "sine",
        freq: 880,
        duration: 0.05,
        gain: 0.08,
        attack: 0.005,
        release: 0.04,
      });
    },

    /**
     * Soft notification
     */
    notify() {
      this._tone({
        type: "sine",
        freq: 740,
        duration: 0.08,
        gain: 0.1,
        attack: 0.01,
        release: 0.06,
      });
    },

    // ——— Internal helpers ———

    _tone({ type = "sine", freq = 440, freqEnd, duration = 0.1, gain = 0.15, attack = 0.01, release = 0.08 }) {
      if (!this.enabled || !this.ctx) return;
      this.resume();
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd != null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t0 + duration);
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    },

    _noiseBurst({ duration = 0.15, gain = 0.1, filterFreq = 1200, filterQ = 1 }) {
      if (!this.enabled || !this.ctx) return;
      this.resume();
      const t0 = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = filterFreq;
      filter.Q.value = filterQ;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      src.start(t0);
    },
  };

  // Auto-init on first user gesture
  function unlock() {
    SoundEngine.init();
    SoundEngine.resume();
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  }
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });

  global.SoundEngine = SoundEngine;
})(window);
