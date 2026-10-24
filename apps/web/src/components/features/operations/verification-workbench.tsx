'use client';

import {useState, type KeyboardEvent} from 'react';
import dynamic from 'next/dynamic';
import {Check, X, Minus, ShieldCheck, Github, ArrowUpRight, FileCode2, Terminal, ClipboardCheck, ChevronDown} from 'lucide-react';
import {checkGroups} from '@/lib/dashboard-analytics';
import type {LiveRun} from '@/types/live-orchestration';
import CandidateDiffPanel from './candidate-diff';

type Tab = 'checks' | 'diff' | 'output';
const Gauge = dynamic(() => import('@/components/charts/gauge').then(module => module.Gauge), {ssr: false});
export default function VerificationWorkbench({run}: {run: LiveRun | null}) {
  const [tab, setTab] = useState<Tab>('checks');
  const groups = checkGroups(run?.checks ?? []);
  const passed = run?.checks.filter(check => check.status === 'passed').length ?? 0;
  function changeTab(event: KeyboardEvent<HTMLDivElement>) {
    const tabs: Tab[] = ['checks', 'diff', 'output'];
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[index]); document.getElementById(`tab-${tabs[index]}`)?.focus();
  }
  return <section className="ops-verification" id="verification"><div className="ops-panel-heading"><h2>Developer workbench</h2><div className="ops-actual-coverage">{!!run?.checks.length && <span aria-hidden="true"><Gauge value={passed / run.checks.length * 100} totalNotches={run.checks.length} width={58} height={39} notchLengthPercent={70} spacing={12} uniformWidth useGradient={false} activeFill="var(--chart-1)" inactiveFill="var(--border)" activeFillOpacity={1} inactiveFillOpacity={1}/></span>}<span>{run?.checks.length ? `${passed} / ${run.checks.length} checks passed` : 'Awaiting execution'}</span></div></div>
    <div className="ops-tabs" role="tablist" aria-label="Candidate evidence" onKeyDown={changeTab}>{([['checks', 'Checks', ClipboardCheck], ['diff', 'Candidate diff', FileCode2], ['output', 'Runner output', Terminal]] as const).map(([id, label, Icon]) => <button id={`tab-${id}`} key={id} role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} aria-controls={`panel-${id}`} onClick={() => setTab(id)}><Icon size={14}/>{label}</button>)}</div>
    <div className="ops-tab-content" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
      {tab === 'checks' ? groups.length ? <div className="ops-check-groups">{groups.map(group => <details key={`${run?.id}-${group.id}`}><summary><ShieldCheck size={15}/><strong>{group.label}</strong><span className={group.failed ? 'failed' : group.passed === group.checks.length ? 'passed' : ''}>{group.failed ? `${group.failed} failed` : `${group.passed} / ${group.checks.length} passed`}</span><ChevronDown size={14}/></summary><ul>{group.checks.map(check => <li key={check.id} className={check.status}><span>{check.status === 'passed' ? <Check size={14}/> : check.status === 'failed' ? <X size={14}/> : <Minus size={14}/>}</span><div><strong>{check.label}</strong>{check.detail && <p>{check.detail}</p>}</div><small>{check.status.replace('-', ' ')}</small></li>)}</ul></details>)}</div> : <div className="ops-empty"><ShieldCheck size={24}/><div><strong>No checks recorded</strong><p>The worker records policy, runtime and business checks. Missing evidence never counts as a pass.</p></div></div> : tab === 'diff' ? <CandidateDiffPanel run={run}/> : <div className="ops-runner-output">{run?.evidence ? <><details><summary>Business-check output</summary><pre>{run.evidence.businessLog ?? 'No business log recorded.'}</pre></details>{run.evidence.runtime && <details><summary>Observed PHP runtime</summary><pre>{JSON.stringify(run.evidence.runtime, null, 2)}</pre></details>}{run.evidence.policy && <details><summary>Policy output</summary><pre>{JSON.stringify(run.evidence.policy, null, 2)}</pre></details>}<dl>{run.repo.candidateSha && <div><dt>Candidate</dt><dd><code>{run.repo.candidateSha}</code></dd></div>}{run.evidence.verifierSha256 && <div><dt>Frozen verifier</dt><dd><code>{run.evidence.verifierSha256}</code></dd></div>}{run.evidence.artifactSha256 && <div><dt>Artifact SHA-256</dt><dd><code>{run.evidence.artifactSha256}</code></dd></div>}</dl></> : <div className="ops-empty"><Terminal size={24}/><div><strong>No runner artifacts yet</strong><p>Actual hosted output and evidence identities appear after verification.</p></div></div>}</div>}
    </div>
    <div className="ops-verification-footer"><span>{run?.sourceMode === 'cached' ? 'Recorded advisory input · real execution' : 'Official source intake · real execution'}</span>{run?.ci && <a href={run.ci.url} target="_blank" rel="noreferrer"><Github size={13}/>CI · {run.ci.conclusion ?? run.ci.status}<ArrowUpRight size={12}/></a>}</div>
  </section>;
}
