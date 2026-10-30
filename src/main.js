import { W, H, PAL, SPR, text, textWidth, centerText } from './gfx.js';
import { sfx, unlock, toggleMute } from './audio.js';
import { WAVES, TOP, GROUND } from './waves.js';
import { CUTSCENES, drawCutsceneFrame } from './cutscenes.js';
import { fetchScores, submitScore, qualifies, isShared } from './scores.js';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const frameEl = document.getElementById('crt');

// ---- input ----------------------------------------------------------------

const held = new Set();
const pressed = new Set();
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'fire', ArrowUp: 'fire', KeyW: 'fire', Enter: 'start',
  KeyP: 'pause', KeyM: 'mute', KeyC: 'crt',
};

function press(k) {
  unlock();
  if (!held.has(k)) pressed.add(k);
  held.add(k);
}
function release(k) { held.delete(k); }

addEventListener('keydown', (e) => {
  if (g.state === 'initials' && typeInitial(e.code)) {
    e.preventDefault();
    return;
  }
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  press(k);
});
addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) release(k);
});
addEventListener('blur', () => held.clear());

for (const btn of document.querySelectorAll('[data-key]')) {
  const k = btn.dataset.key;
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture(e.pointerId); press(k); });
  btn.addEventListener('pointerup', () => release(k));
  btn.addEventListener('pointercancel', () => release(k));
}
canvas.addEventListener('pointerdown', () => press('start'));
canvas.addEventListener('pointerup', () => release('start'));

const justPressed = (k) => pressed.has(k);

// ---- game state -----------------------------------------------------------

const PLAYER_Y = GROUND - 7;
const EXTRA_LIFE_EVERY = 10000;

const stars = Array.from({ length: 40 }, () => ({
  x: Math.random() * W, y: TOP + Math.random() * (GROUND - TOP),
  v: 0.05 + Math.random() * 0.25, c: Math.random() < 0.3 ? 'B' : 'W', tw: Math.random() * 100,
}));

const g = {
  state: 'title', timer: 0, paused: false, t: 0,
  score: 0, hi: 0, lives: 3, nextLife: EXTRA_LIFE_EVERY,
  waveNum: 0, def: null, spd: 1, spawned: 0, killed: 0, spawnTimer: 0, elapsed: 0, bonusShown: 0,
  bugs: [], bullets: [], spits: [], parts: [],
  table: [], tableStatus: 'loading', entry: null, highlight: null, saveError: false,
  player: { x: 136, y: PLAYER_Y, alive: true, dead: 0, inv: 0, cool: 0 },
  sfx,
  spit(x, y, vx, vy) {
    if (g.spits.length < 10 && g.player.alive) { g.spits.push({ x, y, vx, vy }); sfx.spit(); }
  },
  burst: (...args) => explode(...args),
  hurt() {
    if (g.player.alive && g.player.inv === 0) killPlayer();
  },
};

function newGame() {
  Object.assign(g, { score: 0, lives: 3, nextLife: EXTRA_LIFE_EVERY, waveNum: 0 });
  resetPlayer();
  startWave();
}

function resetPlayer() {
  Object.assign(g.player, { x: 136, alive: true, dead: 0, inv: 120, cool: 0 });
}

function startWave() {
  g.def = WAVES[g.waveNum % WAVES.length];
  g.spd = 1 + 0.25 * Math.floor(g.waveNum / WAVES.length);
  Object.assign(g, { spawned: 0, killed: 0, elapsed: 0, bonusShown: 0, spawnTimer: 30, bugs: [], bullets: [], spits: [] });
  g.state = 'intro';
  g.timer = 120;
  sfx.waveStart();
}

// One intermission after each full loop of waves, rotating through the scenes.
function startCutscene() {
  const loop = g.waveNum / WAVES.length - 1;
  g.scene = CUTSCENES[loop % CUTSCENES.length];
  Object.assign(g, { state: 'cutscene', timer: 0, bugs: [], bullets: [], spits: [], parts: [] });
}

function spawnBug() {
  const def = g.def;
  const first = SPR[def.sprite][0];
  const b = { x: 0, y: 0, t: 0, frame: 0, hittable: true, w: first.width, h: first.height, ...def.spawn(g) };
  g.bugs.push(b);
  g.spawned++;
}

function explode(x, y, color, n = 14, force = 1.5) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * force;
    g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, life: 20 + Math.random() * 25, c: color });
  }
}

