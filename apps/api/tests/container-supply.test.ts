import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { inspectContainerReference, nginxVersionAffected, parseContainerReference, parseNginxAdvisories, scanContainerDependencies } from '../src/adapters/container-supply.js';
import { sha256 } from '../src/adapters/http.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const html = `<html><ul>
<li><p>Buffer overread in ngx_http_mp4_module<br>Severity: low<br><a href="https://mailman.nginx.org/pipermail/nginx-announce/2024.html">Advisory</a><br>CVE-2024-7347<br>Not vulnerable: 1.27.1+, 1.26.2+<br>Vulnerable: 1.5.13-1.27.0</p></li>
<li><p>Vendor current issue<br>Severity: medium<br>CVE-2026-15176<br>Not vulnerable: 1.31.7+, 1.30.6+<br>Vulnerable: 0.1.29-1.31.6</p></li>
</ul></html>`;
const manifest = JSON.stringify({ schemaVersion: 2, manifests: [{ digest: `sha256:${'f'.repeat(64)}` }] });
const digest = `sha256:${sha256(manifest)}`;
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

test('container references reject mutable tags, untrusted registries, substitutions and malformed digests', () => {
  assert.equal(parseContainerReference('nginx:1.26.0')?.canonicalName, 'library/nginx');
  assert.equal(parseContainerReference(`docker.io/library/nginx:1.30.6-alpine@${digest}`)?.digest, digest);
  for (const image of ['nginx:latest', 'nginx:1.26', 'evil.test/nginx:1.26.0', 'nginx:${TAG}', 'nginx:1.26.0@sha256:no', 'nginx:1.26.0 test', 'nginx:1.26.0;echo']) assert.equal(parseContainerReference(image), undefined);
});

test('nginx vendor ranges honor fixed stable backports within the broader vulnerable range', () => {
  const advisories = parseNginxAdvisories(html);
  assert.equal(advisories[0].id, 'CVE-2024-7347');
  assert.equal(nginxVersionAffected('1.26.0', advisories[0]), true);
  assert.equal(nginxVersionAffected('1.26.2', advisories[0]), false);
  assert.equal(nginxVersionAffected('1.30.5', advisories[1]), true);
  assert.equal(nginxVersionAffected('1.30.6', advisories[1]), false);
  assert.equal(nginxVersionAffected('1.31.7', advisories[1]), false);
  assert.throws(() => parseNginxAdvisories('<html>format changed</html>'), /cannot claim a clean scan/);
});

test('registry resolution checks manifest content digest and rejects moved pinned references', async () => {
  globalThis.fetch = async (input) => String(input).startsWith('https://auth.docker.io/') ? json({ token: 'public-pull-test-token' }) : new Response(manifest, { headers: { 'docker-content-digest': digest } });
  assert.equal((await inspectContainerReference('nginx:1.30.6')).reference, `nginx:1.30.6@${digest}`);
  await assert.rejects(inspectContainerReference(`nginx:1.30.6@sha256:${'a'.repeat(64)}`), /differs/);
  globalThis.fetch = async (input) => String(input).startsWith('https://auth.docker.io/') ? json({ token: 'public-pull-test-token' }) : new Response(manifest, { headers: { 'docker-content-digest': `sha256:${'b'.repeat(64)}` } });
  await assert.rejects(inspectContainerReference('nginx:1.30.6'), /does not match/);
});

test('arbitrary connected repositories get vendor-confirmed image findings and a published digest-pinned fix', async () => {
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input); calls.push(url);
    if (url === 'https://nginx.org/en/security_advisories.html') return new Response(html);
    if (url.startsWith('https://auth.docker.io/')) return json({ token: 'public-pull-test-token' });
    return new Response(manifest, { headers: { 'docker-content-digest': digest } });
  };
  const findings = await scanContainerDependencies('unrelated-company-service', [{ ecosystem: 'Docker', name: 'library/nginx', version: '1.26.0', imageRef: 'nginx:1.26.0', manifestPath: 'deploy/compose.yaml', direct: true }]);
  assert.equal(findings.length, 2);
  assert.equal(findings[0].advisoryId, 'CVE-2024-7347');
  assert.equal(findings[0].fixedVersion, '1.30.6');
  assert.equal(findings[0].fixedImageRef, `nginx:1.30.6@${digest}`);
  assert.match(findings[0].summary, /not all image OS packages/);
  assert.ok(calls.some((url) => url.endsWith('/manifests/1.26.0')));
  assert.ok(calls.some((url) => url.endsWith('/manifests/1.30.6')));
});

test('failed vendor and registry sources never become a clean container scan', async () => {
  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(scanContainerDependencies('service', [{ ecosystem: 'Docker', name: 'library/nginx', version: '1.26.0', manifestPath: 'compose.yaml', direct: true }]), /HTTP 503/);
});

test('PHP Dockerfile findings apply to any repository and preserve the supported branch and variant', async () => {
  const source = 'CVE-2026-109618 CVE-2026-109619 8.2.35 8.3.36 8.4.27 8.5.12';
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith('https://www.php.net/') || url.startsWith('https://www.jpcert.or.jp/')) return new Response(source);
    if (url.startsWith('https://auth.docker.io/')) return json({ token: 'public-pull-test-token' });
    assert.match(url, /\/library\/php\/manifests\/8\.3\.(?:35|36)-cli-bookworm$/);
    return new Response(manifest, { headers: { 'docker-content-digest': digest } });
  };
  const findings = await scanContainerDependencies('new-user-service', [{ ecosystem: 'Docker', name: 'library/php', version: '8.3.35-cli-bookworm', imageRef: 'php:8.3.35-cli-bookworm', manifestPath: 'Dockerfile', direct: true }]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].fixedVersion, '8.3.36-cli-bookworm');
  assert.equal(findings[0].fixedImageRef, `php:8.3.36-cli-bookworm@${digest}`);
  assert.match(findings[0].summary, /upload_progress/);
});

test('unknown image vendors and incomplete PHP corroboration fail closed', async () => {
  await assert.rejects(scanContainerDependencies('service', [{ ecosystem: 'Docker', name: 'unknown/image', version: '1.0.0', manifestPath: 'compose.yaml', direct: true }]), /unsupported/);
  globalThis.fetch = async () => new Response('8.3.36 only');
  await assert.rejects(scanContainerDependencies('service', [{ ecosystem: 'Docker', name: 'library/php', version: '8.3.35-cli', manifestPath: 'Dockerfile', direct: true }]), /did not corroborate/);
});
