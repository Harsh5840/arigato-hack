import type {AgentCall, Run, RunEvent, RunStatus} from '../../../../packages/contracts/src/live';
export type {CandidateDiff} from '../../../../packages/contracts/src/live';

export type LiveStatus = RunStatus;
export type AgentRole = AgentCall['role'];
export type LiveNode = RunEvent['node'];
export type LiveEvent = RunEvent;
export type LiveRun = Run;
export interface ServiceStatus {
  service: string;
  ready: boolean;
  groqConfigured: boolean;
  githubConfigured: boolean;
  models: Record<AgentRole, string>;
  target: string;
  runner: string;
  activeRunId?: string;
}
export const isTerminal = (status: LiveStatus) => ['completed', 'blocked', 'failed', 'cancelled'].includes(status);
export const liveStatusLabels: Record<LiveStatus, string> = {
  queued: 'Queued', 'source-fetching': 'Fetching Japanese advisory', triaging: 'Supply Chain · triaging', matching: 'Matching repository inventory', baseline: 'Recording baseline', patching: 'Remediation · preparing candidate', verifying: 'Executing candidate checks', reviewing: 'DevSec · reviewing evidence', publishing: 'Opening draft pull request', completed: 'Draft ready for human review', blocked: 'Evidence gate blocked', failed: 'Run failed', cancelled: 'Run cancelled',
};