function addScore(n) {
  g.score += n;
  if (g.score >= g.nextLife) {
    g.nextLife += EXTRA_LIFE_EVERY;
    g.lives++;
    sfx.extraLife();
  }
  if (g.score > g.hi) g.hi = g.score;
}

function killPlayer() {
  const p = g.player;
  p.alive = false;
  p.dead = 120;
  g.lives--;
  g.spits = [];
  explode(p.x + 4, p.y + 3, 'G', 30, 2.2);
  explode(p.x + 4, p.y + 3, 'W', 15, 1.4);
  sfx.die();
}

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---- update ---------------------------------------------------------------

function updateStars() {
  for (const s of stars) {
    s.y += s.v;
    s.tw++;
    if (s.y > GROUND - 2) { s.y = TOP; s.x = Math.random() * W; }
  }
}

function updateParts() {
  for (const p of g.parts) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04;
    p.life--;
  }
  g.parts = g.parts.filter((p) => p.life > 0 && p.y < GROUND);
}

function updatePlayer() {
  const p = g.player;
  if (!p.alive) {
    if (--p.dead <= 0) {
      if (g.lives > 0) resetPlayer();
      else gameOver();
    }
    return;
  }
  if (held.has('left')) p.x -= 1.7;
  if (held.has('right')) p.x += 1.7;
  p.x = Math.max(0, Math.min(W - 9, p.x));
  if (p.inv > 0) p.inv--;
  if (p.cool > 0) p.cool--;
  if (held.has('fire') && p.cool === 0 && g.bullets.length < 2) {
    g.bullets.push({ x: Math.round(p.x) + 4, y: p.y - 4, w: 1, h: 4 });
    p.cool = 10;
    sfx.shoot();
    if (g.state === 'play' && g.def.onShot) g.def.onShot(g);
  }
}

function updatePlay() {
  const p = g.player;
  updatePlayer();

  const def = g.def;
  const spawning = def.duration ? g.elapsed < def.duration : g.spawned < def.total;
  if (g.state === 'play') {
    g.elapsed++;
    if (spawning && g.bugs.length < def.maxAlive && --g.spawnTimer <= 0) {
      spawnBug();
      g.spawnTimer = def.spawnEvery || 35;
    }
  }

  for (const b of g.bugs) {
    b.t++;
    if (b.flash) b.flash--;
    def.update(b, g);
  }

  for (const s of g.bullets) s.y -= 4;
  for (const s of g.spits) { s.x += s.vx; s.y += s.vy; }

  for (const s of g.bullets) {
    for (const b of g.bugs) {
      if (b.dead || b.gone || !b.hittable || !overlap(s, b)) continue;
      s.dead = true;
      b.hp = (b.hp ?? 1) - 1;
      if (b.hp > 0) {
        b.flash = 6;
        explode(s.x, s.y, 'W', 4, 0.8);
        sfx.clink();
        break;
      }
      b.dead = true;
      g.killed++;
      addScore(b.points ?? def.points);
      explode(b.x + b.w / 2, b.y + b.h / 2, def.color, 8 + b.w);
      explode(b.x + b.w / 2, b.y + b.h / 2, 'W', 5, 1);
      sfx[def.killSound || 'hit']();
      break;
    }
  }

  if (p.alive && p.inv === 0) {
    const hb = { x: p.x + 1, y: p.y + 1, w: 7, h: 6 };
    const hitBySpit = g.spits.some((s) => overlap({ x: s.x, y: s.y, w: 1, h: 3 }, hb));
    const hitByBug = g.bugs.some((b) => !b.dead && !b.gone && b.hittable && overlap(b, hb));
    if (hitBySpit || hitByBug) killPlayer();
  }

  g.bullets = g.bullets.filter((s) => !s.dead && s.y > TOP - 4);
  g.spits = g.spits.filter((s) => s.y < GROUND && s.x > -2 && s.x < W + 2);
  g.bugs = g.bugs.filter((b) => !b.dead && !b.gone);

  const done = def.duration ? g.elapsed >= def.duration && g.bugs.length === 0 : g.killed >= def.total;
  if (g.state === 'play' && done && p.alive) {
    g.state = 'clear';
    g.timer = 120;
    g.spits = [];
    if (def.bonus) {
      addScore(def.bonus);
      g.bonusShown = def.bonus;
    }
    sfx.waveClear();
  }
}

function gameOver() {
  g.state = 'over';
  g.timer = 240;
  sfx.gameOver();
}

