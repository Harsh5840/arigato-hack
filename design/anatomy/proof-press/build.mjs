// Proof press: an Anatomy Figure. One cartridge (a dependency update) rides a rail through five stations.
// Numbers come from the recorded container demo (draft PR #1): nginx 1.26.0 to 1.30.6, five check groups,
// seven live HTTP assertions and eleven controller gates. It is an illustrative model, not a live instrument.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as k from '../vendor/kit/iso-kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../../apps/web/public/figures');
mkdirSync(out, { recursive: true });
const kitSource = readFileSync(resolve(here, '../vendor/kit/iso-kit.mjs'), 'utf8').replace(/^export /gm, '');
const theme = 'light';

const WIDTH = 760, HEIGHT = 470;
const BED = { x: -176, y: -72, w: 352, d: 144, r: 10 };
const BED_H = 12, FOOT_H = 5;
const STOPS = [-130, -65, 0, 65, 130];
const TRACK = { from: -164, to: 164 };
const P = k.fitProjection(
  [...k.boxCorners(BED, -BED_H - FOOT_H, 0), [-130, 0, 70], [130, 0, 70], [0, 0, 74], [176, 70, 12]],
  WIDTH, HEIGHT, { pad: 26, azimuth: 40, elevation: 31 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/* ---------- base: bed, feet, rails, sleepers, ruler, plate ---------- */
function base() {
  const o = [`<path class="iso-halo" d="${k.haloOf(BED, -BED_H - FOOT_H, BED_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BED, 24))) {
    o.push(S(k.cylinder(x, y, 8, -BED_H - FOOT_H, 1.8, P, 28), { tone: 'lo' }));
    o.push(S(k.cylinder(x, y, 6, -BED_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: 'mid' }));
  }
  o.push(S(k.slabOf(BED, -BED_H, BED_H, P, 9, 1.6), { tone: 'mid' }));
  o.push(L(k.planOutline(k.insetPlan(BED, 5), 0, P), { tone: 'lo' }));
  const screws = k.corners(BED, 11);
  o.push(L(screws.map(([x, y]) => k.ring(x, y, 2.3, 0, P, 16)).join(''), { tone: 'lo' }));
  o.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the front edge
  const strip = { x: -150, y: BED.y + BED.d - 16, w: 300, d: 8, r: 1 };
  o.push(S(k.slabOf(strip, 0, 0.7, P, 3), { tone: 'lo', crease: 'none' }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 6.5, 5, strip.y + 0.9, 0.7, [2.2, 4], P);
  o.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  o.push(D([at([strip.x + 2, strip.y + 4, 0.7]), at([strip.x + strip.w - 2, strip.y + 4, 0.7])], { size: 0.45 }));
  // engraved plate, back left
  const plate = { x: -150, y: BED.y + 9, w: 74, d: 15, r: 1.5 };
  o.push(S(k.slabOf(plate, 0, 0.8, P, 3), { tone: 'lo', crease: 'none' }));
  o.push(k.faceTextSvg(k.topMatrix([plate.x + plate.w / 2, plate.y + 10.2], 0.8, P, 'x'), 'PROOFPATCH', { size: 5.4, tone: 'mid', anchor: 'middle' }));
  // rails
  for (const y of [-13, 13]) {
    o.push(S(k.slabOf({ x: TRACK.from, y: y - 3, w: TRACK.to - TRACK.from, d: 6, r: 1.2 }, 0, 3, P, 3, 0.5), { tone: 'mid' }));
    const dots = [];
    for (let x = TRACK.from + 10; x <= TRACK.to - 10; x += 26) dots.push(at([x, y, 3]));
    o.push(D(dots, { size: 0.38, tone: 'lo' }));
  }
  for (const x of [TRACK.from - 5, TRACK.to]) {
    o.push(S(k.slabOf({ x, y: -20, w: 5, d: 40, r: 1.4 }, 0, 8, P, 3, 0.5), { tone: 'mid' }));
    o.push(D([at([x + 2.5, -13, 8]), at([x + 2.5, 13, 8])], { size: 0.45 }));
  }
  // station sleepers
  for (const x of STOPS) {
    const sleeper = { x: x - 22, y: -34, w: 44, d: 68, r: 3 };
    o.push(S(k.slabOf(sleeper, 0, 1.6, P, 4, 0.4), { tone: 'lo', crease: 'faint' }));
    o.push(D(k.corners(sleeper, 4).map(([px, py]) => at([px, py, 1.6])), { size: 0.4, tone: 'lo' }));
  }
  return o.join('');
}

/* ---------- gantry helper: posts (back/front) and beam ---------- */
function posts(x, h, y) {
  const o = [];
  o.push(S(k.slabOf({ x: x - 7, y: y - 7, w: 14, d: 14, r: 2 }, 1.6, 4, P, 3, 0.4), { tone: 'mid' }));
  o.push(S(k.cylinder(x, y, 4, 5.6, h - 5.6, P, 22), { tone: 'mid', crease: 'none' }));
  o.push(L([h * 0.34, h * 0.66].map((z) => k.sideArc(x, y, 4, z, P, 14)).join(''), { tone: 'faint' }));
  o.push(D([at([x - 4.2, y - 4.2, 3.6]), at([x + 4.2, y + 4.2, 3.6])], { size: 0.38 }));
  return o.join('');
}
function beam(x, z, span = 64, thick = 9) {
  const plan = { x: x - thick / 2, y: -span / 2, w: thick, d: span, r: 1.6 };
  const o = [S(k.slabOf(plan, z, 7, P, 3, 0.5), { tone: 'mid' })];
  o.push(D([at([x, -span / 2 + 5, z + 7]), at([x, span / 2 - 5, z + 7])], { size: 0.42 }));
  o.push(L(k.lineOnTop([x, -span / 2 + 9], [x, span / 2 - 9], z + 7, P), { tone: 'faint' }));
  return o.join('');
}

/* ---------- station 0: watch (scanner arch with a lens) ---------- */
function watch(x) {
  const back = posts(x, 52, -27);
  const front = posts(x, 52, 27) + beam(x, 52);
  const lens = [];
  lens.push(S(k.cylinder(x, 0, 9.5, 36, 16, P, 40, 0.6), { tone: 'hi', crease: 'lo' }));
  lens.push(L(k.knurl(x, 0, 9.5, 36, 52, 40, P, 0.3), { tone: 'lo' }));
  lens.push(L(k.sideArc(x, 0, 9.5, 44, P, 28), { tone: 'faint' }));
  lens.push(S(k.cylinder(x, 0, 6.2, 33.2, 2.8, P, 32), { tone: 'mid' }));
  lens.push(`<g data-glow="watch" opacity="0">${S(k.cylinder(x, 0, 5.2, 32.2, 1.2, P, 32), { tone: 'hi', lit: true })}</g>`);
  lens.push(S(k.cylinder(x + 0, -20, 2.6, 52, 9, P, 16), { tone: 'mid' }));
  lens.push(L(k.ring(x, -20, 1.2, 61, P, 12), { tone: 'lo' }));
  return { back, front: front + lens.join(''), ref: [x, 27], backRef: [x, -27] };
}

/* ---------- station 1: repair (tool head on guide rods) ---------- */
function repair(x) {
  const back = posts(x, 60, -27);
  const front = posts(x, 60, 27) + beam(x, 60);
  const rods = [];
  for (const dy of [-11, 11]) rods.push(S(k.cylinder(x, dy, 1.4, 22, 38, P, 14), { tone: 'hi', crease: 'none' }));
  const head = [];
  head.push(S(k.slabOf({ x: x - 8, y: -17, w: 16, d: 34, r: 2 }, 0, 6, P, 3, 0.5), { tone: 'mid' }));
  head.push(D([at([x, -13, 6]), at([x, 13, 6])], { size: 0.42 }));
  head.push(S(k.cylinder(x, 0, 3.2, 6, 5, P, 20), { tone: 'mid' }));
  head.push(S(k.cylinder(x, 0, 1.6, -6, 6, P, 16), { tone: 'hi', lit: true, crease: 'none' }));
  head.push(L(k.knurl(x, 0, 3.2, 6, 11, 14, P, 0.3), { tone: 'lo' }));
  const sleeve = S(k.cylinder(x, 0, 5.4, 52, 8, P, 24), { tone: 'mid' });
  return { back, front: front + rods.join('') + sleeve + `<g data-part="head" transform="${k.translateAlong(P, [0, 0, 40])}">${head.join('')}</g>`, ref: [x, 27], backRef: [x, -27] };
}

/* ---------- station 2: verify (hood, gate, five check lamps) ---------- */
const LAMPS = 5;
function verify(x) {
  const back = [];
  const hx = 25, hy = 29;
  back.push(S(k.slabOf({ x: x - hx, y: -hy - 3, w: 2 * hx, d: 4, r: 1 }, 1.6, 22, P, 2, 0.4), { tone: 'mid' }));
  back.push(L(k.lineOnTop([x - hx + 3, -hy - 1], [x + hx - 3, -hy - 1], 23.6, P), { tone: 'faint' }));
  for (const px of [x - hx + 4, x + hx - 4]) back.push(posts(px, 36, -hy + 1));
  const front = [];
  for (const px of [x - hx + 4, x + hx - 4]) front.push(posts(px, 36, hy - 1));
  const roof = { x: x - hx - 3, y: -hy - 4, w: 2 * hx + 6, d: 2 * hy + 8, r: 3 };
  front.push(S(k.slabOf(roof, 36, 5, P, 4, 0.7), { tone: 'hi', crease: 'lo' }));
  front.push(L(k.planOutline(k.insetPlan(roof, 3.2), 41, P, 4), { tone: 'faint' }));
  // lamp row
  const lampW = 6.6, gap = 2.2, total = LAMPS * lampW + (LAMPS - 1) * gap;
  for (let i = 0; i < LAMPS; i++) {
    const lx = x - total / 2 + i * (lampW + gap);
    const plan = { x: lx, y: -6, w: lampW, d: 12, r: 1 };
    front.push(`<g data-lamp="${i}">${S(k.slabOf(plan, 41, 0.9, P, 2), { tone: 'lo', crease: 'none' })}<g data-lit opacity="0">${S(k.slabOf(plan, 41, 1.5, P, 2), { tone: 'hi', lit: true, crease: 'none' })}</g></g>`);
  }
  front.push(D([at([x - hx - 0.5, -hy + 1, 41]), at([x + hx + 0.5, -hy + 1, 41]), at([x - hx - 0.5, hy - 1, 41]), at([x + hx + 0.5, hy - 1, 41])], { size: 0.45 }));
  // drop gate in the entry (moves in z)
  const gate = [];
  gate.push(S(k.slabOf({ x: x - hx - 2, y: -hy + 6, w: 2.2, d: 2 * hy - 12, r: 0.8 }, 0, 14, P, 2, 0.4), { tone: 'mid' }));
  return { back: back.join(''), front: front.join('') + `<g data-part="gate" transform="${k.translateAlong(P, [0, 0, 20])}">${gate.join('')}</g>`, ref: [x, hy + 4], backRef: [x, -hy - 3] };
}

/* ---------- station 3: review (dial gauge on a post) ---------- */
const DIAL = { x: 65, y: -40, r: 17, z: 40, h: 9 };
const DIAL_TOP = DIAL.z + DIAL.h;
const needleAt = (turn) => {
  const a = turn * Math.PI * 2;
  return k.lineOnTop([DIAL.x - Math.sin(a) * 3.4, DIAL.y + Math.cos(a) * 3.4], [DIAL.x + Math.sin(a) * (DIAL.r - 3.6), DIAL.y - Math.cos(a) * (DIAL.r - 3.6)], DIAL_TOP + 0.2, P);
};
function review(x) {
  const o = [];
  o.push(S(k.slabOf({ x: DIAL.x - 12, y: DIAL.y - 12, w: 24, d: 24, r: 3 }, 1.6, 6, P, 4, 0.5), { tone: 'mid' }));
  o.push(D(k.corners({ x: DIAL.x - 12, y: DIAL.y - 12, w: 24, d: 24, r: 3 }, 3.6).map(([px, py]) => at([px, py, 7.6])), { size: 0.4 }));
  o.push(S(k.cylinder(DIAL.x, DIAL.y, 4.2, 7.6, 26, P, 22), { tone: 'mid', crease: 'none' }));
  o.push(L(k.sideArc(DIAL.x, DIAL.y, 4.2, 20, P, 14), { tone: 'faint' }));
  o.push(S(k.cylinder(DIAL.x, DIAL.y, 6, 33.6, 3, P, 22), { tone: 'mid' }));
  o.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 64, 0.8), { tone: 'hi', crease: 'lo' }));
  o.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL_TOP - 3.4, DIAL_TOP, 80, P, 0.3), { tone: 'lo' }));
  o.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL_TOP - 3.4, P, 40), { tone: 'faint' }));
  o.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2.2, DIAL_TOP, P, 64), { tone: 'lo' }));
  const ticks = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 3, 44, 4, DIAL_TOP, [1.3, 2.8], P);
  o.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  o.push(`<g data-glow="review" opacity="0">${L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2.2, DIAL_TOP, P, 64), { tone: 'lit' })}</g>`);
  o.push(L(k.ring(DIAL.x, DIAL.y, 1.7, DIAL_TOP, P, 16), { tone: 'mid' }));
  o.push(k.faceTextSvg(k.topMatrix([DIAL.x, DIAL.y + 9.5], DIAL_TOP, P, 'x'), '11', { size: 3, tone: 'lo', anchor: 'middle' }));
  o.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(0)}" style="stroke-width:1.15"/>`);
  return { back: o.join(''), front: '', ref: [DIAL.x, DIAL.y], backRef: [DIAL.x, DIAL.y] };
}

