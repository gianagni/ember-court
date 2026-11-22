// audio.js — Ember Court's sound: a tiny WebAudio synth, no audio files.
// Short oscillator blips for playing, damage, shielding, drawing, winning and losing.
// AudioContext starts only after a user gesture (browser rule); safe to call early.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ensureCtx();
}

function blip(freq, dur, type, gain, when = 0) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function soundPlayCard() {
  blip(520, 0.12, 'triangle', 0.12);
  blip(780, 0.1, 'triangle', 0.08, 0.05);
}

export function soundDamage() {
  blip(180, 0.18, 'sawtooth', 0.1);
  blip(120, 0.22, 'sawtooth', 0.08, 0.06);
}

export function soundShield() {
  blip(340, 0.15, 'sine', 0.1);
  blip(510, 0.18, 'sine', 0.08, 0.07);
}

export function soundDraw() {
  blip(880, 0.06, 'sine', 0.06);
}

export function soundEndTurn() {
  blip(440, 0.1, 'triangle', 0.08);
}

export function soundWin() {
  [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.25, 'triangle', 0.12, i * 0.11));
}

export function soundLose() {
  [392, 330, 262, 196].forEach((f, i) => blip(f, 0.3, 'sine', 0.1, i * 0.13));
}

export function soundClick() {
  blip(660, 0.05, 'square', 0.04);
}
