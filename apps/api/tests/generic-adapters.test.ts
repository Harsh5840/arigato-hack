import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { sha256 } from '../src/adapters/http.js';
import { clearGitHubCredentialCacheForTests } from '../src/adapters/github.js';
import { parseInventoryFiles } from '../src/adapters/inventory.js';
import { ensureRepositoryCandidate, ensureRepositoryDraftPullRequest, parseRepository, parseRepositoryEvidence, readRepository, readRepositoryCandidateDiff, type RepositoryVerificationInput } from '../src/adapters/repository.js';
import { fetchForumLeads, forumFeeds, parseForumFeed, scanDependencies, selectPublishedSafeVersion } from '../src/adapters/supply-sources.js';

const originalFetch = globalThis.fetch;
const originalToken = process.env.GITHUB_TOKEN, originalManager = process.env.ALLOW_GIT_CREDENTIAL_MANAGER;
beforeEach(() => { process.env.GITHUB_TOKEN = 'unit-test-placeholder'; process.env.ALLOW_GIT_CREDENTIAL_MANAGER = 'false'; clearGitHubCredentialCacheForTests(); });
afterEach(() => { globalThis.fetch = originalFetch; if (originalToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = originalToken; if (originalManager === undefined) delete process.env.ALLOW_GIT_CREDENTIAL_MANAGER; else process.env.ALLOW_GIT_CREDENTIAL_MANAGER = originalManager; clearGitHubCredentialCacheForTests(); });
function response(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } }); }
const baseSha = 'a'.repeat(40), headSha = 'b'.repeat(40), treeSha = 'c'.repeat(40), verifierSha256 = sha256('frozen-test-oracle');
const repo = { owner: 'example', name: 'python-service', defaultBranch: 'main' };
const dependency = { ecosystem: 'PyPI' as const, name: 'requests', version: '2.31.0', manifestPath: 'requirements.txt', direct: true };

test('repository onboarding rejects non-GitHub hosts, credentials and non-root URLs', () => {
  assert.deepEqual(parseRepository('https://github.com/example/service.git'), { owner: 'example', name: 'service' });
  for (const url of ['http://github.com/example/service', 'https://github.com.evil.test/example/service', 'https://user:secret@github.com/example/service', 'https://github.com/example/service/tree/main', 'https://github.com/example/service?token=secret', 'https://localhost/example/service']) assert.throws(() => parseRepository(url));
});

test('nested exact dependency inventories preserve ecosystem and source provenance', () => {
  const parsed = parseInventoryFiles({
    'services/pay/requirements.txt': 'Requests==2.31.0\nDjango>=4.2\n-r shared.txt\ncertifi==2024.2.2; python_version > "3.8"\n',
    'ui/package-lock.json': JSON.stringify({ packages: { '': { dependencies: { lodash: '^4' } }, 'node_modules/lodash': { version: '4.17.20' }, 'node_modules/lodash/node_modules/debug': { version: '2.6.9' } } }),
    'legacy/composer.lock': JSON.stringify({ packages: [{ name: 'symfony/http-foundation', version: 'v6.4.0' }] }),
    'node_modules/ignored/requirements.txt': 'malicious==1.0.0',
  });
  assert.equal(parsed.inventory.length, 4);
  assert.deepEqual(parsed.inventory.find((item) => item.name === 'requests'), { ...dependency, manifestPath: 'services/pay/requirements.txt' });
  assert.equal(parsed.inventory.find((item) => item.name === 'debug')?.direct, false);
  assert.equal(parsed.inventory.find((item) => item.name === 'lodash')?.direct, true);
  assert.equal(parsed.inventory.find((item) => item.ecosystem === 'Packagist')?.version, '6.4.0');
  assert.ok(parsed.warnings.some((warning) => warning.includes('unresolved constraint')));
});