/* ---------- station 4: draft PR (stamp press, output tray, human knob) ---------- */
function draft(x) {
  const back = posts(x, 58, -27);
  const front = [posts(x, 58, 27), beam(x, 58)];
  const head = [];
  head.push(S(k.cylinder(x, 0, 8.5, 0, 6, P, 36, 0.5), { tone: 'mid' }));
  head.push(S(k.cylinder(x, 0, 5.4, -3, 3, P, 28), { tone: 'hi', lit: true }));
  head.push(L(k.knurl(x, 0, 8.5, 0, 6, 30, P, 0.3), { tone: 'lo' }));
  const ram = S(k.cylinder(x, 0, 2.6, 6, 46, P, 18), { tone: 'mid', crease: 'none' });
  const tray = { x: x - 18, y: 24, w: 40, d: 30, r: 2.5 };
  const trayEls = [S(k.slabOf(tray, 1.6, 3, P, 4, 0.5), { tone: 'mid' }), L(k.planOutline(k.insetPlan(tray, 3), 4.6, P, 4), { tone: 'faint' }),
    D(k.corners(tray, 3.5).map(([px, py]) => at([px, py, 4.6])), { size: 0.4 })];
  const card = { x: x - 14, y: 0, w: 28, d: 20, r: 1.6 };
  const cardEls = [S(k.slabOf(card, 4.8, 1.4, P, 3, 0.4), { tone: 'hi', lit: true }), L(k.lineOnTop([x - 10, 6], [x + 10, 6], 6.2, P), { tone: 'lo' }),
    L(k.lineOnTop([x - 10, 10], [x + 4, 10], 6.2, P), { tone: 'faint' }), L(k.lineOnTop([x - 10, 14], [x + 8, 14], 6.2, P), { tone: 'faint' }),
    D([at([x + 9, 3.6, 6.2])], { size: 0.8, tone: 'hi' })];
  // human lever knob, never moved by the machine
  const knob = [x + 36, 40];
  const human = [S(k.slabOf({ x: knob[0] - 8, y: knob[1] - 8, w: 16, d: 16, r: 2.5 }, 1.6, 5, P, 3, 0.5), { tone: 'mid' }),
    S(k.cylinder(knob[0], knob[1], 6, 6.6, 7, P, 28, 0.4), { tone: 'hi' }), L(k.knurl(knob[0], knob[1], 6, 6.6, 13.6, 34, P, 0.3), { tone: 'lo' }),
    L(k.lineOnTop([knob[0], knob[1]], [knob[0] + 6, knob[1]], 13.6, P), { tone: 'hi' }), D([at([knob[0], knob[1], 13.6])], { size: 0.5, tone: 'hi' })];
  return {
    back,
    front: front.join('') + trayEls.join('') + `<g data-part="card" opacity="0" transform="${k.translateAlong(P, [0, 14, 0])}">${cardEls.join('')}</g>` + ram + `<g data-part="stamp" transform="${k.translateAlong(P, [0, 0, 36])}">${head.join('')}</g>` + human.join(''),
    ref: [x, 27], backRef: [x, -27],
  };
}

