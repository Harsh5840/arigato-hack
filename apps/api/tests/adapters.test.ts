import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { zipSync, strToU8 } from 'fflate';
import { fetchAdvisory } from '../src/adapters/advisory.js';
import { analyzeAdvisory, clearGroqModelCacheForTests, proposeRepair, verifyGroqModels } from '../src/adapters/groq.js';
import { clearGitHubCredentialCacheForTests, dispatchVerification, ensureCandidateBranch, ensureDraftPullRequest, parseEvidenceFiles, readCandidateDiff, waitForVerification } from '../src/adapters/github.js';
import { allowedPaths } from '../src/adapters/types.js';
import { boundedBytes, sha256 } from '../src/adapters/http.js';

const originalFetch = globalThis.fetch;
const keys = ['GROQ_API_KEY', 'GITHUB_TOKEN', 'GH_TOKEN', 'ALLOW_GIT_CREDENTIAL_MANAGER', 'SUPPLY_MODEL', 'FIXER_MODEL', 'REVIEWER_MODEL'] as const;
const environment = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
beforeEach(() => {
  clearGroqModelCacheForTests(); clearGitHubCredentialCacheForTests();
  for (const key of keys) delete process.env[key];
  process.env.ALLOW_GIT_CREDENTIAL_MANAGER = 'false';
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of keys) { if (environment[key] === undefined) delete process.env[key]; else process.env[key] = environment[key]; }
  clearGroqModelCacheForTests(); clearGitHubCredentialCacheForTests();
});

function response(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } }); }
const catalog = { data: [{ id: 'openai/gpt-oss-20b' }, { id: 'openai/gpt-oss-120b' }] };
function completion(data: unknown, model = 'openai/gpt-oss-20b') {
  return { model, choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(data) } }], usage: { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 } };
}

test('missing Groq credentials fail explicitly without a network call or simulated result', async () => {
  globalThis.fetch = async () => { throw new Error('Network must not be called.'); };
  await assert.rejects(verifyGroqModels(), /GROQ_API_KEY is missing/);
});

test('authenticated model discovery refuses unavailable configured model IDs', async () => {
  process.env.GROQ_API_KEY = 'unit-test-placeholder';
  globalThis.fetch = async () => response({ data: [{ id: 'openai/gpt-oss-20b' }] });
  await assert.rejects(verifyGroqModels(), /unavailable.*120b/);
});

test('Supply Chain makes a real-shape strict JSON request and records actual reported token usage', async () => {
  process.env.GROQ_API_KEY = 'unit-test-placeholder';
  const advisory = await fetchAdvisory('cached');
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    if (String(input).endsWith('/models')) return response(catalog);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.stream, false);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.response_format.json_schema.schema.additionalProperties, false);
    assert.equal(body.tools, undefined);
    assert.equal(body.model, 'openai/gpt-oss-20b');
    return response(completion({ summaryEn: 'Declared PHP 8.3.35 matches affected inventory.', summaryJa: '宣言された PHP 8.3.35 は対象です。', affected: true, confidence: 'high' }));
  };
  const result = await analyzeAdvisory(advisory, { runtimeVersion: '8.3.35' });
  assert.equal(result.affected, true);
  assert.equal(result.model, 'openai/gpt-oss-20b');
  assert.equal(result.usage.totalTokens, 200);
  assert.deepEqual(calls, ['https://api.groq.com/openai/v1/models', 'https://api.groq.com/openai/v1/chat/completions']);
});

test('fixer output outside the three-file allowlist is rejected despite syntactically valid JSON', async () => {
  process.env.GROQ_API_KEY = 'unit-test-placeholder';
  const advisory = await fetchAdvisory('cached');
  globalThis.fetch = async (input) => String(input).endsWith('/models') ? response(catalog) : response(completion({
    files: [{ path: 'Dockerfile', content: 'FROM example' }, { path: 'composer.json', content: '{}' }, { path: '.github/workflows/fixture-evidence.yml', content: 'malicious' }],
    summaryEn: 'candidate', summaryJa: '候補', rollbackNotes: [], ownerTasks: [],
  }, 'openai/gpt-oss-120b'));
  await assert.rejects(proposeRepair(advisory, Object.fromEntries(allowedPaths.map((path) => [path, 'baseline']))), /outside the fixture allowlist/);
});

