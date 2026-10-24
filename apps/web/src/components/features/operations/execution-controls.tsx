'use client';

import {ArrowRight, GitPullRequestDraft, SearchCheck, Wrench} from 'lucide-react';

type Mode = 'guided' | 'automatic' | 'mixed';
interface Props {
  selectedCount: number;
  eligibleCount: number;
  existingDrafts: number;
  mode: Mode;
  pending: string | null;
  connected: boolean;
  notice: string;
  onMode: (mode: 'guided' | 'automatic') => void;
  onScan: () => void;
  onFindings: () => void;
  onPipeline: () => void;
}

export default function ExecutionControls({selectedCount, eligibleCount, existingDrafts, mode, pending, connected, notice, onMode, onScan, onFindings, onPipeline}: Props) {
  const disabled = !!pending || !selectedCount || !connected;
  return <section className="ops-execution-control" aria-label="Scan and repair mode">
    <div className="ops-execution-heading"><div><span>02 / CHOOSE THE EXECUTION</span><h2>How should these services run?</h2><p>The selected mode is saved on the checked repositories.</p></div><strong>{selectedCount} selected</strong></div>
    <div className="ops-mode-switch" aria-label="Execution mode">
      <button aria-pressed={mode === 'guided'} disabled={disabled} onClick={() => onMode('guided')}><span><SearchCheck size={17}/>Step by step</span><small>Scan first. Pick a finding and start its verified fix yourself.</small></button>
      <button aria-pressed={mode === 'automatic'} disabled={disabled || !eligibleCount} onClick={() => onMode('automatic')}><span><GitPullRequestDraft size={17}/>Complete pipeline</span><small>Scan, fix, test, senior review, then a draft PR for your approval.</small></button>
    </div>
    <div className="ops-execution-footer"><div><strong>{mode === 'automatic' ? 'Automatic repair enabled' : mode === 'guided' ? 'You choose when to start a fix' : 'Mixed settings'}</strong><p>{mode === 'automatic' ? `${eligibleCount} supported service${eligibleCount === 1 ? '' : 's'} can prepare a verified draft after a confirmed match. ${selectedCount - eligibleCount} selected service${selectedCount - eligibleCount === 1 ? '' : 's'} will only scan.` : mode === 'guided' ? 'A scan records findings. Open Findings to choose a target; the fix run performs testing, senior review, and draft publication.' : 'Choose a mode to apply one clear rule to the checked services.'}</p></div><button className="button primary" onClick={onScan} disabled={disabled || mode === 'mixed'}><SearchCheck size={14}/>{pending === 'scan-selected' ? 'Queuing scans…' : `Scan ${selectedCount} selected`}</button></div>
    {existingDrafts > 0 && <p className="ops-existing-drafts">{existingDrafts} affected target{existingDrafts === 1 ? ' already has' : 's already have'} a draft PR. Scanning again will not open a duplicate for the same match.</p>}
    {notice && <p className="ops-action-notice" role="status">{notice}</p>}
    <div className="ops-next-steps"><button onClick={onFindings}>See findings<ArrowRight size={13}/></button><span><Wrench size={13}/>Only confirmed findings can start a fix.</span><button onClick={onPipeline}>Watch the pipeline<ArrowRight size={13}/></button></div>
  </section>;
}
