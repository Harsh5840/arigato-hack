'use client';

import {useEffect, useState} from 'react';
import dynamic from 'next/dynamic';
import {ChevronDown, Radio, CheckCircle2} from 'lucide-react';
import {isTerminal, liveStatusLabels, type AgentRole, type LiveEvent, type LiveRun, type ServiceStatus} from '@/types/live-orchestration';
import {japanTime, numberLabel} from './format';

const LiveAgentFlow = dynamic(() => import('../live-agent-flow'), {ssr: false, loading: () => <div className="ops-flow-loading" role="status">Loading interactive agent flow…</div>});
const roleNames: Record<AgentRole, string> = {supply: 'Supply Chain', fixer: 'Remediation', reviewer: 'DevSec reviewer'};
export default function OrchestrationPanel({run, events, service}: {run: LiveRun | null; events: LiveEvent[]; service: ServiceStatus | null}) {
  const [selected, setSelected] = useState<AgentRole>('supply');
  const [open, setOpen] = useState(true);
  useEffect(() => {const media = matchMedia('(max-width: 740px)'); const update = () => setOpen(!media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update);}, []);
  const call = run?.agentCalls.filter(item => item.role === selected).at(-1);
  const emptyTitle = !run ? 'Waiting for the first run' : run.status === 'queued' ? 'Run queued' : isTerminal(run.status) ? 'Event record unavailable' : 'Waiting for recorded events';
  const emptyMessage = !run ? 'Start a live run to follow intake, model calls, actual checks and draft publication.' : run.status === 'queued' ? 'Waiting for the worker to begin. You can cancel this queued run.' : isTerminal(run.status) ? 'This run has ended, but its event record has not loaded. Reconnect from Run options to retrieve stored evidence.' : 'The run is in progress. Worker events will appear here as they are recorded.';
  return <section className="ops-orchestration-grid" aria-label="Agent orchestration and live events">
    <div className="ops-flow-panel">
      <div className="ops-panel-heading"><h2>Orchestration</h2><span className={`ops-status ${run?.status ?? 'idle'}`}><i/>{run ? liveStatusLabels[run.status] : 'Ready for first run'}</span></div>
      <div className="ops-mobile-roles"><dl><div><dt>Supply Chain</dt><dd>Advisory → inventory</dd></div><div><dt>Remediation</dt><dd>Scoped candidate repair</dd></div><div><dt>Development Security</dt><dd>Baseline, checks, senior review</dd></div></dl><p>Supply Chain → DevSec baseline → Remediation → DevSec checks → human review</p></div>
      <details className="ops-flow-disclosure" open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>Interactive agent flow<ChevronDown size={15}/></summary><LiveAgentFlow compact run={run} events={events} onSelect={node => {const role = node === 'supply-chain' ? 'supply' : node === 'remediation' ? 'fixer' : node === 'devsec' ? 'reviewer' : null; if (role) setSelected(role);}}/></details>
      <div className="ops-agent-row">{(['supply', 'fixer', 'reviewer'] as AgentRole[]).map(role => {const current = run?.agentCalls.filter(item => item.role === role).at(-1); return <button key={role} aria-pressed={selected === role} onClick={() => setSelected(role)}><span>{roleNames[role]}{current?.status === 'completed' && <CheckCircle2 size={12}/>}</span><code>{current?.model ?? service?.models[role] ?? 'Not configured'}</code><small>{current?.status ?? 'Not called'}</small></button>;})}</div>
      <details className="ops-agent-detail"><summary>{roleNames[selected]} · {call?.status ?? 'not called'}<span>{call?.usage ? `${numberLabel(call.usage.totalTokens)} tokens` : 'Inspect call'}</span></summary><p>{call?.summary ?? 'No recorded model output for this role. Results will appear after the worker calls Groq.'}</p>{call?.usage && <pre>{JSON.stringify(call.usage, null, 2)}</pre>}</details>
    </div>
    <aside className="ops-event-rail"><div className="ops-panel-heading"><h2><Radio size={15}/>Run events</h2><span>{events.length} recorded</span></div><p className="ops-event-order">Latest first · Japan Standard Time</p>{events.length ? <ol>{[...events].reverse().map(event => <li key={event.id}><div><time dateTime={event.at}>{japanTime(event.at)}</time><span>{event.node.replaceAll('-', ' ')}</span></div><p>{event.message}</p></li>)}</ol> : <div className="ops-event-empty" role="status"><Radio size={23}/><strong>{emptyTitle}</strong><p>{emptyMessage}</p></div>}</aside>
  </section>;
}
