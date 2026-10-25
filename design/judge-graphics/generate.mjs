import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Hand-drawn vector slides. No generated imagery, remote assets or logo files.
const root = fileURLToPath(new URL('../..', import.meta.url));
const output = resolve(root, 'output/judge-graphics');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const sharp = require('sharp');

const W = 1920, H = 1080;
const C = {
  bg: '#111712', bg2: '#19221A', bg3: '#1C271E', ink: '#F3F4EC',
  muted: '#A8B1A4', muted2: '#7E8D7D', line: '#39483A', line2: '#596C58',
  lime: '#C7EF79', orange: '#F5A37A', blue: '#87C9D4', violet: '#C8B6E9',
  rose: '#EAA0A0', shadow: '#0A100B',
};
const x = (v) => String(v);
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const rect = (px, py, w, h, fill = 'none', stroke = 'none', rx = 0, sw = 1, extra = '') => `<rect x="${x(px)}" y="${x(py)}" width="${x(w)}" height="${x(h)}" rx="${x(rx)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const circle = (cx, cy, r, fill = 'none', stroke = 'none', sw = 1, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const line = (x1, y1, x2, y2, color = C.line, sw = 2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}" ${extra}/>`;
const path = (d, color = C.line, sw = 2, fill = 'none', extra = '') => `<path d="${d}" stroke="${color}" stroke-width="${sw}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const text = (px, py, value, size = 28, color = C.ink, weight = 400, extra = '') => `<text x="${px}" y="${py}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="Segoe UI, Arial, sans-serif" ${extra}>${esc(value)}</text>`;
const mono = (px, py, value, size = 24, color = C.muted, weight = 500, extra = '') => `<text x="${px}" y="${py}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="Bahnschrift, Consolas, monospace" ${extra}>${esc(value)}</text>`;
const lines = (px, py, values, size = 28, color = C.muted, weight = 400, leading = 39) => values.map((s, i) => text(px, py + i * leading, s, size, color, weight)).join('');
const caps = (px, py, value, color = C.muted, size = 20) => text(px, py, value.toUpperCase(), size, color, 600, 'letter-spacing="2.3"');
function arrow(x1, y, x2, color = C.lime, sw = 3) {
  return line(x1, y, x2 - 14, y, color, sw) + path(`M ${x2 - 22} ${y - 9} L ${x2 - 12} ${y} L ${x2 - 22} ${y + 9}`, color, sw);
}
function pill(px, py, w, label, color = C.lime) {
  return rect(px, py, w, 44, C.bg2, color, 22, 1.4) + caps(px + 19, py + 29, label, color, 17);
}
function repoGlyph(px, py, color = C.lime, scale = 1) {
  return `<g transform="translate(${px} ${py}) scale(${scale})">` +
    path('M 10 4 V 76 M 10 18 H 74 V 41', color, 3.3) +
    circle(10, 6, 6, C.bg, color, 3.3) + circle(10, 78, 6, C.bg, color, 3.3) + circle(74, 47, 6, C.bg, color, 3.3) + '</g>';
}
function checkGlyph(px, py, color = C.lime, scale = 1) {
  return `<g transform="translate(${px} ${py}) scale(${scale})">` + circle(36, 36, 32, C.bg2, color, 2.5) + path('M 19 37 L 31 48 L 54 24', color, 4) + '</g>';
}
function base({ n, category, accent = C.lime, footer = 'Illustrative pilot concept. No partner integration or endorsement is claimed.' }) {
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  out += `<defs><pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M 80 0 H 0 V 80" fill="none" stroke="#364437" stroke-width="1" opacity="0.32"/></pattern></defs>`;
  out += rect(0, 0, W, H, C.bg) + rect(0, 0, W, H, 'url(#grid)', 'none', 0, 1, 'opacity="0.24"');
  out += rect(0, 0, 10, H, accent);
  out += circle(104, 54, 19, 'none', accent, 3) + circle(104, 54, 6, accent);
  out += text(141, 64, 'ProofPatch', 31, C.ink, 700, 'letter-spacing="-0.8"');
  out += caps(1390, 61, category, accent, 19);
  out += line(88, 94, 1832, 94, C.line, 2);
  out += line(88, 1003, 1832, 1003, C.line, 2);
  out += text(88, 1041, footer, 19, C.muted2, 400);
  out += mono(1768, 1043, `${String(n).padStart(2, '0')} / 05`, 22, accent, 600);
  return out;
}
function title(out, titleLines, subtitle, accent) {
  const y0 = titleLines.length === 1 ? 215 : 182;
  out += titleLines.map((s, i) => text(88, y0 + i * 79, s, 74, C.ink, 700, 'letter-spacing="-3.5"')).join('');
  out += rect(88, titleLines.length === 1 ? 270 : 304, 82, 6, accent);
  out += text(88, titleLines.length === 1 ? 330 : 362, subtitle, 28, C.muted, 400);
  return out;
}
function labelRule(px, py, width, label, accent = C.lime) {
  return caps(px, py, label, accent, 19) + line(px, py + 15, px + width, py + 15, C.line, 2);
}
function panel(px, py, w, h, accent = C.lime) {
  return rect(px, py, w, h, C.bg2, C.line, 16, 2) + rect(px, py, 6, h, accent, 'none', 3);
}