test('inventory limits and unsafe paths fail instead of silently dropping dependencies', () => {
  assert.throws(() => parseInventoryFiles({ 'requirements.txt': Array.from({ length: 1001 }, (_, index) => `package${index}==1.0.0`).join('\n') }), /1000 exact/);
  assert.throws(() => parseInventoryFiles({ '../requirements.txt': 'requests==2.31.0' }), /unsafe path/);
  assert.throws(() => parseInventoryFiles({ 'requirements.txt': '#'.repeat(1_000_001) }), /one-megabyte/);
});

test('repository discovery reads bounded manifests at the frozen default-branch commit', async () => {
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input); calls.push(url);
    if (url.endsWith('/python-service')) return response({ default_branch: 'main', permissions: { push: true } });
    if (url.endsWith('/commits/main')) return response({ sha: baseSha, commit: { tree: { sha: treeSha } } });
    if (url.includes('/git/trees/')) return response({ truncated: false, tree: [{ path: 'requirements.txt', type: 'blob', mode: '100644', size: 17 }, { path: 'README.md', type: 'blob', mode: '100644', size: 100 }] });
    assert.ok(url.endsWith(`/contents/requirements.txt?ref=${baseSha}`));
    return response({ type: 'file', encoding: 'base64', size: 17, content: Buffer.from('requests==2.31.0\n').toString('base64') });
  };
  const snapshot = await readRepository('https://github.com/example/python-service');
  assert.equal(snapshot.sha, baseSha); assert.equal(snapshot.canPush, true); assert.deepEqual(snapshot.inventory, [dependency]);
  assert.equal(calls.length, 4);
});

test('truncated repository trees are not represented as a complete clean scan', async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/python-service')) return response({ default_branch: 'main' });
    if (url.endsWith('/commits/main')) return response({ sha: baseSha, commit: { tree: { sha: treeSha } } });
    return response({ truncated: true, tree: [] });
  };
  await assert.rejects(readRepository(repo), /truncated/);
});

test('OSV-correlated findings use published, unyanked, same-major releases independently re-queried for vulnerabilities', async () => {
  const batches: string[][] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/querybatch')) {
      const queries = JSON.parse(String(init?.body)).queries;
      batches.push(queries.map((query: { version: string }) => query.version));
      return response({ results: queries.map((query: { version: string }) => query.version === '2.31.0' || query.version === '2.34.0' ? { vulns: [{ id: 'GHSA-test-test-test' }] } : {}) });
    }
    if (url.includes('/vulns/')) return response({ id: 'GHSA-test-test-test', aliases: ['CVE-2024-35195'], summary: 'Session TLS verification issue', affected: [{ package: { ecosystem: 'PyPI', name: 'requests' }, ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '2.32.0' }] }] }], references: [{ type: 'ADVISORY', url: 'https://github.com/psf/requests/security/advisories/GHSA-test-test-test' }] });
    assert.equal(url, 'https://pypi.org/pypi/requests/json');
    return response({ releases: { '2.32.0': [{ yanked: false }], '2.33.0': [{ yanked: true }], '2.34.0': [{ yanked: false }], '3.0.0': [{ yanked: false }], '2.99.0rc1': [{ yanked: false }] } });
  };
  const findings = await scanDependencies('repo-unit', [dependency]);
  assert.equal(findings[0].fixedVersion, '2.32.0');
  assert.equal(findings[0].status, 'detected');
  assert.deepEqual(batches, [['2.31.0'], ['2.34.0', '2.32.0']]);
  assert.ok(findings[0].references[0].url.startsWith('https://osv.dev/'));
  const again = await scanDependencies('repo-unit', [dependency]);
  assert.equal(findings[0].id, again[0].id);
});

test('missing authoritative same-major fix becomes owner work and never an invented version', async () => {
  globalThis.fetch = async () => response({ releases: { '3.0.0': [{ yanked: false }], '2.32.0': [{ yanked: true }] } });
  assert.equal(await selectPublishedSafeVersion(dependency), '');
});