test('live advisory intake requires a feed match and never silently falls back to cache', async () => {
  const calls: string[] = [];
  globalThis.fetch = async (input) => { calls.push(String(input)); return new Response('<rdf><item>unrelated alert</item></rdf>'); };
  await assert.rejects(fetchAdvisory('live'), /No cached fallback was substituted/);
  assert.deepEqual(calls, ['https://www.jpcert.or.jp/rss/jpcert.rdf']);
});

test('live advisory intake fetches only allowlisted official URLs and preserves raw-content digests', async () => {
  const feed = '<rdf><item><link>https://www.jpcert.or.jp/at/2026/at260033.html</link></item></rdf>';
  const notice = '<h1>PHP CVE-2026-109618 CVE-2026-109619</h1><p>8.3.36</p>';
  globalThis.fetch = async (input) => new Response(String(input).endsWith('.rdf') ? feed : notice);
  const advisory = await fetchAdvisory('live');
  assert.equal(advisory.sourceMode, 'live');
  assert.equal(advisory.sources.length, 3);
  assert.equal(advisory.sources[0].sha256, sha256(feed));
  assert.equal(advisory.sources[1].sha256, sha256(notice));
  assert.ok(!advisory.body.includes('<h1>'));
});

test('source redirect cannot move intake to a private or unapproved host', async () => {
  globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/secret' } });
  await assert.rejects(fetchAdvisory('live'), /outside the approved HTTPS host list/);
});

test('untrusted source entities and oversized remote bodies are rejected', async () => {
  globalThis.fetch = async () => new Response('<!ENTITY external SYSTEM "file:///secret"><rdf/>');
  await assert.rejects(fetchAdvisory('live'), /unsupported XML entity/);
  await assert.rejects(boundedBytes(new Response('too long'), 3), /byte limit/);
});

const baseSha = 'a'.repeat(40), headSha = 'b'.repeat(40), verifierSha256 = 'c'.repeat(64);
const runId = 'run_unit_001';
const run = { id: 123, html_url: 'https://github.com/Harsh5840/arigato-php-demo/actions/runs/123', status: 'completed', conclusion: 'success' };
function passingArtifacts(): Record<string, string> {
  const checks = ['docker_parser_directives_absent', 'reviewed_runtime_release', 'reviewed_image_digest', 'composer_floor', 'upload_progress_startup_setting', 'startup_config_is_copied', 'unprivileged_fixture_user'].map((id) => ({ id, pass: true, detail: 'observed' }));
  return {
    'candidate-policy.json': JSON.stringify({ base_sha: baseSha, candidate_sha: headSha, verifier_sha256: verifierSha256, changed_paths: [...allowedPaths], assessment: { security_policy: 'PASS', checks } }),
    'runtime-probe.json': JSON.stringify({ php_version: '8.3.36', upload_progress_enabled: '0', serialize_handler: 'php', checks: { runtime_matches_reviewed_release: true, upload_progress_disabled_at_startup: true, expected_serializer: true } }),
    'business-checks.txt': [...Array.from({ length: 15 }, (_, index) => `PASS: business assertion ${index + 1}`), '15 business checks passed.'].join('\n'),
    'built-image-id.txt': `sha256:${'d'.repeat(64)}\n`,
    'run-provenance.json': JSON.stringify({ proofpatch_run_id: runId, github_run_id: String(run.id), workflow_sha: baseSha, base_sha: baseSha, candidate_sha: headSha, verifier_sha256: verifierSha256, model_execution: 'NOT_ATTESTED_BY_CI', merge_ready: false, finding_closed: false }),
  };
}
const expected = { runId, baseSha, headSha, verifierSha256 };

