'use client';

import {useEffect, useState} from 'react';
import {Activity, ExternalLink, RefreshCw} from 'lucide-react';
import {getRunTrace} from '@/services/orchestration-api';
import {isTerminal, type LangSmithTrace, type LiveRun, type ServiceStatus} from '@/types/live-orchestration';

export default function LangSmithPanel({run, service}: {run: LiveRun | null; service: ServiceStatus | null}) {
  const [trace, setTrace] = useState<LangSmithTrace | null>(null);
  const [checking, setChecking] = useState(false);
  const enabled = Boolean(service?.langsmith?.enabled);
  const runId = run?.id;
  const terminal = run ? isTerminal(run.status) : false;

  useEffect(() => {
    setTrace(null);
    setChecking(false);
    if (!enabled || !runId || !terminal) return;
    let cancelled = false;
    setChecking(true);
    void getRunTrace(runId).then(value => {if (!cancelled) setTrace(value);}).catch(() => {if (!cancelled) setTrace({state: 'unavailable'});}).finally(() => {if (!cancelled) setChecking(false);});
    return () => {cancelled = true;};
  }, [enabled, runId, terminal]);

  async function refresh() {
    if (!runId || !enabled) return;
    setChecking(true);
    try {setTrace(await getRunTrace(runId));}
    catch {setTrace({state: 'unavailable'});}
    finally {setChecking(false);}
  }

  let detail = 'Checking tracing configuration…';
  if (service && !enabled) detail = 'Not connected. Add a LangSmith key and enable tracing on the server to inspect future runs.';
  else if (enabled && !run) detail = 'Tracing is enabled. Select a run to inspect its graph and model calls in LangSmith.';
  else if (enabled && checking) detail = 'Checking whether LangSmith recorded this run…';
  else if (enabled && trace?.state === 'available') detail = 'Trace confirmed by LangSmith. Open the recorded graph and model calls.';
  else if (enabled && trace?.state === 'not-found') detail = 'No trace found for this run yet. Older runs are not uploaded retroactively.';
  else if (enabled && trace?.state === 'unavailable') detail = 'LangSmith could not confirm this trace. Check the server key or retry.';
  else if (enabled) detail = 'Tracing is enabled. Check for this run’s trace as the pipeline progresses.';

  return <section className="ops-langsmith-panel" aria-label="LangSmith trace">
    <div className="ops-langsmith-heading"><span className="ops-langsmith-icon"><Activity size={18}/></span><div><strong>LangSmith trace</strong><small>{service?.langsmith?.project ?? 'proofpatch'} · optional observability</small></div></div>
    <p role="status">{detail}</p>
    <div className="ops-langsmith-actions">
      {trace?.state === 'available' && <a className="button outline" href={trace.url} target="_blank" rel="noopener noreferrer">Open this trace<ExternalLink size={13}/></a>}
      {enabled && runId && <button className="button outline" onClick={() => void refresh()} disabled={checking}><RefreshCw size={13}/>{checking ? 'Checking…' : 'Check trace'}</button>}
      <a href="https://smith.langchain.com/" target="_blank" rel="noopener noreferrer">Open LangSmith<ExternalLink size={12}/></a>
    </div>
    {service && !enabled && <small className="ops-langsmith-setup">Server setup: LANGSMITH_API_KEY and LANGSMITH_TRACING=true. Restart the service, then start a new run.</small>}
  </section>;
}
