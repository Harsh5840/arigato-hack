// The repair line: a bench whose cartridge (the candidate fix) travels past six stations,
// one per workflow step. Built with the vendored Anatomy kit; emits React geometry and a preview.
// node design/anatomy/repair-line/build.mjs [--audit]
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as k from '../vendor/kit/iso-kit.mjs';
import * as A from '../vendor/kit/audit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const destination = resolve(here, '../../../apps/web/src/components/features/operations');
mkdirSync(destination, { recursive: true });
const width = 960, height = 450;
const bed = { x: -262, y: -64, w: 524, d: 128, r: 12 };
const P = k.fitProjection([...k.boxCorners(bed, -14, 0), ...k.boxCorners({ x: -150, y: -50, w: 20, d: 20, r: 0 }, 0, 96), ...k.boxCorners({ x: -70, y: -40, w: 20, d: 80, r: 0 }, 0, 70)], width, height, { pad: 22, azimuth: 62, elevation: 30 });

const cssSource = `
.repair-line-svg{--al-paper:#fbfcf9;--al-top:#fdfdfb;--al-shade-0:#c9d0c2;--al-shade-1:#d8ddd2;--al-shade-2:#e5e9e0;--al-shade-3:#eff2eb;--al-hi:#1d261f;--al-mid:#4d584e;--al-lo:#7a857a;--al-faint:#b3bbb0;--al-lit:#22380f;--al-lit-top:#c7ef79;--al-lit-shade:#a3cc5d;--al-weight:.8px}
.repair-line-svg{display:block;width:100%;height:auto;overflow:visible}.repair-line-svg path,.repair-line-svg circle{vector-effect:non-scaling-stroke}.repair-line-svg .iso-fill{fill:var(--al-paper);stroke:none}.repair-line-svg .iso-shade{stroke:none}.repair-line-svg .iso-shade[data-shade="0"]{fill:var(--al-shade-0)}.repair-line-svg .iso-shade[data-shade="1"]{fill:var(--al-shade-1)}.repair-line-svg .iso-shade[data-shade="2"]{fill:var(--al-shade-2)}.repair-line-svg .iso-shade[data-shade="3"]{fill:var(--al-shade-3)}.repair-line-svg .iso-top{fill:var(--al-top);stroke:none}.repair-line-svg .iso-line{fill:none;stroke:var(--al-lo);stroke-width:var(--al-weight);stroke-linecap:round;stroke-linejoin:round}.repair-line-svg [data-tone="hi"]{stroke:var(--al-hi)}.repair-line-svg [data-tone="mid"]{stroke:var(--al-mid)}.repair-line-svg [data-tone="faint"]{stroke:var(--al-faint)}.repair-line-svg [data-tone="lit"]{stroke:var(--al-lit)}.repair-line-svg .iso-dots{fill:var(--al-hi)}.repair-line-svg .iso-dots[data-tone="lo"]{fill:var(--al-lo)}.repair-line-svg .iso-solid[data-lit]>.iso-top{fill:var(--al-lit-top)}.repair-line-svg .iso-solid[data-lit]>.iso-shade{fill:var(--al-lit-shade)}.repair-line-svg .iso-solid[data-lit]>.iso-edge{stroke:var(--al-lit)}.repair-line-svg .iso-face-text{fill:var(--al-mid);font-family:ui-monospace,Consolas,monospace;font-weight:600;letter-spacing:.4px}
`;
const palette = Object.fromEntries([...cssSource.matchAll(/(--[\w-]+):([^;}]+)/g)].map(([, name, value]) => [name, value]));
const CSS = cssSource.replace(/var\((--[\w-]+)\)/g, (_, name) => palette[name]);