/* ---------- cartridge: one dependency update on a tray ---------- */
const PKG = { x: -15, y: -10, w: 30, d: 20, r: 2 };
function cartridge() {
  const o = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan({ x: -19, y: -15, w: 38, d: 30, r: 3 }, 2), 3, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [bx, by] of [[-14, -13], [14, -13], [-14, 13], [14, 13]]) o.push(S(k.slabOf({ x: bx - 3.5, y: by - 2.5, w: 7, d: 5, r: 1 }, 0.4, 3, P, 2), { tone: 'lo' }));
  const tray = { x: -19, y: -15, w: 38, d: 30, r: 3 };
  o.push(S(k.slabOf(tray, 3, 4, P, 4, 0.5), { tone: 'mid' }));
  o.push(D(k.corners(tray, 3).map(([px, py]) => at([px, py, 7])), { size: 0.4, tone: 'lo' }));
  o.push(S(k.slabOf(PKG, 7, 14, P, 3, 0.6), { tone: 'hi', crease: 'lo' }));
  o.push(L(k.planOutline(k.insetPlan(PKG, 2.2), 21, P, 3), { tone: 'faint' }));
  o.push(L(k.sideSeam(PKG, 12, P, 3), { tone: 'faint' }));
  o.push(`<g data-part="label">${k.faceTextSvg(k.topMatrix([0, 4.4], 21, P, 'x'), '1.26.0', { size: 5.2, tone: 'lo', anchor: 'middle' })}</g>`);
  o.push(`<path data-part="scan" class="iso-line" data-tone="lit" data-free="start" d="" opacity="0" style="stroke-width:1.1"/>`);
  const handle = [0, 17.5];
  o.push(S(k.slabOf({ x: handle[0] - 6, y: 14, w: 12, d: 3.5, r: 1 }, 3.6, 3, P, 2), { tone: 'mid', crease: 'none' }));
  return o.join('');
}

