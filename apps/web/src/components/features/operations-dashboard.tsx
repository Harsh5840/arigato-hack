'use client';

import {useState} from 'react';
import {AlertTriangle, GitBranch, ArrowUpRight, RefreshCw} from 'lucide-react';
import {useLiveOrchestration} from '@/hooks/use-live-orchestration';
import {isTerminal} from '@/types/live-orchestration';
import DashboardHeader from './operations/dashboard-header';
import RunMetrics from './operations/run-metrics';
import OrchestrationPanel from './operations/orchestration-panel';
import VerificationWorkbench from './operations/verification-workbench';
import ReviewPanel from './operations/review-panel';
import RunAnalytics from './operations/run-analytics';

export default function OperationsDashboard() {
  const {service, run, runs, events, connection, error, busy, refresh, start, cancel, selectRun} = useLiveOrchestration();
  const [sourceMode, setSourceMode] = useState<'live' | 'cached'>('live');
  const activeRun = runs.find(item => !isTerminal(item.status));
  function exportRun() {
    if (!run) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({product: 'ProofPatch', exportedAt: new Date().toISOString(), run, events}, null, 2)], {type: 'application/json'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `proofpatch-${run.id}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="operations-dashboard" id="operations">
    <DashboardHeader service={service} connection={connection} busy={busy} run={run} activeRun={activeRun} sourceMode={sourceMode} onSourceMode={setSourceMode} onRun={() => void start(sourceMode)} onCancel={() => void cancel()} onFollow={() => {if (activeRun) void selectRun(activeRun.id);}} onRefresh={() => void refresh()} onExport={exportRun}/>
    <main className="ops-main"><div className="ops-console-heading"><div><h1>Supply-chain operations</h1><p>Japanese advisory → constrained repair → verified draft PR</p></div><span><GitBranch size={13}/>{run?.repo.branch ?? 'Owned PHP fixture'}{run?.repo.candidateSha && <code>{run.repo.candidateSha.slice(0, 7)}</code>}</span></div>
      {connection === 'loading' && !service && <div className="ops-connection-loading" role="status"><span/><p>Connecting to the persisted worker queue…</p></div>}
      {error && <div className="ops-error-banner" role="alert"><AlertTriangle size={18}/><div><strong>{error.code}</strong><p>{error.message}</p></div><button className="button subtle" onClick={() => void refresh()}><RefreshCw size={13}/>Reconnect</button></div>}
      {service && !service.ready && <div className="ops-error-banner" role="status"><AlertTriangle size={18}/><div><strong>Server setup required</strong><p>{!service.groqConfigured ? 'Groq credentials are missing. ' : ''}{!service.githubConfigured ? 'GitHub credentials are missing. ' : ''}Configure the server and reconnect. Credentials never enter this dashboard.</p></div></div>}
      <RunMetrics runs={runs} loaded={service !== null}/>
      <div className="ops-case-strip"><div><span className="ops-japanese-label" lang="ja">日本の脅威情報</span><strong>{run?.advisory?.titleEn ?? 'Japanese PHP advisory intake'}</strong></div><span>{run?.advisory ? `PHP ${run.advisory.fixedVersion}` : 'Runtime match pending'}</span>{run?.advisory?.sources[0] && <a href={run.advisory.sources[0].url} target="_blank" rel="noreferrer">Official source<ArrowUpRight size={13}/></a>}</div>
      <OrchestrationPanel run={run} events={events} service={service}/>
      {run?.failure && <div className="ops-error-banner" role="alert"><AlertTriangle size={18}/><div><strong>{run.failure.code}</strong><p>{run.failure.message}</p></div>{!activeRun && <button className="button outline" onClick={() => void start(run.sourceMode)} disabled={busy || !service?.ready}>Retry workflow</button>}</div>}
      <div className="ops-developer-grid"><VerificationWorkbench run={run}/><ReviewPanel run={run}/></div>
      <RunAnalytics runs={runs} run={run} events={events} onSelect={id => void selectRun(id)}/>
      <footer className="ops-footer"><span>ProofPatch · Open Innovation · SakuraShop PHP pilot</span><span>Version/configuration and behavior checks. No RCE reproduction. Human merge authority.</span></footer>
    </main>
  </div>;
}