const parts = [];
const line = (d, tone = 'faint', free) => k.lineSvg(d, { tone, free });
const plan = (x, y, w, d, r = 1) => ({ x, y, w, d, r });
const screws = (p, z, points = k.corners(p, 3.2)) => points.map(([x, y]) => line(k.ring(x, y, 1.3, z, P, 16), 'mid') + k.dotsSvg([k.iso([x, y, z], P)], { size: .45, tone: 'hi' })).join('');
function slab(name, p, z, h, { tone = 'mid', lit = false, move = 'fixed', inner = '' } = {}) {
  parts.push({ name, plan: p, z, h, move, kind: 'slab', at: [p.x + p.w / 2, p.y + p.d / 2, z + h / 2], svg: k.solidSvg(k.slabOf(p, z, h, P, 6, .6), { tone, lit, inner }) });
}
function cylinder(name, x, y, r, z, h, { inner = '', tone = 'mid', move = 'fixed', lit = false } = {}) {
  parts.push({ name, x, y, r, z, h, move, kind: 'cylinder', at: [x, y, z + h / 2], svg: k.solidSvg(k.cylinder(x, y, r, z, h, P, 40, .4), { tone, inner, lit }) });
}
// Station number engraved on a small plate at each station's foot.
const plate = (name, n, x, y) => { const p = plan(x - 8, y - 7, 16, 14, 2); slab(name, p, 0, 1.2, { tone: 'lo', inner: line(k.planOutline(k.insetPlan(p, 1.4), 1.2, P), 'faint') + k.faceTextSvg(k.topMatrix([x, y + 3.2], 1.2, P), String(n), { size: 9, anchor: 'middle', tone: 'mid' }) }); };

// Bench: feet, bedplate with groove and corner screws, ruler strip along the front edge.
for (const [i, [x, y]] of [...k.corners(bed, 22), [-60, -42], [60, 42]].entries()) {
  cylinder(`bench.pad.${i}`, x, y, 8, -14, 2, { tone: 'lo' });
  cylinder(`bench.foot.${i}`, x, y, 5.4, -12, 5, { tone: 'lo' });
}
slab('bench.bed', bed, -7, 7, { tone: 'mid', inner: line(k.planOutline(k.insetPlan(bed, 5), 0, P), 'lo') + line(k.sideSeam(bed, -3.5, P, 6), 'faint') + screws(bed, 0, k.corners(bed, 10)) });
const ruler = plan(-246, 50, 492, 7, 1.2), ticks = k.topTicks(-240, 240, 6, 5, 50, 1, [2.2, 4.6], P);
slab('bench.ruler', ruler, 0, 1, { tone: 'lo', inner: line(ticks.minor, 'lo') + line(ticks.major, 'mid') + line(k.lineOnTop([-240, 50], [240, 50], 1, P), 'mid') });
// Twin rails on raised shoes; end stops at both ends.
for (const y of [-14, 10]) {
  const rail = plan(-240, y, 430, 4, 1);
  slab(`rail.${y}`, rail, 0, 6, { tone: 'hi', inner: line(k.planOutline(k.insetPlan(rail, .7), 6, P), 'lo') });
  for (const x of [-246, 190]) { const stop = plan(x, y - 3, 6, 10, 1.2); slab(`rail.stop.${x}.${y}`, stop, 0, 10, { inner: screws(stop, 10, [[x + 3, y + 2]]) }); }
}

// Station 1: repository tray with tracked packages.
const tray = plan(-236, -58, 46, 34, 3);
slab('s1.tray', tray, 0, 5, { tone: 'mid', inner: line(k.planOutline(k.insetPlan(tray, 2.5), 5, P), 'lo') + screws(tray, 5) });
for (const [i, [x, y, h]] of [[-230, -52, 9], [-218, -52, 6], [-206, -52, 11], [-230, -39, 7], [-218, -39, 12], [-206, -39, 5]].entries()) {
  const box = plan(x, y, 9, 9, 1); slab(`s1.package.${i}`, box, 5, h, { tone: i === 4 ? 'hi' : 'mid', inner: line(k.planOutline(k.insetPlan(box, 1.4), 5 + h, P), 'faint') });
}
plate('s1.plate', 1, -213, 32);

