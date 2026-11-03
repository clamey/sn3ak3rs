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
// A ship held by a grabber Bouncer turns orange to match it.
RAW.shipCaptive = RAW.ship.map((rows) => rows.map((r) => r.replace(/G/g, 'O')));

export const SPR = {};
for (const [name, frames] of Object.entries(RAW)) SPR[name] = frames.map(makeSprite);

// 5-row bitmap font, rows separated by spaces.
const GLYPHS = {
  A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##',
  D: '##. #.# #.# #.# ##.', E: '### #.. ##. #.. ###', F: '### #.. ##. #.. #..',
  G: '.## #.. #.# #.# .##', H: '#.# #.# ### #.# #.#', I: '### .#. .#. .#. ###',
  J: '..# ..# ..# #.# .#.', K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###',
  M: '#...# ##.## #.#.# #...# #...#', N: '##. #.# #.# #.# #.#', O: '.#. #.# #.# #.# .#.',
  P: '##. #.# ##. #.. #..', Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#',
  S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.', U: '#.# #.# #.# #.# ###',
  V: '#.# #.# #.# #.# .#.', W: '#...# #...# #.#.# #.#.# .#.#.', X: '#.# #.# .#. #.# #.#',
  Y: '#.# #.# .#. .#. .#.', Z: '### ..# .#. #.. ###',
  0: '### #.# #.# #.# ###', 1: '.#. ##. .#. .#. ###', 2: '##. ..# .#. #.. ###',
  3: '##. ..# .#. ..# ##.', 4: '#.# #.# ### ..# ..#', 5: '### #.. ##. ..# ##.',
  6: '.## #.. ### #.# ###', 7: '### ..# .#. .#. .#.', 8: '### #.# ### #.# ###',
  9: '### #.# ### ..# ##.',
  '-': '... ... ### ... ...', '!': '.#. .#. .#. ... .#.', '.': '... ... ... ... .#.',
  ':': '... .#. ... .#. ...', '(': '.#. #.. #.. #.. .#.', ')': '.#. ..# ..# ..# .#.',
  ' ': '... ... ... ... ...',
};
// Glyphs are 3 wide except where that can't be read (W, M), which get 5.
const FONT = {};
for (const [ch, g] of Object.entries(GLYPHS)) FONT[ch] = g.split(' ');

const glyph = (ch) => FONT[ch] || FONT[' '];

export function textWidth(str, scale = 1) {
  let w = 0;
  for (const ch of str.toUpperCase()) w += (glyph(ch)[0].length + 1) * scale;
  return w - scale;
}

export function text(ctx, str, x, y, color = 'W', scale = 1) {
  ctx.fillStyle = PAL[color];
  for (const ch of str.toUpperCase()) {
    const rows = glyph(ch);
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '#') ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
      }
    });
    x += (rows[0].length + 1) * scale;
  }
}

export function centerText(ctx, str, y, color = 'W', scale = 1) {
  text(ctx, str, Math.floor((W - textWidth(str, scale)) / 2), y, color, scale);
}