test('GHSA and PYSEC mirrors with shared CVE aliases become one finding', async () => {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/querybatch')) {
      const queries = JSON.parse(String(init?.body)).queries;
      return response({ results: queries.map((query: { version: string }) => query.version === dependency.version ? { vulns: [{ id: 'PYSEC-2026-1' }, { id: 'GHSA-abcd-abcd-abcd' }] } : {}) });
    }
    if (url.includes('/vulns/')) {
      const id = url.split('/').at(-1)!;
      return response({ id, aliases: ['CVE-2026-12345', id.startsWith('GHSA-') ? 'PYSEC-2026-1' : 'GHSA-abcd-abcd-abcd'], affected: [{ package: { ecosystem: 'PyPI', name: 'requests' } }] });
    }
    return response({ releases: { '2.34.2': [{ yanked: false }] } });
  };
  const findings = await scanDependencies('repo-unit', [dependency]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].advisoryId, 'GHSA-abcd-abcd-abcd');
});

test('OSV pagination and unavailable authoritative services fail explicitly', async () => {
  globalThis.fetch = async () => response({ results: [{ next_page_token: 'more', vulns: [] }] });
  await assert.rejects(scanDependencies('repo-unit', [dependency]), /paginated/);
  globalThis.fetch = async () => response({ error: 'unavailable' }, 503);
  await assert.rejects(scanDependencies('repo-unit', [dependency]), /503/);
});

test('OSV scans preserve all dependencies while splitting requests into batches of at most 100', async () => {
  const batches: string[][] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://api.osv.dev/v1/querybatch');
    const queries = JSON.parse(String(init?.body)).queries as {package: {name: string}}[];
    batches.push(queries.map(query => query.package.name));
    return response({results: queries.map(() => ({}))});
  };
  const inventory = Array.from({length: 205}, (_, index) => ({...dependency, name: `package${index}`}));
  assert.deepEqual(await scanDependencies('repo-unit', inventory), []);
  assert.deepEqual(batches.map(batch => batch.length), [100, 100, 5]);
  assert.deepEqual(batches.flat(), inventory.map(item => item.name));
});

test('forum leads are unconfirmed, reject external links and refuse XML entity declarations', () => {
  const feed = forumFeeds[0];
  const leads = parseForumFeed('<rss><item><title>Security issue CVE-2026-12345</title><link>https://discuss.python.org/t/security/100</link><description>Investigate requests</description></item><item><title>Exploit</title><link>https://evil.test/payload</link></item></rss>', feed);
  assert.equal(leads.length, 1); assert.equal(leads[0].trust, 'unconfirmed'); assert.deepEqual(leads[0].aliases, ['CVE-2026-12345']);
  assert.throws(() => parseForumFeed('<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///secret">]><rss/>', feed), /forbidden/);
});

test('forum feed errors remain visible independently and redirects never leave the allowlist', async () => {
  globalThis.fetch = async (input, init) => { assert.equal(init?.redirect, 'error'); if (String(input).includes('discuss.python')) return new Response('<rss/>'); return response({}, 503); };
  const result = await fetchForumLeads();
  assert.equal(result.leads.length, 0); assert.deepEqual(result.errors, [{ source: 'github-advisories', message: 'Feed returned HTTP 503.' }]);
});

const expected: RepositoryVerificationInput = { workflow: 'proofpatch-verify.yml', runId: 'run-unit', baseSha, headSha, startedAt: '2026-10-25T00:00:00Z', verifierSha256, requiredCheckIds: ['scope', 'business_suite'] };
function evidence() { return { run_id: expected.runId, base_sha: baseSha, candidate_sha: headSha, verifier_sha256: verifierSha256, workflow_sha: baseSha, github_run_id: '42', checks: [{ id: 'scope', label: 'Repair scope', pass: true, detail: 'Only approved files changed.' }, { id: 'business_suite', label: 'Business regression', pass: true, detail: 'Frozen business assertions passed.' }] }; }
const run = { id: 42, html_url: 'https://github.com/example/python-service/actions/runs/42', status: 'completed', conclusion: 'success', head_sha: baseSha };