function modelFlow() {
  let out = base({ n: 1, category: 'SYSTEM MAP / LIVE IMPLEMENTATION', footer: 'Fix and review use separate contexts of the same 120B model; neither can override failed checks.' });
  out = title(out, ['One advisory. Three agents.', 'One reviewed PR.'], 'LangGraph routes the work. Groq runs the models. Tests decide whether a draft may open.', C.lime);
  out += labelRule(88, 414, 1744, 'LangGraph orchestrator: typed state, retry budget, blocked path', C.lime);
  const modules = [
    { x: 88, w: 294, num: '00', name: 'SIGNAL + REPO', model: 'INPUT', body: ['Public leads, OSV / vendor', 'evidence and exact repo', 'dependency inventory.'], col: C.blue },
    { x: 415, w: 294, num: '01', name: 'SUPPLY CHAIN', model: 'openai/gpt-oss-20b', body: ['Triages new leads.', 'Checks whether a known', 'version is actually installed.'], col: C.lime },
    { x: 742, w: 294, num: '02', name: 'FIX AGENT', model: 'openai/gpt-oss-120b', body: ['Proposes a scoped package', 'or image update. Changes', 'stay inside the allowed files.'], col: C.orange },
    { x: 1069, w: 294, num: 'GATE', name: 'HARD EVIDENCE', model: 'GitHub Actions', body: ['Runs baseline and candidate', 'tests. Verifies advisory,', 'diff and exact commit.'], col: C.blue },
    { x: 1396, w: 436, num: '03', name: 'SENIOR REVIEW', model: 'openai/gpt-oss-120b', body: ['Reads the real diff and CI.', 'Approves a draft or asks for', 'changes. Cannot waive gates.'], col: C.violet },
  ];
  for (let i = 0; i < modules.length - 1; i++) out += arrow(modules[i].x + modules[i].w + 3, 590, modules[i + 1].x - 5, C.line2, 3);
  for (const m of modules) {
    out += rect(m.x, 456, m.w, 302, C.bg2, C.line, 12, 2);
    out += rect(m.x, 456, m.w, 6, m.col);
    out += mono(m.x + 26, 510, m.num, 29, m.col, 700);
    out += caps(m.x + 26, 553, m.name, C.ink, 21);
    out += rect(m.x + 26, 575, m.w - 52, 44, C.bg3, 'none', 7);
    out += mono(m.x + 42, 605, m.model, m.model.startsWith('openai/') ? 19 : 23, m.col, 600);
    out += lines(m.x + 26, 665, m.body, 24, C.muted, 400, 32);
  }
  out += path('M 1190 766 V 800 H 890 V 780', C.orange, 2.5, 'none', 'stroke-dasharray="7 9"');
  out += path('M 881 790 L 890 779 L 899 790', C.orange, 2.5);
  out += mono(940, 828, 'Failed check: retry once or block', 18, C.orange);
  out += rect(88, 841, 1744, 115, C.bg3, C.line, 14, 2);
  out += caps(117, 879, 'automated output', C.lime, 18);
  out += text(117, 924, 'Verified draft PR', 43, C.ink, 700, 'letter-spacing="-1.2"');
  out += arrow(613, 902, 777, C.lime, 4);
  out += caps(820, 879, 'final authority', C.lime, 18);
  out += text(820, 924, 'Human review, merge and deployment', 39, C.ink, 650, 'letter-spacing="-1"');
  return out + '</svg>';
}