// ---- high scores ----------------------------------------------------------

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function refreshScores() {
  fetchScores()
    .then((rows) => {
      g.table = rows;
      g.tableStatus = 'ok';
      g.hi = Math.max(g.hi, rows[0]?.score || 0);
    })
    .catch(() => { g.tableStatus = 'offline'; });
}

function toTitle() {
  g.state = 'title';
  g.timer = 0;
}

function afterGameOver() {
  if (qualifies(g.table, g.score)) {
    g.state = 'initials';
    g.timer = 0;
    g.entry = { letters: ['A', 'A', 'A'], pos: 0, saving: false };
    sfx.extraLife();
  } else {
    toTitle();
  }
}

// Keyboard letters go straight into the current slot; arrows + fire work for touch.
function typeInitial(code) {
  const en = g.entry;
  if (!en || en.saving || g.timer < 30) return false;
  if (/^Key[A-Z]$/.test(code)) {
    en.letters[en.pos] = code[3];
    if (en.pos < 2) en.pos++;
    sfx.note(880, 0.04);
    return true;
  }
  if (code === 'Backspace') {
    en.pos = Math.max(0, en.pos - 1);
    return true;
  }
  return false;
}

function updateInitials() {
  const en = g.entry;
  if (en.saving || g.timer < 30) return;
  const step = justPressed('left') ? -1 : justPressed('right') ? 1 : 0;
  if (step) {
    en.letters[en.pos] = ALPHA[(ALPHA.indexOf(en.letters[en.pos]) + step + 26) % 26];
    sfx.note(660, 0.03);
  }
  if (justPressed('fire') || justPressed('start')) {
    if (en.pos < 2) {
      en.pos++;
      sfx.note(880, 0.04);
    } else {
      submitEntry();
    }
  }
}

function submitEntry() {
  const en = g.entry;
  en.saving = true;
  const entry = { initials: en.letters.join(''), score: g.score, wave: g.waveNum + 1 };
  submitScore(entry)
    .then((rows) => {
      g.table = rows;
      g.tableStatus = 'ok';
      g.saveError = false;
      g.hi = Math.max(g.hi, rows[0]?.score || 0);
    })
    .catch(() => { g.saveError = true; })
    .finally(() => {
      g.highlight = entry;
      g.state = 'scores';
      g.timer = 0;
      sfx.waveClear();
    });
}

function update() {
  g.t++;
  if (justPressed('mute')) toggleMute();
  if (justPressed('crt')) frameEl.classList.toggle('crt');

  if (g.state === 'cutscene') {
    updateStars();
    g.scene.update(g.timer, sfx);
    if (++g.timer >= g.scene.length || (g.timer > 30 && (justPressed('fire') || justPressed('start')))) startWave();
  } else if (g.state === 'title') {
    updateStars();
    // Attract mode alternates the title page with the high-score table.
    if (++g.timer % TITLE_CYCLE === TABLE_AT) refreshScores();
    if (justPressed('fire') || justPressed('start')) newGame();
  } else if (g.state === 'over') {
    updateStars();
    updateParts();
    if (--g.timer <= 0 || (g.timer < 180 && (justPressed('fire') || justPressed('start')))) afterGameOver();
  } else if (g.state === 'initials') {
    updateStars();
    g.timer++;
    updateInitials();
  } else if (g.state === 'scores') {
    updateStars();
    if (++g.timer > SCORES_HOLD || (g.timer > 30 && (justPressed('fire') || justPressed('start')))) {
      g.highlight = null;
      toTitle();
    }
  } else {
    if (justPressed('pause') || (g.paused && justPressed('start'))) g.paused = !g.paused;
    if (!g.paused) {
      updateStars();
      updateParts();
      updatePlay();
      if (g.state === 'intro' && --g.timer <= 0) g.state = 'play';
      if (g.state === 'clear' && --g.timer <= 0 && g.player.alive) {
        g.waveNum++;
        if (g.waveNum % WAVES.length === 0) startCutscene();
        else startWave();
      }
    }
  }
  pressed.clear();
}

// ---- render ---------------------------------------------------------------

const pad = (n, len = 6) => String(n).padStart(len, '0');

function drawStars() {
  for (const s of stars) {
    if ((s.tw >> 4) % 7 === 0) continue;
    ctx.fillStyle = PAL[s.c];
    ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
  }
}

