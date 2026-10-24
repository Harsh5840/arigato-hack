'use client';

import {useEffect, useRef, useState} from 'react';
import {AlertTriangle, GitBranch, ArrowUpRight, RefreshCw, Network, ChevronDown} from 'lucide-react';
import {useLiveOrchestration} from '@/hooks/use-live-orchestration';
import {useRepositoryMonitoring} from '@/hooks/use-repository-monitoring';
import {isTerminal} from '@/types/live-orchestration';
import type {LiveRun} from '@/types/live-orchestration';
import type {MonitoredRepository} from '@/types/monitoring';
import DashboardHeader from './operations/dashboard-header';
import RunMetrics from './operations/run-metrics';
import OrchestrationPanel from './operations/orchestration-panel';
import VerificationWorkbench from './operations/verification-workbench';
import ReviewPanel from './operations/review-panel';
import RunAnalytics from './operations/run-analytics';
import SecurityJourney from './operations/security-journey';
import RepositoryPanel from './operations/repository-panel';
import SecurityWatchPanel from './operations/security-watch-panel';
import FindingsPanel from './operations/findings-panel';
import {canPrepareRepair} from './operations/repair-capability';

function belongsTo(run: LiveRun, repository?: MonitoredRepository) {return !!repository && (run.repositoryId === repository.id || run.repo.owner.toLowerCase() === repository.owner.toLowerCase() && run.repo.name.toLowerCase() === repository.name.toLowerCase());}

