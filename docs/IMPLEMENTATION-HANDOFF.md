# Implementation handoff

Updated **25 October 2026 (Asia/Calcutta)**. Current implementation: generic stack/test discovery, scheduled repository monitoring, actual LangGraph/LangChain Groq agents and a central exact-candidate verifier. Automatic repair is based on exact package/manifest capability and permissions, rather than repository owner or name. One dashboard retains the established visual flow with simpler labels, grouped advisory evidence, real tests, diffs and human PR handoff.

## Current generic repair architecture

- Up to 20 registered GitHub repositories and 1,000 exact dependencies per inventory. OSV queries use batches of at most 100. Missing sources, unresolved declarations and truncated trees remain visible.
- Any qualifying public repository name can use supported exact PyPI requirements, direct npm/Composer dependencies with locks, or official PHP/nginx Dockerfile/Compose image references. Baseline test discovery advertises exact ecosystem/package/manifest targets. A tested service does not grant capability to an untested manifest elsewhere in a monorepo.
- New supported connections default to automatic draft preparation; existing settings survive reconnect. Read-only access, missing/empty suites, unknown stacks and private central checkout remain explicit boundaries. Private inventory may use granted server access, but generic repair currently requires anonymous public checkout.
- The shared ten-node LangGraph uses actual `ChatGroq` supply, fixer and senior-review contexts. Scope, tests and publication remain deterministic controller decisions. A maximum of two candidate attempts, five repair role calls and 16 minutes bounds a run. Worker loss fails closed rather than replaying external writes automatically.
- `.github/workflows/repository-repair.yml` in `arigato-hack` supplies the trusted verifier. Target repositories need no custom ProofPatch workflow. Central workflow SHA, target baseline/candidate SHA, graph attempt, Actions ID, verifier and artifact digests are bound together.
- npm and Composer use two phases: the real package manager resolves a lock artifact without hooks/plugins, then final verification runs against the committed candidate. Models cannot invent lock integrity data. Application source is excluded during dependency downloads. Frozen application tests run in isolated, non-root, read-only containers without external network, credentials or a Docker socket.
- Containers receive real Trivy scans of baseline and candidate plus supported vendor-CVE corroboration. The affected image is never executed. Selected CVEs still reported in the candidate block publication. Residual image findings and scanner coverage gaps remain visible for human review.
- Final scope, frozen verifier, actual version, business-suite and advisory checks plus separate senior review precede an open draft at the verified head. Human merge, deployment and running-environment verification remain required. `mergeReady` and `findingClosed` remain false.

## Three-repository central-runner acceptance

