# Live supply-chain watch → LangGraph → human-reviewed PR

Updated **25 October 2026 (Asia/Calcutta)**. This is a working hackathon integration with a separate API/worker and one developer dashboard. It includes generic repository inventory monitoring, a reviewed Python Requests repair policy, and the retained Japanese PHP advisory demonstration. Coverage and live execution records are distinct from the earlier synthetic pitch assets.

## Start the service

Use Node 22.12+ and npm. From the product repository root:

```sh
npm run setup
# Copy .env.example to .env and configure credentials locally.
npm run dev
```

Set `GROQ_API_KEY`. For GitHub, configure `GITHUB_TOKEN` or use non-interactive Git Credential Manager locally. The server identity must be able to read each registered repository. Candidate branches, workflow dispatch and draft publication additionally require Contents read/write, Actions read/write and Pull requests read/write on the repair target. Keep populated environment files out of Git and the browser.

The command starts Next.js at `http://127.0.0.1:3000`, Hono at `127.0.0.1:8787`, and the separate watcher/queue worker. All three must remain running. No local Python/PHP/Docker runtime is required for the judging laptop: candidate containers execute on GitHub Actions. [Deployment configuration](SEPARATE-SERVER-DEPLOYMENT.md) documents separate server processes and access configuration; a remote host has not been deployed.

Run/event data persists in `.data/proofpatch.sqlite`. LangGraph checkpoints persist in `.data/graph-checkpoints.sqlite`; complete run exports are under `output/live-runs/<run-id>/`. A checkpoint does not currently trigger automatic side-effect replay after a worker crash. Lost worker leases fail closed; inspect the recorded branch/CI state before retrying.

## The 90-second judging story

“We connect service repositories once. A worker watches security sources, confirms whether an exact installed dependency is affected, proposes a supported fix, runs the maintainer's frozen checks, and asks a senior-review context to inspect the result. We open a draft PR. A human decides whether to merge.”

| Time | Show |
|---|---|
| 0–15 s | **Repositories**: select the owned Sakura Python repository and expand its real Requests inventory. Explain that accessible repositories can be monitored, while automatic repair requires a reviewed policy. |
| 15–30 s | **Security watch**: worker heartbeat, scheduled cadence, source health and unconfirmed forum leads. Click **Watch now** for the selected repository if a fresh scan is useful. |
| 30–50 s | **Confirmed findings**: show the OSV match for Requests 2.31.0 and the published target. Enable **Automatically prepare a draft fix** on the supported profile, or use the finding's repair action. |
| 50–70 s | Follow the six-step visual journey; expand the technical graph to see actual LangGraph nodes and Groq role calls. Open the selected run's checks, immutable GitHub diff or runner output. |
| 70–90 s | Open the real draft PR. Show evidence, Japanese/English rationale, candidate identity and remaining human actions. No automatic merge or deployment occurs. |

A hosted runner may take longer than the pitch. Start the live run before presenting and retain an explicitly dated completed record as a fallback. Keep tabs on its actual Actions run and draft. If the new run is waiting or blocked, show that state; do not substitute historical evidence as its result.

## What actually runs

1. The worker reads approved forum feeds and exact manifests from registered GitHub repositories. Scheduled monitoring defaults to 300 seconds and can be paused. A manual source/repository check queues work for the worker.
2. The read-only Supply Chain scout uses actual Groq through LangChain `ChatGroq` to triage newly observed forum leads. Previously triaged IDs are cached to avoid repeatedly paying for unchanged leads. Forum text is untrusted data and remains unconfirmed.
3. OSV exact ecosystem/package/version queries establish corroborated findings. The adapter checks published registry releases, excludes unsupported/pre-release or yanked candidates, stays within the installed major and rechecks the selected candidate with OSV. Unsupported inventory and unavailable sources are reported.
4. A supported repair uses the shared LangGraph workflow: source → inventory → triage → baseline → repair → verify → review → gate → publish. A tenth `blocked` node handles rejected paths. SQLite checkpoints and persisted events show real progress.
5. The fixer creates a scoped candidate. Frozen hosted checks and the separate senior-review context must pass before the deterministic publication gate permits a draft PR. Advisory, base/candidate commit, verifier digest, workflow and run identities are bound together.
6. The human reviews and merges in GitHub, then owns deployment and deployed-environment verification.

