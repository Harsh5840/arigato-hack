# Demonstrate a GitHub advisory-to-draft-PR repair

Updated **25 October 2026 (Asia/Calcutta)**. The same LangGraph workflow handles supported public repositories by detected stack and tests. PHP, Python and container central-runner flows have created real draft PRs after actual tests and senior review. The dashboard reports actual progress and preserves blocked attempts.

## Start the service

Use Node 22.12+ and npm. From the product repository root:

```sh
npm run setup
# Copy .env.example to .env and configure credentials locally.
npm run dev
```

Configure `GROQ_API_KEY` and server-side GitHub authentication. Locally, `GITHUB_TOKEN` or non-interactive Git Credential Manager supplies the GitHub identity. Never put populated credentials in Git or the browser.

The identity needs Contents read/write and Pull requests read/write on each repair target. It also needs Actions read/write on the central verifier repository, `Harsh5840/arigato-hack`. The targets do not need a ProofPatch workflow. The central workflow must already exist on the service repository's main branch.

Open `http://127.0.0.1:3000`. The command starts Next.js, Hono on `127.0.0.1:8787` and a separate watcher/queue worker. Keep all three running. Candidate execution uses GitHub Actions, so the judging laptop does not need local PHP, Python or a running Docker engine. [Separate-server configuration](SEPARATE-SERVER-DEPLOYMENT.md) is available; no remote host has been deployed.

## Present the three-repository story

Use these intentionally affected inventories. Do not deploy their main branches.