test('generic evidence binds successful frozen checks to exact run, workflow, candidate and oracle identities', () => {
  const parsed = parseRepositoryEvidence({ 'verification.json': JSON.stringify(evidence()) }, run, expected);
  assert.ok(parsed.checks.every((check) => check.status === 'passed'));
  assert.equal(parsed.candidateSha, headSha);
  for (const key of ['run_id', 'base_sha', 'candidate_sha', 'verifier_sha256', 'workflow_sha', 'github_run_id']) {
    const changed = { ...evidence(), [key]: 'wrong' };
    assert.equal(parseRepositoryEvidence({ 'verification.json': JSON.stringify(changed) }, run, expected).checks.find((check) => check.id === 'evidence_identity')?.status, 'failed');
  }
});

test('empty or duplicated runner assertions cannot authorize a PR despite a green job', () => {
  for (const checks of [[], [evidence().checks[0]], [evidence().checks[0], evidence().checks[0]]]) {
    const value = { ...evidence(), checks };
    assert.equal(parseRepositoryEvidence({ 'verification.json': JSON.stringify(value) }, run, expected).checks.find((check) => check.id === 'evidence_schema')?.status, 'failed');
  }
  assert.equal(parseRepositoryEvidence({}, run, expected).checks.find((check) => check.id === 'evidence_identity')?.status, 'failed');
});

test('generic candidate writers prohibit workflow/verifier mutation before any network write', async () => {
  globalThis.fetch = async () => { throw new Error('No network operation is permitted.'); };
  await assert.rejects(ensureRepositoryCandidate(repo, { sha: baseSha, treeSha }, { files: [{ path: '.github/workflows/backdoor.yml', content: 'x' }] }, 'proofpatch/unit-test'), /Trusted verifiers/);
  await assert.rejects(ensureRepositoryCandidate(repo, { sha: baseSha, treeSha }, { files: [{ path: 'verification/business.py', content: 'pass' }] }, 'proofpatch/unit-test'), /Trusted verifiers/);
});

test('draft publication refuses a candidate that moved after verification', async () => {
  let writes = 0;
  globalThis.fetch = async (_input, init) => { if (init?.method === 'POST') writes++; return response({ object: { sha: 'd'.repeat(40) } }); };
  await assert.rejects(ensureRepositoryDraftPullRequest(repo, { branch: 'proofpatch/unit-test', title: 'Fix dependency', body: 'Human review required.', expectedHeadSha: headSha }), /moved after verification/);
  assert.equal(writes, 0);
});

test('candidate writers accept bounded generated lockfiles larger than source files', async () => {
  for (const path of ['package-lock.json', 'services/pay/composer.lock']) {
    const writes: {path:string;body:Record<string,unknown>}[]=[];
    globalThis.fetch=async(input,init)=>{
      const url=String(input);
      if(init?.method!=='POST')return response({message:'Not Found'},404);
      writes.push({path:url,body:JSON.parse(String(init.body))});
      if(url.endsWith('/git/blobs'))return response({sha:'d'.repeat(40)});
      if(url.endsWith('/git/trees'))return response({sha:treeSha});
      if(url.endsWith('/git/commits'))return response({sha:headSha});
      assert.ok(url.endsWith('/git/refs'));return response({ref:'refs/heads/proofpatch/big-lock'});
    };
    const content=JSON.stringify({lockfileVersion:3,padding:'a'.repeat(250_000)});
    const result=await ensureRepositoryCandidate(repo,{sha:baseSha,treeSha},{files:[{path,content}]},'proofpatch/big-lock');
    assert.equal(result.sha,headSha);
    assert.equal(writes.find(write=>write.path.endsWith('/git/blobs'))?.body.content,content);
    assert.equal(writes.length,4);
  }
});