/* ---------- assemble ---------- */
const stations = [watch(STOPS[0]), repair(STOPS[1]), verify(STOPS[2]), review(STOPS[3]), draft(STOPS[4])];
const body = [
  `<g data-layer="base">${base()}</g>`,
  ...stations.flatMap((s, i) => [
    `<g data-order="back" data-i="${i}" data-rx="${s.backRef[0]}" data-ry="${s.backRef[1]}">${s.back}</g>`,
    `<g data-order="front" data-i="${i}" data-rx="${s.ref[0]}" data-ry="${s.ref[1]}">${s.front}</g>`,
  ]),
  `<g data-order="cart" data-part="cart" transform="${k.translateAlong(P, [STOPS[0], 0, 0])}">${cartridge()}</g>`,
];
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'A bench press with five stations on a rail: a scanner arch, a repair head, a test hood with five lamps, a dial gauge and a stamp press. A cartridge carrying a dependency update rides the rail through each station, and a draft pull request card slides out at the end. A human-only knob beside the tray is never driven by the machine.',
  body,
});

const live = `
const P = ${JSON.stringify(P)};
const STOPS = ${JSON.stringify(STOPS)};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_TOP = ${DIAL_TOP}, LAMPS = ${LAMPS};
const NAMES = ['Watch', 'Repair', 'Verify', 'Review', 'Draft PR'];
const NOTES = ['OSV matches nginx 1.26.0 exactly', 'One image line changes: 1.26.0 to 1.30.6', 'Five check groups, 7 live HTTP assertions', 'Senior review reads 11 of 11 controller gates', 'Opened as a draft. You decide on merge.'];
const needleAt = ${needleAt.toString().replace(/k\./g, '')};
const stage = document.querySelector('.iso-stage');
const svg = stage.querySelector('svg');
const q = (s) => svg.querySelector(s);
const cart = q('[data-part=cart]'), head = q('[data-part=head]'), gate = q('[data-part=gate]'), needle = q('[data-part=needle]');
const stamp = q('[data-part=stamp]'), card = q('[data-part=card]'), label = q('[data-part=label] text'), scan = q('[data-part=scan]');
const glowWatch = q('[data-glow=watch]'), glowReview = q('[data-glow=review]');
const lamps = [...svg.querySelectorAll('[data-lamp] [data-lit]')];
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const order = [...svg.querySelectorAll('[data-order]')].map((el) => ({ el, depth: 0, ref: [Number(el.dataset.rx ?? 0), Number(el.dataset.ry ?? 0)], cart: el.dataset.order === 'cart' }));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);
let x = STOPS[0], target = 0, level = [0, 0, 0, 0, 0], clock = 0, tourClock = 0, touring = true, last = 0, frame = 0, visible = false, idle = 0, said = -1, sorted = '';
const baseNode = svg.querySelector('[data-layer=base]');
function resort() {
  for (const item of order) item.depth = item.cart ? depthOf([x, 0, 0], P) : depthOf([item.ref[0], item.ref[1], 0], P);
  const next = [...order].sort((a, b) => a.depth - b.depth);
  const key = next.map((n) => n.el.dataset.order + n.el.dataset.i).join();
  if (key === sorted) return;
  sorted = key;
  for (const item of next) svg.appendChild(item.el);
}
function draw(dt) {
  clock += dt;
  cart.setAttribute('transform', translateAlong(P, [x, 0, 0]));
  const near = STOPS.findIndex((s) => Math.abs(s - x) < 2.5);
  for (let i = 0; i < 5; i++) {
    const want = near === i ? 1 : 0;
    level[i] += (want - level[i]) * (still.matches ? 1 : 1 - Math.exp(-dt / (want ? 1.05 : 0.25)));
    if (Math.abs(want - level[i]) < 0.002) level[i] = want;
  }
  // watch: lens glows and a scan line sweeps the package
  glowWatch.setAttribute('opacity', level[0].toFixed(3));
  const sweep = 0.5 + 0.5 * Math.sin(clock * 3.2);
  const sx = -13 + 26 * sweep;
  scan.setAttribute('d', lineOnTop([sx, -9], [sx, 9], 21.2, P));
  scan.setAttribute('opacity', (level[0] * 0.95).toFixed(3));
  // repair: head presses down, label swaps to the target version
  head.setAttribute('transform', translateAlong(P, [0, 0, 40 - 33 * ease(level[1])]));
  const repaired = x > STOPS[1] + 8 || level[1] > 0.7;
  const text = repaired ? '1.30.6' : '1.26.0';
  if (label && label.textContent !== text) label.textContent = text;
  // verify: gate drops, lamps fill in turn
  gate.setAttribute('transform', translateAlong(P, [0, 0, 20 * (1 - ease(clamp(level[2] * 3, 0, 1)))]));
  const run = clamp((level[2] - 0.2) / 0.8, 0, 1);
  lamps.forEach((lamp, i) => lamp.setAttribute('opacity', clamp(run * (LAMPS + 0.6) - i, 0, 1).toFixed(3)));
  // review: needle sweeps to 11 of 11 (a full, calm turn)
  needle.setAttribute('d', needleAt(0.94 * ease(level[3])));
  glowReview.setAttribute('opacity', clamp((level[3] - 0.85) / 0.15, 0, 1).toFixed(3));
  // draft: stamp down and up, card slides to the tray
  const a = level[4];
  const press = a < 0.28 ? ease(a / 0.28) : a < 0.5 ? 1 - ease((a - 0.28) / 0.22) : 0;
  stamp.setAttribute('transform', translateAlong(P, [0, 0, 36 - 30 * press]));
  const out = ease(clamp((a - 0.5) / 0.5, 0, 1));
  card.setAttribute('transform', translateAlong(P, [0, 14 + 22 * out, 0]));
  card.setAttribute('opacity', clamp(out * 3, 0, 1).toFixed(3));
  resort();
  const index = near >= 0 ? near : -1;
  if (index !== said) {
    said = index;
    readout.textContent = index < 0 ? 'in transit' : NAMES[index] + '. ' + NOTES[index];
    stage.setAttribute('aria-valuenow', String(index < 0 ? target : index));
    stage.setAttribute('aria-valuetext', readout.textContent);
    if (index >= 0) parent.postMessage({ source: 'proof-press', stage: index }, '*');
  }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { tourClock += dt; const dwell = 3.9; target = Math.floor(tourClock / dwell) % 5; }
  const want = STOPS[target];
  x = still.matches ? want : x + (want - x) * (1 - Math.exp(-dt / 0.42));
  if (Math.abs(want - x) < 0.02) x = want;
  draw(dt);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (i) => { touring = false; target = clamp(i, 0, 4); clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; tourClock = target * 3.9; run(); }, 5200); run(); };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: '120px 0px' }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener('pointermove', (ev) => { const b = svg.getBoundingClientRect(); steer(Math.round(clamp(((ev.clientX - b.left) / b.width - 0.1) / 0.8, 0, 1) * 4)); });
stage.addEventListener('keydown', (ev) => {
  let to = null;
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') to = target + 1;
  if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') to = target - 1;
  if (ev.key === 'Home') to = 0; if (ev.key === 'End') to = 4;
  if (to === null) return; ev.preventDefault(); steer(to);
});
addEventListener('message', (ev) => { if (ev.data && ev.data.source === 'proofpatch-ui' && typeof ev.data.goto === 'number') steer(ev.data.goto); });
draw(0);
`;

