import type { CandidateDiff, LiveEvent, LiveRun, ServiceStatus } from '@/types/live-orchestration';

export const orchestrationApi = '/api/proofpatch';
export class OrchestrationError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'OrchestrationError'; }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${orchestrationApi}${path}`, {cache: 'no-store', ...init, headers: {'Content-Type': 'application/json', ...init?.headers}});
  } catch { throw new OrchestrationError('SERVICE_OFFLINE', 'The orchestration service is unreachable. Start the API and worker, then reconnect.'); }
  let body: T & {error?: {code?: string; message?: string}};
  try { body = await response.json(); }
  catch { throw new OrchestrationError('SERVICE_OFFLINE', 'The API did not return JSON. Check that the orchestration service is running on port 8787.'); }
  if (!response.ok) throw new OrchestrationError(body.error?.code ?? `HTTP_${response.status}`, body.error?.message ?? `Request failed (${response.status}).`);
  return body;
}
export const getServiceStatus = () => request<ServiceStatus>('/status');
export const getRuns = () => request<{runs: LiveRun[]}>('/runs');
export const getRun = (id: string) => request<{run: LiveRun}>(`/runs/${encodeURIComponent(id)}`);
export const getRunEvidence = (id: string) => request<{run: LiveRun; events: LiveEvent[]}>(`/runs/${encodeURIComponent(id)}/evidence`);
export const getCandidateDiff = (id: string) => request<CandidateDiff>(`/runs/${encodeURIComponent(id)}/diff`);
export const startRun = (sourceMode: 'live' | 'cached') => request<{run: LiveRun}>('/runs', {method: 'POST', body: JSON.stringify({sourceMode})});
export const cancelRun = (id: string) => request<{run: LiveRun}>(`/runs/${encodeURIComponent(id)}/cancel`, {method: 'POST', body: '{}'});
