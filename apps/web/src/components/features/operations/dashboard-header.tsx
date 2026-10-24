'use client';

import {ArrowUpRight, Download, RefreshCw, Settings2, ShieldCheck, Square} from 'lucide-react';
import type {LiveRun, ServiceStatus} from '@/types/live-orchestration';

interface Props {
  service: ServiceStatus | null;
  connection: string;
  busy: boolean;
  run: LiveRun | null;
  activeRun?: LiveRun;
  onCancel: () => void;
  onFollow: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

export default function DashboardHeader({service, connection, busy, run, activeRun, onCancel, onFollow, onRefresh, onExport}: Props) {
  const following = activeRun?.id === run?.id;
  return <header className="ops-header"><div className="ops-header-inner ops-header-simple">
    <a className="ops-brand" href="#operations"><ShieldCheck size={25} strokeWidth={1.7}/><strong>ProofPatch</strong></a>
    <span className={`ops-service ${connection}`}><i/>{connection === 'offline' ? 'Offline' : connection === 'loading' ? 'Connecting' : connection === 'reconnecting' ? 'Reconnecting' : service?.ready ? 'Service connected' : 'Setup required'}</span>
    <div className="ops-header-actions"><button className="ops-icon-button" aria-label="Service options" popoverTarget="run-options"><Settings2 size={17}/></button>
      <div id="run-options" popover="auto" className="ops-popover ops-options-popover"><h2>Service options</h2><button onClick={onRefresh} disabled={busy}><RefreshCw size={14}/>Reconnect service</button><button onClick={onExport} disabled={!run}><Download size={14}/>Export selected run</button></div>
      {activeRun && (following ? <button className="button outline" onClick={onCancel} disabled={busy || activeRun.cancelRequested}><Square size={13}/>{activeRun.cancelRequested ? 'Cancelling…' : 'Cancel run'}</button> : <button className="button primary" onClick={onFollow}>View active run<ArrowUpRight size={14}/></button>)}
    </div>
  </div></header>;
}
