'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {addRepository, getFindings, getMonitoring, getRepositories, OrchestrationError, pollMonitoring, remediateFinding, scanRepository, updateMonitoring, updateRepository} from '@/services/orchestration-api';
import type {MonitoredRepository, MonitoringSnapshot, SupplyFinding} from '@/types/monitoring';

export function useRepositoryMonitoring() {
  const [repositories, setRepositories] = useState<MonitoredRepository[]>([]);
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [findings, setFindings] = useState<SupplyFinding[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<{code: string; message: string} | null>(null);
  const [loadError, setLoadError] = useState<{code: string; message: string} | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    try {
      const [registry, state, detected] = await Promise.all([getRepositories(), getMonitoring(), getFindings()]);
      if (!mounted.current) return;
      setRepositories(registry.repositories); setSnapshot(state); setFindings(detected.findings); setLoaded(true); setLoadError(null);
    } catch (cause) {if (mounted.current) setLoadError(cause instanceof OrchestrationError ? {code: cause.code, message: cause.message} : {code: 'MONITORING_UNAVAILABLE', message: 'Repository monitoring could not be loaded. Reconnect to retry.'});}
  }, []);
  useEffect(() => {mounted.current = true; void refresh(); const timer = setInterval(() => void refresh(), 5000); return () => {mounted.current = false; clearInterval(timer);};}, [refresh]);
  async function perform<T>(name: string, action: () => Promise<T>): Promise<T | undefined> {
    if (pending) return;
    setPending(name); setError(null);
    try {const result = await action(); await refresh(); return result;}
    catch (cause) {if (mounted.current) setError(cause instanceof OrchestrationError ? {code: cause.code, message: cause.message} : {code: 'ACTION_FAILED', message: cause instanceof Error ? cause.message : 'The monitoring action failed.'});}
    finally {if (mounted.current) setPending(null);}
  }
  return {
    repositories, snapshot, findings, loaded, error: error ?? loadError, pending, refresh: () => {setError(null); return refresh();},
    add: (url: string) => perform('add', () => addRepository(url)),
    update: (id: string, changes: {enabled?: boolean; autoRemediate?: boolean}) => perform(`update:${id}`, () => updateRepository(id, changes)),
    scan: (id: string) => perform(`scan:${id}`, () => scanRepository(id)),
    poll: () => perform('poll', () => pollMonitoring()),
    configure: (changes: {enabled?: boolean; intervalSeconds?: number}) => perform('configure', () => updateMonitoring(changes)),
    remediate: (id: string) => perform(`repair:${id}`, () => remediateFinding(id)),
  };
}
