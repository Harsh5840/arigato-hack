'use client';

import type {CSSProperties} from 'react';
import {Github, Rss, SearchCheck, Wrench, ShieldCheck, GitPullRequestDraft, Check, UserRound, Cpu, Bot, ArrowRight} from 'lucide-react';
import type {LiveRun} from '@/types/live-orchestration';
import type {MonitoredRepository, MonitoringSnapshot, SupplyFinding} from '@/types/monitoring';
import {activeStepIndex, flowSteps, stepDone, stepEvidence, type ActorKind} from './flow-model';

const icons = [Github, Rss, SearchCheck, Wrench, ShieldCheck, GitPullRequestDraft];
const actorIcon: Record<ActorKind, typeof Bot> = {you: UserRound, system: Cpu, agent: Bot};
// Same role hues as the timeline lanes and token bars.
const roleOf: Partial<Record<string, string>> = {confirm: 'role-supply', prepare: 'role-fixer', verify: 'role-reviewer'};

interface Props {
  repository?: MonitoredRepository; snapshot: MonitoringSnapshot | null; findings: SupplyFinding[]; run: LiveRun | null;
  focus: number; onFocus: (index: number) => void;
}
export default function SecurityJourney({repository, snapshot, findings, run, focus, onFocus}: Props) {
  const active = activeStepIndex(repository, run);
  const done = stepDone(repository, snapshot, findings, run);
  const reached = Math.max(active, done.lastIndexOf(true));
  const step = flowSteps[focus];
  const ActorIcon = actorIcon[step.actorKind];
  return <section className="flow" aria-labelledby="flow-title">
    <div className="section-head"><h2 id="flow-title">How a fix is made</h2><p>Six steps from a security alert to a pull request you review. Select a step to see who acts and what it is allowed to do.</p></div>
    <ol className="flow-track" style={{'--reached': `${Math.max(0, reached) / (flowSteps.length - 1) * 100}%`} as CSSProperties}>
      {flowSteps.map((item, index) => {const Icon = icons[index]; const state = active === index ? 'active' : done[index] ? 'done' : 'idle'; return <li key={item.id} data-state={state}>
        <button aria-pressed={focus === index} aria-current={active === index ? 'step' : undefined} onClick={() => onFocus(index)}>
          <span className="flow-node">{state === 'done' ? <Check size={18} strokeWidth={2.2}/> : <Icon size={18} strokeWidth={1.8}/>}</span>
          <span className="flow-step-text"><strong>{item.title}</strong><span>{stepEvidence(index, repository, snapshot, findings, run)}</span></span>
          <span className={`actor-chip ${item.actorKind} ${roleOf[item.id] ?? ''}`}>{item.actor}</span>
        </button>
      </li>;})}
    </ol>
    <div className="flow-detail" aria-live="polite">
      <div className="flow-detail-head">
        <span className={`actor-badge ${step.actorKind} ${roleOf[step.id] ?? ''}`}><ActorIcon size={16} strokeWidth={1.8}/></span>
        <div><h3>{step.title}</h3><p>{step.actor}{step.actorKind === 'agent' ? ' · a model call with bounded tools' : step.actorKind === 'system' ? ' · deterministic, no model decides' : ' · human authority'}</p></div>
        <span className={`flow-detail-state ${active === focus ? 'active' : done[focus] ? 'done' : ''}`}>{active === focus ? 'Running now' : done[focus] ? 'Recorded' : !repository && focus === 0 ? 'Start here' : 'Not reached yet'}</span>
      </div>
      <dl className="flow-io">
        <div><dt>Receives</dt><dd>{step.receives}</dd></div>
        <div className="flow-io-arrow" aria-hidden="true"><ArrowRight size={16}/></div>
        <div className="flow-io-main"><dt>Does</dt><dd>{step.does}</dd></div>
        <div className="flow-io-arrow" aria-hidden="true"><ArrowRight size={16}/></div>
        <div><dt>Produces</dt><dd>{step.produces}</dd></div>
      </dl>
      <p className="flow-guard"><ShieldCheck size={15}/><span><strong>Cannot:</strong> {step.cannot}</span></p>
    </div>
  </section>;
}
