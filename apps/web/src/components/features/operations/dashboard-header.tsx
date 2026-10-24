'use client';

import {ShieldCheck, Github, ChevronDown, Play, Square, Settings2, RefreshCw, Download, ArrowUpRight} from 'lucide-react';
import type {LiveRun, ServiceStatus} from '@/types/live-orchestration';
import type {MonitoredRepository} from '@/types/monitoring';

interface Props {
  service: ServiceStatus | null; connection: string; busy: boolean; run: LiveRun | null; activeRun?: LiveRun;
  sourceMode: 'live' | 'cached'; onSourceMode: (mode: 'live' | 'cached') => void;
  onRun: () => void; onCancel: () => void; onFollow: () => void; onRefresh: () => void; onExport: () => void;
  repositories: MonitoredRepository[]; repositoryId: string; onRepository: (id: string) => void; actionLabel: string;
}
export default function DashboardHeader({service, connection, busy, run, activeRun, sourceMode, onSourceMode, onRun, onCancel, onFollow, onRefresh, onExport, repositories, repositoryId, onRepository, actionLabel}: Props) {
  const following = activeRun?.id === run?.id;
  const repository = repositories.find(item => item.id === repositoryId);
  return <header className="ops-header"><div className="ops-header-inner">
    <a className="ops-brand" href="#operations"><ShieldCheck size={25} strokeWidth={1.7}/><strong>ProofPatch</strong></a>
    <button className="ops-repo-button" popoverTarget="repository-connection"><Github size={15}/><span>{repository ? `${repository.owner}/${repository.name}` : 'Select or connect a repository'}</span><ChevronDown size={13}/></button>
    <div id="repository-connection" popover="auto" className="ops-popover ops-repo-popover"><h2>Connected repositories</h2><label>Repository<select value={repositoryId} onChange={event => onRepository(event.target.value)}><option value="" disabled>Select a repository</option>{repositories.map(item => <option key={item.id} value={item.id}>{item.owner}/{item.name}</option>)}</select></label><p>Connect repositories below. The server checks access, detects the stack and identifies a verification plan.</p><dl><div><dt>Access</dt><dd>{!repository?.inventorySha ? 'GitHub access has not been checked yet' : repository.canPush ? 'Can create a branch and draft PR' : 'Verified read-only access'}</dd></div><div><dt>Authority</dt><dd>You review and merge every draft</dd></div></dl><button popoverTarget="repository-connection" popoverTargetAction="hide" onClick={() => document.getElementById('repositories')?.scrollIntoView()}>Manage repository connections<ArrowUpRight size={13}/></button><p className="ops-muted">This server uses configured GitHub credentials. A production GitHub App installation flow remains planned.</p></div>
    <span className={`ops-service ${connection} ${service && !service.ready ? 'setup' : ''}`}><i/>{connection === 'offline' ? 'Offline' : connection === 'loading' ? 'Connecting' : connection === 'reconnecting' ? 'Reconnecting' : service?.ready ? 'Service connected' : 'Setup required'}</span>
    <div className="ops-header-actions"><button className="ops-icon-button" aria-label="Run options" popoverTarget="run-options"><Settings2 size={17}/></button>
      <div id="run-options" popover="auto" className="ops-popover ops-options-popover"><h2>Run options</h2>{run && !run.target && <><label>Historical demo source<select value={sourceMode} disabled={!!activeRun || busy} onChange={event => onSourceMode(event.target.value as 'live' | 'cached')}><option value="live">Fetch official sources</option><option value="cached">Recorded source snapshot</option></select></label><p>This source setting applies only when retrying a historical runtime demo.</p></>}<button onClick={onRefresh} disabled={busy}><RefreshCw size={14}/>Reconnect service</button><button onClick={onExport} disabled={!run}><Download size={14}/>Export selected run</button></div>
      {activeRun ? following ? <button className="button outline" onClick={onCancel} disabled={busy || activeRun.cancelRequested}><Square size={13}/>{activeRun.cancelRequested ? 'Cancelling…' : 'Cancel run'}</button> : <button className="button primary" onClick={onFollow}>Follow active run<ArrowUpRight size={14}/></button> : <button className="button primary" onClick={onRun} disabled={busy || !service?.ready || !repository || connection === 'offline' || connection === 'loading'}><Play size={14} fill="currentColor"/>{busy ? 'Working…' : actionLabel}</button>}
    </div>
  </div></header>;
}
