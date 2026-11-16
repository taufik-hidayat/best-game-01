// All sound is synthesised with WebAudio — no audio files, no network. Each effect
// is a short oscillator or noise burst; the context starts on the first user gesture.
let ctx = null;
let muted = false;

function ensureContext() {
  if (ctx) return ctx;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  ctx = new AudioContext();
  return ctx;
}

export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(freqStart, freqEnd, duration, type, volume, when = 0) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noiseBurst(duration, volume, lowpass) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime;
  const len = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  source.connect(filter).connect(gain).connect(c.destination);
  source.start(t0);
}

export const sfx = {
  setMuted(value) {
    muted = value;
  },
  shoot(kind) {
    if (kind === 'prism') tone(220, 90, 0.18, 'sawtooth', 0.05);
    else if (kind === 'frost') tone(880, 660, 0.1, 'sine', 0.04);
    else tone(660 + Math.random() * 120, 440, 0.07, 'square', 0.03);
  },
  kill() {
    tone(520, 780, 0.12, 'sine', 0.06);
    tone(780, 1040, 0.14, 'sine', 0.04, 0.05);
  },
  leak() {
    tone(160, 55, 0.3, 'sawtooth', 0.12);
    noiseBurst(0.2, 0.08, 500);
  },
  build() {
    tone(330, 495, 0.12, 'triangle', 0.07);
    tone(495, 660, 0.12, 'triangle', 0.05, 0.08);
  },
  upgrade() {
    tone(440, 660, 0.1, 'triangle', 0.06);
    tone(660, 880, 0.12, 'triangle', 0.06, 0.07);
  },
  waveHorn() {
    tone(196, 196, 0.25, 'sawtooth', 0.07);
    tone(294, 294, 0.35, 'sawtooth', 0.07, 0.18);
  },
  click() {
    tone(900, 700, 0.05, 'sine', 0.03);
  },
  deny() {
    tone(220, 160, 0.15, 'square', 0.05);
  },
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.08, i * 0.13));
  },
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.9, 0.35, 'sawtooth', 0.06, i * 0.16));
  },
};