function drawHud() {
  text(ctx, 'SCORE ' + pad(g.score), 2, 1, 'W');
  centerText(ctx, 'HI ' + pad(g.hi), 1, 'O');
  if (!['title', 'scores', 'initials'].includes(g.state)) text(ctx, 'WAVE ' + pad(g.waveNum + 1, 2), W - 32, 1, 'B');
}

function drawGround() {
  ctx.fillStyle = PAL.G;
  ctx.fillRect(0, GROUND, W, 1);
  for (let i = 0; i < Math.min(g.lives - (g.player.alive ? 1 : 0), 8); i++) {
    ctx.drawImage(SPR.ship[0], 2 + i * 12, GROUND + 2);
  }
  if (g.state !== 'title' && g.state !== 'cutscene' && g.def) {
    if (g.def.duration) {
      const secs = Math.ceil(Math.max(0, g.def.duration - g.elapsed) / 60);
      text(ctx, 'TIME ' + pad(secs, 2), W - 36, GROUND + 3, 'O');
    } else {
      text(ctx, 'BUGS ' + pad(Math.max(0, g.def.total - g.killed), 2), W - 36, GROUND + 3, 'V');
    }
  }
}

function drawBug(b, def) {
  if (def.thread) {
    ctx.fillStyle = PAL.W;
    const cx = Math.round(b.x + b.w / 2);
    for (let y = TOP; y < b.y; y += 2) ctx.fillRect(cx, y, 1, 1);
  }
  const name = b.spr || def.sprite;
  const frames = (b.flash && SPR[name + 'Hit']) || SPR[name];
  ctx.drawImage(frames[b.frame % frames.length], Math.round(b.x), Math.round(b.y));
}

function drawPlay() {
  // Keep things entering from the top from drawing over the HUD.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP - 2, W, H);
  ctx.clip();
  for (const b of g.bugs) drawBug(b, g.def);
  ctx.restore();

  ctx.fillStyle = PAL.W;
  for (const s of g.bullets) ctx.fillRect(s.x, Math.round(s.y), 1, 4);
  for (const s of g.spits) {
    ctx.fillStyle = (g.t >> 2) & 1 ? PAL.O : PAL.V;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 3);
  }

  const p = g.player;
  if (p.alive && !(p.inv > 0 && (p.inv >> 2) & 1)) ctx.drawImage(SPR.ship[0], Math.round(p.x), p.y);

  for (const q of g.parts) {
    ctx.fillStyle = PAL[q.c];
    ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
  }

  if (g.state === 'intro') {
    centerText(ctx, 'WAVE ' + (g.waveNum + 1), 70, 'W', 2);
    if ((g.timer >> 3) & 1) centerText(ctx, g.def.name, 88, g.def.color, 2);
  } else if (g.state === 'clear') {
    centerText(ctx, 'WAVE CLEAR!', 78, 'G', 2);
    if (g.bonusShown) centerText(ctx, 'BONUS ' + g.bonusShown, 96, 'O', 2);
  }
  if (g.paused) centerText(ctx, 'PAUSED', 84, 'W', 2);
}

function drawTitle() {
  centerText(ctx, 'SPACE BUGS', 19, 'V', 4);
  centerText(ctx, 'SPACE BUGS', 18, 'G', 4);

  WAVES.forEach((def, i) => {
    const y = 45 + i * 12;
    const frames = SPR[def.icon || def.sprite];
    const img = frames[(g.t >> 4) & (frames.length - 1)];
    ctx.drawImage(img, 86 - Math.ceil(img.width / 2), y + 3 - Math.floor(img.height / 2));
    text(ctx, def.name, 100, y + 1, def.color);
    text(ctx, def.label || String(def.points).padStart(4, ' ') + ' PTS', 150, y + 1, 'W');
  });

  if ((g.t >> 5) & 1) centerText(ctx, 'PRESS SPACE TO PLAY', 142, 'W');
  centerText(ctx, 'ARROWS MOVE   SPACE FIRES', 156, 'B');
  centerText(ctx, 'P PAUSE   M MUTE   C CRT', 166, 'B');
  const secs = Math.ceil((TABLE_AT - (g.timer % TITLE_CYCLE)) / 60);
  text(ctx, 'TOP 10 SCORES IN ' + secs + 'S', 4, 186, 'V');
  ctx.drawImage(SPR.ship[0], 136, PLAYER_Y);
}

const TITLE_CYCLE = 1200;
const SCORES_HOLD = 900;
const TABLE_AT = 720;

