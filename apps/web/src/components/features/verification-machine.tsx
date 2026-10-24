'use client';

import { useId } from 'react';
import { machineGeometry as geometry } from './verification-machine.geometry';

type VerificationMachineProps = {
  stage: number;
  blocked: boolean;
  running: boolean;
};

/** The five physical fingers mirror canPrepareDraft's five synthetic checks. */
export default function VerificationMachine({ stage, blocked, running }: VerificationMachineProps) {
  const id = useId();
  const step = Math.max(0, Math.min(4, Math.trunc(Number.isFinite(stage) ? stage : 0)));
  const checks = [step >= 1, step >= 3, step >= 3 && !blocked, step >= 3, step >= 3];
  const aligned = checks.filter(Boolean).length;
  const travel = step === 0 ? 0 : step === 1 ? 12 : step === 2 || blocked ? 40 : step === 3 ? 108 : 130;
  const key = `${step}-${blocked ? 'blocked' : 'pass'}` as keyof typeof geometry.scenes;
  const parts = new Map(geometry.parts.map(part => [part.name, part]));
  const state = step >= 3 && blocked ? 'Blocked by benign regression' : step >= 3 ? 'Eligible for human review' : running ? 'Verification sequence running' : 'Awaiting verification';
  const description = `Synthetic prototype illustration. ${aligned} of five checks aligned: baseline failure, candidate pass, benign controls, test identity, and commit identity. ${step >= 3 && blocked ? 'The middle check finger stays lowered and physically stops the lime patch cartridge before the gate.' : step >= 3 ? 'All check fingers are raised and the lime patch cartridge advances through the gate.' : 'The lime patch cartridge approaches the lowered check fingers. Further evidence is required.'}`;

  return (
    <div className="machine-figure" data-stage={step} data-blocked={blocked} data-running={running}>
      <svg className="verification-svg" viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>{`Verification interlock: ${state}`}</title>
        <desc id={`${id}-description`}>{description}</desc>
        <style>{geometry.css}</style>
        {geometry.scenes[key].map(name => {
          const part = parts.get(name)!;
          const checkIndex = part.move.startsWith('check-') ? Number(part.move.at(-1)) : -1;
          const amount = part.move === 'patch' ? travel : checkIndex >= 0 && checks[checkIndex] ? 23 : 0;
          const vector = part.move === 'patch' ? geometry.motion.x : geometry.motion.z;
          return <g key={name} className="machine-part" data-part={name} style={{ transitionDelay: part.move === 'patch' && step >= 3 && !blocked ? '220ms' : '0ms' }} transform={`translate(${vector[0] * amount} ${vector[1] * amount})`} dangerouslySetInnerHTML={{ __html: part.svg }} />;
        })}
      </svg>
    </div>
  );
}