| Repository | Explain the change | Relevant behavior checks |
|---|---|---|
| [PHP service](https://github.com/Harsh5840/arigato-php-demo) | Replace the affected official PHP image in `Dockerfile` with a vendor-corroborated version and digest | 15 storefront assertions cover Japanese text, integer yen totals and authorization. INI and deployed-configuration follow-up remain human tasks. |
| [Python service](https://github.com/Harsh5840/arigato-python-demo) | Update the affected Requests pin in `requirements.txt` | 12 business assertions cover Japanese JSON, JPY totals, authorization, URL encoding, TLS verification and timeouts. |
| [Container service](https://github.com/Harsh5840/arigato-container-demo) | Replace the old nginx `image:` value in `compose.yaml` with an updated digest-pinned image | Seven live HTTP checks cover the Japanese storefront, health endpoint, JPY catalog, assets, 404 behavior and a security header. |

The shortest judge explanation is: **“Change one YAML image reference, test live HTTP behavior, review the actual draft PR.”** The YAML setting selects the software inside the container. The red diff line removes the old image; the green line selects its replacement.

The completed central-runner records are:

| Target | Real draft and executed evidence |
|---|---|
| Python | [Draft PR #2](https://github.com/Harsh5840/arigato-python-demo/pull/2), [central CI 40128567277](https://github.com/Harsh5840/arigato-hack/actions/runs/40128567277), run `85a102f8-c69a-424d-8f0d-8a5b653bf816`, candidate `2291e66959c292547792346e77c88b8d25c8685c`. Twelve business assertions passed. |
| Container YAML | [Draft PR #1](https://github.com/Harsh5840/arigato-container-demo/pull/1), [central CI 40128986019](https://github.com/Harsh5840/arigato-hack/actions/runs/40128986019), run `1159357a-7e93-4c2d-ab11-efa91a56aa59`, candidate `0300b01cedd3133c42e95176d0d5c8087e19cdcd`. Seven live HTTP assertions and 11 controller/runner gates passed; three Groq calls reported 7,136 tokens. |
| PHP | [Draft PR #6](https://github.com/Harsh5840/arigato-php-demo/pull/6), [central CI 40129110636](https://github.com/Harsh5840/arigato-hack/actions/runs/40129110636), run `00cd66dd-c269-4b93-83a3-c690fb8f8932`, candidate `870aea9893c3d7c6341938c0b76541ee2125bad0`. PHP 8.3.36 ran 15 storefront assertions; 11 controller/runner gates passed and three Groq calls reported 6,210 tokens. |

The container update is nginx 1.26.0 → 1.30.6 with a pinned digest. Trivy recorded 831 baseline and 391 candidate findings across all severities. These are scanner entries, not unique CVE counts or a security score. Remaining findings stay visible; the image is not declared clean.

PHP PR #6 changes the Dockerfile image only. Passing CLI storefront tests does not verify deployed web exposure or INI/startup configuration. Keep its configuration, deployment and incident follow-ups visible when presenting the draft.

PHP PR #6's [legacy target-repository Fixture evidence job is red](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40129179437). It fails its policy gate before building because it expects the earlier three-file runtime/configuration repair. The separate [central image-only verification passed](https://github.com/Harsh5840/arigato-hack/actions/runs/40129110636) with 15 assertions. Show both results to the judge. The human owner must reconcile the legacy policy and required INI/web follow-ups before merge; do not describe all CI as green or hide/skip the check.

## Walk through the dashboard in 90 seconds

| Time | Show |
|---|---|
| 0–15 s | In **Services**, check the container repo or use **Select all**. Expand **Inspect** to show the detected stack and tests. The repo's name grants no special repair permission. |
| 15–30 s | Point to **Step by step** and **Complete pipeline**. The first scans and waits for a person to start a finding's repair; the second automatically moves new supported matches through fix, tests, senior review and a draft PR. **Scan selected** queues exactly the checked services. |
| 30–45 s | Open **Findings**. A new actionable match has **Fix & create draft PR**; clicking it queues the real fix and opens Pipeline progress. Existing demo matches show **Open draft PR** because their PRs already exist. Several advisory matches collapse into one repair row; expand actual CVE evidence if asked. |
| 45–65 s | Open **Pipeline**. Follow **Connect & inspect → Watch for alerts → Confirm the risk → Prepare the update → Test & review → You review the PR**, then show the actual LangGraph/React Flow handoffs. |
| 65–80 s | Open **Results**. Show model times and reported tokens, checks, YAML candidate diff, CI link, scanner residuals and live HTTP test output for a recorded run. |
| 80–90 s | Open **PRs**. Select all to show the three recorded GitHub draft PRs; the container's 28 advisory matches appear on one review card. Open the real PR to show the exact candidate, senior-review rationale and human follow-ups. You decide whether to merge. |

New connections begin in Step by step mode with automatic repair off. Existing settings are preserved on reconnect. Complete pipeline enables automatic fixes for checked supported repositories and turns on their individual continuous watch. Unsupported selections still scan. A connection cannot grant permissions the server identity lacks.

Start a new live run before presenting because hosted verification can take several minutes. Open its actual Actions run in another tab. Earlier local run history was cleared on 25 October 2026; the published draft PRs and committed archived evidence above still exist. The current **Delete saved runs** action removes saved runs and their linked dashboard findings but leaves GitHub PRs open. If an unresolved finding is rediscovered on a later scan, its existing PR link is restored, preventing a duplicate draft. To show a new end-to-end run, connect a fresh supported affected repository or introduce a new affected version in a demo repository. If a new run is queued, running or blocked, show that state. A dated completed record is a fallback, not the result of the new attempt.

For post-demo cleanup, **Results → Close PRs + clear findings** acts on the checked services. It closes recorded open ProofPatch drafts on GitHub, then clears their local findings and PR cards. GitHub retains closed PR history; the action does not delete run evidence. If GitHub fails, local records remain for a retry. Do not use this before showing the three existing demo PRs.

## Explain what actually executes

1. A worker checks enabled repositories every 300 seconds by default. It inventories exact package versions and supported image references at immutable commits. OSV requests contain at most 100 queries each, with up to 1,000 tracked dependencies per repository.
2. A read-only Groq scout triages new allowlisted forum leads through LangChain `ChatGroq`. Forum text cannot authorize changes. Exact OSV queries, registry publication checks and supported image-vendor advisories establish affected inventory and repair targets.
3. The shared LangGraph runs source, inventory, triage, baseline, repair, verify, review, gate and publish nodes, with a blocked path. The controller discovers the exact package/manifest test policy and freezes baseline test bytes before repair.
4. The Fix Agent proposes a scoped dependency or image change. Python changes the selected exact pin. npm and Composer first use the real package manager to resolve a lockfile on the central runner, then commit it and verify the final exact candidate. The model cannot invent lockfile integrity metadata.
5. The central workflow in `arigato-hack` checks direct-parent candidate scope, frozen tests, actual selected version, application tests and advisory evidence. Candidate tests run without external network, credentials or a Docker socket, with a non-root user, read-only filesystem and resource limits. Dependency download phases have restricted inputs and do not receive application source.
6. Container checks scan the affected image without executing it, scan the digest-pinned candidate with real Trivy, corroborate supported vendor CVEs and run fixed-image application smoke tests. A selected CVE still reported in the candidate blocks publication. Other OS findings and scanner coverage gaps remain visible for human review.
7. A separate senior-review context inspects the actual changes and observed evidence. Only a passing deterministic gate permits a real draft PR at the verified candidate SHA. A human reviews, merges, deploys and verifies the running service.

Supply Chain uses `openai/gpt-oss-20b`. Fix and Senior Review use separate contexts of `openai/gpt-oss-120b` through Groq. They are not Claude Sonnet or Opus, and separate contexts do not establish independent-model assurance. A repair allows at most five role calls, two candidate attempts and 16 minutes. Monitoring scout calls have separate recorded usage.

## Choose a supported repository

Any public GitHub repository name can qualify when the server can write a branch and discover the exact supported verification plan:

- PyPI: stable exact pins in supported requirements files, with conventional unittest/pytest tests or the existing business-check script. Unsupported requirement includes, custom indexes, URLs and unresolved constraints stay blocked.
- npm and Composer: a direct dependency, committed manifest and lockfile, meaningful baseline tests and supported public registry sources. Transitive-only changes and workspaces require more policy work.
- Containers: official nginx or PHP image references in Dockerfile or Compose YAML, digest-pinned replacements, supported vendor evidence and the required baseline runtime checks/configuration.

Private repositories can be inventoried when credentials permit, but the current central verifier checks out public source anonymously. Private generic repair is unavailable until an isolated checkout credential is configured. Missing tests and unknown stacks stay explicit rather than passing an empty suite. Arbitrary application-code migrations are not implemented.

## Keep execution records distinct

Stored runs and events live in `.data/proofpatch.sqlite`; LangGraph checkpoints live in `.data/graph-checkpoints.sqlite`. Final run exports are saved under `output/live-runs/<run-id>/`. Worker loss fails closed. Checkpoints do not automatically replay GitHub writes after a crash.

Earlier [Python draft PR #1](https://github.com/Harsh5840/arigato-python-demo/pull/1) and [passing fixture verification](https://github.com/Harsh5840/arigato-python-demo/actions/runs/40126005250) belong to run `444cd3c2-0d9d-4cc4-b53c-2f08d67cf33e`, before the central-runner path. Earlier [PHP draft PR #5](https://github.com/Harsh5840/arigato-php-demo/pull/5) belongs to the retained runtime/configuration workflow. These are real historical results, not evidence that a new attempt has passed.

This service has one operator identity, SQLite storage and one worker. Customer login, tenant isolation, GitHub App installation, X ingestion, local-file pentesting and automatic merge/deployment are not implemented. Keep the dashboard private. A passing candidate does not prove deployed exposure is resolved or that every vulnerability is absent.

Run `npm run typecheck`, `npm test` and `npm run build` for product checks. Mocked unit tests and retained synthetic prototype tests are separate from actual Groq/GitHub/container execution. See [repository onboarding](REPOSITORY-ONBOARDING.md) for exact access and coverage.