function drawTable() {
  centerText(ctx, 'HIGH SCORES', 20, 'G', 2);
  if (!g.table.length) {
    const msg = g.tableStatus === 'loading' ? 'LOADING...' : g.tableStatus === 'offline' ? 'SCORES OFFLINE' : 'NO SCORES YET';
    centerText(ctx, msg, 80, 'W', 2);
  }
  let marked = false;
  g.table.forEach((r, i) => {
    const mine = !marked && g.highlight && r.initials === g.highlight.initials && r.score === g.highlight.score;
    if (mine) marked = true;
    const color = mine ? ((g.t >> 3) & 1 ? 'G' : 'V') : i === 0 ? 'O' : 'W';
    const y = 40 + i * 12;
    // Fixed columns, since W and M are wider than other letters.
    const rank = i + 1 + '.';
    text(ctx, rank, 81 - textWidth(rank, 2), y, color, 2);
    text(ctx, r.initials, 91, y, color, 2);
    text(ctx, pad(r.score), 137, y, color, 2);
    text(ctx, 'W' + pad(r.wave, 2), 197, y, color, 2);
  });
  let footer = isShared ? 'GALACTIC TOP 10' : 'THIS DEVICE ONLY';
  if (g.tableStatus === 'offline') footer = 'SCORES OFFLINE';
  if (g.saveError && g.state === 'scores') footer = 'COULD NOT SAVE SCORE';
  centerText(ctx, footer, 166, 'B');
  const left = g.state === 'scores' ? SCORES_HOLD - g.timer : TITLE_CYCLE - (g.timer % TITLE_CYCLE);
  text(ctx, 'INSTRUCTIONS IN ' + Math.max(1, Math.ceil(left / 60)) + 'S', 4, 186, 'V');
}

function drawInitials() {
  const en = g.entry;
  centerText(ctx, 'NEW HIGH SCORE!', 28, 'O', 2);
  centerText(ctx, pad(g.score), 48, 'W', 2);
  centerText(ctx, 'ENTER YOUR INITIALS', 72, 'B');
  // Slots are wide enough for W and M; narrower letters are centered in theirs.
  const x0 = Math.floor((W - 68) / 2);
  en.letters.forEach((ch, i) => {
    text(ctx, ch, x0 + i * 24 + (20 - textWidth(ch, 4)) / 2, 88, i === en.pos ? 'G' : 'W', 4);
  });
  if (!en.saving && (g.t >> 4) & 1) {
    ctx.fillStyle = PAL.G;
    ctx.fillRect(x0 + en.pos * 24, 110, 20, 2);
  }
  if (en.saving) centerText(ctx, 'SAVING...', 128, 'W', 2);
  else {
    centerText(ctx, 'TYPE OR USE LEFT RIGHT', 128, 'B');
    centerText(ctx, 'FIRE OR ENTER TO SET', 138, 'B');
  }
}

function render() {
  ctx.fillStyle = PAL.K;
  ctx.fillRect(0, 0, W, H);
  drawStars();
  drawHud();
  if (g.state === 'title' || g.state === 'scores' || g.state === 'initials') {
    if (g.state === 'initials') drawInitials();
    else if (g.state === 'scores' || g.timer % TITLE_CYCLE >= TABLE_AT) drawTable();
    else drawTitle();
    ctx.fillStyle = PAL.G;
    ctx.fillRect(0, GROUND, W, 1);
    return;
  }
  drawGround();
  if (g.state === 'cutscene') {
    drawCutsceneFrame(ctx, g.scene, g.timer);
    return;
  }
  drawPlay();
  if (g.state === 'over') {
    centerText(ctx, 'GAME OVER', 80, 'O', 3);
  }
}

// ---- sizing & loop --------------------------------------------------------

function fit() {
  const controls = document.getElementById('touch');
  const reserve = controls && getComputedStyle(controls).display !== 'none' ? controls.offsetHeight + 16 : 0;
  const s = Math.min((innerWidth - 32) / W, (innerHeight - 32 - reserve) / H);
  const k = s >= 2 ? Math.floor(s) : Math.max(s, 1);
  canvas.style.width = W * k + 'px';
  canvas.style.height = H * k + 'px';
  frameEl.style.setProperty('--px', k + 'px');
}
addEventListener('resize', fit);
fit();
refreshScores();

const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;
function loop(now) {
  acc += Math.min(now - last, 250);
  last = now;
  while (acc >= STEP) {
    update();
    acc -= STEP;
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Hook for automated checks in the browser console.
window.__spacebugs = g;
