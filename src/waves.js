// Wave definitions. Each wave is one species of space bug with its own movement.
// spawn(g) returns a new bug's state; update(b, g) runs once per 60Hz tick.

import { W, SPR } from './gfx.js';

export const TOP = 10;
export const GROUND = 184;

const ROCK = {
  S: { spr: 'rockS', hp: 1, points: 20, speed: [1.5, 2.2], spin: 6 },
  M: { spr: 'rockM', hp: 2, points: 40, speed: [1.0, 1.4], spin: 10 },
  L: { spr: 'rockL', hp: 3, points: 60, speed: [0.6, 0.9], spin: 16 },
};

const rand = (a, b) => a + Math.random() * (b - a);
const sign = () => (Math.random() < 0.5 ? -1 : 1);

function aimAt(g, b, speed) {
  const p = g.player;
  const dx = p.x + 4 - (b.x + b.w / 2);
  const dy = p.y - (b.y + b.h);
  const d = Math.hypot(dx, dy) || 1;
  g.spit(b.x + b.w / 2, b.y + b.h, (dx / d) * speed, (dy / d) * speed);
}

export const WAVES = [
  {
    name: 'DRIFTERS', sprite: 'drifter', color: 'V', points: 50, total: 14, maxAlive: 6,
    spawn(g) {
      const dir = sign();
      return {
        x: dir > 0 ? -9 : W, baseY: rand(18, 70), phase: rand(0, Math.PI * 2),
        vx: dir * rand(0.5, 0.9) * g.spd,
      };
    },
    update(b, g) {
      b.x += b.vx;
      if (b.x > W) b.x = -b.w;
      if (b.x < -b.w) b.x = W;
      b.baseY += 0.04 * g.spd;
      if (b.baseY > 140) b.baseY = 18;
      b.y = b.baseY + Math.sin(b.t * 0.07 + b.phase) * 12;
      b.frame = (b.t >> 3) & 1;
      if (Math.random() < 0.004 * g.spd) g.spit(b.x + 4, b.y + 5, 0, 1.3 * g.spd);
    },
  },
  {
    name: 'BOUNCERS', sprite: 'bouncer', color: 'O', points: 75, total: 14, maxAlive: 6,
    spawn(g) {
      return { x: rand(10, W - 20), y: TOP, vx: sign() * rand(0.7, 1.2) * g.spd, vy: rand(0.5, 0.9) * g.spd };
    },
    update(b, g) {
      b.x += b.vx;
      b.y += b.vy;
      if ((b.x < 0 && b.vx < 0) || (b.x > W - b.w && b.vx > 0)) b.vx = -b.vx;
      if ((b.y < TOP && b.vy < 0) || (b.y > 150 && b.vy > 0)) b.vy = -b.vy;
      b.frame = (b.t >> 2) & 1;
      if (Math.random() < 0.003 * g.spd) g.spit(b.x + 3, b.y + 7, 0, 1.4 * g.spd);
    },
  },
  {
    // A swaying row that steps down every time the player fires, hit or miss. Waiting doesn't
    // help either: they creep down slowly on their own. Reaching the ground costs a ship and
    // sends the creeper back to the top.
    name: 'CREEPERS', sprite: 'creeper', color: 'G', points: 100, total: 10, maxAlive: 10, spawnEvery: 4,
    spawn(g) {
      // Late arrivals join the row at its current height.
      const y = g.bugs.length ? g.bugs[0].ty : TOP + 14;
      return { homeX: 14 + g.spawned * 26, y, ty: y };
    },
    onShot(g) {
      for (const b of g.bugs) b.ty += 3 * g.spd;
      g.sfx.creep();
    },
    update(b, g) {
      b.ty += 0.008 * g.spd;
      b.y = Math.min(b.ty, b.y + 0.6);
      b.x = b.homeX + Math.sin(g.t * 0.03) * 10;
      b.frame = (b.t >> 4) & 1;
      if (b.y + b.h >= GROUND) {
        g.burst(b.x + b.w / 2, GROUND - 2, 'G', 16);
        g.hurt();
        // Landing doesn't count as a kill: it goes back to the top and the wave goes on.
        b.y = b.ty = TOP + 14;
      }
    },
  },
  {
    name: 'DANGLERS', sprite: 'dangler', color: 'W', points: 100, total: 12, maxAlive: 5, thread: true,
    spawn() {
      const x = rand(8, W - 17);
      return { x, anchorX: x, y: TOP - 5, state: 'down', st: 0, targetY: rand(40, 140) };
    },
    update(b, g) {
      b.st++;
      if (b.state === 'down') {
        b.y += 1.1 * g.spd;
        if (b.y >= b.targetY) { b.state = 'sway'; b.st = 0; b.timer = rand(60, 150); }
      } else if (b.state === 'sway') {
        b.x = b.anchorX + Math.sin(b.st * 0.09) * 6;
        if (Math.random() < 0.012 * g.spd) aimAt(g, b, 1.5 * g.spd);
        if (--b.timer <= 0) b.state = 'up';
      } else {
        b.y -= 1.6 * g.spd;
        if (b.y <= TOP - 5) {
          b.anchorX = b.x = rand(8, W - 17);
          b.targetY = rand(40, 140);
          b.state = 'down';
        }
      }
      b.frame = b.state === 'sway' ? (b.t >> 3) & 1 : 0;
    },
  },
  {
    // Survival wave: rocks never fire, the threat is getting crushed. Lasts `duration` ticks
    // instead of counting kills; surviving pays `bonus`. Bigger rocks are slower but tougher.
    name: 'ROCK STORM', sprite: 'rockL', icon: 'rockM', color: 'O', label: '1000 BONUS',
    duration: 30 * 60, bonus: 1000, maxAlive: 9, spawnEvery: 18, killSound: 'crumble',
    spawn(g) {
      const r = Math.random();
      const size = r < 0.25 ? ROCK.L : r < 0.65 ? ROCK.M : ROCK.S;
      const w = SPR[size.spr][0].width;
      const h = SPR[size.spr][0].height;
      return {
        spr: size.spr, w, h, hp: size.hp, points: size.points, spin: size.spin,
        x: rand(0, W - w), y: TOP - h, vx: rand(-0.4, 0.4), vy: rand(...size.speed) * g.spd,
      };
    },
    update(b, g) {
      b.x += b.vx;
      b.y += b.vy;
      if ((b.x < 0 && b.vx < 0) || (b.x > W - b.w && b.vx > 0)) b.vx = -b.vx;
      b.frame = Math.floor(b.t / b.spin) & 1;
      if (b.y + b.h >= GROUND) {
        b.gone = true;
        g.burst(b.x + b.w / 2, GROUND - 1, 'O', 4 + b.w);
        g.sfx.thud();
      }
    },
  },
  {
    name: 'BLINKERS', sprite: 'blinker', color: 'B', points: 150, total: 12, maxAlive: 5,
    spawn() {
      return { x: rand(8, W - 15), y: rand(20, 130), lit: false, timer: rand(10, 60), hittable: false };
    },
    update(b, g) {
      if (--b.timer <= 0) {
        b.lit = !b.lit;
        if (b.lit) {
          b.x = rand(8, W - 15);
          b.y = rand(20, 130);
          b.timer = 80 / g.spd;
          b.shot = false;
          g.sfx.blink();
        } else {
          b.timer = rand(30, 60);
        }
      }
      if (b.lit && !b.shot && b.timer < 40 / g.spd) { b.shot = true; aimAt(g, b, 1.6 * g.spd); }
      b.hittable = b.lit;
      b.spr = b.lit ? 'blinker' : 'blinkerDark';
      b.frame = (b.t >> 2) & 1;
    },
  },
  {
    name: 'DIVERS', sprite: 'diver', color: 'O', points: 125, total: 12, maxAlive: 5,
    spawn(g) {
      return { x: rand(10, W - 17), y: -8, py: rand(14, 34), vx: sign() * 0.9 * g.spd, state: 'patrol', timer: rand(60, 180) };
    },
    update(b, g) {
      if (b.state === 'patrol') {
        b.y += (b.py - b.y) * 0.08;
        b.x += b.vx;
        if ((b.x < 0 && b.vx < 0) || (b.x > W - b.w && b.vx > 0)) b.vx = -b.vx;
        if (--b.timer <= 0) { b.state = 'dive'; b.vy = 0.4; g.sfx.dive(); }
      } else {
        b.vy = Math.min(b.vy + 0.06 * g.spd, 3.2 * g.spd);
        const dx = g.player.x + 1 - b.x;
        b.x += Math.max(-1.2, Math.min(1.2, dx * 0.03)) * g.spd;
        b.y += b.vy;
        if (b.y > GROUND + 10) {
          b.y = -8;
          b.py = rand(14, 34);
          b.state = 'patrol';
          b.timer = rand(60, 180);
        }
      }
      b.frame = (b.t >> 2) & 1;
    },
  },
  {
    name: 'HOPPERS', sprite: 'hopper', color: 'B', points: 200, total: 12, maxAlive: 4,
    spawn(g) {
      const dir = sign();
      return { x: dir > 0 ? -7 : W, y: GROUND - 5, vx: dir * rand(0.6, 1.0) * g.spd, vy: -rand(2.6, 3.4), air: true };
    },
    update(b, g) {
      if (b.air) {
        b.vy += 0.06;
        b.x += b.vx;
        b.y += b.vy;
        if ((b.x < 0 && b.vx < 0) || (b.x > W - b.w && b.vx > 0)) b.vx = -b.vx;
        if (b.y >= GROUND - b.h) {
          b.y = GROUND - b.h;
          b.air = false;
          b.timer = rand(15, 45) / g.spd;
          g.sfx.thud();
        }
      } else if (--b.timer <= 0) {
        const toward = Math.sign(g.player.x - b.x) || 1;
        const dir = Math.random() < 0.7 ? toward : -toward;
        b.vx = dir * rand(0.5, 1.1) * g.spd;
        b.vy = -rand(2.4, 3.4) * Math.sqrt(g.spd);
        b.air = true;
      }
      b.frame = b.air ? 0 : 1;
    },
  },
];