// Station 2: watch mast with two receiver arms and a beacon.
const mastFoot = plan(-152, -58, 24, 24, 3);
slab('s2.foot', mastFoot, 0, 4, { tone: 'mid', inner: screws(mastFoot, 4) });
cylinder('s2.mast', -140, -46, 2.6, 4, 82, { tone: 'mid', inner: line(k.ringSeam(k.circleRing(-140, -46, 2.6, 40), 40, P), 'faint') });
for (const [i, [y, d]] of [[-60, 11.4], [-43.4, 11.4]].entries()) slab(`s2.arm.${i}`, plan(-142, y, 4, d, .8), 60, 3, { tone: 'mid' });
for (const [i, y] of [-61, -31].entries()) cylinder(`s2.receiver.${i}`, -140, y, 4.4, 63, 3, { tone: 'hi', inner: line(k.ring(-140, y, 2.2, 66, P, 24), 'lo') });
cylinder('s2.beacon', -140, -46, 4.8, 86, 6, { tone: 'hi', move: 'lamp-1', inner: line(k.ring(-140, -46, 2.4, 92, P, 24), 'mid') });
plate('s2.plate', 2, -140, 32);

// Station 3: Supply Chain scanner gantry straddling the rails.
for (const [i, y] of [-44, 30].entries()) {
  const shoe = plan(-76, y, 28, 12, 2), post = plan(-68, y + 2, 12, 8, 1.4);
  slab(`s3.shoe.${i}`, shoe, 0, 4, { inner: screws(shoe, 4) });
  slab(`s3.post.${i}`, post, 4, 58, { tone: 'mid', inner: line(k.sideSeam(post, 22, P, 6), 'lo') });
}
const beam = plan(-71, -44, 18, 86, 1.6);
slab('s3.beam', beam, 62, 9, { tone: 'hi', inner: line(k.sideSeam(beam, 66.5, P, 6), 'lo') + screws(beam, 71, [[-62, -40], [-62, 38]]) });
const head = plan(-70, -12, 16, 22, 2);
slab('s3.head', head, 44, 18, { tone: 'mid', inner: line(k.planOutline(k.insetPlan(head, 2), 62, P), 'faint') + line(k.sideSeam(head, 52, P, 6), 'faint') });
cylinder('s3.lens', -62, -1, 5, 37, 7, { tone: 'hi', inner: line(k.ring(-62, -1, 3, 44, P, 30), 'lo') });
cylinder('s3.lamp', -62, -36, 3, 71, 3, { tone: 'hi', move: 'lamp-2' });
plate('s3.plate', 3, -98, 32);

// Station 4: frozen-test vault (DevSec, front) and the Remediation press (back) over the rails.
const vault = plan(40, -62, 34, 26, 2.5);
slab('s4.vault', vault, 0, 26, { tone: 'mid', inner: line(k.sideSeam(vault, 9, P, 6), 'lo') + line(k.sideSeam(vault, 17, P, 6), 'lo') + line(k.planOutline(k.insetPlan(vault, 2.5), 26, P), 'faint') });
cylinder('s4.lock', 57, -49, 3.2, 26, 4, { tone: 'hi', inner: line(k.ring(57, -49, 1.4, 30, P, 20), 'mid') });
const column = plan(14, -60, 20, 18, 2.5);
slab('s4.column-foot', plan(10, -63, 28, 24, 3), 0, 4, { inner: screws(plan(10, -63, 28, 24, 3), 4) });
slab('s4.column', column, 4, 66, { tone: 'mid', inner: line(k.sideSeam(column, 26, P, 6), 'lo') + line(k.sideSeam(column, 48, P, 6), 'faint') });
const arm = plan(16, -42, 16, 46, 2);
slab('s4.arm', arm, 58, 10, { tone: 'hi', inner: line(k.planOutline(k.insetPlan(arm, 2), 68, P), 'faint') + screws(arm, 68, [[24, -38]]) });
cylinder('s4.guide', 24, -2, 6.5, 50, 8, { tone: 'mid', inner: line(k.knurl(24, -2, 6.5, 50, 58, 30, P), 'faint') });
cylinder('s4.ram', 24, -2, 3.8, 30, 20, { tone: 'hi' });
cylinder('s4.die', 24, -2, 7, 26, 4, { tone: 'hi' });
cylinder('s4.lamp', 24, -51, 3, 70, 3, { tone: 'hi', move: 'lamp-3' });
plate('s4.plate', 4, 24, 32);