test('complete hosted artifacts pass while stale evidence, missing runtime and incorrect actual values fail closed', () => {
  const good = parseEvidenceFiles(passingArtifacts(), run, expected);
  assert.ok(good.checks.every((check) => check.status === 'passed'));
  const stale = parseEvidenceFiles(passingArtifacts(), run, { ...expected, headSha: 'f'.repeat(40) });
  assert.equal(stale.checks.find((check) => check.id === 'evidence_identity')?.status, 'failed');
  assert.equal(stale.checks.find((check) => check.id === 'workflow_provenance')?.status, 'failed');
  const missing = passingArtifacts(); delete missing['runtime-probe.json'];
  assert.equal(parseEvidenceFiles(missing, run, expected).checks.find((check) => check.id === 'runtime_execution')?.status, 'not-run');
  const contradictory = passingArtifacts();
  contradictory['runtime-probe.json'] = contradictory['runtime-probe.json'].replace('8.3.36', '8.3.35');
  assert.equal(parseEvidenceFiles(contradictory, run, expected).checks.find((check) => check.id === 'runtime_runtime_matches_reviewed_release')?.status, 'failed');
});

test('a green workflow cannot hide missing policy assertions, changed scope or missing provenance', () => {
  const files = passingArtifacts();
  const policy = JSON.parse(files['candidate-policy.json']);
  policy.assessment.checks = [{ id: 'invented', pass: true }];
  policy.changed_paths.push('verification/policy.mjs');
  files['candidate-policy.json'] = JSON.stringify(policy);
  delete files['run-provenance.json'];
  const evidence = parseEvidenceFiles(files, run, expected);
  assert.equal(evidence.checks.find((check) => check.id === 'candidate_policy')?.status, 'failed');
  assert.equal(evidence.checks.find((check) => check.id === 'workflow_provenance')?.status, 'not-run');
  assert.equal(evidence.checks.filter((check) => check.id.startsWith('policy_') && check.status === 'failed').length, 7);
});

test('artifact download authenticates GitHub only and verifies controller, Actions and artifact identities', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  const files = passingArtifacts();
  const zipped = zipSync(Object.fromEntries(Object.entries(files).map(([name, content]) => [name, strToU8(content)])));
  let storageRequested = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('.blob.core.windows.net/')) {
      storageRequested = true;
      assert.equal(new Headers(init?.headers).get('authorization'), null);
      return new Response(zipped);
    }
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer unit-test-placeholder');
    if (url.includes('/fixture-evidence.yml/runs?')) return response({ workflow_runs: [{ ...run, display_title: `ProofPatch ${runId}`, created_at: new Date().toISOString(), event: 'workflow_dispatch' }] });
    if (url.endsWith('/jobs?per_page=20')) return response({ jobs: [{ steps: [{ name: 'PHP verification', status: 'completed', conclusion: 'success' }] }] });
    if (url.endsWith('/artifacts?per_page=30')) return response({ artifacts: [{ id: 9, name: `candidate-evidence-${headSha}`, expired: false, size_in_bytes: zipped.length, digest: `sha256:${sha256(zipped)}` }] });
    if (url.endsWith('/artifacts/9/zip')) return new Response(null, { status: 302, headers: { location: 'https://fixture.blob.core.windows.net/evidence/file.zip?signed=unit-test' } });
    throw new Error(`Unexpected mocked URL: ${url}`);
  };
  const evidence = await waitForVerification({ ...expected, startedAt: new Date().toISOString() }, () => undefined);
  assert.equal(storageRequested, true);
  assert.equal(evidence.artifactSha256, sha256(zipped));
  assert.ok(evidence.checks.every((check) => check.status === 'passed'));
});

