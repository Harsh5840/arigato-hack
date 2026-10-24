export type RunStatus = 'queued' | 'source-fetching' | 'triaging' | 'matching' | 'baseline' | 'patching' | 'verifying' | 'reviewing' | 'publishing' | 'completed' | 'blocked' | 'failed' | 'cancelled';
export type Check = { id: string; label: string; status: 'pending' | 'passed' | 'failed' | 'not-run'; detail?: string };
export type AgentCall = { role: 'supply' | 'fixer' | 'reviewer'; model: string; status: 'running' | 'completed' | 'failed'; summary?: string; summaryJa?: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number }; startedAt: string; completedAt?: string };
export interface Run {
  id: string; status: RunStatus; createdAt: string; updatedAt: string;
  sourceMode: 'live' | 'cached'; mode: 'live-groq';
  repo: { owner: string; name: string; baseSha?: string; candidateSha?: string; branch?: string };
  advisory?: { id: string; titleEn: string; titleJa: string; summary: string; sources: { url: string; title: string; language: 'ja' | 'en'; retrievedAt: string; publishedAt?: string; sha256?: string }[]; cves: string[]; fixedVersion: string; ownerTasks: string[] };
  agentCalls: AgentCall[]; checks: Check[];
  review?: { decision: 'approve' | 'request_changes'; summaryEn: string; summaryJa: string; concerns: string[]; ownerTasks: string[] };
  pullRequest?: { url: string; number: number; draft: boolean; reused?: boolean };
  ci?: { url: string; id: number; status: string; conclusion: string | null };
  failure?: { code: string; message: string };
  evidence?: { runtime?: Record<string, unknown>; businessLog?: string; policy?: Record<string, unknown>; builtImageId?: string; artifactSha256?: string; verifierSha256?: string; rawFiles?: Record<string, string> };
  draftPRAllowed?: boolean; mergeReady: false; findingClosed: false; cancelRequested?: boolean;
}
export interface RunEvent { id: number; runId: string; at: string; node: 'controller' | 'supply-chain' | 'remediation' | 'devsec' | 'gate' | 'review'; kind: string; message: string }
export interface CandidateDiff {
  baseSha: string;
  candidateSha: string;
  compareUrl: string;
  files: { path: string; status: 'modified' | 'added' | 'removed'; additions: number; deletions: number; patch: string }[];
  truncated: boolean;
}
export const terminalStatuses: ReadonlySet<RunStatus> = new Set(['completed', 'blocked', 'failed', 'cancelled']);
