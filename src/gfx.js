// Apple II hi-res flavored graphics: 280x192, six-color palette, bitmap sprites and font.

export const W = 280;
export const H = 192;

export const PAL = {
  K: '#000000',
  W: '#ffffff',
  G: '#14f53c',
  V: '#ff44fd',
  O: '#ff6a3c',
  B: '#14cffd',
};

// Sprites are drawn as strings: one char per pixel, '.' is transparent, other chars index PAL.
function makeSprite(rows) {
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const x = c.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, i) => {
      if (ch === '.') return;
      x.fillStyle = PAL[ch];
      x.fillRect(i, y, 1, 1);
    });
  });
  return c;
}

const RAW = {
  ship: [[
    '....W....',
    '....W....',
    '...WWW...',
    '..GWBWG..',
    '.GGWWWGG.',
    'GGGGGGGGG',
    'G.G...G.G',
  ]],
  drifter: [[
    'V.......V',
    'VV..W..VV',
    'VVVWWWVVV',
    '.VVWWWVV.',
    '..V.W.V..',
  ], [
    '.........',
    'VVV.W.VVV',
    'VVVWWWVVV',
    '..VWWWV..',
    '....W....',
  ]],
  bouncer: [[
    'O.....O',
    '.O...O.',
    '..OOO..',
    '.OWOWO.',
    'OOOOOOO',
    '.OOOOO.',
    'O..O..O',
  ], [
    '.O...O.',
    '.O...O.',
    '..OOO..',
    '.OWOWO.',
    'OOOOOOO',
    '.OOOOO.',
    '.O.O.O.',
  ]],
  dangler: [[
    'W.W...W.W',
    '.W.WVW.W.',
    '..WVVVW..',
    '.W.WVW.W.',
    'W.W...W.W',
  ], [
    '.W.....W.',
    'W.WWVWW.W',
    '..WVVVW..',
    'W.WWVWW.W',
    '.W.....W.',
  ]],
  blinker: [[
    '..B.B..',
    '...W...',
    '.BWWWB.',
    'BB.G.BB',
    '...G...',
    '..GGG..',
  ], [
    '.B...B.',
    '..BWB..',
    '.BWWWB.',
    '.B.G.B.',
    '..GGG..',
    '.GGGGG.',
  ]],
  blinkerDark: [[
    '.......',
    '.......',
    '..B.B..',
    '.......',
    '.......',
    '.......',
  ]],
  diver: [[
    'W.....W',
    '.W...W.',
    '..OOO..',
    '.OWOWO.',
    '..OOO..',
    '..WWW..',
    '..OOO..',
    '...O...',
  ], [
    '.......',
    'WW...WW',
    '..OOO..',
    '.OWOWO.',
    '..OOO..',
    '..WWW..',
    '..OOO..',
    '...O...',
  ]],
  creeper: [[
    '.G.....G.',
    '..GGGGG..',
    '.GVGGGVG.',
    'GGGGGGGGG',
    'G.G.G.G.G',
  ], [
    'G.......G',
    '.GGGGGGG.',
    '.GVGGGVG.',
    'GGGGGGGGG',
    '.G.G.G.G.',
  ]],
  hopperFlat: [[
    '.BWBBBWB.',
    'BBBBBBBBB',
  ]],
  note: [[
    '.WW',
    '.W.',
    '.W.',
    'WW.',
    'WW.',
  ]],
  hopper: [[
    '..BBB..',
    '.BWBWB.',
    'BBBBBBB',
    '.B...B.',
    'B.....B',
  ], [
    '..BBB..',
    '.BWBWB.',
    'BBBBBBB',
    '..B.B..',
    '..B.B..',
  ]],
};

// Rocks tumble by alternating with a 180-degree rotation of themselves.
const ROCKS = {
  rockS: [
    '.OOO.',
    'OOWOO',
    'OOOOO',
    'OWOOO',
    '.OOO.',
  ],
  rockM: [
    '..OOOO...',
    '.OOWOOOO.',
    'OOOOOO.OO',
    'OOWOOOOOO',
    'OOOOOWOOO',
    'OO.OOOOOO',
    '.OOOOOWO.',
    '...OOOO..',
  ],
  rockL: [
    '....OOOOO....',
    '..OOOOWOOOO..',
    '.OOWOOOOO.OO.',
    '.OOOOOOOOOOO.',
    'OOOOO.OOOWOOO',
    'OOWOOOOOOOOOO',
    'OOOOOOOWOOO.O',
    'OO.OOOOOOOOOO',
    '.OOOOWOOOOOO.',
    '.OOOOOOO.WOO.',
    '..OOOOOOOOO..',
    '....OOOOO....',
  ],
};
const rotate180 = (rows) => rows.map((r) => [...r].reverse().join('')).reverse();
const whiteOut = (rows) => rows.map((r) => r.replace(/[^.]/g, 'W'));
for (const [name, rows] of Object.entries(ROCKS)) {
  RAW[name] = [rows, rotate180(rows)];
  RAW[name + 'Hit'] = RAW[name].map(whiteOut);
}

export const SPR = {};
for (const [name, frames] of Object.entries(RAW)) SPR[name] = frames.map(makeSprite);

// 3x5 bitmap font, rows separated by spaces.
const GLYPHS = {
  A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##',
  D: '##. #.# #.# #.# ##.', E: '### #.. ##. #.. ###', F: '### #.. ##. #.. #..',
  G: '.## #.. #.# #.# .##', H: '#.# #.# ### #.# #.#', I: '### .#. .#. .#. ###',
  J: '..# ..# ..# #.# .#.', K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###',
  M: '#.# ### ### #.# #.#', N: '##. #.# #.# #.# #.#', O: '.#. #.# #.# #.# .#.',
  P: '##. #.# ##. #.. #..', Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#',
  S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.', U: '#.# #.# #.# #.# ###',
  V: '#.# #.# #.# #.# .#.', W: '#.# #.# ### ### #.#', X: '#.# #.# .#. #.# #.#',
  Y: '#.# #.# .#. .#. .#.', Z: '### ..# .#. #.. ###',
  0: '### #.# #.# #.# ###', 1: '.#. ##. .#. .#. ###', 2: '##. ..# .#. #.. ###',
  3: '##. ..# .#. ..# ##.', 4: '#.# #.# ### ..# ..#', 5: '### #.. ##. ..# ##.',
  6: '.## #.. ### #.# ###', 7: '### ..# .#. .#. .#.', 8: '### #.# ### #.# ###',
  9: '### #.# ### ..# ##.',
  '-': '... ... ### ... ...', '!': '.#. .#. .#. ... .#.', '.': '... ... ... ... .#.',
  ':': '... .#. ... .#. ...', '(': '.#. #.. #.. #.. .#.', ')': '.#. ..# ..# ..# .#.',
  ' ': '... ... ... ... ...',
};
const FONT = {};
for (const [ch, g] of Object.entries(GLYPHS)) FONT[ch] = g.replaceAll(' ', '');

export function textWidth(str, scale = 1) {
  return str.length * 4 * scale - scale;
}

export function text(ctx, str, x, y, color = 'W', scale = 1) {
  ctx.fillStyle = PAL[color];
  for (const ch of str.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    for (let i = 0; i < 15; i++) {
      if (g[i] === '#') ctx.fillRect(x + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
    }
    x += 4 * scale;
  }
}

export function centerText(ctx, str, y, color = 'W', scale = 1) {
  text(ctx, str, Math.floor((W - textWidth(str, scale)) / 2), y, color, scale);
}
