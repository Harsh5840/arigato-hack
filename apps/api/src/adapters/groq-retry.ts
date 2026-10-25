import { abortableDelay } from './http.js';

const transientStatuses = new Set([429, 502, 503, 504]);

function retryDelayMs(header: string | null): number {
  if (!header?.trim()) return 1_200;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1_000);
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 1_200;
}

/** One bounded retry on provider throttling or temporary server errors.
 * A wait beyond the budget is returned to the caller as an explicit failure. */
export async function fetchGroqWithRetry(input: RequestInfo | URL, init: RequestInit, maxWaitMs: number, signal?: AbortSignal): Promise<Response> {
  const requestSignal = init.signal && signal ? AbortSignal.any([init.signal, signal]) : init.signal ?? signal;
  for (let attempt = 0; attempt < 2; attempt++) {
    requestSignal?.throwIfAborted();
    const response = await globalThis.fetch(input, { ...init, redirect: 'error', signal: requestSignal });
    if (attempt === 1 || !transientStatuses.has(response.status)) return response;
    const delay = retryDelayMs(response.headers.get('retry-after'));
    if (delay > maxWaitMs) return response;
    await response.body?.cancel();
    await abortableDelay(delay, requestSignal ?? undefined);
  }
  throw new Error('Groq retry budget exhausted.');
}