function jetro() {
  let out = base({ n: 2, category: 'PARTNER CONCEPT 01 / JETRO', accent: C.lime });
  out = title(out, ['Security readiness', 'for Japanese SMEs.'], 'JETRO could offer a ProofPatch pilot to an SME preparing an overseas digital launch.', C.lime);
  out += labelRule(88, 414, 1744, 'Proposed integration', C.lime);
  out += panel(88, 450, 520, 405, C.lime);
  out += caps(119, 497, 'SME authorises', C.lime, 19);
  out += text(119, 553, 'One GitHub', 48, C.ink, 700, 'letter-spacing="-1.5"');
  out += text(119, 610, 'service repo', 48, C.ink, 700, 'letter-spacing="-1.5"');
  out += repoGlyph(122, 663, C.lime, 0.72);
  out += mono(216, 710, 'PHP storefront demo', 24, C.ink, 600);
  out += lines(119, 785, ['Japanese copy and JPY totals', 'stay in the business test suite.'], 24, C.muted, 400, 32);
  out += arrow(620, 652, 692, C.lime, 4);
  const stages = [
    { x: 710, n: '01', title: 'Watch', body: ['Exact image and', 'package versions'] },
    { x: 1085, n: '02', title: 'Confirm', body: ['Vendor advisory', 'and affected version'] },
    { x: 1460, n: '03', title: 'Propose', body: ['Tested update and', 'human-review PR'] },
  ];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    out += circle(s.x + 36, 508, 32, C.bg2, C.lime, 2.5);
    out += mono(s.x + 19, 518, s.n, 23, C.lime, 700);
    out += line(s.x + 36, 540, s.x + 36, 686, C.line2, 3);
    out += text(s.x, 735, s.title, 37, C.ink, 700);
    out += lines(s.x, 786, s.body, 24, C.muted, 400, 32);
    if (i < 2) out += arrow(s.x + 96, 508, stages[i + 1].x - 35, C.line2, 2.7);
  }
  out += rect(88, 884, 1744, 75, C.bg3, C.line, 9, 2);
  out += caps(115, 930, 'Pilot output', C.lime, 19);
  out += text(314, 932, 'Bilingual risk brief with a verified draft PR for the SME owner.', 30, C.ink, 600);
  return out + '</svg>';
}

function geek() {
  let out = base({ n: 3, category: 'PARTNER CONCEPT 02 / GEEK PICTURES INDIA', accent: C.orange });
  out = title(out, ['Protect the portal', 'behind the production.'], 'An authorised project portal repo can be watched without scanning unreleased creative media.', C.orange);
  out += labelRule(88, 414, 1744, 'Proposed integration', C.orange);
  // A film-strip frame, deliberately abstract and not a borrowed brand mark.
  out += rect(88, 451, 724, 404, C.bg2, C.line, 16, 2);
  out += rect(108, 471, 684, 364, C.bg, C.line2, 9, 2);
  for (let i = 0; i < 7; i++) {
    out += rect(125 + i * 91, 483, 47, 20, C.bg2, C.line2, 4, 1.3);
    out += rect(125 + i * 91, 803, 47, 20, C.bg2, C.line2, 4, 1.3);
  }
  out += caps(151, 560, 'Client project portal', C.orange, 19);
  out += text(151, 621, 'GitHub repository', 42, C.ink, 700);
  out += line(151, 647, 748, 647, C.line, 2);
  out += mono(151, 698, 'package-lock.json', 24, C.muted, 500);
  out += mono(151, 740, 'Dockerfile / compose.yaml', 24, C.muted, 500);
  out += arrow(827, 656, 895, C.orange, 4);
  const gx = 920;
  out += caps(gx, 491, 'ProofPatch watches', C.orange, 20);
  out += text(gx, 548, 'Declared dependencies', 37, C.ink, 650);
  out += text(gx, 610, 'Known advisory match', 37, C.ink, 650);
  out += text(gx, 672, 'Bounded repair and tests', 37, C.ink, 650);
  out += line(gx + 555, 491, gx + 555, 770, C.line2, 2);
  out += checkGlyph(1515, 500, C.orange, 1.05);
  out += caps(1602, 523, 'Output', C.orange, 18);
  out += lines(1517, 628, ['Draft PR', 'for the portal', 'owner to review'], 31, C.ink, 650, 47);
  out += rect(88, 884, 1744, 75, C.bg3, C.line, 9, 2);
  out += caps(115, 930, 'Why it matters', C.orange, 19);
  out += text(338, 932, 'Less production disruption; no creative files are needed for package inventory.', 29, C.ink, 600);
  return out + '</svg>';
}

