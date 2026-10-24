'use client';

import {useEffect, useRef, useState} from 'react';
import {AlertTriangle, ArrowRight, GitBranch, ListChecks, Network, RefreshCw, SearchCheck, Trash2} from 'lucide-react';
import {useLiveOrchestration} from '@/hooks/use-live-orchestration';
import {useRepositoryMonitoring} from '@/hooks/use-repository-monitoring';
import {isTerminal} from '@/types/live-orchestration';
import type {LiveRun} from '@/types/live-orchestration';
import type {MonitoredRepository} from '@/types/monitoring';
import DashboardHeader from './operations/dashboard-header';
import ExecutionControls from './operations/execution-controls';
import RepositoryPanel from './operations/repository-panel';
import FindingsPanel from './operations/findings-panel';
import SecurityWatchPanel from './operations/security-watch-panel';
import SecurityJourney from './operations/security-journey';
import OrchestrationPanel from './operations/orchestration-panel';
import RunMetrics from './operations/run-metrics';
import RunAnalytics from './operations/run-analytics';
import VerificationWorkbench from './operations/verification-workbench';
import ReviewPanel from './operations/review-panel';
import {canPrepareRepair, groupRepairFindings} from './operations/repair-capability';

type DashboardTab = 'services' | 'findings' | 'pipeline' | 'results';
const tabs: {id: DashboardTab; label: string; Icon: typeof GitBranch}[] = [
  {id: 'services', label: 'Services', Icon: GitBranch},
  {id: 'findings', label: 'Findings', Icon: SearchCheck},
  {id: 'pipeline', label: 'Pipeline', Icon: Network},
  {id: 'results', label: 'Results', Icon: ListChecks},
];
function belongsTo(run: LiveRun, repository?: MonitoredRepository) {
  return !!repository && (run.repositoryId === repository.id || run.repo.owner.toLowerCase() === repository.owner.toLowerCase() && run.repo.name.toLowerCase() === repository.name.toLowerCase());
}