| Target | Current recorded result |
|---|---|
| [Python](https://github.com/Harsh5840/arigato-python-demo) | Completed generic run `85a102f8-c69a-424d-8f0d-8a5b653bf816`, [central CI 40128567277](https://github.com/Harsh5840/arigato-hack/actions/runs/40128567277), candidate `2291e66959c292547792346e77c88b8d25c8685c`, [real draft PR #2](https://github.com/Harsh5840/arigato-python-demo/pull/2). Twelve actual Japanese business assertions passed. |
| [Container YAML](https://github.com/Harsh5840/arigato-container-demo) | Completed generic run `1159357a-7e93-4c2d-ab11-efa91a56aa59`, [central CI 40128986019](https://github.com/Harsh5840/arigato-hack/actions/runs/40128986019), candidate `0300b01cedd3133c42e95176d0d5c8087e19cdcd`, [real draft PR #1](https://github.com/Harsh5840/arigato-container-demo/pull/1). Seven live HTTP assertions and 11 controller/runner gates passed. Three Groq calls reported 7,136 tokens. |
| [PHP](https://github.com/Harsh5840/arigato-php-demo) | Completed generic run `00cd66dd-c269-4b93-83a3-c690fb8f8932`, [central CI 40129110636](https://github.com/Harsh5840/arigato-hack/actions/runs/40129110636), candidate `870aea9893c3d7c6341938c0b76541ee2125bad0`, [real draft PR #6](https://github.com/Harsh5840/arigato-php-demo/pull/6). PHP 8.3.36 passed 15 storefront assertions and 11 controller/runner gates. Three real Groq calls reported 6,210 tokens. |

The container repository's baseline is `db7ecf6797233e222fa554139fb588bc156f0e32`. Its Compose `image:` reference is the judge-friendly diff. Explain it as “change one YAML image reference, test live HTTP, review the actual draft PR.” The generic PHP update changes the image only; INI, startup/web configuration and incident follow-up remain human tasks.

The completed container diff selects `nginx:1.30.6@sha256:a7675fcee220f59b4a99f7098c06a0d5d999c2c0ee37c0211efb780536e5cb20` from nginx 1.26.0. Its frozen verifier is `2e6350b66f08e02ab2d8906c590dd667fe5173694f5192d6d4029fb601a88474`; the downloaded artifact digest is `1e9e32c47466ee9ca0a4e2d85b0f67d6be3cc37893adae0563ccba2f5c5f2f7f`. [The saved run](../output/live-runs/1159357a-7e93-4c2d-ab11-efa91a56aa59/run.json) preserves actual Trivy output: 831 baseline and 391 candidate findings across all severities. These are scanner entries, not unique CVE counts. Residuals remain for human review; the image is not declared clean.

The completed PHP diff selects `php:8.3.36-cli-bookworm@sha256:cdb77e306d6bb99db40e513fbe036ecc6c53b575cbcb7e581387845fef26d755`. Its frozen verifier is `7533060350490af1a82ecf0fda5d19427dd76e81a68d6ef15d2dc1983942813c`; artifact digest `aaf18e908c2f03fca2efc908a2942f38679e08ee4cb0d396cfa1055665b20f54`. [The saved generic PHP run](../output/live-runs/00cd66dd-c269-4b93-83a3-c690fb8f8932/run.json) records an image-only Dockerfile change. This does not claim deployed INI/web configuration or incident response is complete.

**PHP target CI remains red:** [Fixture evidence run 40129179437](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40129179437) fails its legacy policy before building. Its `ci-candidate` policy expects the previous three-file runtime/configuration repair, while [central run 40129110636](https://github.com/Harsh5840/arigato-hack/actions/runs/40129110636) verifies the current image-only change and passed 15 assertions. These are separate results. Before merge, the human owner must reconcile that policy and the INI/web follow-ups. The failing check remains visible; all CI is not green.

Initial central attempts that failed a tool-output or runtime-permission boundary remain stored as blocked records. They did not authorize PRs. Use actual final run IDs and output bundles when describing completed execution; a passing CI alone is not a completed senior-review/publication flow.

## Current release verification status

Final root tests and type checks passed: 125 API tests and 21 frontend tests, 146 total. The optimized Next production build passed after the final repair-strip label removal. The updated dev stack was restarted. Ten valid PNGs in `apps/web/.impeccable/review/generic-autofix` include the nine original desktop/mobile captures and mobile repair confirmation. Browser checks recorded zero errors, with only the standard reduced-motion informational warning. The fresh `generic-autofix/VERDICT.md` disposition is **SHIP**, scoped to the two scored corrections: stale design documentation and the removed repair-strip kicker. That visual verdict is not a scanner/security audit or a claim that PHP's legacy target CI is green.

Use [LIVE-DEMO.md](LIVE-DEMO.md) for setup and [REPOSITORY-ONBOARDING.md](REPOSITORY-ONBOARDING.md) for coverage/access. API, worker and frontend are separate processes. No remote deployment, GitHub App install, tenant isolation, X connector, arbitrary code migration, universal exploit coverage or automatic merge/deployment is claimed.

## Historical fixture-specific records

The remaining sections preserve earlier implementation/evidence and their original limits. Their repair scope, runner identities and test totals do not describe the current central-runner release.

## Earlier fixture-specific LangGraph Python demonstration

The separate watcher inventoried the registered Python repository, corroborated three distinct Requests 2.31.0 advisory groups, selected published same-major Requests 2.34.2 and coalesced related findings into one automatic repair run. The complete graph used real Groq responses and real hosted Python execution to create [draft PR #1](https://github.com/Harsh5840/arigato-python-demo/pull/1).

| Identity | Actual record |
|---|---|
| Repository | [Harsh5840/arigato-python-demo](https://github.com/Harsh5840/arigato-python-demo) |
| Registered repository ID | `3dc4b2be848b7eaafd78` |
| LangGraph thread/run | `444cd3c2-0d9d-4cc4-b53c-2f08d67cf33e` |
| Created → completed | 25 October 2026, 01:05:24 → 01:06:23 IST; elapsed 58.883 seconds for this run, not a guaranteed latency |
| Baseline/workflow SHA | `c0625047e22ec73c55db4d048c26823af412664d` |
| Candidate SHA | `32bfc05eaddc485acef19ab2714d5ae11d8e39ad` |
| Candidate branch | `proofpatch/package-444cd3c2-a1` |
| Frozen oracle SHA256 | `03905c2485c9c301b7cb0ac0de7af293483ba43f777d847ad5edb98d423da367` |
| Actual candidate CI | [Actions run 40126005250 — success](https://github.com/Harsh5840/arigato-python-demo/actions/runs/40126005250) |
| Evidence artifact | `proofpatch-444cd3c2-0d9d-4cc4-b53c-2f08d67cf33e-a1` |
| Artifact SHA256 | `b61fb432560948d18cf28f41cfb0abf1ee8b0003a6818e4a8f62a37417235574` |
| Runtime observations | Python 3.12.15; Requests 2.34.2 |
| Verification | 11 recorded controller/evidence checks passed; includes five frozen runner gates and 12 actual business assertions inside the business-suite gate |
| Actual repair model usage | Supply 1,134 + fixer 1,286 + reviewer 3,810 = 6,230 reported tokens across three role calls |
| Final authority | Draft created; human merge/deployment remain required; finding not declared closed |

[Persisted run/events and raw verification output](../output/live-runs/444cd3c2-0d9d-4cc4-b53c-2f08d67cf33e/run.json) include the successful nodes `source`, `inventory`, `triage`, `baseline`, `repair`, `verify`, `review`, `gate`, `publish`. The tenth graph node is the alternative `blocked` path and is not expected on a successful run.

The actual installed application inventory checked against OSV was Requests 2.34.2, certifi 2026.10.23, charset-normalizer 3.5.2, idna 3.20 and urllib3 2.8.0. “No OSV matches” describes that query at execution time; it does not guarantee the packages contain no undiscovered vulnerability.

The main baseline remains deliberately affected and was not installed/executed. [Its initial static classification CI](https://github.com/Harsh5840/arigato-python-demo/actions/runs/40125768335) passed fixture setup checks, not application security. The automatic candidate changes only the Requests pin; application source is preserved.

## Earlier implementation and coverage

- Shared ten-node `StateGraph` with conditional repair/review routes, SQLite checkpoints and persisted events. Strategies provide work for the same edges. Worker loss fails expired leases closed; automatic crash replay is not implemented.
- Actual `ChatGroq` calls with authenticated model discovery, strict structured output, usage recording and bounded inputs/time. Supply Chain uses `openai/gpt-oss-20b`; fixer/reviewer use separate contexts of `openai/gpt-oss-120b`. These are not Sonnet/Opus and do not constitute independent-model assurance.
- Separate API and watcher/queue worker. Scheduled monitoring defaults to 300 seconds; manual repository/source requests are queued for the worker. New lead IDs receive read-only Groq triage and are cached after triage.
- Up to 20 registered accessible GitHub repositories. Exact Python requirements, npm lockfile and Composer lockfile inventory adapters support bounded nested manifests, up to 100 exact dependencies. Unsupported constraints and source outages stay visible.
- OSV exact-version corroboration plus published same-major candidate selection/rechecking. GHSA/PYSEC aliases are deduplicated. Same package/version/target findings share one repair run.
- Newly connected arbitrary repositories remain monitor-only. Automatic package repair currently requires the owned Python Requests profile and preserves code. Broader migrations need approved policy/compatibility checks. The owned PHP runtime advisory profile remains available as a separate manual demonstration.
- One dashboard: working add/select/watch/automatic-fix toggles, source health and timestamps, findings, six-step journey, technical React Flow, run history, real diff, grouped checks, raw evidence, bilingual draft handoff and metrics calculated from stored runs.

One public forum source currently returns HTTP 406: the GitHub advisory Atom endpoint. The Python Packaging feed and OSV have worked. The source-health panel reports the unavailable feed; no cached success is silently substituted. The scout's actual recorded summary found no lead directly establishing the Requests finding; OSV inventory corroboration established it independently. There is no X connector.

## Earlier fixture verification boundaries

Frozen Python paths are `verification/verify.mjs` and `verification/business.py`; their ordered path/content hashes bind the oracle identity. Candidate CI checks a direct-child commit, allowed changed paths and unchanged verifier, then validates the exact published pin. Only the candidate is built. Python executes without network, with read-only filesystem, non-root user, dropped capabilities, no forwarded model/GitHub credentials and resource bounds. The actual installed package inventory is queried against OSV by the trusted host verifier after container execution.

The five runner IDs are `scope`, `verifier`, `package_version`, `business_suite`, `no_known_advisories`. Evidence also binds controller run, Actions ID, workflow/base/candidate SHAs and oracle digest. Missing/failed/malformed/stale results block promotion regardless of model approval. A changed main blocks publication. Candidate/PR heads must equal the verified SHA, and existing branches are never force-pushed.

Twelve business assertions cover Japanese UTF-8, integer JPY totals, query parameters, TLS, timeouts, environment trust, fractional-yen rejection, URL quoting and unauthorized responses using a fake service transport. This exercises actual installed Python/Requests and application behavior, not an exploit against a deployed service. The product does not claim universal pentest coverage or fault-proof security.

## Earlier runbook and ownership

Follow [LIVE-DEMO.md](LIVE-DEMO.md): `npm run setup`, configure ignored credentials, then `npm run dev`. The frontend, API and worker must stay running. Select the Python repository and use its confirmed finding/automatic-fix control; the PHP action remains a separate advisory demo. Use [repository onboarding](REPOSITORY-ONBOARDING.md) for exact working API routes and company onboarding boundaries. [SEPARATE-SERVER-DEPLOYMENT.md](SEPARATE-SERVER-DEPLOYMENT.md) documents separate server configuration; no remote host deployment is claimed.

A owns frontend/demo; B source intake/inventory; C repair policy; D graph/checks/GitHub integration. Rehearse repository → corroborated finding → actual candidate → observed results → draft PR → human follow-up. Preserve a dated completed run if a new provider/runner is still busy.

## Validation and release evidence

The focused generic adapter suite passed 15 tests covering bounded inventories, host restrictions, source outages, authoritative candidate selection, advisory deduplication, frozen evidence identity, protected paths and stale PR heads. TypeScript passed during adapter integration. The Python fixture's static tests, AST parsing without importing the affected dependency, workflow YAML parsing and initial hosted baseline job passed. Actual candidate CI linked above independently passed with the 12 runtime business assertions.

Root release checks are `npm run typecheck`, `npm test`, `npm run build`. Mocked unit-test success is distinct from actual run evidence. Earlier documents' test totals are not totals for the expanded LangGraph release; use its final CI report for aggregate results.

## Historical PHP evidence retained

The earlier single-dashboard PHP execution created [draft PR #4](https://github.com/Harsh5840/arigato-php-demo/pull/4) with [passing CI](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40123778532). Its run `bc7050bc-a41e-4f47-a903-fe00c22e3734` recorded 35 checks including 15 actual PHP business assertions, 8,080 reported tokens and 64.543 seconds. [Historical run bundle](../output/live-runs/bc7050bc-a41e-4f47-a903-fe00c22e3734/run.json). It predates LangGraph migration and is not evidence of the new graph executing.

[PHP PR #3](https://github.com/Harsh5840/arigato-php-demo/pull/3) is the preceding hardened live run; [PR #2](https://github.com/Harsh5840/arigato-php-demo/pull/2) is an earlier actual Groq run before later hardening; [PR #1](https://github.com/Harsh5840/arigato-php-demo/pull/1) is a prepared repair, not model-generated. These records remain historical and unmerged. Their policies and identities should not be relabeled as Python or current-run evidence.

## Remaining work

GitHub App registration/installation, customer authentication/tenancy, webhook handling, provider data/retention controls, billing, distributed queue/workers, automatic crash replay, arbitrary framework migration, local-file pentesting and deployment verification remain future work. Existing source/baseline pins preserve a demonstration, not a forever-safe production version policy. No automatic merge or deployment occurred. Pricing, demand, comparative superiority and defensibility remain hypotheses.
