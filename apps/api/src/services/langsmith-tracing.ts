import { Client } from 'langsmith';

export interface LangSmithStatus { enabled: boolean; project: string }
export type LangSmithTrace =
  | { state: 'not-connected' | 'not-found' | 'unavailable'; url?: never }
  | { state: 'available'; url: string };

export function langSmithStatus(env: NodeJS.ProcessEnv = process.env): LangSmithStatus {
  return {
    enabled: env.LANGSMITH_TRACING?.toLowerCase() === 'true' && Boolean(env.LANGSMITH_API_KEY?.trim()),
    project: env.LANGSMITH_PROJECT?.trim() || 'proofpatch',
  };
}

/** Only a LangSmith lookup can establish that a run has a trace. */
export async function langSmithTrace(runId: string, env: NodeJS.ProcessEnv = process.env, lookup?: (id: string) => Promise<string>): Promise<LangSmithTrace> {
  if (!langSmithStatus(env).enabled) return { state: 'not-connected' };
  try {
    const getUrl = lookup ?? ((id: string) => new Client({
      apiKey: env.LANGSMITH_API_KEY,
      apiUrl: env.LANGSMITH_ENDPOINT?.trim() || undefined,
      workspaceId: env.LANGSMITH_WORKSPACE_ID?.trim() || undefined,
      timeout_ms: 5000,
      callerOptions: { maxRetries: 0 },
    }).getRunUrl({ runId: id }));
    const url = await getUrl(runId);
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return { state: 'unavailable' };
    return { state: 'available', url };
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : undefined;
    return { state: status === 404 ? 'not-found' : 'unavailable' };
  }
}
