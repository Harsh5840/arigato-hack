import type { Dependency, SupplyFinding } from '../../../../packages/contracts/src/monitoring.js';
import { boundedBytes, boundedJson, combinedSignal, object, sha256, string } from './http.js';
import { compareVersions } from './inventory.js';

export const nginxAdvisoriesUrl = 'https://nginx.org/en/security_advisories.html';
export const phpAdvisoriesUrl = 'https://www.php.net/archive/2026.php';
export const phpJapaneseAdvisoryUrl = 'https://www.jpcert.or.jp/at/2026/at260033.html';
export interface ContainerReference { canonicalName: string; tag: string; digest?: string; reference: string }
export interface NginxAdvisory { id: string; title: string; severity: string; affected: string; fixes: string[]; url?: string }

/** Image discovery is deliberately not an arbitrary registry fetch: this adapter
 * corroborates Docker Official nginx images against the nginx vendor feed. */
export function parseContainerReference(input: string): ContainerReference | undefined {
  if (input.length > 300 || /\s|[${}\\]/.test(input)) return undefined;
  const match = input.match(/^(?:(?:docker\.io|index\.docker\.io)\/)?(?:library\/)?(nginx|php):([0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9][a-z0-9._-]*)?)(?:@(sha256:[a-f0-9]{64}))?$/);
  if (!match) return undefined;
  return { canonicalName: `library/${match[1]}`, tag: match[2], ...(match[3] ? { digest: match[3] } : {}), reference: input };
}

function plain(value: string): string { return value.replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot);/g, ' ').replace(/\s+/g, ' ').trim(); }
export function parseNginxAdvisories(html: string): NginxAdvisory[] {
  if (Buffer.byteLength(html) > 750_000 || /<!ENTITY/i.test(html)) throw new Error('nginx advisory feed exceeded the trusted parser bounds.');
  const advisories: NginxAdvisory[] = [];
  for (const match of html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const item = match[1], id = plain(item).match(/CVE-\d{4}-\d{4,}/)?.[0];
    if (!id) continue;
    const title = plain(item.split(/<br\s*\/?\s*>/i)[0]);
    const fixes = [...(item.match(/Not vulnerable:\s*([\s\S]*?)<br/i)?.[1] ?? '').matchAll(/\b(\d+\.\d+\.\d+)\+/g)].map((entry) => entry[1]);
    const affected = plain(item.match(/(?:^|<br\s*\/?\s*>)\s*Vulnerable:\s*([\s\S]*?)(?:<br|<\/p)/i)?.[1] ?? '');
    // Unsupported vendor statements must not become clean-version assertions.
    if (!title || !affected || !fixes.length || !/^\d+\.\d+\.\d+(?:-\d+\.\d+\.\d+)?(?:,\s*\d+\.\d+\.\d+(?:-\d+\.\d+\.\d+)?)*$/.test(affected)) continue;
    const rawUrl = item.match(/href="(https:\/\/(?:my\.f5\.com|mailman\.nginx\.org)\/[^"<>]+)"[^>]*>Advisory</i)?.[1];
    advisories.push({ id, title, severity: plain(item.match(/Severity:\s*([^<]+)/i)?.[1] ?? 'unspecified'), fixes, affected, ...(rawUrl ? { url: rawUrl } : {}) });
  }
  if (!advisories.length || advisories.length > 200) throw new Error('nginx advisory feed format is unsupported; container monitoring cannot claim a clean scan.');
  return advisories;
}

export function nginxVersionAffected(version: string, advisory: NginxAdvisory): boolean {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('nginx version must be an exact numeric release.');
  const branch = version.split('.').slice(0, 2).join('.');
  const highestFix = [...advisory.fixes].sort(compareVersions).at(-1)!;
  if (compareVersions(version, highestFix) >= 0 || advisory.fixes.some((fix) => fix.split('.').slice(0, 2).join('.') === branch && compareVersions(version, fix) >= 0)) return false;
  return advisory.affected.split(/,\s*/).some((range) => {
    const [introduced, last = introduced] = range.split('-');
    return compareVersions(version, introduced) >= 0 && compareVersions(version, last) <= 0;
  });
}

