import { createHash } from 'node:crypto';

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function combinedSignal(signal?: AbortSignal, milliseconds = 25_000): AbortSignal {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(milliseconds)]) : AbortSignal.timeout(milliseconds);
}

export async function boundedBytes(response: Response, maxBytes = 1_000_000): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw new Error(`Remote response exceeded the ${maxBytes}-byte limit.`);
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error(`Remote response exceeded the ${maxBytes}-byte limit.`);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

export async function boundedJson(response: Response, maxBytes = 1_000_000): Promise<unknown> {
  const bytes = await boundedBytes(response, maxBytes);
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error('Remote response was not valid JSON.'); }
}

export function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

export function string(value: unknown, label: string, maxLength = 4_000): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) throw new Error(`${label} must be a nonempty string of at most ${maxLength} characters.`);
  return value;
}

export function strings(value: unknown, label: string, maxItems = 12): string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${label} must be an array with at most ${maxItems} entries.`);
  return value.map((entry, index) => string(entry, `${label}[${index}]`, 2_000));
}

export function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) throw new Error(`${label} returned unexpected or missing fields.`);
}

export function abortableDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); reject(signal?.reason ?? new Error('Operation cancelled.')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