function valueCreate() {
  let out = base({ n: 4, category: 'PARTNER CONCEPT 03 / VALUE CREATE', accent: C.violet });
  out = title(out, ['A repeatable security', 'playbook for each client.'], 'Value Create could turn advisory evidence into a consistent consulting deliverable.', C.violet);
  out += labelRule(88, 414, 1744, 'Pilot architecture: one isolated deployment per client', C.violet);
  const rows = [
    { y: 457, name: 'CLIENT A', stack: 'PYTHON SERVICE', color: C.blue },
    { y: 589, name: 'CLIENT B', stack: 'PHP SERVICE', color: C.orange },
    { y: 721, name: 'CLIENT C', stack: 'CONTAINER SERVICE', color: C.lime },
  ];
  for (const r of rows) {
    out += rect(88, r.y, 1744, 108, C.bg2, C.line, 10, 2);
    out += rect(88, r.y, 6, 108, r.color);
    out += caps(119, r.y + 42, r.name, r.color, 19);
    out += mono(119, r.y + 77, r.stack, 22, C.ink, 600);
    out += arrow(400, r.y + 54, 546, C.line2, 3);
    out += caps(574, r.y + 41, 'Isolated ProofPatch instance', C.ink, 19);
    out += text(574, r.y + 80, 'Repo watch + fix + verification', 27, C.muted, 400);
    out += arrow(1115, r.y + 54, 1240, C.line2, 3);
    out += caps(1272, r.y + 41, 'Evidence packet', r.color, 19);
    out += text(1272, r.y + 80, 'Finding, CI result, draft PR', 27, C.ink, 500);
  }
  out += rect(88, 882, 1744, 80, C.bg3, C.line, 10, 2);
  out += caps(117, 932, 'Consultant value', C.violet, 19);
  out += text(386, 935, 'Compare verified risks and decide what each client should fix first.', 29, C.ink, 600);
  out += text(88, 989, 'Current boundary: no shared multi-tenant dashboard; a unified portfolio view would be future work.', 19, C.muted2, 400);
  return out + '</svg>';
}

function hakuhodo() {
  let out = base({ n: 5, category: 'PARTNER CONCEPT 04 / HAKUHODO INDIA', accent: C.blue });
  out = title(out, ['Campaign speed without', 'silent dependency risk.'], 'Proposed pilot: watch authorised campaign-site repos before a human approves release.', C.blue);
  out += labelRule(88, 414, 1744, 'Three sites, one repeatable review path', C.blue);
  const sites = [
    { y: 455, name: 'MICROSITE', stack: 'PHP image', color: C.orange },
    { y: 574, name: 'LANDING PAGE', stack: 'npm package', color: C.violet },
    { y: 693, name: 'STOREFRONT', stack: 'nginx image', color: C.lime },
  ];
  for (const s of sites) {
    out += rect(88, s.y, 437, 95, C.bg2, C.line, 11, 2);
    out += rect(88, s.y, 6, 95, s.color);
    out += caps(120, s.y + 38, s.name, s.color, 18);
    out += mono(120, s.y + 72, s.stack, 25, C.ink, 600);
    out += line(525, s.y + 47, 687, s.y + 47, C.line2, 2.5);
  }
  out += line(687, 502, 687, 740, C.line2, 2.5);
  out += arrow(687, 621, 777, C.blue, 3.5);
  out += rect(804, 493, 345, 255, C.bg2, C.blue, 16, 2);
  out += caps(835, 544, 'ProofPatch', C.blue, 20);
  out += text(835, 600, 'Watch', 45, C.ink, 700);
  out += text(835, 653, 'match', 45, C.ink, 700);
  out += text(835, 706, 'propose', 45, C.ink, 700);
  out += arrow(1166, 621, 1226, C.blue, 3.5);
  out += rect(1253, 493, 321, 255, C.bg2, C.line, 16, 2);
  out += caps(1284, 544, 'Hard gate', C.blue, 20);
  out += text(1284, 603, 'Tests', 44, C.ink, 700);
  out += text(1284, 656, 'policy', 44, C.ink, 700);
  out += text(1284, 709, 'review', 44, C.ink, 700);
  out += arrow(1591, 621, 1638, C.blue, 3.5);
  out += line(1692, 463, 1692, 797, C.blue, 3);
  out += circle(1692, 621, 24, C.bg, C.blue, 3);
  out += caps(1618, 836, 'Owner review', C.blue, 18);
  out += text(88, 888, 'A tested draft reaches the site owner before launch.', 35, C.ink, 700);
  out += text(88, 940, 'ProofPatch does not merge, deploy or claim to replace campaign release checks.', 26, C.muted, 400);
  return out + '</svg>';
}

const graphics = [
  ['01-agent-orchestration', modelFlow()],
  ['02-jetro-integration', jetro()],
  ['03-geek-pictures-integration', geek()],
  ['04-value-create-integration', valueCreate()],
  ['05-hakuhodo-integration', hakuhodo()],
];
await mkdir(output, { recursive: true });
for (const [name, svg] of graphics) {
  const sourcePath = resolve(output, `${name}.svg`);
  const imagePath = resolve(output, `${name}.png`);
  await writeFile(sourcePath, svg, 'utf8');
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(imagePath);
  console.log(imagePath);
}