async function request(url: string, signal?: AbortSignal, headers: Record<string, string> = {}): Promise<Response> {
  const response = await fetch(url, { redirect: 'error', signal: combinedSignal(signal, 25_000), headers: { 'user-agent': 'ProofPatch-Container-Monitor', ...headers } });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Container advisory source ${new URL(url).hostname} returned HTTP ${response.status}.`); }
  return response;
}

export async function inspectContainerReference(input: string, signal?: AbortSignal): Promise<ContainerReference & { digest: string }> {
  const image = parseContainerReference(input);
  if (!image) throw new Error('Only exact Docker Official nginx and PHP image tags can be corroborated by this vendor adapter.');
  const tokenData = object(await boundedJson(await request(`https://auth.docker.io/token?service=registry.docker.io&scope=repository:${image.canonicalName}:pull`, signal)), 'Docker pull token');
  const token = string(tokenData.token, 'Docker pull token', 10_000);
  const response = await request(`https://registry-1.docker.io/v2/${image.canonicalName}/manifests/${encodeURIComponent(image.tag)}`, signal, { authorization: `Bearer ${token}`, accept: 'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json' });
  const bytes = await boundedBytes(response, 1_000_000), digest = response.headers.get('docker-content-digest');
  if (!digest || !/^sha256:[a-f0-9]{64}$/.test(digest) || `sha256:${sha256(bytes)}` !== digest) throw new Error('Docker manifest content does not match its registry digest.');
  if (image.digest && image.digest !== digest) throw new Error('Pinned image digest differs from the current published tag; the version label cannot be trusted.');
  return { ...image, digest, reference: `${image.canonicalName.replace(/^library\//, '')}:${image.tag}@${digest}` };
}

async function scanPhpImages(repositoryId: string, dependencies: Dependency[], signal?: AbortSignal): Promise<SupplyFinding[]> {
  if (!dependencies.length) return [];
  const [vendorBytes, japaneseBytes] = await Promise.all([phpAdvisoriesUrl, phpJapaneseAdvisoryUrl].map(async (url) => boundedBytes(await request(url, signal), 1_500_000)));
  const vendor = new TextDecoder('utf-8', { fatal: true }).decode(vendorBytes), japanese = new TextDecoder('utf-8', { fatal: true }).decode(japaneseBytes);
  const cves = ['CVE-2026-109618', 'CVE-2026-109619'];
  const releases = ['8.2.35', '8.3.36', '8.4.27', '8.5.12'];
  if (!cves.every((cve) => vendor.includes(cve) && japanese.includes(cve)) || !releases.every((version) => vendor.includes(version) && japanese.includes(version))) throw new Error('PHP and Japanese advisory sources did not corroborate the complete supported-branch release mapping.');
  const findings: SupplyFinding[] = [];
  for (const dependency of dependencies) {
    const image = parseContainerReference(dependency.imageRef ?? `php:${dependency.version}`);
    if (!image) throw new Error('PHP image uses a mutable or unsupported version; provide a complete numeric tag.');
    const installed = image.tag.match(/^(\d+\.\d+\.\d+)/)![1], branch = installed.split('.').slice(0, 2).join('.');
    const safeVersion = releases.find((version) => version.startsWith(`${branch}.`));
    if (!safeVersion) throw new Error('This PHP branch has no supported vendor mapping in the current container advisory adapter.');
    if (compareVersions(installed, safeVersion) >= 0) continue;
    const suffix = image.tag.slice(installed.length);
    await inspectContainerReference(image.reference, signal);
    const fixed = await inspectContainerReference(`php:${safeVersion}${suffix}`, signal);
    findings.push({
      id: `finding-${sha256(JSON.stringify([repositoryId, 'Docker', dependency.name, dependency.version, dependency.manifestPath, 'JPCERT-AT-2026-0033'])).slice(0, 24)}`,
      repositoryId, advisoryId: 'JPCERT-AT-2026-0033', aliases: cves, ecosystem: 'Docker', packageName: dependency.name,
      installedVersion: image.tag, fixedVersion: fixed.tag, manifestPath: dependency.manifestPath,
      imageRef: dependency.imageRef ?? image.reference, fixedImageRef: fixed.reference, fixedDigest: fixed.digest,
      summary: `PHP ${installed} is older than the vendor security release ${safeVersion} on its supported branch. JPCERT/CC and PHP corroborate two RCE advisories. Update the image and review the separate session.upload_progress.enabled=0 startup mitigation, actual web configuration and incident logs. This covers upstream PHP, not every image OS package or absence of compromise.`,
      references: [{ title: 'JPCERT/CC Japanese PHP advisory', url: phpJapaneseAdvisoryUrl }, { title: 'PHP vendor releases and upload-progress follow-up', url: phpAdvisoriesUrl }, { title: 'Docker Official PHP image', url: 'https://hub.docker.com/_/php' }],
      detectedAt: new Date().toISOString(), status: 'detected',
    });
  }
  return findings;
}

