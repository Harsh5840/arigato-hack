# Implementation handoff

Updated **25 October 2026 (Asia/Calcutta)**. Current implementation: a repository registry and scheduled supply-chain watcher, actual LangGraph orchestration and LangChain ChatGroq roles, frozen hosted checks, and automatic draft publication in the owned Python and PHP demonstrations. One dashboard presents repository controls, source health, confirmed findings, the simple six-step journey, technical graph, live events, actual results and observed analytics.

## Executed LangGraph Python demonstration

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

## Current implementation and coverage

- Shared ten-node `StateGraph` with conditional repair/review routes, SQLite checkpoints and persisted events. Strategies provide work for the same edges. Worker loss fails expired leases closed; automatic crash replay is not implemented.
- Actual `ChatGroq` calls with authenticated model discovery, strict structured output, usage recording and bounded inputs/time. Supply Chain uses `openai/gpt-oss-20b`; fixer/reviewer use separate contexts of `openai/gpt-oss-120b`. These are not Sonnet/Opus and do not constitute independent-model assurance.
- Separate API and watcher/queue worker. Scheduled monitoring defaults to 300 seconds; manual repository/source requests are queued for the worker. New lead IDs receive read-only Groq triage and are cached after triage.
- Up to 20 registered accessible GitHub repositories. Exact Python requirements, npm lockfile and Composer lockfile inventory adapters support bounded nested manifests, up to 100 exact dependencies. Unsupported constraints and source outages stay visible.
- OSV exact-version corroboration plus published same-major candidate selection/rechecking. GHSA/PYSEC aliases are deduplicated. Same package/version/target findings share one repair run.
- Newly connected arbitrary repositories remain monitor-only. Automatic package repair currently requires the owned Python Requests profile and preserves code. Broader migrations need approved policy/compatibility checks. The owned PHP runtime advisory profile remains available as a separate manual demonstration.
- One dashboard: working add/select/watch/automatic-fix toggles, source health and timestamps, findings, six-step journey, technical React Flow, run history, real diff, grouped checks, raw evidence, bilingual draft handoff and metrics calculated from stored runs.

One public forum source currently returns HTTP 406: the GitHub advisory Atom endpoint. The Python Packaging feed and OSV have worked. The source-health panel reports the unavailable feed; no cached success is silently substituted. The scout's actual recorded summary found no lead directly establishing the Requests finding; OSV inventory corroboration established it independently. There is no X connector.

## Verification boundaries

Frozen Python paths are `verification/verify.mjs` and `verification/business.py`; their ordered path/content hashes bind the oracle identity. Candidate CI checks a direct-child commit, allowed changed paths and unchanged verifier, then validates the exact published pin. Only the candidate is built. Python executes without network, with read-only filesystem, non-root user, dropped capabilities, no forwarded model/GitHub credentials and resource bounds. The actual installed package inventory is queried against OSV by the trusted host verifier after container execution.

The five runner IDs are `scope`, `verifier`, `package_version`, `business_suite`, `no_known_advisories`. Evidence also binds controller run, Actions ID, workflow/base/candidate SHAs and oracle digest. Missing/failed/malformed/stale results block promotion regardless of model approval. A changed main blocks publication. Candidate/PR heads must equal the verified SHA, and existing branches are never force-pushed.

Twelve business assertions cover Japanese UTF-8, integer JPY totals, query parameters, TLS, timeouts, environment trust, fractional-yen rejection, URL quoting and unauthorized responses using a fake service transport. This exercises actual installed Python/Requests and application behavior, not an exploit against a deployed service. The product does not claim universal pentest coverage or fault-proof security.

## Runbook and ownership

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
