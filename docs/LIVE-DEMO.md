# Japanese PHP advisory → Groq → draft PR

This is a working, bounded integration for the Open Innovation hackathon. It targets only the team's owned `Harsh5840/arigato-php-demo` repository. The single operations dashboard uses actual service state; seeded prototype screens are no longer routed into it.

## Start from a fresh clone

Use Node 22.12+ and npm. The SQLite flag is included in the supplied commands because Node 22.12 still requires it. From the repository root:

```sh
npm run setup
```

Copy `.env.example` to `.env`, configure `GROQ_API_KEY`, and either set `GITHUB_TOKEN` or sign in with Git Credential Manager. A repository-scoped token needs Contents read/write, Actions read/write and Pull requests read/write on the dummy repository. Existing Git Credential Manager authentication is used non-interactively when no token is configured. Populated environment files are ignored by Git.

```sh
npm run dev
```

This starts Next.js on `http://127.0.0.1:3000`, Hono on `127.0.0.1:8787`, and the separate queue worker. All three must stay running. Next rewrites `/api/proofpatch/*` to the API. Run records and events persist in `.data/proofpatch.sqlite`; completed evidence exports are written to `output/live-runs/<run-id>/`.

The API intentionally binds to loopback and accepts only the local frontend origin. This is a local hackathon integration, not an authenticated multi-tenant deployment. Do not expose its process directly to the Internet. No Docker installation is needed on the demo laptop: isolated PHP execution runs in GitHub Actions.

## What judges can do

1. Open the dashboard. Confirm the service status and owned repository in the sticky header. The repository menu explains the current connection and the planned company GitHub App flow.
2. Click **Run live demo**. The default performs real JPCERT feed/notice and PHP vendor requests. A missing corroboration stops the run. **Run options** can explicitly select a recorded source; Groq, GitHub and runner execution remain real.
3. Follow the interactive agent graph and newest-first event rail on the same page. Select a role and expand its actual model call. On mobile, the role summary precedes the expandable detailed graph.
4. Inspect **Developer workbench**: expand grouped checks, switch to **Candidate diff** for the actual immutable GitHub comparison, or **Runner output** for runtime/business logs and verifier identities. The linked CI shows work in progress.
5. Open the automatically created **draft PR** beside the workbench. Inspect the three-file diff, bilingual review, evidence, rollback notes and remaining owner actions. A human owns review, merge and deployment.
6. Inspect **Run observations** for recorded outcomes, actual phase timings/tokens and sample counts. Select a dated record from history. Reload to recover it; **Run options** contains JSON export. Cancel stops later stages; in-flight external writes or CI may remain recorded. Lost worker leases fail closed.

For a short judging slot, start one live run before the talk and keep a dated completed run available. Provider and hosted-runner queues vary. Use the previous actual record transparently if the new runner is still busy; do not label historical results as the new run. The [90-second judging path and company onboarding design](REPOSITORY-ONBOARDING.md) give the exact story.

## Execution and boundaries

The Supply Chain role uses `openai/gpt-oss-20b`; Remediation and the DevSec senior-review role use separate contexts of `openai/gpt-oss-120b` through Groq. These are actual Groq model IDs, not Sonnet/Opus. Authenticated model discovery and strict JSON responses are required. Fixer/reviewer separation is not independent-model assurance. The aggregate limit is five role calls, two candidate attempts and a 16-minute deadline; individual provider requests and runner polling have smaller bounds.

The controller corroborates the official Japanese notice with the PHP vendor archive, matches the declared PHP 8.3.35 baseline, freezes five verifier files, and accepts exactly three changes: reviewed PHP 8.3.36 image/digest, matching Composer PHP floor, and disabled upload progress at startup. Docker parser directives, extra executable instructions, Composer scripts and unrelated INI changes are rejected. Models cannot edit verification code, workflows or application code through this path.

A trusted workflow on dummy-repo main checks exact base/head identities and the frozen verifier before building only the fixed candidate. The PHP container has no network, a read-only filesystem, dropped capabilities, a non-root user and resource limits. Artifacts bind the workflow/run/base/head/verifier identities. Missing, failed, contradictory or stale evidence blocks publication. The branch and returned PR head are checked against the verified candidate. A changed main requires a new run.

The affected baseline is classified without running its image. Runtime version/configuration checks and Japanese UTF-8, JPY arithmetic and authorization regressions are real; they do not reproduce the PHP RCE or prove a deployed service secure. `mergeReady` and `findingClosed` remain false, even after a successful draft publication.

## Verification commands

```sh
npm run typecheck
npm test
npm run build
```

Backend tests use isolated stores and mocked network adapters where appropriate; exported live runs are separate evidence of actual provider, GitHub and PHP execution. The dummy repository has its own baseline tests and candidate-verification workflow. Automated forum/X discovery, repository onboarding, continuous local watch, general repair tools, tenant authentication, billing and production deployment remain future phases.