// Station 5: DevSec test bench with a check dial, then the evidence gate arm across the rails.
const bench = plan(92, -60, 38, 30, 3);
slab('s5.bench', bench, 0, 18, { tone: 'mid', inner: line(k.sideSeam(bench, 9, P, 6), 'lo') + screws(bench, 18, k.corners(bench, 3.5)) });
cylinder('s5.dial', 111, -45, 11, 18, 3, { tone: 'hi', inner: (t => line(t.minor, 'lo') + line(t.major, 'mid'))(k.radialTicks(111, -45, 9.4, 30, 5, 21, [1.2, 2.6], P)) + line(k.lineOnTop([111, -45], [117, -51], 21.2, P), 'hi', true) });
cylinder('s5.hub', 111, -45, 1.6, 21, 1.4, { tone: 'hi' });
cylinder('s5.probe', 97, -36, 2.2, 18, 14, { tone: 'mid' });
cylinder('s5.lamp', 124, -54, 3, 18, 3, { tone: 'hi', move: 'lamp-4' });
const gatePost = plan(158, -40, 10, 10, 1.5);
slab('s5.gate-foot', plan(154, -44, 18, 18, 2), 0, 3, { inner: screws(plan(154, -44, 18, 18, 2), 3) });
slab('s5.gate-post', gatePost, 3, 42, { tone: 'mid', inner: line(k.sideSeam(gatePost, 22, P, 6), 'lo') });
slab('s5.gate-arm', plan(160, -30, 6, 54, 1.4), 10, 5, { tone: 'hi', move: 'gate', inner: line(k.planOutline(k.insetPlan(plan(160, -30, 6, 54, 1.4), 1.2), 15, P), 'lo') });
slab('s5.gate-weight', plan(157, -50, 12, 10, 1.4), 10, 7, { tone: 'mid', move: 'gate' });
plate('s5.plate', 5, 120, 32);

// Station 6: review tray at the end of the line.
const out = plan(196, -30, 40, 52, 3);
slab('s6.tray', out, 0, 6, { tone: 'mid', inner: line(k.planOutline(k.insetPlan(out, 2.5), 6, P), 'lo') });
slab('s6.back', plan(232, -30, 4, 52, 1), 6, 14, { tone: 'mid' });
slab('s6.side', plan(196, -30, 36, 3, 1), 6, 8, { tone: 'mid' });
slab('s6.stamp-base', plan(204, -58, 22, 20, 2.5), 0, 5, { tone: 'mid', inner: screws(plan(204, -58, 22, 20, 2.5), 5) });
cylinder('s6.stamp', 215, -48, 5.5, 5, 16, { tone: 'hi', inner: line(k.knurl(215, -48, 5.5, 5, 21, 28, P), 'faint') });
cylinder('s6.lamp', 215, -48, 3, 21, 2, { tone: 'hi', move: 'lamp-5' });
plate('s6.plate', 6, 214, 36);