export default function OperationsDashboard() {
  const {service, run: selectedRun, runs: allRuns, events: storedEvents, connection, error, busy, refresh, cancel, clearSavedRuns, selectRun, adoptRun, clearSelection} = useLiveOrchestration();
  const monitoring = useRepositoryMonitoring();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [tab, setTab] = useState<DashboardTab>('services');
  const [notice, setNotice] = useState('');
  const [historyNotice, setHistoryNotice] = useState('');
  const requestedRun = useRef<string | null>(null);
  const followedAutomaticRuns = useRef(new Set<string>());

  useEffect(() => {
    if (!monitoring.loaded || initialized) return;
    const known = new Set(monitoring.repositories.map(item => item.id));
    let saved: string[] = [];
    let preferred = '';
    let hadSavedSelection = false;
    try {
      const stored = localStorage.getItem('proofpatch.selectedRepositories');
      hadSavedSelection = stored !== null;
      const parsed: unknown = JSON.parse(stored || '[]');
      if (Array.isArray(parsed)) saved = parsed.filter((item): item is string => typeof item === 'string' && known.has(item));
      preferred = localStorage.getItem('proofpatch.focusedRepository') || localStorage.getItem('proofpatch.repository') || '';
    } catch { /* Browser storage is optional. */ }
    if (!saved.length && !hadSavedSelection && monitoring.repositories.length) saved = [known.has(preferred) ? preferred : monitoring.repositories[0].id];
    setSelectedIds(saved);
    setFocusedId(saved.includes(preferred) ? preferred : saved[0] || '');
    setInitialized(true);
  }, [initialized, monitoring.loaded, monitoring.repositories]);
  useEffect(() => {
    if (!initialized) return;
    try {localStorage.setItem('proofpatch.selectedRepositories', JSON.stringify(selectedIds)); localStorage.setItem('proofpatch.focusedRepository', focusedId);} catch { /* Selection still works. */ }
  }, [initialized, selectedIds, focusedId]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    if (tabs.some(item => item.id === requested)) setTab(requested as DashboardTab);
  }, []);

  const selectedRepositories = monitoring.repositories.filter(item => selectedIds.includes(item.id));
  const focusedRepository = selectedRepositories.find(item => item.id === focusedId);
  const allSelectedFindings = monitoring.findings.filter(item => selectedIds.includes(item.repositoryId));
  const focusedFindings = allSelectedFindings.filter(item => item.repositoryId === focusedId);
  const runs = allRuns.filter(item => selectedRepositories.some(repository => belongsTo(item, repository)));
  const run = selectedRun && belongsTo(selectedRun, focusedRepository) ? selectedRun : null;
  const events = run ? storedEvents : [];
  const activeRun = allRuns.find(item => !isTerminal(item.status));
  const eligible = selectedRepositories.filter(repository => canPrepareRepair(repository));
  const mode = !selectedRepositories.length || selectedRepositories.every(item => !item.autoRemediate) ? 'guided'
    : eligible.length && eligible.every(item => item.autoRemediate && item.enabled) && selectedRepositories.every(item => !canPrepareRepair(item) || item.autoRemediate && item.enabled) ? 'automatic' : 'mixed';
  const groupedFindings = groupRepairFindings(allSelectedFindings);
  const affectedCount = groupedFindings.length;
  const existingDrafts = groupedFindings.filter(group => group.finding.status === 'draft-created').length;

  useEffect(() => {
    if (run && !isTerminal(run.status)) return;
    const queued = allSelectedFindings.find(item => item.status === 'queued' && item.runId && !followedAutomaticRuns.current.has(item.runId));
    if (!queued?.runId) return;
    followedAutomaticRuns.current.add(queued.runId);
    setFocusedId(queued.repositoryId);
    void selectRun(queued.runId);
  }, [allSelectedFindings, run, selectRun]);
  useEffect(() => {
    if (!focusedRepository) {if (selectedRun) clearSelection(); return;}
    if (run) {requestedRun.current = null; return;}
    const latest = allRuns.find(item => belongsTo(item, focusedRepository));
    if (latest && requestedRun.current !== latest.id) {requestedRun.current = latest.id; void selectRun(latest.id);}
    else if (!latest && selectedRun) clearSelection();
  }, [focusedRepository, run, allRuns, selectedRun, selectRun, clearSelection]);

  function changeTab(next: DashboardTab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'services') url.searchParams.delete('tab'); else url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  }
  function focusRepository(id: string) {
    requestedRun.current = null;
    setSelectedIds(previous => previous.includes(id) ? previous : [...previous, id]);
    setFocusedId(id);
  }
  function toggleRepository(id: string) {
    const next = selectedIds.includes(id) ? selectedIds.filter(item => item !== id) : [...selectedIds, id];
    setSelectedIds(next);
    if (!next.includes(focusedId)) {requestedRun.current = null; setFocusedId(next[0] || '');}
    else if (!selectedIds.includes(id)) {requestedRun.current = null; setFocusedId(id);}
    setNotice('');
  }
  function selectAll(checked: boolean) {
    const next = checked ? monitoring.repositories.map(item => item.id) : [];
    setSelectedIds(next);
    if (!next.includes(focusedId)) {requestedRun.current = null; setFocusedId(next[0] || '');}
    setNotice('');
  }
  async function add(url: string) {
    const result = await monitoring.add(url);
    if (!result) return false;
    setSelectedIds([result.repository.id]); setFocusedId(result.repository.id);
    setNotice(`${result.repository.owner}/${result.repository.name} connected. Step by step is the default for a new service.`);
    return true;
  }
  async function applyMode(next: 'guided' | 'automatic') {
    setNotice('');
    const result = await monitoring.setMode(selectedIds, next);
    if (result) setNotice(next === 'guided' ? `Step by step saved for ${selectedIds.length} selected service${selectedIds.length === 1 ? '' : 's'}.` : `Complete pipeline enabled for ${result.enabled} supported service${result.enabled === 1 ? '' : 's'}.${result.scanOnly.length ? ` ${result.scanOnly.length} unsupported service${result.scanOnly.length === 1 ? '' : 's'} will scan only.` : ''}`);
  }
  async function scanSelected() {
    setNotice('');
    const result = await monitoring.scanSelected(selectedIds);
    if (result) setNotice(`${result.queued} service scan${result.queued === 1 ? '' : 's'} queued. ${mode === 'automatic' ? 'New confirmed supported findings will continue through fix, tests, senior review, and a draft PR.' : 'Open Findings after the worker checks advisory sources.'}`);
  }
  async function prepareFix(id: string) {
    const finding = monitoring.findings.find(item => item.id === id);
    if (finding) focusRepository(finding.repositoryId);
    const result = await monitoring.remediate(id);
    if (result) {adoptRun(result.run); changeTab('pipeline');}
  }
  async function showRun(id: string) {
    const target = allRuns.find(item => item.id === id);
    const owner = monitoring.repositories.find(item => target && belongsTo(target, item));
    if (owner) focusRepository(owner.id);
    await selectRun(id);
    changeTab('results');
  }
  async function followActive() {
    if (!activeRun) return;
    const owner = monitoring.repositories.find(item => belongsTo(activeRun, item));
    if (owner) focusRepository(owner.id);
    await selectRun(activeRun.id);
    changeTab('pipeline');
  }
  function exportRun() {
    if (!run) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({product: 'ProofPatch', exportedAt: new Date().toISOString(), run, events}, null, 2)], {type: 'application/json'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `proofpatch-${run.id}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function deleteHistory() {
    if (!window.confirm('Delete all locally saved runs and their event history? This cannot be undone. Findings and GitHub draft PRs will remain.')) return;
    setHistoryNotice('');
    const result = await clearSavedRuns();
    if (!result) return;
    requestedRun.current = null;
    followedAutomaticRuns.current.clear();
    await monitoring.refresh();
    setHistoryNotice(`${result.deleted} saved run${result.deleted === 1 ? '' : 's'} deleted. Existing GitHub draft PRs remain.`);
  }

  return <div className="operations-dashboard" id="operations">
    <DashboardHeader service={service} connection={connection} busy={busy || !!monitoring.pending} run={run} activeRun={activeRun} onCancel={() => void cancel()} onFollow={() => void followActive()} onRefresh={() => {void refresh(); void monitoring.refresh();}} onExport={exportRun}/>
    <main className="ops-main ops-command-center">
      <div className="ops-console-heading"><div><h1>Security workspace</h1><p>Choose services, decide how they run, then follow the evidence.</p></div><span>{selectedRepositories.length} selected · {focusedRepository ? `showing ${focusedRepository.owner}/${focusedRepository.name}` : 'choose a service'}</span></div>
      <nav className="ops-dashboard-tabs" aria-label="Dashboard views">{tabs.map(({id, label, Icon}) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => changeTab(id)}><Icon size={15}/>{label}{id === 'services' && <span>{selectedRepositories.length}</span>}{id === 'findings' && <span>{affectedCount}</span>}</button>)}</nav>
      {error && <div className="ops-error-banner" role="alert"><AlertTriangle size={18}/><div><strong>{error.code}</strong><p>{error.message}</p></div><button className="button subtle" onClick={() => void refresh()}><RefreshCw size={13}/>Reconnect</button></div>}
      {service && !service.ready && <div className="ops-error-banner" role="status"><AlertTriangle size={18}/><div><strong>Server setup required</strong><p>{!service.groqConfigured ? 'Groq credentials are missing. ' : ''}{!service.githubConfigured ? 'GitHub credentials are missing. ' : ''}Configure the server and reconnect. Credentials stay on the server.</p></div></div>}
      {monitoring.error && <div className="ops-error-banner" role="alert"><AlertTriangle size={18}/><div><strong>{monitoring.error.code}</strong><p>{monitoring.error.message}</p></div><button className="button subtle" onClick={() => void monitoring.refresh()}><RefreshCw size={13}/>Reload monitoring</button></div>}

      {tab === 'services' && <div className="ops-services-view">
        <div className="ops-services-grid"><RepositoryPanel repositories={monitoring.repositories} selectedIds={selectedIds} focusedId={focusedId} loaded={monitoring.loaded} pending={monitoring.pending} onToggle={toggleRepository} onAll={selectAll} onFocus={focusRepository} onAdd={add} onWatch={(id, enabled) => void monitoring.update(id, {enabled})}/><ExecutionControls selectedCount={selectedRepositories.length} eligibleCount={eligible.length} existingDrafts={existingDrafts} mode={mode} pending={monitoring.pending} connected={monitoring.loaded && connection !== 'offline'} notice={notice} onMode={next => void applyMode(next)} onScan={() => void scanSelected()} onFindings={() => changeTab('findings')} onPipeline={() => changeTab('pipeline')}/></div>
        <details className="ops-watch-details"><summary>Threat sources and watch schedule <span>Service status</span></summary><SecurityWatchPanel snapshot={monitoring.snapshot} pending={monitoring.pending} onPoll={() => void monitoring.poll()} onToggle={enabled => void monitoring.configure({enabled})}/></details>
      </div>}

      {tab === 'findings' && <div className="ops-findings-view"><div className="ops-tab-intro"><div><span>02 / REVIEW THE MATCHES</span><h2>Findings for checked services</h2><p>Published advisories are matched to the exact versions in each repository. Start a fix for one finding at a time in Step by step mode.</p></div><button onClick={() => changeTab('services')}>Change services<ArrowRight size={13}/></button></div>
        {selectedRepositories.length ? selectedRepositories.map(repository => <section className="ops-repository-findings" key={repository.id}><div className="ops-repository-findings-title"><strong>{repository.owner}/{repository.name}</strong><span>{repository.autoRemediate ? 'Complete pipeline enabled' : 'Step by step'}</span></div><FindingsPanel findings={allSelectedFindings.filter(item => item.repositoryId === repository.id)} repository={repository} pending={monitoring.pending} onRepair={id => void prepareFix(id)} onRun={id => void showRun(id)}/></section>) : <div className="ops-tab-empty"><strong>No services selected</strong><p>Check one repository or Select all in Services.</p><button className="button primary" onClick={() => changeTab('services')}>Choose services</button></div>}
      </div>}

      {tab === 'pipeline' && <div className="ops-pipeline-page"><div className="ops-tab-intro"><div><span>03 / WATCH THE HANDOFF</span><h2>Repair pipeline</h2><p>Advisory match → package or image update → tests → senior review → draft PR → human review.</p></div><strong>{focusedRepository ? `${focusedRepository.owner}/${focusedRepository.name}` : 'Choose a service'}</strong></div>
        <SecurityJourney repository={focusedRepository} snapshot={monitoring.snapshot} findings={focusedFindings} run={run} events={events}/><OrchestrationPanel run={run} events={events} service={service}/>
        {run?.failure && <div className="ops-error-banner" role="alert"><AlertTriangle size={18}/><div><strong>{run.failure.code}</strong><p>{run.failure.message}</p></div>{run.target && !activeRun && <button className="button outline" onClick={() => void prepareFix(run.target!.findingId)} disabled={busy || !service?.ready}>Retry fix</button>}</div>}
        <button className="ops-text-next" onClick={() => changeTab('results')}>Open checks, model usage, and draft PR<ArrowRight size={15}/></button>
      </div>}

      {tab === 'results' && <div className="ops-results-view"><div className="ops-tab-intro"><div><span>04 / INSPECT THE PROOF</span><h2>Results and human review</h2><p>Observed checks, each model call, token use, code diff, and the actual draft PR.</p></div><div className="ops-results-actions"><strong>{run ? `Run ${run.id.slice(0, 8)}` : 'No run selected'}</strong><button className="ops-delete-runs" disabled={!allRuns.length || !!activeRun || busy} title={activeRun ? 'Wait for the active run to finish or cancel it first' : !allRuns.length ? 'No saved runs to delete' : 'Delete locally saved run history across all services'} onClick={() => void deleteHistory()}><Trash2 size={14}/>Delete saved runs</button></div></div>
        {historyNotice && <div className="ops-history-notice" role="status">{historyNotice}</div>}
        <RunMetrics runs={runs} loaded={service !== null && monitoring.loaded && !!selectedRepositories.length}/>
        {run && <section className="ops-run-facts"><h2>Selected run</h2><p>{run.advisory?.titleEn ?? focusedFindings[0]?.summary ?? 'No advisory summary recorded.'}</p><dl><div><dt>Started</dt><dd>{new Date(run.createdAt).toLocaleString('en-GB',{timeZone:'Asia/Tokyo',dateStyle:'medium',timeStyle:'medium'})} JST</dd></div><div><dt>Last activity</dt><dd>{new Date(run.updatedAt).toLocaleString('en-GB',{timeZone:'Asia/Tokyo',dateStyle:'medium',timeStyle:'medium'})} JST</dd></div><div><dt>Checks passed</dt><dd>{run.checks.filter(check => check.status === 'passed').length} / {run.checks.length}</dd></div></dl></section>}
        {runs.length ? <RunAnalytics runs={runs} run={run} events={events} onSelect={id => void showRun(id)}/> : <div className="ops-tab-empty"><strong>No run results yet</strong><p>Scan a selected service. In Step by step mode, choose a finding to start the repair run; Complete pipeline mode starts supported repairs automatically.</p><button className="button primary" onClick={() => changeTab('services')}>Go to Services</button></div>}
        {run && <div className="ops-developer-grid"><VerificationWorkbench run={run}/><ReviewPanel run={run}/></div>}
      </div>}
      <footer className="ops-footer"><span>ProofPatch · Open Innovation · Packages + container images</span><span>Draft PRs are for human review. You decide whether to merge.</span></footer>
    </main>
  </div>;
}