Supply Chain uses `openai/gpt-oss-20b`; Remediation and Senior Review use separate contexts of `openai/gpt-oss-120b`. These are actual Groq model IDs, not Sonnet/Opus. The two large-model roles are not independent-model assurance. Repair runs allow at most five role calls, two candidates and 16 minutes; provider calls and hosted verification have smaller deadlines. Forum scouting is a separately recorded monitoring call.

## Current coverage

| Capability | Working scope |
|---|---|
| Register repositories | HTTPS `github.com/owner/repository` URLs accessible to the server's identity; up to 20 records. No arbitrary server clone URL or browser-provided shell commands. |
| Inventory | Root/nested exact `requirements.txt` / `requirements-*.txt` pins, npm `package-lock.json` entries and `composer.lock` packages. At most 100 exact dependencies and bounded manifests. Unresolved constraints are explicitly skipped/reported. |
| Forum discovery | Approved Python Packaging RSS and GitHub advisory Atom requests, with per-source failures. No X API connector. A feed outage is visible, not silently replaced. |
| Automatic package fix | Owned `Harsh5840/arigato-python-demo`, Requests pin only; application source remains byte-for-byte unchanged. Other repository/package migrations require a new reviewed policy. |
| PHP demonstration | Owned `Harsh5840/arigato-php-demo`: live Japanese/vendor advisory corroboration and three reviewed PHP runtime/configuration changes. This is a manual advisory demo rather than generic runtime discovery. |

## Python evidence

Completed current example: [draft PR #1](https://github.com/Harsh5840/arigato-python-demo/pull/1), [successful hosted run 40126005250](https://github.com/Harsh5840/arigato-python-demo/actions/runs/40126005250), and [saved LangGraph run](../output/live-runs/444cd3c2-0d9d-4cc4-b53c-2f08d67cf33e/run.json). The automatic run took 58.883 seconds, used three real role calls and recorded 11 passing controller/evidence checks including the five runner gates and 12 business assertions. It is a dated demonstration, not a latency guarantee.

[Sakura Python main](https://github.com/Harsh5840/arigato-python-demo) intentionally pins affected `requests==2.31.0`; never deploy or execute that baseline. At the current scan, OSV returned three distinct advisory groups after GHSA/PYSEC alias deduplication, and PyPI plus candidate OSV queries selected `2.34.2`. Multiple findings for the same package/version/target coalesce into one repair run rather than three duplicate PRs.

Trusted verification runs from main, checks a direct-child candidate and frozen oracle, downloads binary wheels for the approved candidate, and builds a pinned Python container without build network access. Actual business execution uses a non-root user, no network, read-only filesystem, dropped capabilities and resource limits. Twelve frozen assertions cover Japanese text, JPY arithmetic, authorization failures, URL encoding, TLS and bounded timeouts. Actual installed Requests and four application dependencies are queried against OSV again. The five required gates are `scope`, `verifier`, `package_version`, `business_suite` and `no_known_advisories`.

The artifact `proofpatch-<verification-run-id>` binds the controller run, Actions run, workflow SHA, base SHA, candidate SHA and verifier SHA256. Missing, stale or failing evidence blocks publication. Tests confirm the represented behavior; they do not reproduce every exploit or establish deployed security.

## Retained completed PHP record

[Draft PR #4](https://github.com/Harsh5840/arigato-php-demo/pull/4), [actual passing verification](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40123778532) and [stored run evidence](../output/live-runs/bc7050bc-a41e-4f47-a903-fe00c22e3734/run.json) are an earlier completed demonstration. It recorded 35 checks including 15 executed PHP business assertions. Its historical run predates the LangGraph migration and must not be presented as proof of the new graph executing.

## Operating limits

This is one server identity, SQLite storage and one worker, without customer tenant isolation or a working GitHub App installation flow. Private-code/model data policy, production identity, billing, horizontal scaling, webhook ingestion and broader migration policies remain future work. Scheduled checks run while this worker is alive; they are not a guarantee that every new exploit is discovered. Local developer-file pentesting is not implemented. `mergeReady` and `findingClosed` remain false after draft publication.

```sh
npm run typecheck
npm test
npm run build
```

Product unit tests may use mocked networks and isolated stores. Only linked executed runs establish actual Groq/GitHub/container results. See [the implementation handoff](IMPLEMENTATION-HANDOFF.md) for the current run record and [repository onboarding](REPOSITORY-ONBOARDING.md) for the company journey.
