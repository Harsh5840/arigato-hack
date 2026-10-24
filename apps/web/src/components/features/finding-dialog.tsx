'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, X, Download, GitPullRequest, CircleAlert, ArrowRight } from 'lucide-react';
import type { Finding, Scenario, Stage } from '@/types/security';
import { canPrepareDraft, verificationFor } from '@/lib/workflow';
const steps = ['Reproduce', 'Propose patch', 'Verify', 'Prepare draft'];
export default function FindingDialog({ finding, stage, blocked, scenario, onScenario, onStep, onClose, onExport }: { finding: Finding; stage: Stage; blocked: boolean; scenario: Scenario; onScenario: (value: Scenario) => void; onStep: () => void; onClose: () => void; onExport: () => void }) {
  const [tab, setTab] = useState('Evidence');
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const nodes = root.current?.querySelectorAll<HTMLElement>('button:not([disabled]),select,a[href]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = previousOverflow; old?.focus(); };
  }, [onClose]);
  const eligible = stage >= 3 && canPrepareDraft(verificationFor(blocked));
  return <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div ref={root} className="dialog" role="dialog" aria-modal="true" aria-labelledby="finding-title"><header className="dialog-header"><div><span className="small muted">{finding.id} / {finding.repo}</span><h2 id="finding-title">{finding.title}</h2></div><button className="icon-button" aria-label="Close finding" onClick={onClose}><X/></button></header><div className="demo-notice"><CircleAlert size={17}/><span>Simulated workflow. No live scan, code change, or GitHub pull request.</span></div><div className="step-track">{steps.map((step, i) => <div key={step} className={stage > i ? 'done' : stage === i ? 'current' : ''}><span>{stage > i ? <Check size={16}/> : i + 1}</span>{step}</div>)}</div><div className="tabs" role="tablist">{['Evidence', 'Patch diff', 'Review'].map(t => <button role="tab" aria-selected={tab === t} key={t} onClick={() => setTab(t)}>{t}</button>)}</div><div className="dialog-content" role="tabpanel">
    {tab === 'Evidence' && <><h3>Prove the failure. Then prove the fix.</h3><p className="muted">{finding.summary}</p><div className="compare"><div><label>Baseline / DEMO-BASE</label><strong className="text-red">{finding.before}</strong><span>Security expectation fails in the seeded fixture</span></div><div><label>Patched / DEMO-PATCH</label><strong className={stage >= 3 ? 'text-green' : ''}>{stage >= 3 ? finding.after : 'Awaiting verification'}</strong><span>{stage >= 3 ? 'Security replay passes in the seeded fixture' : 'Generate a patch, then rerun the same check'}</span></div></div><div className="checks">{finding.checks.map((check, i) => <div key={check}><span className={stage >= 3 ? blocked && i === 1 ? 'check fail' : 'check pass' : 'check'}>{stage >= 3 ? blocked && i === 1 ? <X size={14}/> : <Check size={14}/> : '—'}</span>{check}<span className="check-result">{stage >= 3 ? blocked && i === 1 ? 'FAIL (simulated)' : 'PASS (simulated)' : 'Not run'}</span></div>)}</div><p className="small muted">Evidence identifiers are demonstration labels. Immutable hashes and isolated execution are planned for the MVP.</p></>}
    {tab === 'Patch diff' && <><h3>Small change. Explicit review.</h3><p className="muted">{stage >= 2 ? 'Proposed fixture patch. This code has not been applied to a repository.' : 'Use “Propose patch” to reveal the illustrative change.'}</p>{stage >= 2 ? <pre className="diff">{finding.diff.map((line, i) => <div key={i} className={line.startsWith('+') ? 'added' : line.startsWith('-') ? 'removed' : ''}>{line}</div>)}</pre> : <div className="empty-state">No patch proposed yet.</div>}<p className="small muted">Dependency policy: choose a maintained compatible fixed version, regenerate the lockfile, and test. The highest available version is not automatically the safest upgrade.</p></>}
    {tab === 'Review' && <><h3>{stage === 4 ? 'Local draft prepared' : eligible ? 'Ready for developer review' : 'Evidence gate'}</h3><p className="muted">{stage === 4 ? 'This is a local PR preview. Nothing has been sent to GitHub.' : 'Every required check must pass before a local draft can be prepared.'}</p><div className="review-gates">{[['Failure reproduced',stage >= 1],['Patch proposed',stage >= 2],['Security replay passes',stage >= 3],['Benign regressions pass',stage >= 3 && !blocked],['Matching commit and test IDs (simulated)',stage >= 3]].map(([label, pass]) => <div key={String(label)}><span>{String(label)}</span><strong className={pass ? 'text-green' : 'muted'}>{pass ? 'Satisfied' : 'Pending / blocked'}</strong></div>)}</div>{stage === 4 && <div className="pr-preview"><GitPullRequest size={20}/><div><strong>fix: {finding.title.toLowerCase()}</strong><p>Branch: proofpatch/{finding.id.toLowerCase()}<br/>Includes proposed patch, regression evidence, limitations, and reviewer checklist.</p></div></div>}<p className="small muted">A human owns the merge decision. Passing these checks covers only the tested behavior.</p></>}
  </div><footer className="dialog-footer"><label className="scenario">Demo outcome<select aria-label="Demo outcome" value={scenario} onChange={e => onScenario(e.target.value as Scenario)}><option value="pass">All checks pass</option><option value="regression">Regression fails</option></select></label><div className="dialog-actions"><button className="button subtle" onClick={onExport}><Download size={16}/>Export evidence</button><button className="button primary" disabled={stage === 4} onClick={() => { onStep(); if (stage === 1) setTab('Patch diff'); if (stage >= 2) setTab('Review'); }}>{stage === 4 ? 'Draft prepared' : stage === 3 && blocked ? 'Retry verification' : steps[stage]}<ArrowRight size={16}/></button></div></footer></div></div>;
}
