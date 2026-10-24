# How a company uses ProofPatch

Updated **25 October 2026 (Asia/Calcutta)**. The working service accepts GitHub repository URLs, detects the supported stack and tests, watches corroborated advisories and proposes real draft PRs. Repair eligibility comes from exact package/manifest capability and GitHub permissions, rather than repository names. A customer GitHub App installation flow and multi-tenant SaaS identity remain planned.

## Working journey today

1. Start the API, worker and dashboard with a server-side GitHub identity and Groq key. The frontend never receives these credentials.
2. Click **Add repository**, paste a clean HTTPS `github.com/owner/repository` URL and select **Connect & inspect**. The server reads an immutable default-branch commit, permissions, dependency/image declarations and relevant baseline test files. Adding a URL cannot grant access the server identity lacks.
3. Inspect **Detected stack** and **How this repository will be tested**. New supported public connections enable automatic draft preparation by default. Reconnecting preserves existing settings. Pause automatic fixes with the repository toggle when needed.
4. Use **Scan now** for a queued refresh, or keep **Watch for new vulnerabilities** enabled for the default 300-second schedule. The heartbeat, source status and timestamps show whether the worker is functioning.
5. Review **Vulnerabilities found** separately from unconfirmed forum leads. OSV or supported vendor evidence establishes findings. Multiple advisories for one exact update share a repair row and run; expand their actual source evidence. A forum post alone cannot authorize a repair.
6. Follow **Prepare draft fix**, the six-step journey and optional technical graph. Inspect the actual diff, checks and runner output. The central workflow verifies the candidate without installing a custom workflow in your target repository.
7. Open the real draft PR. Your developer reviews and merges in GitHub, then owns deployment and running-service verification. A draft does not close the finding or claim production is fixed.

## Exact current coverage

| Area | Implemented boundary |
|---|---|
| GitHub connection | Up to 20 HTTPS github.com repositories accessible to the server's token/Git Credential Manager identity; no customer OAuth/App installation, SSH clone URL or arbitrary host. |
| Python inventory | Root/nested `requirements.txt` and `requirements-*.txt` stable exact pins. Ranges, markers, include directives, URLs and unsupported resolution are reported rather than represented as known installed versions. |
| JavaScript inventory | npm `package-lock.json` resolved packages, including supported legacy lockfile trees and nested manifests. |
| PHP package inventory | Packagist packages in `composer.lock`, with a corresponding manifest for direct-dependency repair. |
| Image inventory | Supported exact official Docker Hub image tags in Dockerfile `FROM` and Compose YAML `image:` declarations. nginx/PHP have vendor advisory and runtime-smoke adapters. Unsupported images remain explicitly bounded. |
| Inventory bounds | At most 1,000 exact dependencies; OSV batches contain at most 100 queries. Tree/manifest reads and frozen verification contexts remain bounded. Truncation and source errors cannot become complete clean scans. |
| Python repair | Any qualifying public repository name: exact requirements pin plus supported baseline unittest/pytest or existing business-check script. The selected pin changes; application source and tests remain frozen. |
| npm/Composer repair | Direct dependency, committed manifest/lock and meaningful baseline test plan. Real package-manager preparation creates a lock artifact, followed by final committed-candidate verification. Transitive-only repairs and workspaces need further policy work. |
| Container repair | Official nginx/PHP image reference replacement by verified version and SHA-256 digest, with relevant baseline config/runtime checks. Real Trivy scans, vendor CVE corroboration and isolated fixed-image behavior checks establish observed evidence. |
| Private repositories | Inventory can use the server's granted access. Generic automatic fixes are unavailable while central checkout is anonymous/public-only. A separately configured isolated credential is required before private execution can be supported. |
| Missing tests/unknown stack | Remain monitored or blocked with a written reason. An empty suite cannot authorize a PR. Arbitrary application-code migrations are not implemented. |

Package selection checks published, stable, same-major releases and asks OSV again before proposing a target. Image selection corroborates supported vendor fixes and published digests. Neither step establishes application compatibility by itself. The exact package/manifest must have a runnable baseline policy. One supported manifest in a monorepo does not make every package eligible. Missing safe targets require owner review.

The central verifier is `.github/workflows/repository-repair.yml` in the service repository. It runs trusted code at a frozen workflow SHA and checks out public targets anonymously. Give the server identity Contents read/write and Pull requests read/write on targets, plus Actions read/write on the central verifier repository. No custom ProofPatch workflow or workflow-write permission is required in a target for this path. npm/Composer preparation does not count as final verification.

For images, the affected baseline is scanned but never executed. Selected CVEs still reported in the candidate block publication. Other OS/package findings and coverage gaps remain attached to the evidence. Updating a PHP image alone leaves INI, web/startup configuration and incident follow-up with the human owner.

## API for a service operator

