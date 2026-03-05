/**
 * audio.js — Programmatic sound effects using the Web Audio API.
 * All sounds are generated as oscillator tones — no external files needed.
 */
class AudioManager {
    constructor() {
        this.enabled = true;
        this.ctx = null;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    }

    /** Resume the audio context (browsers require a user gesture). */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    /* ------------------------------------------------------------------ */
    /* Internal helpers                                                     */
    /* ------------------------------------------------------------------ */

    _osc(type, freq, startTime, duration, volume = 0.3) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(volume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration + 0.01);
        } catch (_) {}
    }

    _sweep(type, freqStart, freqEnd, startTime, duration, volume = 0.3) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freqStart, startTime);
            osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
            gain.gain.setValueAtTime(volume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration + 0.01);
        } catch (_) {}
    }

    /* ------------------------------------------------------------------ */
    /* Public sound methods                                                 */
    /* ------------------------------------------------------------------ */

    jump() {
        this._sweep('square', 320, 700, this.ctx.currentTime, 0.12, 0.25);
    }

    coin() {
        const t = this.ctx.currentTime;
        this._osc('square', 988,  t,        0.08, 0.18);
        this._osc('square', 1319, t + 0.08, 0.12, 0.18);
    }

    stomp() {
        const t = this.ctx.currentTime;
        this._sweep('square', 350, 120, t, 0.12, 0.35);
    }

    powerup() {
        const t = this.ctx.currentTime;
        [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => {
            this._osc('square', f, t + i * 0.065, 0.1, 0.2);
        });
    }

    death() {
        const t = this.ctx.currentTime;
        this._osc('square', 440, t,      0.08, 0.35);
        this._osc('square', 349, t+0.09, 0.08, 0.35);
        this._sweep('square', 261, 110,  t+0.19, 0.4, 0.35);
    }

    levelComplete() {
        const t = this.ctx.currentTime;
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
            this._osc('square', f, t + i * 0.14, 0.18, 0.22);
        });
    }

    blockHit() {
        this._sweep('square', 220, 170, this.ctx.currentTime, 0.08, 0.3);
    }

    checkpoint() {
        const t = this.ctx.currentTime;
        [523, 659, 784, 1047].forEach((f, i) => {
            this._osc('square', f, t + i * 0.1, 0.12, 0.2);
        });
    }
}