// Subject: the candidate cartridge on four bearing shoes. Built at x=0 and moved along the rails.
const cart = plan(-17, -18, 34, 34, 3);
for (const [x, y] of [[-14, -15], [8, -15], [-14, 9], [8, 9]]) slab(`cart.bearing.${x}.${y}`, plan(x, y, 6, 5, 1), 6, 3, { tone: 'mid', move: 'cart' });
slab('cart.tray', cart, 9, 4, { tone: 'hi', move: 'cart', inner: line(k.sideSeam(cart, 11, P, 6), 'lo') });
const insert = plan(-13, -14, 26, 26, 2.4);
slab('cart.insert', insert, 13, 6, { tone: 'hi', lit: true, move: 'cart', inner: line(k.planOutline(k.insetPlan(insert, 2.6), 19, P), 'lit') + line(k.lineOnTop([-8, -4], [8, -4], 19, P), 'lit', true) + line(k.lineOnTop([-8, 2], [4, 2], 19, P), 'lit', true) });

// Poses: cart station per step; the ram presses at step 4 (index 3); the gate lifts only when a draft is allowed.
const stationX = [-213, -140, -62, 24, 111, 214];
export const state = (step, blocked) => ({ cart: blocked ? 128 : stationX[Math.max(0, step)], gate: !blocked && step >= 5 ? 26 : 0 });
function offsetOf(part, s) {
  if (part.move === 'cart') return [s.cart, 0, 0];
  if (part.move === 'gate') return [0, 0, s.gate];
  return [0, 0, 0];
}
function record(s) {
  const R = A.recorder(P, { ground: shape => (shape.name ?? '').startsWith('bench.pad') });
  for (const part of parts) {
    const o = offsetOf(part, s);
    const shape = part.kind === 'slab' ? A.slab({ ...part.plan, x: part.plan.x + o[0] }, part.z + o[2], part.h, { name: part.name, owner: part.name.split('.')[0] }) : A.cylinder(part.x + o[0], part.y, part.r, part.z + o[2], part.h, { name: part.name, owner: part.name.split('.')[0] });
    R.put({ name: part.name, piece: part.move, at: part.at.map((n, i) => n + o[i]), svg: `<g transform="${k.translateAlong(P, o)}">${part.svg}</g>`, shapes: [R.solid(shape)] });
  }
  A.settle(R, P, { step: 2 }); R.items.sort((a, b) => a.key - b.key);
  return R;
}
const scenes = {};
for (const key of ['0', '1', '2', '3', '4', '5', 'blocked']) {
  const R = record(key === 'blocked' ? state(4, true) : state(Number(key), false));
  scenes[key] = R.items.map(item => item.name);
}
const origin = k.iso([0, 0, 0], P), vector = point => k.iso(point, P).map((n, i) => +(n - origin[i]).toFixed(4));
const geometry = { width, height, css: CSS, motion: { x: vector([1, 0, 0]), z: vector([0, 0, 1]) }, stationX, parts: parts.map(({ name, move, svg }) => ({ name, move, svg })), scenes };
writeFileSync(resolve(destination, 'repair-line.geometry.ts'), `// Generated by design/anatomy/repair-line/build.mjs with the vendored Anatomy kit. Do not edit paths.\nexport const repairLineGeometry = ${JSON.stringify(geometry)} as const;\n`);
const still = key => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="repair-line-svg"><style>${CSS}</style>${record(key === 'blocked' ? state(4, true) : state(Number(key), false)).items.map(i => i.svg).join('')}</svg>`;
writeFileSync(resolve(here, 'preview.html'), `<!doctype html><meta charset="utf-8"><title>Repair line</title><body style="margin:0;background:#f4f6f2"><main style="max-width:1100px;margin:auto;padding:24px;display:grid;gap:24px">${['0', '3', '5', 'blocked'].map(still).join('')}</main></body>`);
writeFileSync(resolve(here, 'parts.json'), JSON.stringify({ count: parts.length, stations: stationX, parts: parts.map(({ svg, ...part }) => part) }, null, 2));
console.log(`Built ${parts.length} kit solids and ${Object.keys(scenes).length} scene orderings.`);
if (process.argv.includes('--audit')) for (const key of ['0', '3', '5', 'blocked']) { console.log(`\npose ${key}`); A.auditOrExit(record(key === 'blocked' ? state(4, true) : state(Number(key), false)), P); }
