import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as k from './vendor/kit/iso-kit.mjs';
import * as A from './vendor/kit/audit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const design = resolve(here, '..');
const destination = resolve(here, '../../apps/web/src/components/features');
mkdirSync(destination, { recursive: true });
const width = 800, height = 480;
const bed = { x: -120, y: -85, w: 280, d: 170, r: 10 };
const bounds=[...k.boxCorners(bed,-15,0),...k.boxCorners({x:11,y:-73,w:40,d:146,r:0},0,80),...[-48,-24,0,24,48].flatMap(y=>[[33,y-2,103],[37,y+2,103]])];
const P = k.fitProjection(bounds, width, height, { pad: 34, azimuth: 57, elevation: 29 });
const cssSource = `
.verification-svg{--anatomy-paper:#202321;--anatomy-face:#30352e;--anatomy-top:#373c36;--anatomy-shade-0:#181c19;--anatomy-shade-1:#222722;--anatomy-shade-2:#2b302b;--anatomy-shade-3:#323832;--anatomy-hi:#b6b8aa;--anatomy-mid:#7a8274;--anatomy-lo:#525b4e;--anatomy-faint:#414a3e;--anatomy-lit:#c7ef79;--anatomy-lit-top:#c7ef79;--anatomy-lit-shade:#779945;--anatomy-weight:.7px}
.verification-svg{display:block;width:100%;height:auto;overflow:visible}.verification-svg path,.verification-svg circle{vector-effect:non-scaling-stroke}.verification-svg .iso-fill{fill:var(--anatomy-paper);stroke:none}.verification-svg .iso-shade{stroke:none}.verification-svg .iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}.verification-svg .iso-shade[data-shade="1"]{fill:var(--anatomy-shade-1)}.verification-svg .iso-shade[data-shade="2"]{fill:var(--anatomy-shade-2)}.verification-svg .iso-shade[data-shade="3"]{fill:var(--anatomy-shade-3)}.verification-svg .iso-top{fill:var(--anatomy-top);stroke:none}.verification-svg .iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}.verification-svg [data-tone="hi"]{stroke:var(--anatomy-hi)}.verification-svg [data-tone="mid"]{stroke:var(--anatomy-mid)}.verification-svg [data-tone="faint"]{stroke:var(--anatomy-faint)}.verification-svg [data-tone="lit"]{stroke:var(--anatomy-lit)}.verification-svg .iso-dots{fill:var(--anatomy-hi)}.verification-svg .iso-dots[data-tone="lo"]{fill:var(--anatomy-lo)}.verification-svg .iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}.verification-svg .iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}.verification-svg .iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}.verification-svg .iso-face-text{fill:var(--anatomy-hi);font-family:monospace;letter-spacing:.5px}.verification-svg .machine-part{transition:transform 740ms cubic-bezier(.22,.7,.25,1)}@media(prefers-reduced-motion:reduce){.verification-svg .machine-part{transition:none}}
`;
// Resolve tokens at build time too: browser CSS variables work, but SVG importers
// used by slide/document tools do not consistently inherit them.
const palette=Object.fromEntries([...cssSource.matchAll(/(--[\w-]+):([^;}]+)/g)].map(([,name,value])=>[name,value]));
const CSS=cssSource.replace(/var\((--[\w-]+)\)/g,(_,name)=>palette[name]);
const parts = [];
const line = (d, tone = 'faint', free) => k.lineSvg(d, { tone, free });
const screws = (plan, z, points = k.corners(plan, 3.3)) => points.map(([x,y]) => line(k.ring(x,y,1.4,z,P,16),'mid') + k.dotsSvg([k.iso([x,y,z],P)],{size:.45,tone:'hi'})).join('');
const plan = (x,y,w,d,r=1) => ({x,y,w,d,r});
function slab(name, p, z, h, { tone='mid', lit=false, move='fixed', inner='' }={}) {
  parts.push({name, plan:p, z, h, move, kind:'slab', at:[p.x+p.w/2,p.y+p.d/2,z+h/2], svg:k.solidSvg(k.slabOf(p,z,h,P,6,.7), {tone,lit,inner})});
}
function cylinder(name,x,y,r,z,h,{inner='',tone='mid'}={}) {
  parts.push({name,x,y,r,z,h,move:'fixed',kind:'cylinder',at:[x,y,z+h/2],svg:k.solidSvg(k.cylinder(x,y,r,z,h,P,40,.5),{tone,inner})});
}
for (const [i,[x,y]] of k.corners(bed,20).entries()) {
  cylinder(`stand.foot-pad.${i}`,x,y,8,-15,2,{tone:'lo'});
  cylinder(`stand.leveling-foot.${i}`,x,y,5.6,-13,5,{tone:'lo'});
}
slab('stand.bedplate',bed,-8,8,{tone:'mid',inner:line(k.planOutline(k.insetPlan(bed,5),0,P),'lo')+line(k.sideSeam(bed,-4,P,6),'faint')+screws(bed,0,k.corners(bed,10))});
for(const y of [-46,42]) {
  const rail=plan(-108,y,244,4,1.2);
  slab(`rail.${y}`,rail,0,8,{tone:'hi',inner:line(k.planOutline(k.insetPlan(rail,.8),8,P),'lo')});
  for(const x of [-114,136]) { const stop=plan(x,y-3,6,10,1.3);slab(`stop.${x}.${y}`,stop,0,12,{inner:screws(stop,12,[[x+3,y+2]])}); }
}
const ruler=plan(-104,76,238,8,1.3), ticks=k.topTicks(-100,130,5,5,76,1,[2.4,5],P);
slab('ruler-strip',ruler,0,1,{tone:'lo',inner:line(ticks.minor,'lo')+line(ticks.major,'mid')+line(k.lineOnTop([-100,76],[130,76],1,P),'mid')});
const nameplate=plan(-105,-77,58,13,2);
slab('identity-plate',nameplate,0,1,{tone:'lo',inner:line(k.planOutline(k.insetPlan(nameplate,1.5),1,P),'faint')+screws(nameplate,1,[[-101,-70.5],[-51,-70.5]])+k.faceTextSvg(k.topMatrix([-76,-69],1.1,P),'PP / 05',{size:3.3,anchor:'middle',tone:'hi'})});
for(const y of [-73,60]) {
  const shoe=plan(16,y,35,13,2), post=plan(25,y+2,14,9,1.5);
  slab(`gantry-shoe.${y}`,shoe,0,4,{inner:screws(shoe,4)});
  slab(`gantry-post.${y}`,post,4,64,{inner:line(k.sideSeam(post,21,P,6),'lo')+line(k.planOutline(k.insetPlan(post,2),68,P),'mid')});
  slab(`gantry-gusset.${y}`,plan(11,y+3,14,7,1),4,15,{tone:'lo'});
}
const beam=plan(20,-73,8,146,1.5);
slab('gantry-crossbeam',beam,68,10,{tone:'hi',inner:line(k.sideSeam(beam,73,P,6),'lo')+screws(beam,78,[[24,-69],[24,69]])});
const labels=['Baseline failure','Candidate passes','Benign controls','Test identity','Commit identity'];
for(const [i,y] of [-48,-24,0,24,48].entries()) {
  const bracket=plan(28,y-8,3,16,.5);
  slab(`check.${i}.bracket`,bracket,68,12,{inner:screws(bracket,80,[[29.5,y]])});
  for(const edge of [-1,1]) {
    const cheek=plan(31,y+(edge<0?-6:2),12,4,1);
    slab(`check.${i}.guide.${edge}`,cheek,68,12,{inner:line(k.planOutline(k.insetPlan(cheek,.8),80,P),'lo')});
  }
  slab(`check.${i}.stem`,plan(33,y-2,4,4,.5),33,47,{move:`check-${i}`,tone:'hi',inner:line(k.sideSeam(plan(33,y-2,4,4,.5),57,P,6),'lo')});
  const dog=plan(28,y-7,14,14,2);
  slab(`check.${i}.shoe`,dog,24,9,{move:`check-${i}`,tone:'hi',inner:line(k.planOutline(k.insetPlan(dog,2),33,P),'lo')+screws(dog,33,[[35,y]])});
}
const cartridge=plan(-95,-57,80,114,5);
slab('patch.tray',cartridge,13,6,{move:'patch',tone:'hi',inner:line(k.sideSeam(cartridge,16,P,6),'lo')});
for(const x of [-91,-31])for(const y of [-46,42]) {
  const bearing=plan(x,y-1,12,6,1.2); slab(`patch.bearing.${x}.${y}`,bearing,8,5,{move:'patch',inner:screws(bearing,13,[[x+6,y+2]])});
}
const insert=plan(-86,-50,62,100,3);
slab('patch.insert',insert,19,7,{move:'patch',lit:true,tone:'hi',inner:line(k.planOutline(k.insetPlan(insert,3),26,P),'mid')+line(k.planOutline(plan(-79,-42,48,9,1),26,P),'mid')+line(k.planOutline(plan(-79,28,48,9,1),26,P),'mid')+screws(insert,26,k.corners(insert,6))});
slab('patch.nose',plan(-21,-55,6,110,1),19,7,{move:'patch',tone:'hi'});
for(const y of [-19,15])slab(`patch.pull-upright.${y}`,plan(-102,y,7,4,1),15,10,{move:'patch',tone:'hi'});
slab('patch.pull',plan(-103,-19,5,38,1.4),25,4,{move:'patch',tone:'hi',inner:line(k.planOutline(plan(-102,-16,3,32,.8),29,P),'lo')});
for(const [i,x]of [-20,102].entries()) {
  const pedestal=plan(x-10,-74,20,17,2);slab(`knob.pedestal.${i}`,pedestal,0,5,{tone:'lo',inner:screws(pedestal,5)});
  cylinder(`knob.${i}`,x,-65,6,5,6,{tone:'mid',inner:line(k.knurl(x,-65,6,5,11,36,P),'lo')+line(k.ring(x,-65,3.5,11,P,40),'mid')});
}
const state = (stage,blocked=false) => ({ checks:[stage>=1,stage>=3,stage>=3&&!blocked,stage>=3,stage>=3], travel:stage===0?0:stage===1?12:stage===2||blocked?40:stage===3?108:130 });
function posePart(part,s) {
  const offset=part.move==='patch'?[s.travel,0,0]:part.move.startsWith('check-')?[0,0,s.checks[Number(part.move.at(-1))]?23:0]:[0,0,0];
  const p=part.plan ? {...part.plan,x:part.plan.x+offset[0],y:part.plan.y+offset[1]}:null;
  return {offset,p,z:part.z+offset[2]};
}
function record(s) {
  const R=A.recorder(P);
  for(const part of parts) {
    const {offset,p,z}=posePart(part,s);
    const shape=part.kind==='slab'?A.slab(p,z,part.h,{name:part.name,owner:part.name.startsWith('patch.')?'patch':part.name.startsWith('check.')?part.name.split('.').slice(0,2).join('.'):part.name}):A.cylinder(part.x,part.y,part.r,z,part.h,{name:part.name});
    const svg=`<g class="machine-part" data-part="${part.name}" transform="${k.translateAlong(P,offset)}">${part.svg}</g>`;
    R.put({name:part.name,piece:part.move,at:part.at.map((n,i)=>n+offset[i]),svg,shapes:[R.solid(shape)]});
  }
  A.settle(R,P,{step:2});R.items.sort((a,b)=>a.key-b.key);
  return R;
}
const scenes={};
for(let stage=0;stage<=4;stage++)for(const blocked of [false,true]) {
  const key=`${stage}-${blocked?'blocked':'pass'}`, s=state(stage,blocked), R=record(s);
  scenes[key]=R.items.map(item=>item.name);console.log(`Ordered ${key}`);
}
function svg(stage,blocked) {
 const s=state(stage,blocked),R=record(s);
 const desc=blocked?'Four checks are aligned. The benign regression shoe remains lowered and the patch cartridge is stopped before promotion.':'Five verification checks are aligned. The lime patch cartridge has cleared the mechanical interlock for human review.';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="machine-title machine-desc" class="verification-svg"><title id="machine-title">ProofPatch verification interlock</title><desc id="machine-desc">${desc} Synthetic prototype illustration.</desc><style>${CSS}</style>${R.items.map(item=>item.svg).join('')}</svg>`;
}
writeFileSync(resolve(design,'verification-machine.svg'),svg(3,false));
writeFileSync(resolve(design,'verification-machine-blocked.svg'),svg(3,true));
writeFileSync(resolve(here,'preview.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verification interlock</title></head><body style="margin:0;background:#151815;color:#bbbfb3;font-family:monospace"><main style="max-width:1000px;margin:auto"><div class="iso-plate">${svg(3,false)}</div><div class="iso-plate">${svg(3,true)}</div></main></body></html>`);
writeFileSync(resolve(here,'parts.json'),JSON.stringify({count:parts.length,checks:labels,projection:P,parts:parts.map(({svg,...part})=>part)},null,2));
const origin=k.iso([0,0,0],P), vector=(point)=>k.iso(point,P).map((n,i)=>n-origin[i]);
writeFileSync(resolve(destination,'verification-machine.geometry.ts'),`// Generated by design/anatomy/build.mjs using the installed Anatomy kit. Do not edit paths.\nexport const machineGeometry = ${JSON.stringify({width,height,css:CSS,motion:{x:vector([1,0,0]),z:vector([0,0,1])},parts:parts.map(({name,move,svg})=>({name,move,svg})),scenes})} as const;\n`);
console.log(`Built ${parts.length} actual kit solids, 10 state orderings, transparent pass and blocked SVGs.`);
if(process.argv.includes('--audit')) for(const blocked of [false,true]) {
 console.log(`\n${blocked?'BLOCKED':'PASS'} pose`);
 const R=record(state(3,blocked));A.auditOrExit(R,P);
}
