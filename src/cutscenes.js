// Comic intermissions that play after each full loop of waves. Each scene is a timeline driven by `t`
// (60Hz ticks): update(t, sfx) fires sound cues, draw(ctx, t) renders the frame.

import { W, PAL, SPR, text, centerText } from './gfx.js';
import { GROUND } from './waves.js';

const clamp01 = (u) => Math.max(0, Math.min(1, u));
const lerp = (a, b, u) => a + (b - a) * clamp01(u);
const prog = (t, t0, t1) => (t - t0) / (t1 - t0);
const groundY = (name, scale = 1) => GROUND - SPR[name][0].height * scale;

function spr(ctx, name, frame, x, y, scale = 1) {
  const frames = SPR[name];
  const img = frames[frame % frames.length];
  ctx.drawImage(img, Math.round(x), Math.round(y), img.width * scale, img.height * scale);
}

// A beat-synced melody: plays `notes[i]` every `every` ticks while t is in [t0, t1).
function beat(t, sfx, t0, t1, every, notes, dur = 0.06) {
  if (t < t0 || t >= t1 || (t - t0) % every) return;
  const f = notes[((t - t0) / every) % notes.length];
  if (f) sfx.note(f, dur);
}

function caption(ctx, t, t0, str, color, y = 110) {
  if (t >= t0) centerText(ctx, str, y, color, 2);
}

const BOOGIE = [98, 0, 131, 98, 117, 0, 147, 131];

const bugBoogie = {
  length: 620,
  update(t, sfx) {
    beat(t, sfx, 60, 330, 15, BOOGIE);
    if (t === 330) sfx.scratch();
    if (t === 430) sfx.slink();
    beat(t, sfx, 520, 620, 15, BOOGIE);
  },
  draw(ctx, t) {
    const dancing = (t >= 90 && t < 330) || t >= 520;
    const sway = dancing ? ((t >> 4) & 1 ? 3 : -3) : 0;
    for (let i = 0; i < 3; i++) {
      const homeX = 96 + i * 30;
      const x = lerp(-12 - i * 30, homeX, prog(t, 0, 90)) + sway;
      const y = 70 + (dancing ? Math.abs(Math.sin(t * 0.21)) * -6 : 0);
      spr(ctx, 'drifter', t < 330 || t >= 520 ? t >> 3 : 0, x, y);
      if (t >= 340 && t < 520) text(ctx, '!', x + 3, y - 9, 'O');
    }
    if (dancing) {
      for (let k = 0; k < 4; k++) {
        const nt = (t + k * 11) % 40;
        spr(ctx, 'note', 0, 92 + k * 26 + Math.sin(nt * 0.2) * 2, 62 - nt * 0.6);
      }
    }
    // The ship's moves are off the beat, and bigger than they need to be.
    if (t >= 150 && t < 520) {
      const x = t < 430 ? lerp(W + 4, 196, prog(t, 150, 200)) : lerp(196, W + 4, prog(t, 430, 510));
      const hop = t >= 200 && t < 330 && ((t + 7) >> 3) % 3 === 0 ? 4 : 0;
      spr(ctx, 'ship', 0, x, groundY('ship') - hop);
      if (t >= 360 && t < 430) text(ctx, '...', x - 1, groundY('ship') - 9, 'W');
    }
    caption(ctx, t, 520, 'NO SHIPS ON THE', 'V', 112);
    caption(ctx, t, 520, 'DANCE FLOOR', 'V', 126);
  },
};

