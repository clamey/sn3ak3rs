// Sound in the spirit of the Apple II's 1-bit speaker: hard on/off square waves and
// sample-and-hold noise, no smooth envelopes, so every blip has that clicky edge.

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);

    // 1-bit noise: random +/-1 held for a few samples, which gives a crunchier hiss.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let v = 1;
    for (let i = 0; i < d.length; i++) {
      if (i % 6 === 0) v = Math.random() < 0.5 ? -1 : 1;
      d[i] = v;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ready() {
  return ctx && !muted && ctx.state === 'running';
}

function tone(f0, f1, dur, delay = 0, vol = 1) {
  if (!ready()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(0, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, rate = 1, delay = 0, vol = 1) {
  if (!ready()) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource();
  const g = ctx.createGain();
  s.buffer = noiseBuf;
  s.playbackRate.value = rate;
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(0, t + dur);
  s.connect(g).connect(master);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

export const sfx = {
  shoot() { tone(1800, 400, 0.06, 0, 0.6); },
  hit() { noise(0.1, 0.7); tone(500, 60, 0.12, 0, 0.5); },
  spit() { tone(160, 90, 0.04, 0, 0.4); },
  blink() { tone(2400, 2400, 0.02, 0, 0.3); tone(3000, 3000, 0.02, 0.04, 0.3); },
  dive() { tone(900, 200, 0.35, 0, 0.35); },
  thud() { tone(70, 50, 0.03, 0, 0.5); },
  creep() { tone(130, 95, 0.05, 0.03, 0.5); },
  clink() { tone(2200, 1500, 0.03, 0, 0.4); },
  crumble() { noise(0.25, 0.35); tone(220, 40, 0.2, 0, 0.5); },
  note(f, dur = 0.06) { tone(f, f, dur, 0, 0.5); },
  scratch() { noise(0.12, 2.5); tone(900, 90, 0.15, 0, 0.4); },
  slink() { [392, 370, 349, 330].forEach((f, i) => tone(f, f, 0.12, i * 0.14, 0.4)); },
  rumble() { noise(0.4, 0.2, 0, 0.7); },
  boing() { tone(150, 900, 0.25, 0, 0.5); },
  whoosh() { noise(0.3, 1.6, 0, 0.6); tone(300, 1500, 0.3, 0, 0.3); },
  tractor() { tone(220, 440, 0.12, 0, 0.3); },
  captured() { [784, 698, 622, 554, 494, 440].forEach((f, i) => tone(f, f, 0.1, i * 0.12, 0.5)); },
  rescue() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.06, i * 0.07, 0.5)); },
  die() {
    noise(0.5, 0.35);
    tone(600, 40, 0.8, 0, 0.6);
  },
  extraLife() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, 0.06, i * 0.07, 0.5)); },
  waveStart() { [262, 330, 392, 523].forEach((f, i) => tone(f, f, 0.08, i * 0.09, 0.5)); },
  waveClear() { [523, 392, 523, 659, 784].forEach((f, i) => tone(f, f, 0.07, i * 0.08, 0.5)); },
  gameOver() { [392, 330, 262, 196, 131].forEach((f, i) => tone(f, f * 0.97, 0.18, i * 0.2, 0.5)); },
};