These routes are relative to `/api` on the Hono server; the dashboard uses the Next `/api/proofpatch` proxy.

| Method and route | Effect |
|---|---|
| `GET /repositories` | List registered repositories and their current inventory/watch capability. |
| `POST /repositories` with `{ "url": "https://github.com/owner/repository" }` | Verify access, inventory, detected stack/test capability and register the repository. |
| `PATCH /repositories/:id` | Change `enabled` and/or `autoRemediate`; unsupported automatic repair is rejected. Clients cannot forge capability or profile fields. |
| `POST /repositories/:id/scan` | Queue a repository refresh; the worker performs it. |
| `GET /monitoring` | Inspect source health, heartbeat, cadence, leads and scout summary/usage. |
| `PATCH /monitoring` | Set `enabled` and/or `intervalSeconds` (60–86,400). |
| `POST /monitoring/poll` | Request a source/registered-repository cycle. |
| `GET /findings` | List recorded corroborated findings. |
| `POST /findings/:id/remediate` | Queue a supported finding's repair or reuse its grouped run. |
| `GET /runs/:id/events` | Read persisted progress through SSE. |
| `GET /runs/:id/diff` / `evidence` | Read the actual pinned comparison or exported evidence. |

Monitoring actions queue server work; an HTTP acknowledgement is not a completed scan. A stopped/stale worker should remain visible. The service uses one SQLite-backed worker; process separation does not yet implement distributed workers or tenant isolation. See [deployment configuration](SEPARATE-SERVER-DEPLOYMENT.md) before hosting it.

## Planned GitHub App onboarding

A company administrator would install the ProofPatch App on **Only select repositories**, and ProofPatch would resolve the granted repository IDs/installation server-side. GitHub installation is separate from signing into a customer dashboard. The App journey is future work; there is no functioning install button in this release. [GitHub installation guide](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party)

Installation tokens should be minted on demand, restricted to the repositories/permissions granted by that installation and kept server-side. They expire after one hour. [Installation token documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)

| Permission | Proposed purpose |
|---|---|
| Metadata: read | Resolve installed repository identity. |
| Contents: read/write | Read pinned inventory and create scoped candidate branches. Application policy must narrow this broad API permission. |
| Pull requests: read/write | Reconcile/create a draft at the verified candidate SHA; never merge automatically. |
| Actions: read/write | Dispatch and inspect the central service workflow. A future customer-owned runner could need a separate installation grant. |
| Workflows | Only for separately approved workflow installation/editing where required; routine fixer work cannot alter verification YAML. |

Minimum permissions depend on the actual API operations. Dispatching a declared `workflow_dispatch` workflow is different from editing its source. [GitHub App permissions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app), [workflow dispatch API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)

Before private customer onboarding, add tenant-bound authorization across repositories/runs/events/artifacts, installation access removal, retention/deletion controls, provider data disclosure, encrypted secret handling and isolated customer execution. Signed webhooks require raw-body HMAC verification, delivery deduplication and installation/repository membership checks. An App does not itself implement these application controls. [Webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)

## Plain-language judging explanation

“A company connects repositories of its services. Our separate worker keeps checking supported sources and exact dependency versions. If an advisory matches, the first agent explains it, the second prepares a permitted fix, and tests plus a senior-review agent inspect it. The system opens a draft PR. The company's developer is still the person who merges.”

Show [PHP](https://github.com/Harsh5840/arigato-php-demo), [Python](https://github.com/Harsh5840/arigato-python-demo) and [the container service](https://github.com/Harsh5840/arigato-container-demo). The container story is “change one YAML image reference, test live HTTP, review the actual draft PR.” Also show one missing-test or read-only boundary. Use [LIVE-DEMO.md](LIVE-DEMO.md) for the walkthrough and dated fallback evidence; historical fixture PRs must not be presented as results of a new central-runner attempt.

The generic central path produced [Python PR #2](https://github.com/Harsh5840/arigato-python-demo/pull/2) after [12 executed business assertions](https://github.com/Harsh5840/arigato-hack/actions/runs/40128567277), [container PR #1](https://github.com/Harsh5840/arigato-container-demo/pull/1) after [seven live HTTP assertions](https://github.com/Harsh5840/arigato-hack/actions/runs/40128986019), and [PHP PR #6](https://github.com/Harsh5840/arigato-php-demo/pull/6) after [15 storefront assertions](https://github.com/Harsh5840/arigato-hack/actions/runs/40129110636). The container changes nginx 1.26.0 → 1.30.6 in Compose YAML. Its Trivy output retains 391 candidate findings across all severities, compared with 831 baseline findings; passing selected-advisory checks is not a clean-image guarantee. PHP's Dockerfile-only update runs PHP 8.3.36 while leaving INI, deployed-web and incident follow-up with the owner.
