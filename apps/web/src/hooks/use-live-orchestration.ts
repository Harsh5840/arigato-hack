'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {cancelRun, getRunEvidence, getRuns, getServiceStatus, orchestrationApi, startRun, OrchestrationError} from '@/services/orchestration-api';
import {isTerminal, type LiveEvent, type LiveRun, type ServiceStatus} from '@/types/live-orchestration';

export function useLiveOrchestration() {
  const [service, setService] = useState<ServiceStatus | null>(null);
  const [run, setRun] = useState<LiveRun | null>(null);
  const [runs, setRuns] = useState<LiveRun[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connection, setConnection] = useState<'loading' | 'connected' | 'reconnecting' | 'offline'>('loading');
  const [error, setError] = useState<{code: string; message: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const selectedRunId = useRef<string | undefined>(undefined);
  const report = useCallback((cause: unknown) => {
    if (!mounted.current) return;
    setError(cause instanceof OrchestrationError ? {code: cause.code, message: cause.message} : {code: 'REQUEST_FAILED', message: cause instanceof Error ? cause.message : 'The request failed. Try reconnecting.'});
  }, []);
  const refresh = useCallback(async () => {
    setConnection('loading'); setError(null);
    try {
      const [status, history] = await Promise.all([getServiceStatus(), getRuns()]);
      if (!mounted.current) return;
      setService(status); setRuns(history.runs); setConnection('connected');
      const target = status.activeRunId ?? history.runs[0]?.id;
      if (target) { const result = await getRunEvidence(target); if (mounted.current) {selectedRunId.current = result.run.id; setRun(result.run); setEvents(result.events);} }
    } catch (cause) { report(cause); if (mounted.current) setConnection('offline'); }
  }, [report]);
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; }; }, [refresh]);
  const runId = run?.id;
  const terminal = run ? isTerminal(run.status) : false;
  useEffect(() => {
    if (!runId) return;
    const stream = new EventSource(`${orchestrationApi}/runs/${encodeURIComponent(runId)}/events`);
    function receive(event: MessageEvent) {
      try {
        const data = JSON.parse(event.data) as {run?: LiveRun; events?: LiveEvent[]; event?: LiveEvent};
        if (data.run) {
          setRun(data.run);
          setRuns(previous => [data.run!, ...previous.filter(item => item.id !== data.run!.id)]);
          if (isTerminal(data.run.status)) stream.close();
        }
        if (data.events) setEvents(data.events);
        if (data.event) setEvents(previous => previous.some(item => item.id === data.event!.id) ? previous : [...previous, data.event!]);
        setConnection('connected');
      } catch { setError({code: 'INVALID_EVENT', message: 'A progress event could not be read. Reconnect to reload the stored run.'}); }
    }
    stream.addEventListener('snapshot', receive as EventListener);
    stream.addEventListener('run', receive as EventListener);
    stream.onopen = () => setConnection('connected');
    stream.onerror = () => { if (stream.readyState !== EventSource.CLOSED) setConnection('reconnecting'); };
    return () => stream.close();
  }, [runId]);
  // A bounded polling fallback keeps durable results visible if an intermediary buffers SSE.
  useEffect(() => {
    if (!runId || terminal) return;
    const timer = setInterval(() => { void getRunEvidence(runId).then(result => { if (mounted.current && selectedRunId.current === result.run.id) {setRun(result.run); setEvents(result.events);} }).catch(report); }, 10000);
    return () => clearInterval(timer);
  }, [runId, terminal, report]);
  async function start(sourceMode: 'live' | 'cached') {
    setBusy(true); setError(null);
    try { const result = await startRun(sourceMode); selectedRunId.current = result.run.id; setRun(result.run); setEvents([]); setRuns(previous => [result.run, ...previous.filter(item => item.id !== result.run.id)]); }
    catch (cause) { report(cause); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function cancel() {
    if (!run) return;
    setBusy(true); setError(null);
    try { const result = await cancelRun(run.id); setRun(result.run); }
    catch (cause) { report(cause); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function selectRun(id: string) {
    setError(null);
    try { const result = await getRunEvidence(id); selectedRunId.current = result.run.id; setRun(result.run); setEvents(result.events); }
    catch (cause) { report(cause); }
  }
  return {service, run, runs, events, connection, error, busy, refresh, start, cancel, selectRun};
}
