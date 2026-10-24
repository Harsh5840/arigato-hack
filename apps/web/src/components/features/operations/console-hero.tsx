'use client';

import {ArrowUpRight, GitBranch, Github, ArrowDown} from 'lucide-react';
import {isTerminal, liveStatusLabels, type LiveEvent, type LiveRun} from '@/types/live-orchestration';
import type {MonitoredRepository, MonitoringSnapshot, SupplyFinding} from '@/types/monitoring';
import {activeStepIndex, flowSteps, stepDone} from './flow-model';
import {durationLabel, japanTime} from './format';
import RepairLine from './repair-line';

const stations = ['Repository tray', 'Watch mast', 'Supply Chain scanner', 'Remediation press and frozen-test vault', 'DevSec bench and evidence gate', 'Review tray'];

function outcome(repository: MonitoredRepository | undefined, run: LiveRun | null): {tone: string; pill: string; headline: string} {
  if (!repository) return {tone: 'idle', pill: 'Not connected', headline: 'Connect a repository to begin'};
  if (!run) return {tone: 'idle', pill: 'Watching', headline: `Watching ${repository.name}. No repair run yet.`};
  if (!isTerminal(run.status)) return {tone: 'running', pill: 'Running', headline: liveStatusLabels[run.status]};
  if (run.status === 'completed' && run.pullRequest) return {tone: 'done', pill: 'Draft ready', headline: `Draft PR #${run.pullRequest.number} is ready for your review`};
  if (run.status === 'blocked') return {tone: 'held', pill: 'Held', headline: 'The evidence gate held this draft'};
  if (run.status === 'failed') return {tone: 'failed', pill: 'Failed', headline: 'This run failed before a draft was allowed'};
  if (run.status === 'cancelled') return {tone: 'idle', pill: 'Cancelled', headline: 'This run was cancelled'};
  return {tone: 'done', pill: 'Completed', headline: liveStatusLabels[run.status]};
}

interface Props {
  repository?: MonitoredRepository; snapshot: MonitoringSnapshot | null; findings: SupplyFinding[];
  run: LiveRun | null; events: LiveEvent[]; focus: number; onFocus: (index: number) => void;
}
export default function ConsoleHero({repository, snapshot, findings, run, events, focus, onFocus}: Props) {
  const active = activeStepIndex(repository, run);
  const done = stepDone(repository, snapshot, findings, run);
  const blocked = run?.status === 'blocked';
  const station = active >= 0 ? active : run?.pullRequest ? 5 : Math.max(0, done.lastIndexOf(true));
  const state = outcome(repository, run);
  const latest = events.at(-1);
  const elapsed = run ? Date.parse(run.updatedAt) - Date.parse(run.createdAt) : null;
  const where = blocked ? 'stopped at the evidence gate' : `at station ${station + 1}: ${stations[station]}`;
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-copy">
      <h1 id="hero-title">Repository security</h1>
      <p className="hero-lede">Connect a repository, watch for security alerts, and review every fix as a tested draft pull request before it merges.</p>
      <div className="hero-repo">{repository ? <><Github size={15}/><a href={repository.url} target="_blank" rel="noreferrer">{repository.owner}/{repository.name}</a><span><GitBranch size={14}/>{run?.repo.branch ?? repository.defaultBranch}</span>{run?.repo.candidateSha && <code>{run.repo.candidateSha.slice(0, 7)}</code>}</> : <span>No repository selected</span>}</div>
      <article className={`pulse ${state.tone}`} aria-live="polite">
        <div className="pulse-top"><span className="pulse-pill"><i/>{state.pill}</span>{run && <span className="pulse-meta">Run {run.id.slice(0, 8)}{elapsed !== null && Number.isFinite(elapsed) ? ` · ${durationLabel(elapsed)}` : ''}</span>}</div>
        <h2>{state.headline}</h2>
        {active >= 0 && <p className="pulse-step">Step {active + 1} of 6 · {flowSteps[active].title} · {flowSteps[active].actor}</p>}
        {(run?.failure || latest) && <p className="pulse-label">{run?.failure ? 'Failure' : 'Latest stored event'}</p>}
        <p className="pulse-event">{run?.failure?.message ?? latest?.message ?? (run ? 'Waiting for the first stored worker event.' : 'Activity here comes from stored worker events. Nothing is invented.')}</p>
        {latest && <time dateTime={latest.at}>{japanTime(latest.at)} JST</time>}
        <div className="pulse-actions">
          {run?.pullRequest && <a className="btn primary" href={run.pullRequest.url} target="_blank" rel="noreferrer">Open draft PR<span className="btn-icon"><ArrowUpRight size={14}/></span></a>}
          {run && <a className="btn text" href="#timeline">See the timeline<ArrowDown size={14}/></a>}
        </div>
      </article>
    </div>
    <figure className="figure-card">
      <div className="figure-inner">
        <figcaption className="figure-head"><span>Fig. 1</span><span>The repair line</span></figcaption>
        <RepairLine station={station} blocked={blocked} active={active} done={done} focus={focus} label={blocked ? 'stopped at the evidence gate' : where}/>
        <div className="figure-foot"><span>Select a station to read its step</span><strong>{blocked ? 'Cartridge held at the gate' : run?.pullRequest ? 'Cartridge in the review tray' : `Cartridge ${where}`}</strong></div>
      </div>
      <ol className="figure-legend">{stations.map((name, index) => <li key={name}><button aria-pressed={focus === index} onClick={() => onFocus(index)}><span>{index + 1}</span>{name}</button></li>)}</ol>
      <p className="figure-note">An illustration posed from the stored run. The lime cartridge is the candidate fix; the gate arm lifts only when the draft is allowed.</p>
    </figure>
  </section>;
}
