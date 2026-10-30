# Space Bugs

An original fixed-screen shooter in the style of early-'80s Apple II games. It has a 280×192
hi-res screen, the six-color hi-res palette, clicky 1-bit speaker-style sound, and eight waves:
seven species of space bug that each move in their own way, plus a rock storm to survive.

Plain HTML, CSS and JavaScript (ES modules). No build step, no dependencies.

## Play

| Key | Action |
| --- | --- |
| ← → / A D | Move |
| Space / ↑ / W | Fire |
| Enter | Start |
| P | Pause |
| M | Mute |
| C | Toggle CRT effect (scanlines, bloom) |

Touch devices get on-screen ◀ FIRE ▶ buttons.

### The bugs

| Wave | Bug | Behavior | Points |
| --- | --- | --- | --- |
| 1 | Drifters | Flutter sideways in a sine wave, wrap around the screen, sink slowly | 50 |
| 2 | Bouncers | Ricochet around the upper screen | 75 |
| 3 | Creepers | A swaying row that steps down every time you fire, hit or miss, and creeps down slowly anyway. One reaching the ground costs a ship and climbs back to the top | 100 |
| 4 | Danglers | Drop on silk threads, sway and spit at you, then climb back up | 100 |
| 5 | Rock Storm | 30-second survival wave. Small, medium and large rocks fall and tumble but never fire. Large rocks take 3 hits, medium 2, small 1 (60/40/20 pts) | 1000 bonus |
| 6 | Blinkers | Only hittable while lit; teleport each time they light up and fire an aimed shot | 150 |
| 7 | Divers | Patrol the top, then dive and steer toward you | 125 |
| 8 | Hoppers | Leap along the ground in arcs. Shoot them mid-air | 200 |

After wave 8 you get a short comic intermission (three rotate: *Bug Boogie*, *Hopper's Bad Day*,
*Infiltration*; Space skips), then the cycle repeats 25% faster. You get an extra ship every 10,000 points.
The high score is saved in `localStorage`.

## Run locally

ES modules don't load from `file://`, so serve the folder:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main`.
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Layout

```
index.html        canvas + touch controls
src/main.js       game loop (fixed 60Hz step), state machine, input, rendering
src/waves.js      one entry per wave: spawn() + update() (kill-count or timed)
src/cutscenes.js  timeline-scripted intermissions shown between loops
src/gfx.js        palette, string-art sprites, 3x5 bitmap font
src/audio.js      Web Audio square-wave / 1-bit noise sound effects
src/style.css     scaling, bezel, CRT overlay
```