test('large non-lock files, UTF-8 byte overflow, unsafe lock paths and aggregate overflow fail before network', async()=>{
  globalThis.fetch=async()=>{throw new Error('Network must not run for rejected candidate scope.');};
  const rejected=[
    [{path:'src/service.ts',content:'a'.repeat(100_001)}],
    [{path:'package-lock.json.backup',content:'a'.repeat(100_001)}],
    [{path:'src/service.ts',content:'東'.repeat(40_000)}],
    [{path:'../package-lock.json',content:'a'.repeat(250_000)}],
    [{path:'package-lock.json',content:'a'.repeat(1_000_000)}],
    [{path:'package-lock.json',content:'a'.repeat(600_000)},{path:'services/pay/composer.lock',content:'b'.repeat(450_000)}],
  ];
  for(const files of rejected)await assert.rejects(ensureRepositoryCandidate(repo,{sha:baseSha,treeSha},{files},'proofpatch/reject-size'),/allowed source\/manifest repair scope/);
});

function comparison(overrides:Record<string,unknown>={}){
  return {base_commit:{sha:baseSha},merge_base_commit:{sha:baseSha},total_commits:1,commits:[{sha:headSha}],files:[{filename:'package-lock.json',status:'modified',additions:1200,deletions:1150,patch:'+'.repeat(100_000)}],...overrides};
}
test('large displayed lock patches are omitted while immutable comparison validation stays mandatory',async()=>{
  globalThis.fetch=async()=>response(comparison());
  const diff=await readRepositoryCandidateDiff(repo,baseSha,headSha);
  assert.equal(diff.truncated,true);assert.equal(diff.files[0].patch,'');
  assert.equal(diff.files[0].additions,1200);assert.equal(diff.baseSha,baseSha);assert.equal(diff.candidateSha,headSha);
  const invalid=[
    {base_commit:{sha:'d'.repeat(40)}},
    {merge_base_commit:{sha:'d'.repeat(40)}},
    {total_commits:2},
    {commits:[{sha:'d'.repeat(40)}]},
    {files:[{filename:'../package-lock.json',status:'modified',additions:1,deletions:0,patch:'+'.repeat(100_000)}]},
    {files:[{filename:'package-lock.json',status:'renamed',additions:1,deletions:0,patch:'+'.repeat(100_000)}]},
    {files:[{filename:'package-lock.json',status:'modified',additions:-1,deletions:0,patch:'+'.repeat(100_000)}]},
  ];
  for(const value of invalid){globalThis.fetch=async()=>response(comparison(value));await assert.rejects(readRepositoryCandidateDiff(repo,baseSha,headSha));}
});

test('large-patch candidate branch reuse still verifies exact lockfile bytes without force-pushing',async()=>{
  const content=JSON.stringify({lockfileVersion:3,padding:'a'.repeat(250_000)});
  let currentContent=content,writes=0;
  globalThis.fetch=async(input,init)=>{
    if(init?.method==='POST'){writes++;throw new Error('Existing candidate must not be mutated.');}
    const url=String(input);
    if(url.includes('/git/ref/heads/'))return response({object:{sha:headSha}});
    if(url.includes('/git/commits/'))return response({parents:[{sha:baseSha}]});
    if(url.includes('/compare/'))return response(comparison());
    assert.ok(url.endsWith(`/contents/package-lock.json?ref=${headSha}`));
    return response({type:'file',encoding:'base64',size:Buffer.byteLength(currentContent),content:Buffer.from(currentContent).toString('base64')});
  };
  const repair={files:[{path:'package-lock.json',content}]};
  assert.equal((await ensureRepositoryCandidate(repo,{sha:baseSha,treeSha},repair,'proofpatch/reused-lock')).sha,headSha);
  currentContent=content.replace('lockfileVersion', 'lockfileVersioN');
  await assert.rejects(ensureRepositoryCandidate(repo,{sha:baseSha,treeSha},repair,'proofpatch/reused-lock'),/content differs/);
  assert.equal(writes,0);
});
