import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const plain = value => value.replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot);/g, ' ').replace(/\s+/g, ' ').trim();
const compare = (a, b) => { const left = a.split('.').map(Number), right = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i]; return 0; };
const version = value => { const match = /^(\d+\.\d+\.\d+)(?:-[a-z0-9._-]+)?$/.exec(value || ''); assert.ok(match, 'Vendor verification requires a complete numeric runtime image tag.'); return match[1]; };
export function parseVendorNginx(html) {
  assert.ok(Buffer.byteLength(html) < 750_000 && !/<!ENTITY/i.test(html));
  const values = [];
  for (const match of html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const content = match[1], id = plain(content).match(/CVE-\d{4}-\d{4,}/)?.[0]; if (!id) continue;
    const fixes = [...(content.match(/Not vulnerable:\s*([\s\S]*?)<br/i)?.[1] || '').matchAll(/\b(\d+\.\d+\.\d+)\+/g)].map(match => match[1]);
    const affected = plain(content.match(/(?:^|<br\s*\/?\s*>)\s*Vulnerable:\s*([\s\S]*?)(?:<br|<\/p)/i)?.[1] || '');
    if (fixes.length && /^\d+\.\d+\.\d+(?:-\d+\.\d+\.\d+)?(?:,\s*\d+\.\d+\.\d+(?:-\d+\.\d+\.\d+)?)*$/.test(affected)) values.push({ id, fixes, affected });
  }
  assert.ok(values.length > 0 && values.length <= 200, 'Vendor nginx feed has an unsupported format.'); return values;
}
export function vendorNginxAffected(value, advisory) {
  const installed = version(value), branch = installed.split('.').slice(0, 2).join('.');
  const highestFix = [...advisory.fixes].sort(compare).at(-1);
  if (compare(installed, highestFix) >= 0 || advisory.fixes.some(fix => fix.split('.').slice(0, 2).join('.') === branch && compare(installed, fix) >= 0)) return false;
  return advisory.affected.split(/,\s*/).some(range => { const [start, end = start] = range.split('-'); return compare(installed, start) >= 0 && compare(installed, end) <= 0; });
}
export function evaluateImageAdvisoryEvidence(selectedIds, baselineFindings, candidateFindings) {
  const selected = [...new Set(selectedIds)];
  const baseline = baselineFindings.filter(value => selected.includes(value.VulnerabilityID));
  const candidate = candidateFindings.filter(value => selected.includes(value.VulnerabilityID));
  return { pass: selected.length > 0 && candidate.length === 0, baselineSelectedCount: baseline.length, candidateSelectedCount: candidate.length, coverageGap: selected.filter(id => !baseline.some(value => value.VulnerabilityID === id)) };
}
async function text(url) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { 'user-agent': 'ProofPatch-Central-Vendor-Verifier' } });
  assert.ok(response.ok, `Vendor source returned HTTP ${response.status}.`);
  const result = await response.text(); assert.ok(Buffer.byteLength(result) < 1_500_000, 'Vendor source exceeded byte bounds.'); return result;
}
export async function corroborateVendorRepair(target, selectedIds) {
  const name = target.packageName.replace(/^docker\.io\//, '').replace(/^library\//, '');
  const requested = [...new Set(selectedIds.filter(id => /^CVE-\d{4}-\d+$/.test(id)))];
  assert.ok(requested.length > 0 && requested.length <= 100, 'Container verification must bind the selected vendor CVE identities.');
  if (name === 'nginx') {
    const url = 'https://nginx.org/en/security_advisories.html', body = await text(url), advisories = parseVendorNginx(body);
    const baseline = advisories.filter(advisory => vendorNginxAffected(target.installedVersion, advisory));
    const candidate = advisories.filter(advisory => vendorNginxAffected(target.fixedVersion, advisory));
    assert.ok(requested.every(id => baseline.some(advisory => advisory.id === id)), 'Selected nginx CVE does not affect the exact baseline tag according to the vendor.');
    assert.ok(candidate.length === 0, 'A current nginx vendor advisory still affects the proposed replacement version.');
    return { vendor: 'nginx', baselineAffectedIds: baseline.map(value => value.id), candidateAffectedIds: [], selectedIds: requested, sources: [{ url, sha256: createHash('sha256').update(body).digest('hex') }] };
  }
  if (name === 'php') {
    const urls = ['https://www.php.net/archive/2026.php', 'https://www.jpcert.or.jp/at/2026/at260033.html'];
    const bodies = await Promise.all(urls.map(text));
    const cves = ['CVE-2026-109618', 'CVE-2026-109619'], fixes = ['8.2.35', '8.3.36', '8.4.27', '8.5.12'];
    assert.ok(bodies.every(body => cves.every(id => body.includes(id)) && fixes.every(fix => body.includes(fix))), 'PHP and JPCERT/CC did not corroborate the supported release mapping.');
    assert.ok(requested.every(id => cves.includes(id)), 'PHP image CVE is outside the supported vendor release mapping.');
    const installed = version(target.installedVersion), fixed = version(target.fixedVersion), branch = installed.split('.').slice(0, 2).join('.');
    const safe = fixes.find(value => value.startsWith(branch + '.'));
    assert.ok(safe && fixed.startsWith(branch + '.') && compare(installed, safe) < 0 && compare(fixed, safe) >= 0, 'PHP baseline/replacement does not cross its supported security release.');
    return { vendor: 'PHP + JPCERT/CC', baselineAffectedIds: cves, candidateAffectedIds: [], selectedIds: requested, followUp: 'Separately review session.upload_progress.enabled=0, deployed web configuration and incident logs. This PR updates the image only.', sources: bodies.map((body,index) => ({ url: urls[index], sha256: createHash('sha256').update(body).digest('hex') })) };
  }
  throw new Error('This image vendor needs a corroborated release advisory adapter.');
}
