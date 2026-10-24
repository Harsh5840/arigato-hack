import { readFile } from 'node:fs/promises';
import { boundedBytes, combinedSignal, object, sha256, string, strings } from './http.js';
import { fixedImage, type Advisory } from './types.js';

const feedUrl = 'https://www.jpcert.or.jp/rss/jpcert.rdf';
const noticeUrl = 'https://www.jpcert.or.jp/at/2026/at260033.html';
const vendorUrl = 'https://www.php.net/archive/2026.php';
const approvedHosts = new Set(['www.jpcert.or.jp', 'jpcert.or.jp', 'www.php.net', 'php.net']);

// Connectors fetch data. Feed text never supplies executable tools or target URLs.
async function fetchSource(url: string, signal?: AbortSignal): Promise<{ body: string; sha256: string; retrievedAt: string }> {
  let next = new URL(url);
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (next.protocol !== 'https:' || !approvedHosts.has(next.hostname) || next.username || next.password || next.port) throw new Error('Advisory source is outside the approved HTTPS host list.');
    const response = await fetch(next, { redirect: 'manual', signal: combinedSignal(signal), headers: { 'user-agent': 'ProofPatch-Hackathon/1.0 (bounded advisory intake)', accept: 'text/html,application/rdf+xml,application/xml;q=0.9' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Advisory redirect did not include a location.');
      next = new URL(location, next);
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Official advisory source returned HTTP ${response.status}. Retry live intake or select the explicitly labelled cached snapshot.`); }
    const bytes = await boundedBytes(response, 1_500_000);
    const body = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    // No XML parsing, DTD expansion, external entities or scripts are executed.
    if (/<!ENTITY\s/i.test(body)) throw new Error('Advisory contains an unsupported XML entity declaration.');
    return { body, sha256: sha256(bytes), retrievedAt: new Date().toISOString() };
  }
  throw new Error('Official source exceeded the redirect limit.');
}

export const ownerTasks = [
  'Human review and deployment of the pinned candidate image are required; this draft does not change a running service.',
  'Verify the startup upload-progress setting and serializer behavior in the actual web deployment, then restart relevant workers.',
  'Review PHP/JPCERT incident guidance and retained logs; passing these fixture checks does not prove absence of compromise or reproduce the RCE.',
];

function normalizedBody(): string {
  return 'Official-source correlation: JPCERT-AT-2026-0033, published 2026-10-22, references PHP CVE-2026-109618 and CVE-2026-109619. PHP 8.3 releases before 8.3.36 require the reviewed branch update. PHP published a separate configuration-dependent session upload-progress follow-up on 2026-10-23. For this owned synthetic fixture, propose the reviewed PHP 8.3.36 image, raise the Composer PHP floor consistently and disable upload progress at startup. Do not infer installed runtime or exploitability from a Dockerfile alone. Keep deployment, actual web configuration and incident review human-owned. This is a normalized factual brief, not a full advisory reproduction.';
}

export function validateCachedAdvisory(value: unknown): Advisory {
  const data = object(value, 'Cached advisory');
  if (data.id !== 'JPCERT-AT-2026-0033' || data.sourceMode !== 'cached' || data.fixedVersion !== '8.3.36' || data.image !== fixedImage) throw new Error('Cached advisory identity or approved repair policy is invalid.');
  if (!Array.isArray(data.sources) || data.sources.length !== 3) throw new Error('Cached advisory must preserve three source records.');
  const sources = data.sources.map((entry): Advisory['sources'][number] => {
    const source = object(entry, 'Cached source');
    const url = string(source.url, 'Source URL');
    if (![feedUrl, noticeUrl, vendorUrl].includes(url)) throw new Error('Cached source URL is not approved.');
    if (!/^[a-f0-9]{64}$/.test(string(source.sha256, 'Source digest'))) throw new Error('Cached source digest is invalid.');
    const retrievedAt = string(source.retrievedAt, 'Retrieval time');
    if (!Number.isFinite(Date.parse(retrievedAt))) throw new Error('Cached source retrieval time is invalid.');
    if (source.language !== 'ja' && source.language !== 'en') throw new Error('Cached source language is invalid.');
    return { url, title: string(source.title, 'Source title'), language: source.language, retrievedAt, sha256: source.sha256 as string, ...(typeof source.publishedAt === 'string' ? { publishedAt: source.publishedAt } : {}) };
  });
  return { id: data.id, titleEn: string(data.titleEn, 'English title'), titleJa: string(data.titleJa, 'Japanese title'), sourceMode: 'cached', sources, summary: string(data.summary, 'Summary'), body: string(data.body, 'Brief', 8_000), fixedVersion: '8.3.36', image: fixedImage, cves: strings(data.cves, 'CVE IDs', 3), ownerTasks: strings(data.ownerTasks, 'Owner tasks') };
}

export async function fetchAdvisory(sourceMode: 'live' | 'cached', signal?: AbortSignal): Promise<Advisory> {
  signal?.throwIfAborted();
  if (sourceMode === 'cached') {
    const snapshot = JSON.parse(await readFile(new URL('./fixtures/php-2026-10.json', import.meta.url), 'utf8'));
    signal?.throwIfAborted();
    return validateCachedAdvisory(snapshot);
  }
  const feed = await fetchSource(feedUrl, signal);
  if (!feed.body.includes('/at/2026/at260033.html')) throw new Error('The live JPCERT feed did not contain the selected PHP advisory. No cached fallback was substituted; choose cached mode explicitly.');
  const [notice, vendor] = await Promise.all([fetchSource(noticeUrl, signal), fetchSource(vendorUrl, signal)]);
  if (!notice.body.includes('CVE-2026-109618') || !notice.body.includes('CVE-2026-109619') || !notice.body.includes('8.3.36') || !vendor.body.includes('CVE-2026-109618') || !vendor.body.includes('CVE-2026-109619') || !vendor.body.includes('8.3.36')) throw new Error('Japanese and PHP vendor sources did not corroborate the expected CVEs and reviewed version. Intake stopped.');
  return {
    id: 'JPCERT-AT-2026-0033',
    titleEn: 'PHP runtime vulnerabilities: Japanese advisory and vendor corroboration',
    titleJa: 'PHP の複数の脆弱性：日本語注意喚起と開発元情報の照合',
    sourceMode: 'live',
    sources: [
      { url: feedUrl, title: 'JPCERT/CC official advisory feed', language: 'ja', retrievedAt: feed.retrievedAt, sha256: feed.sha256 },
      { url: noticeUrl, title: 'JPCERT-AT-2026-0033', language: 'ja', publishedAt: '2026-10-21T15:00:00.000Z', retrievedAt: notice.retrievedAt, sha256: notice.sha256 },
      { url: vendorUrl, title: 'PHP October 2026 security notices', language: 'en', publishedAt: '2026-10-21', retrievedAt: vendor.retrievedAt, sha256: vendor.sha256 },
    ],
    summary: 'The owned SakuraShop fixture declares PHP 8.3.35. This case reviews a pinned PHP 8.3.36 candidate plus a separate startup-setting mitigation; deployment and incident review remain open.',
    body: normalizedBody(), fixedVersion: '8.3.36', image: fixedImage,
    cves: ['CVE-2026-109618', 'CVE-2026-109619'], ownerTasks,
  };
}