const card = k.plateHtml({
  fig: 'Fig 1',
  title: 'Proof press',
  hint: 'Hover to steer the cartridge',
  readout: 'Watch. OSV matches nginx 1.26.0 exactly',
  keys: [
    { mark: 'lit', label: 'Active work: what the machine is doing right now' },
    { mark: 'raised', label: 'The cartridge: one dependency update' },
  ],
  caption: 'A cartridge carrying one dependency update rides a rail through five stations. It is checked, repaired, tested, reviewed and stamped into a draft PR. The knob beside the tray is only ever turned by a person.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Proof press: arrow keys move the cartridge between stations" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0">${svg}</div>`,
});
const skin = `<style>:root[data-theme=light],[data-theme=light]{--anatomy-page:#f5f6f4;--anatomy-card:#fcfdfb;--anatomy-lit:#3f7d0e;--anatomy-lit-top:#d9f0b4;--anatomy-lit-shade:#b9db84;--anatomy-strong:#1f2417}
.iso-solid[data-lit]>.iso-edge{stroke:#3f7d0e}body{padding:0}</style>`;
const html = k.pageHtml({ title: 'Proof press', theme, body: card, script: kitSource + live, width: 780 }).replace('</head>', skin + '</head>');
writeFileSync(resolve(out, 'proof-press.html'), html);
console.log('wrote', resolve(out, 'proof-press.html'), html.length, 'bytes; solids ~', (html.match(/class="iso-solid/g) || []).length);