const hoppersBadDay = {
  length: 640,
  update(t, sfx) {
    if (t < 180 && t % 45 === 0 && t > 0) sfx.thud();
    if (t >= 185 && t < 225 && t % 10 === 0) sfx.note(t % 20 ? 1568 : 1760, 0.05);
    if (t === 228) sfx.note(1200, 0.1);
    if (t === 262) sfx.crumble();
    if (t === 380) sfx.rumble();
    if (t === 455) sfx.boing();
    if (t >= 470 && t < 560 && t % 20 === 0) sfx.note(2093 + (t % 40 ? 0 : 300), 0.03);
  },
  draw(ctx, t) {
    const shake = t >= 262 && t < 280 ? Math.round(Math.sin(t * 3) * 2) : 0;
    ctx.save();
    ctx.translate(0, shake);

    const hx = t < 180 ? lerp(-8, 130, prog(t, 0, 180)) : t < 470 ? 130 : lerp(130, W + 10, prog(t, 470, 600));
    const gy = groundY('hopper');
    if (t < 180) {
      spr(ctx, 'hopper', t % 45 < 6 ? 1 : 0, hx, gy - Math.abs(Math.sin((t * Math.PI) / 45)) * 18);
    } else if (t < 262) {
      spr(ctx, 'hopper', 1, hx, gy);
      if (t < 225) spr(ctx, 'note', 0, hx + 8, gy - 8 - ((t >> 2) % 4));
      if (t >= 228) text(ctx, '!', hx + 2, gy - 8, 'O');
      // The rock's shadow grows as it gets closer.
      const sw = Math.round(lerp(2, 26, prog(t, 200, 262)));
      ctx.fillStyle = PAL.V;
      for (let x = 0; x < sw; x += 2) ctx.fillRect(hx + 3 - sw / 2 + x, GROUND + 1, 1, 1);
    } else if (t < 455) {
      spr(ctx, 'hopperFlat', 0, hx - 1, GROUND - 2);
    } else {
      const wobble = t >= 470 ? Math.sin(t * 0.3) * 2 : 0;
      const hopY = t >= 470 ? Math.abs(Math.sin(t * 0.09)) * 8 : 0;
      spr(ctx, 'hopper', 0, hx + wobble, gy - hopY);
      for (let k = 0; k < 3; k++) {
        const a = t * 0.15 + (k * Math.PI * 2) / 3;
        ctx.fillStyle = PAL[k ? 'W' : 'O'];
        ctx.fillRect(Math.round(hx + wobble + 3 + Math.cos(a) * 6), Math.round(gy - hopY - 5 + Math.sin(a) * 2), 1, 1);
      }
    }

    // The rock: falls, sits, then rolls away to the right.
    if (t >= 200) {
      const rh = SPR.rockL[0].height * 2;
      const fall = prog(t, 230, 262);
      const ry = t < 230 ? -rh - 4 : lerp(-rh, GROUND - rh, fall * fall);
      const rx = t < 380 ? hx - 9 : lerp(hx - 9, W + 4, prog(t, 380, 450));
      spr(ctx, 'rockL', t >= 380 ? t >> 3 : 0, rx, ry, 2);
    }
    if (t >= 262 && t < 300) {
      ctx.fillStyle = PAL.O;
      for (let k = 0; k < 10; k++) {
        const d = (t - 262) * (0.5 + (k % 3) * 0.3);
        const dir = k % 2 ? 1 : -1;
        ctx.fillRect(Math.round(hx + 4 + dir * (14 + d)), Math.round(GROUND - 2 - (k % 4) - d * 0.3), 1, 1);
      }
    }
    ctx.restore();

    caption(ctx, t, 500, 'HOPPER IS OK', 'B', 104);
    if (t >= 570) centerText(ctx, 'MOSTLY', 122, 'W', 1);
  },
};

const CONGA = [196, 0, 196, 0, 196, 0, 262, 0, 220, 0, 220, 0, 220, 0, 294, 0];
const LINE = ['creeper', 'bouncer', 'drifter', 'hopper', 'diver', 'ship'];

const infiltration = {
  length: 680,
  update(t, sfx) {
    beat(t, sfx, 0, 300, 8, CONGA);
    if (t === 300) sfx.scratch();
    if (t === 400) sfx.note(330, 0.15);
    if (t === 425) sfx.whoosh();
    if (t >= 440 && t < 520 && t % 12 === 0) sfx.thud();
  },
  draw(ctx, t) {
    const lead = Math.min(-10 + t * 0.6, 170);
    const spacing = lerp(18, 11, prog(t, 300, 320));
    LINE.forEach((name, i) => {
      if (name === 'ship') return;
      const x = lead - i * spacing;
      const step = t < 300 && ((t >> 3) + i) & 1 ? 2 : 0;
      const angry = t >= 440 && t < 520 ? Math.abs(Math.sin(t * 0.25 + i)) * 6 : 0;
      const y = groundY(name) - step - angry;
      spr(ctx, name, t < 300 ? t >> 3 : 0, x, y);
      if (t >= 330 && t < 520) text(ctx, t < 380 ? '?' : '!', x + 2, y - 8, t < 380 ? 'W' : 'O');
    });

    // The ship in disguise: two antennae taped on top. They fall off when everyone turns around.
    const shipX = t < 425 ? lead - 5 * spacing : lead - 5 * spacing - (t - 425) * 4;
    const sy = groundY('ship') - (t < 300 && (t >> 3) & 1 ? 2 : 0);
    if (shipX > -12) {
      spr(ctx, 'ship', 0, shipX, sy);
      const drop = t < 400 ? 0 : Math.min(GROUND - sy - 1, (t - 400) * 0.6);
      ctx.fillStyle = PAL.G;
      ctx.fillRect(Math.round(shipX + 2), Math.round(sy - 3 + drop), 1, 3);
      ctx.fillRect(Math.round(shipX + 6), Math.round(sy - 3 + drop), 1, 3);
      ctx.fillStyle = PAL.V;
      ctx.fillRect(Math.round(shipX + 2), Math.round(sy - 4 + drop), 1, 1);
      ctx.fillRect(Math.round(shipX + 6), Math.round(sy - 4 + drop), 1, 1);
      if (t >= 380 && t < 425) text(ctx, '!', shipX + 3, sy - 12, 'W');
    }
    if (t >= 425 && t < 470) {
      ctx.fillStyle = PAL.W;
      for (let k = 0; k < 6; k++) ctx.fillRect(Math.round(shipX + 10 + k * 5 + ((t + k) % 3)), GROUND - 1 - (k % 3), 1, 1);
    }
    caption(ctx, t, 520, 'THE DISGUISE', 'G', 104);
    caption(ctx, t, 520, 'NEEDED WORK', 'G', 118);
  },
};

export const CUTSCENES = [bugBoogie, hoppersBadDay, infiltration];

export function drawCutsceneFrame(ctx, scene, t) {
  centerText(ctx, 'INTERMISSION', 18, 'B', 2);
  scene.draw(ctx, t);
  if (t > 30 && (t >> 5) & 1) centerText(ctx, 'SPACE TO SKIP', 170, 'W');
}
