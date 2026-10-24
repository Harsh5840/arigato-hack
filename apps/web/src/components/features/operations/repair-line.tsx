'use client';

import {useId} from 'react';
import {repairLineGeometry as geometry} from './repair-line.geometry';

type SceneKey = keyof typeof geometry.scenes;
const parts = new Map(geometry.parts.map(part => [part.name, part]));
const stationOf = (name: string) => name.startsWith('s') && /^s\d\./.test(name) ? Number(name[1]) - 1 : -1;

interface Props {
  /** Station the cartridge sits at, 0-5. */
  station: number;
  /** The evidence gate held this run: the cartridge stops at the lowered gate arm. */
  blocked: boolean;
  active: number; done: boolean[];
  /** Station to emphasise because the reader selected its step, or -1. */
  focus: number;
  label: string;
}

/** Illustration of the six-step workflow. It is posed from recorded run state; it measures nothing itself. */
export default function RepairLine({station, blocked, active, done, focus, label}: Props) {
  const id = useId();
  const key: SceneKey = blocked ? 'blocked' : String(Math.max(0, Math.min(5, station))) as SceneKey;
  const cartX = blocked ? 128 : geometry.stationX[Math.max(0, Math.min(5, station))];
  const gate = !blocked && station >= 5 ? 26 : 0;
  const lampState = (index: number) => active === index ? 'active' : done[index] ? 'done' : 'idle';
  return <svg className="repair-line-svg" viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="img" aria-labelledby={`${id}-t ${id}-d`} data-focus={focus}>
    <title id={`${id}-t`}>{`The repair line: ${label}`}</title>
    <desc id={`${id}-d`}>{`An illustrated bench with six numbered stations: repository tray, watch mast, Supply Chain scanner, Remediation press with the frozen-test vault, DevSec test bench with the evidence gate, and the review tray. The lime cartridge is the candidate fix. ${blocked ? 'It is stopped at the lowered evidence gate.' : station >= 5 ? 'The gate arm is raised and the cartridge sits in the review tray.' : `It is at station ${station + 1}.`}`}</desc>
    <style>{geometry.css}</style>
    {geometry.scenes[key].map(name => {
      const part = parts.get(name)!;
      const index = stationOf(name);
      const lamp = part.move.startsWith('lamp-') ? Number(part.move.slice(5)) : -1;
      const offset = part.move === 'cart' ? cartX : part.move === 'gate' ? gate : 0;
      const vector = part.move === 'cart' ? geometry.motion.x : geometry.motion.z;
      return <g key={name} className="rl-part" data-move={part.move} data-station={index} data-dim={focus >= 0 && index >= 0 && index !== focus ? '' : undefined} data-lamp={lamp >= 0 ? lampState(lamp) : undefined}
        style={part.move === 'cart' || part.move === 'gate' ? {transform: `translate(${(vector[0] * offset).toFixed(2)}px, ${(vector[1] * offset).toFixed(2)}px)`} : undefined} dangerouslySetInnerHTML={{__html: part.svg}}/>;
    })}
  </svg>;
}
