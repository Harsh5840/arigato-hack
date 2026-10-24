'use client';

import {ShieldCheck, Github, ChevronDown, Play, Square, Settings2, RefreshCw, Download, ArrowUpRight} from 'lucide-react';
import type {LiveRun, ServiceStatus} from '@/types/live-orchestration';

interface Props {
  service: ServiceStatus | null; connection: string; busy: boolean; run: LiveRun | null; activeRun?: LiveRun;
  sourceMode: 'live' | 'cached'; onSourceMode: (mode: 'live' | 'cached') => void;
  onRun: () => void; onCancel: () => void; onFollow: () => void; onRefresh: () => void; onExport: () => void;
}
export default function DashboardHeader({service, connection, busy, run, activeRun, sourceMode, onSourceMode, onRun, onCancel, onFollow, onRefresh, onExport}: Props) {
  const following = activeRun?.id === run?.id;
  return <header className="ops-header"><div className="ops-header-inner">
    <a className="ops-brand" href="#operations"><ShieldCheck size={25} strokeWidth={1.7}/><strong>ProofPatch</strong></a>
    <button className="ops-repo-button" popoverTarget="repository-connection"><Github size={15}/><span>{service?.target ?? 'Harsh5840/arigato-php-demo'}</span><ChevronDown size={13}/></button>
    <div id="repository-connection" popover="auto" className="ops-popover ops-repo-popover"><h2>Repository connection</h2><p className="ops-repo-name">{service?.target ?? 'Harsh5840/arigato-php-demo'}</p><p>This pilot is scoped to the team’s owned SakuraShop PHP repository. Server credentials provide the connection.</p><dl><div><dt>Access</dt><dd>Candidate branch, hosted checks, draft PR</dd></div><div><dt>Authority</dt><dd>No automatic merge or deployment</dd></div></dl><a href="https://github.com/Harsh5840/arigato-hack/blob/main/docs/REPOSITORY-ONBOARDING.md" target="_blank" rel="noreferrer">GitHub App onboarding plan<ArrowUpRight size={13}/></a><p className="ops-muted">App installation and other repository connections are planned.</p></div>
    <span className={`ops-service ${connection}`}><i/>{connection === 'offline' ? 'Offline' : connection === 'loading' ? 'Connecting' : connection === 'reconnecting' ? 'Reconnecting' : service?.ready ? 'Service connected' : 'Setup required'}</span>
    <div className="ops-header-actions"><button className="ops-icon-button" aria-label="Run options" popoverTarget="run-options"><Settings2 size={17}/></button>
      <div id="run-options" popover="auto" className="ops-popover ops-options-popover"><h2>Run options</h2><label>Advisory intake<select value={sourceMode} disabled={!!activeRun || busy} onChange={event => onSourceMode(event.target.value as 'live' | 'cached')}><option value="live">Fetch official sources</option><option value="cached">Recorded source snapshot</option></select></label><p>{sourceMode === 'live' ? 'Fetch Japanese and vendor evidence before matching the runtime.' : 'Source input is recorded. Groq calls, checks and PR publication remain real.'}</p><button onClick={onRefresh} disabled={busy}><RefreshCw size={14}/>Reconnect service</button><button onClick={onExport} disabled={!run}><Download size={14}/>Export selected run</button></div>
      {activeRun ? following ? <button className="button outline" onClick={onCancel} disabled={busy || activeRun.cancelRequested}><Square size={13}/>{activeRun.cancelRequested ? 'Cancelling…' : 'Cancel run'}</button> : <button className="button primary" onClick={onFollow}>Follow active run<ArrowUpRight size={14}/></button> : <button className="button primary" onClick={onRun} disabled={busy || !service?.ready || connection === 'offline' || connection === 'loading'}><Play size={14} fill="currentColor"/>{busy ? 'Starting…' : 'Run live demo'}</button>}
    </div>
  </div></header>;
}