/** Confirm upstream application-version advisories, not a complete OS-package
 * image scan. The execution runner must still scan the candidate image. */
export async function scanContainerDependencies(repositoryId: string, dependencies: Dependency[], signal?: AbortSignal): Promise<SupplyFinding[]> {
  if (!repositoryId || repositoryId.length > 180 || dependencies.length > 100) throw new Error('Container scan identity or dependency bound is invalid.');
  const images = dependencies.filter((dependency) => dependency.ecosystem === 'Docker');
  if (!images.length) return [];
  const supported = images.filter((dependency) => /^(?:docker\.io\/)?(?:library\/)?(?:nginx|php)$/.test(dependency.name));
  if (supported.length !== images.length) throw new Error('An image vendor is unsupported by the application-version adapter. A complete image scan requires the Trivy runner; this scan cannot claim clean coverage.');
  const phpImages = supported.filter((dependency) => /(?:^|\/)php$/.test(dependency.name));
  const phpFindings = await scanPhpImages(repositoryId, phpImages, signal);
  const nginxImages = supported.filter((dependency) => /(?:^|\/)nginx$/.test(dependency.name));
  if (!nginxImages.length) return phpFindings;
  const html = new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(await request(nginxAdvisoriesUrl, signal), 750_000));
  const advisories = parseNginxAdvisories(html), findings: SupplyFinding[] = [...phpFindings];
  const fixedImages = new Map<string, Awaited<ReturnType<typeof inspectContainerReference>>>();
  for (const dependency of nginxImages) {
    if (!['nginx', 'library/nginx', 'docker.io/library/nginx'].includes(dependency.name)) continue;
    const image = parseContainerReference(dependency.imageRef ?? `nginx:${dependency.version}`);
    if (!image) throw new Error('nginx image uses a mutable or unsupported version; provide a complete numeric tag.');
    const installed = image.tag.match(/^(\d+\.\d+\.\d+)/)![1], suffix = image.tag.slice(installed.length);
    const matched = advisories.filter((advisory) => nginxVersionAffected(installed, advisory));
    if (!matched.length) continue;
    // Establish that the affected tag really exists before recommending a fix.
    await inspectContainerReference(image.reference, signal);
    const targets = [...new Set(advisories.flatMap((advisory) => advisory.fixes))]
      .filter((version) => version.split('.')[0] === installed.split('.')[0] && Number(version.split('.')[1]) % 2 === 0 && compareVersions(version, installed) > 0 && advisories.every((advisory) => !nginxVersionAffected(version, advisory)))
      .sort((a, b) => compareVersions(b, a)).slice(0, 12);
    let fixed: Awaited<ReturnType<typeof inspectContainerReference>> | undefined;
    for (const version of targets) {
      const tag = version + suffix;
      try { fixed = fixedImages.get(tag) ?? await inspectContainerReference(`nginx:${tag}`, signal); fixedImages.set(tag, fixed); break; }
      catch (error) { if (!(error instanceof Error) || !error.message.includes('HTTP 404')) throw error; }
    }
    // Prioritize the well documented historical issue for a clear demo while
    // retaining every current vendor-confirmed advisory as a separate finding.
    matched.sort((a, b) => Number(b.id === 'CVE-2024-7347') - Number(a.id === 'CVE-2024-7347') || a.id.localeCompare(b.id));
    for (const advisory of matched) findings.push({
      id: `finding-${sha256(JSON.stringify([repositoryId, 'Docker', dependency.name, dependency.version, dependency.manifestPath, advisory.id])).slice(0, 24)}`,
      repositoryId, advisoryId: advisory.id, aliases: [advisory.id], ecosystem: 'Docker', packageName: dependency.name,
      installedVersion: image.tag, fixedVersion: fixed?.tag ?? '', manifestPath: dependency.manifestPath,
      imageRef: dependency.imageRef ?? image.reference, ...(fixed ? { fixedImageRef: fixed.reference, fixedDigest: fixed.digest } : {}),
      summary: `${advisory.title} (${advisory.severity}). nginx ${installed} is in the vendor-affected range. Exploitability depends on enabled modules and configuration. This finding covers upstream nginx, not all image OS packages.`,
      references: [{ title: 'nginx official security advisories and affected releases', url: nginxAdvisoriesUrl }, ...(advisory.url ? [{ title: 'Upstream vendor advisory', url: advisory.url }] : []), { title: 'Docker Official nginx image', url: 'https://hub.docker.com/_/nginx' }],
      detectedAt: new Date().toISOString(), status: fixed ? 'detected' : 'needs-owner',
    });
  }
  return findings;
}