test('draft publication returns the exact existing open draft without a duplicate external write', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  let writes = 0;
  globalThis.fetch = async (input, init) => {
    if (init?.method !== 'GET') writes++;
    if (String(input).includes('/git/ref/heads/')) return response({ object: { sha: headSha } });
    return response([{ html_url: 'https://github.com/Harsh5840/arigato-php-demo/pull/7', number: 7, draft: true, state: 'open', merged_at: null, head: { ref: 'proofpatch/unit-run', sha: headSha } }]);
  };
  const result = await ensureDraftPullRequest({ branch: 'proofpatch/unit-run', title: 'Review candidate', body: 'Evidence and remaining human tasks.', expectedHeadSha: headSha });
  assert.equal(result.reused, true);
  assert.equal(result.draft, true);
  assert.equal(writes, 0);
});

test('draft publication rejects a moved branch before attempting PR creation', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  let writes = 0;
  globalThis.fetch = async (_input, init) => {
    if (init?.method !== 'GET') writes++;
    return response({ object: { sha: 'e'.repeat(40) } });
  };
  await assert.rejects(ensureDraftPullRequest({ branch: 'proofpatch/unit-run', title: 'Review candidate', body: 'Evidence.', expectedHeadSha: headSha }), /branch moved after verification/);
  assert.equal(writes, 0);
});

test('draft publication rechecks head immediately before creation and rejects a lookup-time race', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  let refReads = 0, writes = 0;
  globalThis.fetch = async (input, init) => {
    if (init?.method !== 'GET') writes++;
    if (String(input).includes('/git/ref/heads/')) return response({ object: { sha: ++refReads === 1 ? headSha : 'e'.repeat(40) } });
    return response([]);
  };
  await assert.rejects(ensureDraftPullRequest({ branch: 'proofpatch/unit-run', title: 'Review candidate', body: 'Evidence.', expectedHeadSha: headSha }), /branch moved after verification/);
  assert.equal(refReads, 2);
  assert.equal(writes, 0);
});

test('an existing stale-head, closed, merged or promoted PR cannot be reused as a verified draft', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  const valid = { html_url: 'https://github.com/Harsh5840/arigato-php-demo/pull/7', number: 7, draft: true, state: 'open', merged_at: null, head: { ref: 'proofpatch/unit-run', sha: headSha } };
  const rejected = [
    { ...valid, head: { ...valid.head, sha: 'e'.repeat(40) } },
    { ...valid, state: 'closed' },
    { ...valid, state: 'closed', merged_at: new Date().toISOString() },
    { ...valid, draft: false },
  ];
  for (const pullRequest of rejected) {
    let writes = 0;
    globalThis.fetch = async (input, init) => {
      if (init?.method !== 'GET') writes++;
      return String(input).includes('/git/ref/heads/') ? response({ object: { sha: headSha } }) : response([pullRequest]);
    };
    await assert.rejects(ensureDraftPullRequest({ branch: 'proofpatch/unit-run', title: 'Review candidate', body: 'Evidence.', expectedHeadSha: headSha }), /does not match the verified candidate|closed, merged or no longer a draft/);
    assert.equal(writes, 0);
  }
});

test('new draft creation verifies GitHub response head and cannot report stale evidence as successful', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  let writes = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes('/git/ref/heads/')) return response({ object: { sha: headSha } });
    if (init?.method === 'GET') return response([]);
    writes++;
    return response({ html_url: 'https://github.com/Harsh5840/arigato-php-demo/pull/8', number: 8, draft: true, state: 'open', merged_at: null, head: { ref: 'proofpatch/unit-run', sha: 'e'.repeat(40) } });
  };
  await assert.rejects(ensureDraftPullRequest({ branch: 'proofpatch/unit-run', title: 'Review candidate', body: 'Evidence.', expectedHeadSha: headSha }), /does not match the verified candidate/);
  assert.equal(writes, 1);
});

test('cancellation after branch reads blocks the PR at the immediate write boundary', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  let writes = 0, reads = 0, callbackCalls = 0;
  globalThis.fetch = async (input, init) => {
    if (init?.method === 'POST') writes++;
    reads++;
    return String(input).includes('/git/ref/heads/') ? response({ object: { sha: headSha } }) : response([]);
  };
  await assert.rejects(ensureDraftPullRequest({ branch: 'proofpatch/unit-run', title: 'Review candidate', body: 'Evidence.', expectedHeadSha: headSha, beforeWrite: () => { callbackCalls++; throw new Error('Controller cancelled.'); } }), /Controller cancelled/);
  assert.equal(reads, 3);
  assert.equal(callbackCalls, 1);
  assert.equal(writes, 0);
});

