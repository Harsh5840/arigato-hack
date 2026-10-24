# How a company uses ProofPatch

Updated **25 October 2026 (Asia/Calcutta)**. The working hackathon service accepts accessible GitHub repository URLs, stores inventory/watch settings, checks approved sources from a separate worker, and proposes verified draft PRs where a reviewed repair policy exists. A customer GitHub App installation flow and multi-tenant SaaS identity remain planned.

## Working journey today

1. Start the API, worker and dashboard with a server-side GitHub identity and Groq key. The frontend never receives these credentials.
2. Click **Add repository**, paste a clean HTTPS `github.com/owner/repository` URL and select **Connect**. The server verifies access and reads the default-branch commit, push capability and supported dependency manifests. Adding a URL does not grant GitHub access that the server identity lacks.
3. Select the repository and inspect **Dependency inventory**. Enable **Watch this repository**, use **Watch now** for a queued refresh, or let the worker's default 300-second schedule run. Source status, retrieval times and heartbeat reveal whether the watcher is functioning.
4. Review **Confirmed findings** separately from unconfirmed forum leads. The scout triages new leads using Groq, while OSV exact package/version corroboration establishes actionable findings. A model's reading of a post cannot authorize a repair.
5. For the supported Python Requests profile, enable **Automatically prepare a draft fix** or request a fix from a finding. Multiple advisories for the same package/version/target are coalesced. Other repositories remain monitor-only until a reviewed verification policy is installed.
6. Follow the six-step journey or technical graph, inspect the candidate/checks/runner logs, and open the actual draft PR. Your developer reviews and merges in GitHub; your team deploys and verifies the running service.

## Exact current coverage

| Area | Implemented boundary |
|---|---|
| GitHub connection | Up to 20 HTTPS github.com repositories accessible to the server's token/Git Credential Manager identity; no customer OAuth/App installation, SSH clone URL or arbitrary host. |
| Python inventory | Root/nested `requirements.txt` and `requirements-*.txt` stable exact pins. Ranges, markers, include directives, URLs and unsupported resolution are reported rather than represented as known installed versions. |
| JavaScript inventory | npm `package-lock.json` resolved packages, including supported legacy lockfile trees and nested manifests. |
| PHP package inventory | Packagist packages in `composer.lock`; Docker PHP runtime declarations use the separate reviewed runtime policy. |
| Boundaries | At most 100 exact dependencies and bounded tree/manifest reads. Truncation or unavailable authoritative sources cannot be called a complete clean scan. |
| Package repair | Owned Sakura Python Requests profile: verified package pin only, unchanged application source, trusted hosted checks. Automatic repairs are not enabled for every registered repository. |
| PHP runtime demo | Retained manual Japanese advisory-to-PR workflow with three reviewed runtime/configuration changes. |

The selection policy checks published, stable, same-major releases and asks OSV again before proposing a target. That is not universal runtime compatibility verification. A new ecosystem or code migration needs an explicit policy, relevant frozen regressions and a suitable runner. A target with no supported known fix requires owner review.

## API for a service operator

These routes are relative to `/api` on the Hono server; the dashboard uses the Next `/api/proofpatch` proxy.

| Method and route | Effect |
|---|---|
| `GET /repositories` | List registered repositories and their current inventory/watch capability. |
| `POST /repositories` with `{ "url": "https://github.com/owner/repository" }` | Verify access, inventory and register a repository. |
| `PATCH /repositories/:id` | Change `enabled` and/or `autoRemediate`; unsupported automatic repair is rejected. |
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
| Actions: read/write | Dispatch an already installed trusted workflow and inspect its state/artifacts. |
| Workflows | Only for separately approved workflow installation/editing where required; routine fixer work cannot alter verification YAML. |

Minimum permissions depend on the actual API operations. Dispatching a declared `workflow_dispatch` workflow is different from editing its source. [GitHub App permissions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app), [workflow dispatch API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)

Before private customer onboarding, add tenant-bound authorization across repositories/runs/events/artifacts, installation access removal, retention/deletion controls, provider data disclosure, encrypted secret handling and isolated customer execution. Signed webhooks require raw-body HMAC verification, delivery deduplication and installation/repository membership checks. An App does not itself implement these application controls. [Webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)

## Plain-language judging explanation

“A company connects repositories of its services. Our separate worker keeps checking supported sources and exact dependency versions. If an advisory matches, the first agent explains it, the second prepares a permitted fix, and tests plus a senior-review agent inspect it. The system opens a draft PR. The company's developer is still the person who merges.”

Show the actual Python example and one repository's unsupported-policy state. This demonstrates both the functioning flow and the boundary a real customer would need to configure. For the full walkthrough and dated fallback evidence, use [LIVE-DEMO.md](LIVE-DEMO.md).
