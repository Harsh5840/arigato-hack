import type { CandidateDiff, LangSmithTrace, LiveEvent, LiveRun, ServiceStatus } from '@/types/live-orchestration';
import type {MonitoredRepository, MonitoringSnapshot, SupplyFinding} from '@/types/monitoring';

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
export const deleteSavedRuns = () => request<{deleted: number; deletedFindings: number}>('/runs', {method: 'DELETE', body: '{}'});
export const getRun = (id: string) => request<{run: LiveRun}>(`/runs/${encodeURIComponent(id)}`);
export const getRunEvidence = (id: string) => request<{run: LiveRun; events: LiveEvent[]}>(`/runs/${encodeURIComponent(id)}/evidence`);
export const getRunTrace = (id: string) => request<LangSmithTrace>(`/runs/${encodeURIComponent(id)}/langsmith`);
export const getCandidateDiff = (id: string) => request<CandidateDiff>(`/runs/${encodeURIComponent(id)}/diff`);
export const startRun = (sourceMode: 'live' | 'cached') => request<{run: LiveRun}>('/runs', {method: 'POST', body: JSON.stringify({sourceMode})});
export const cancelRun = (id: string) => request<{run: LiveRun}>(`/runs/${encodeURIComponent(id)}/cancel`, {method: 'POST', body: '{}'});
export const getRepositories = () => request<{repositories: MonitoredRepository[]}>('/repositories');
export const addRepository = (url: string) => request<{repository: MonitoredRepository}>('/repositories', {method: 'POST', body: JSON.stringify({url})});
export const updateRepository = (id: string, changes: {enabled?: boolean; autoRemediate?: boolean}) => request<{repository: MonitoredRepository}>(`/repositories/${encodeURIComponent(id)}`, {method: 'PATCH', body: JSON.stringify(changes)});
export const scanRepository = (id: string) => request<{repository: MonitoredRepository; findings: SupplyFinding[]}>(`/repositories/${encodeURIComponent(id)}/scan`, {method: 'POST', body: '{}'});
export const getMonitoring = () => request<MonitoringSnapshot>('/monitoring');
export const pollMonitoring = () => request<MonitoringSnapshot>('/monitoring/poll', {method: 'POST', body: '{}'});
export const updateMonitoring = (changes: {enabled?: boolean; intervalSeconds?: number}) => request<MonitoringSnapshot>('/monitoring', {method: 'PATCH', body: JSON.stringify(changes)});
export const getFindings = () => request<{findings: SupplyFinding[]}>('/findings');
export const closePullRequestsAndDeleteFindings = (repositoryIds: string[], expectedFindingCount: number, expectedPullRequestCount: number) => request<{deletedFindings: number; closedPullRequests: number; alreadyClosedPullRequests: number}>('/findings', {method: 'DELETE', body: JSON.stringify({repositoryIds, expectedFindingCount, expectedPullRequestCount})});
export const remediateFinding = (id: string) => request<{run: LiveRun}>(`/findings/${encodeURIComponent(id)}/remediate`, {method: 'POST', body: '{}'});