test('cancellation blocks all candidate blob writes after an awaited absent-branch lookup', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  let writes = 0;
  globalThis.fetch = async (_input, init) => {
    if (init?.method === 'POST') { writes++; return response({ sha: headSha }); }
    return response({ message: 'Not found' }, 404);
  };
  await assert.rejects(ensureCandidateBranch({ sha: baseSha, treeSha: '9'.repeat(40), files: {}, verifierSha256 }, { files: allowedPaths.map((path) => ({ path, content: 'scoped repair' })) }, 'proofpatch/unit-run', undefined, () => { throw new Error('Controller cancelled.'); }), /Controller cancelled/);
  assert.equal(writes, 0);
});

test('every candidate blob, tree, commit and ref write invokes the controller guard locally', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  let writes = 0, guards = 0;
  globalThis.fetch = async (_input, init) => {
    if (init?.method !== 'POST') return response({ message: 'Not found' }, 404);
    writes++;
    const body = JSON.parse(String(init.body));
    assert.equal(body.beforeWrite, undefined);
    assert.equal(guards, writes);
    return response({ sha: headSha });
  };
  await ensureCandidateBranch({ sha: baseSha, treeSha: '9'.repeat(40), files: {}, verifierSha256 }, { files: allowedPaths.map((path) => ({ path, content: 'scoped repair' })) }, 'proofpatch/unit-run', undefined, () => { guards++; });
  assert.equal(writes, 6);
  assert.equal(guards, 6);
});

test('workflow dispatch guard rejects persisted cancellation before the external POST', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  let requests = 0;
  globalThis.fetch = async () => { requests++; return new Response(null, { status: 204 }); };
  await assert.rejects(dispatchVerification({ baseSha, headSha, runId, beforeWrite: () => { throw new Error('Controller cancelled.'); } }), /Controller cancelled/);
  assert.equal(requests, 0);
});

test('candidate diff returns only the immutable stored comparison and reports missing patches', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), `https://api.github.com/repos/Harsh5840/arigato-php-demo/compare/${baseSha}...${headSha}`);
    assert.equal(init?.method, 'GET');
    return response({ base_commit: { sha: baseSha }, merge_base_commit: { sha: baseSha }, total_commits: 1, commits: [{ sha: headSha }], files: allowedPaths.map((filename, index) => ({ filename, status: 'modified', additions: 1, deletions: 1, ...(index ? { patch: '@@ -1 +1 @@\n-old\n+new' } : {}) })) });
  };
  const diff = await readCandidateDiff(baseSha, headSha);
  assert.equal(diff.truncated, true);
  assert.equal(diff.files.length, 3);
  assert.equal(diff.files[0].patch, '');
  assert.match(diff.compareUrl, new RegExp(`${headSha}$`));
});

test('candidate diff rejects stale identities and paths outside the repair scope', async () => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  const comparison = { base_commit: { sha: baseSha }, merge_base_commit: { sha: baseSha }, total_commits: 1, commits: [{ sha: headSha }], files: allowedPaths.map((filename) => ({ filename, status: 'modified', additions: 1, deletions: 1, patch: '@@ -1 +1 @@\n-old\n+new' })) };
  globalThis.fetch = async () => response({ ...comparison, commits: [{ sha: 'f'.repeat(40) }] });
  await assert.rejects(readCandidateDiff(baseSha, headSha), /identities/);
  globalThis.fetch = async () => response({ ...comparison, files: [{ ...comparison.files[0], filename: '.env' }, ...comparison.files.slice(1)] });
  await assert.rejects(readCandidateDiff(baseSha, headSha), /unexpected path/);
});