export default function OperationsDashboard() {
  const {service, run: selection, runs: allRuns, events: storedEvents, connection, error, busy, refresh, start, cancel, selectRun, adoptRun, clearSelection} = useLiveOrchestration();
  const monitoring = useRepositoryMonitoring();
  const [sourceMode, setSourceMode] = useState<'live' | 'cached'>('live');
  const [repositoryId, setRepositoryId] = useState('');
  const repository = monitoring.repositories.find(item => item.id === repositoryId);
  const requestedRun = useRef<string | null>(null);
  const followedAutomaticRuns = useRef(new Set<string>());
  useEffect(() => {
    if (repositoryId || !monitoring.repositories.length) return;
    let saved: string | null = null;
    try {saved = localStorage.getItem('proofpatch.repository');} catch { /* Storage can be disabled. */ }
    const preferred = monitoring.repositories.find(item => item.id === saved) ?? monitoring.repositories.find(item => item.enabled) ?? monitoring.repositories[0];
    setRepositoryId(preferred.id);
  }, [repositoryId, monitoring.repositories]);
  const runs = allRuns.filter(item => belongsTo(item, repository));
  const run = selection && belongsTo(selection, repository) ? selection : null;
  const events = run ? storedEvents : [];
  const findings = monitoring.findings.filter(item => item.repositoryId === repositoryId);
  const activeRun = allRuns.find(item => !isTerminal(item.status));
  useEffect(() => {
    if (!repository?.autoRemediate) return;
    const queued = findings.find(item => item.status === 'queued' && item.runId && !followedAutomaticRuns.current.has(item.runId));
    if (!queued?.runId) return;
    followedAutomaticRuns.current.add(queued.runId);
    if (run?.id !== queued.runId) void selectRun(queued.runId);
  }, [repository, findings, run?.id, selectRun]);
  useEffect(() => {
    if (!repository) return;
    if (run) {requestedRun.current = null; return;}
    const latest = allRuns.find(item => belongsTo(item, repository));
    if (latest && requestedRun.current !== latest.id) {requestedRun.current = latest.id; void selectRun(latest.id);}
    else if (!latest && selection) clearSelection();
  }, [repository, run, allRuns, selection, selectRun, clearSelection]);
  function chooseRepository(id: string) {requestedRun.current = null; setRepositoryId(id); try {localStorage.setItem('proofpatch.repository',id);} catch { /* Selection still works without browser storage. */ }}
  async function prepareFix(id: string) {const result = await monitoring.remediate(id); if (result) adoptRun(result.run);}
  async function add(url: string) {const result = await monitoring.add(url); if (!result) return false; chooseRepository(result.repository.id); return true;}
  const repairFinding = findings.find(item => item.status === 'detected' && canPrepareRepair(repository, item));
  const actionLabel = repairFinding ? 'Prepare draft fix' : 'Scan repository';
  function runAction() {if (!repository) return; if (repairFinding) void prepareFix(repairFinding.id); else void monitoring.scan(repository.id);}
  async function followActive() {if (!activeRun) return; const owner = monitoring.repositories.find(item => belongsTo(activeRun, item)); if (owner) chooseRepository(owner.id); await selectRun(activeRun.id);}
  function exportRun() {
    if (!run) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({product: 'ProofPatch', exportedAt: new Date().toISOString(), run, events}, null, 2)], {type: 'application/json'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `proofpatch-${run.id}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="operations-dashboard" id="operations">
    <DashboardHeader service={service} connection={connection} busy={busy || !!monitoring.pending} run={run} activeRun={activeRun} sourceMode={sourceMode} onSourceMode={setSourceMode} onRun={runAction} onCancel={() => void cancel()} onFollow={() => void followActive()} onRefresh={() => {void refresh(); void monitoring.refresh();}} onExport={exportRun} repositories={monitoring.repositories} repositoryId={repositoryId} onRepository={chooseRepository} actionLabel={actionLabel}/>
    <main className="ops-main"><div className="ops-console-heading"><div><h1>Repository security</h1><p>Connect your code. Watch security news. Review the fix before it merges.</p></div><span><GitBranch size={13}/>{run?.repo.branch ?? repository?.defaultBranch ?? 'No repository selected'}{run?.repo.candidateSha && <code>{run.repo.candidateSha.slice(0, 7)}</code>}</span></div>
      {connection === 'loading' && !service && <div className="ops-connection-loading" role="status"><span/><p>Connecting to the persisted worker queue…</p></div>}
      {error && <div className="ops-error-banner" role="alert"><AlertTriangle size={18}/><div><strong>{error.code}</strong><p>{error.message}</p></div><button className="button subtle" onClick={() => void refresh()}><RefreshCw size={13}/>Reconnect</button></div>}
      {service && !service.ready && <div className="ops-error-banner" role="status"><AlertTriangle size={18}/><div><strong>Server setup required</strong><p>{!service.groqConfigured ? 'Groq credentials are missing. ' : ''}{!service.githubConfigured ? 'GitHub credentials are missing. ' : ''}Configure the server and reconnect. Credentials never enter this dashboard.</p></div></div>}
      {monitoring.error && <div className="ops-error-banner" role="alert"><AlertTriangle size={18}/><div><strong>{monitoring.error.code}</strong><p>{monitoring.error.message}</p></div><button className="button subtle" onClick={() => void monitoring.refresh()}><RefreshCw size={13}/>Reload monitoring</button></div>}
      <RunMetrics runs={runs} loaded={service !== null && monitoring.loaded && !!repository}/>
      <SecurityJourney repository={repository} snapshot={monitoring.snapshot} findings={findings} run={run} events={events}/>
      <div className="ops-monitoring-grid"><RepositoryPanel repositories={monitoring.repositories} selectedId={repositoryId} loaded={monitoring.loaded} pending={monitoring.pending} onSelect={chooseRepository} onAdd={add} onUpdate={(id, changes) => void monitoring.update(id, changes)} onScan={id => void monitoring.scan(id)}/><SecurityWatchPanel snapshot={monitoring.snapshot} pending={monitoring.pending} onPoll={() => void monitoring.poll()} onToggle={enabled => void monitoring.configure({enabled})}/></div>
      <FindingsPanel findings={findings} repository={repository} pending={monitoring.pending} onRepair={id => void prepareFix(id)} onRun={id => void selectRun(id)}/>
      <div className="ops-case-strip"><div><strong>{run?.advisory?.titleEn ?? 'No repair run selected'}</strong></div><span>{run?.target ? `${run.target.packageName} ${run.target.installedVersion} → ${run.target.fixedVersion}` : run?.advisory ? `PHP ${run.advisory.fixedVersion}` : 'Awaiting a corroborated finding'}</span>{run?.advisory?.sources[0] && <a href={run.advisory.sources[0].url} target="_blank" rel="noreferrer">Source evidence<ArrowUpRight size={13}/></a>}</div>
      <details className="ops-technical-orchestration"><summary><Network size={16}/>How the three agents work<span>Technical details</span><ChevronDown size={14}/></summary><OrchestrationPanel run={run} events={events} service={service}/></details>
      {run?.failure && <div className="ops-error-banner" role="alert"><AlertTriangle size={18}/><div><strong>{run.failure.code}</strong><p>{run.failure.message}</p></div>{!activeRun && <button className="button outline" onClick={() => {if (run.target) void prepareFix(run.target.findingId); else void start(run.sourceMode);}} disabled={busy || !service?.ready}>Retry workflow</button>}</div>}
      <div className="ops-developer-grid"><VerificationWorkbench run={run}/><ReviewPanel run={run}/></div>
      <RunAnalytics runs={runs} run={run} events={events} onSelect={id => void selectRun(id)}/>
      <footer className="ops-footer"><span>ProofPatch · Open Innovation · Packages + container images</span><span>Detected stack, observed tests, real draft PR. You decide whether to merge.</span></footer>
    </main>
  </div>;
}
