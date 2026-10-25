# ProofPatch setup: GitHub repositories to reviewed draft PRs

This is the repeatable setup for the current four-person hackathon demo. The
ProofPatch server runs separately from the repositories it watches. It reads
dependency and image versions, verifies a corroborated advisory, prepares a
scoped update, runs the central verifier, and opens a **draft** GitHub PR. A
person decides whether to merge and deploy it.

## 1. Know which repository does what

| Role | Repository | Purpose |
| --- | --- | --- |
| ProofPatch service and central verifier | [`Harsh5840/arigato-hack`](https://github.com/Harsh5840/arigato-hack) | Dashboard, API, LangGraph worker and `.github/workflows/repository-repair.yml` |
| Monitored PHP service | [`Harsh5840/arigato-php-demo`](https://github.com/Harsh5840/arigato-php-demo) | Affected PHP image in `Dockerfile`; Japanese storefront checks |
| Monitored Python service | [`Harsh5840/arigato-python-demo`](https://github.com/Harsh5840/arigato-python-demo) | Affected Requests pin in `requirements.txt`; business checks |
| Monitored container service | [`Harsh5840/arigato-container-demo`](https://github.com/Harsh5840/arigato-container-demo) | Affected nginx `image:` in `compose.yaml`; live HTTP checks |

Only the last three are **scanned**. The service repository hosts the trusted
GitHub Actions verifier. There is no need to clone the monitored repositories
onto the ProofPatch server or install a ProofPatch workflow in each target.
These demo baselines intentionally contain affected dependencies; do not
deploy their `main` branches.

## 2. Give the service its GitHub identity

For a local demo, sign Git Credential Manager into the owner account that can
write to all three targets, or set `GITHUB_TOKEN` in the untracked root `.env`.
For a separate server or Docker Compose, use a repository-scoped token: it
cannot use the laptop's Git Credential Manager session. Grant the service
identity:

- **Target repos:** Contents read/write and Pull requests read/write, so it
  can create a candidate branch and draft PR. Public source is currently
  required for the generic central verifier.
- **`arigato-hack`:** Contents read and Actions read/write, so it can dispatch
  and inspect `.github/workflows/repository-repair.yml` on its default branch.

The service does not need repository Administration permission to scan or
repair. An owner/admin needs that permission only to invite collaborators.
Check that Actions are enabled on the central repository and that the workflow
is present on its default branch. The target repos do not need Actions write
access for the central-runner path.

**Team access:** `riteshk1314` was sent a **write-access invitation** to each
of the three monitored repositories on 25 October 2026. The recipient must
accept each GitHub invitation before that account has write access. The owner
can check **Settings → Collaborators** in each target repository; the
recipient can check GitHub notifications or invitation email. The service's
own GitHub identity remains separate from this teammate access.

## 3. Start ProofPatch locally

Use Node.js **22.12+** and npm. In PowerShell:

```powershell
git clone https://github.com/Harsh5840/arigato-hack.git
Set-Location arigato-hack
npm run setup
Copy-Item .env.example .env
```

Edit **only** the untracked `.env` with a real `GROQ_API_KEY`. Set
`GITHUB_TOKEN` if Git Credential Manager is not authenticated. Keep the
default `PROOFPATCH_RUNNER_REPOSITORY_URL` pointing to `arigato-hack`.
`LANGSMITH_API_KEY` and `LANGSMITH_TRACING=true` are optional for tracing;
traces may contain repository context. Do not commit `.env` or put provider
keys in browser settings.

Then run:

```powershell
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). This starts the Next.js
dashboard, Hono API on `127.0.0.1:8787`, and the separate worker. Keep the
terminal running. The worker's default watch interval is **300 seconds**;
manual scans do not need to wait for that interval. GitHub Actions performs
the candidate verification, so local PHP, Python and Docker are not required
for the judge laptop.

For a single-server Docker deployment, use the same untracked `.env`, add a
random 32+ character `API_TOKEN`, set `GITHUB_TOKEN`, and follow
[`docs/SEPARATE-SERVER-DEPLOYMENT.md`](docs/SEPARATE-SERVER-DEPLOYMENT.md).
The current dashboard has one operator identity and is not a public,
multi-tenant login service.

## 4. Connect all three GitHub services

In **Services → Add repository**, paste each URL from the table above and
select **Connect & inspect**. A fresh database may already display the PHP
fixture: reconnect its URL to refresh its detected stack and permissions.
Connect Python and container the same way. Confirm that each row shows an
inventory, a supported test plan and **branch-write access**. A repository
URL alone cannot grant access; fix the GitHub identity if `canPush` is false.

Check the three rows or use **Select all**. Set **Step by step** for a judge
demo where you choose each fix after inspecting findings. Set **Complete
pipeline** only when you want new confirmed findings to proceed through fix,
test, senior review and draft PR automatically. Turn on continuous watch for
the desired services, then choose **Scan selected**. The saved connections
live in `.data/proofpatch.sqlite`; `.env`, SQLite state and live run evidence
are local/server data rather than repository setup files.

## 5. Demonstrate the end-to-end result

1. In **Services**, show PHP, Python and container with detected manifests,
   stack, watch state and last scan. Scan one checked service.
2. In **Findings**, open the exact advisory and installed version. In Step by
   step mode, select **Fix & create draft PR** for an actionable finding.
3. In **Pipeline**, follow the supply-chain triage, scoped fix, central tests,
   senior review and publish stages. The forum scout is a lead source; an
   uncorroborated post alone cannot authorize a fix.
4. In **Results**, show the actual test output, candidate diff, per-agent time
   and token usage, and the GitHub Actions link. A failed or blocked check
   stays visible.
5. In **PRs**, open the **draft** on GitHub. The judge can inspect the code and
   verification evidence; a human reviews, merges and verifies deployment.

For the shortest visual example, select the **container repo**: the proposed
change replaces one `image:` line in YAML, then runs HTTP checks and presents
the real draft PR. Existing published demo PRs and caveats are listed in
[`docs/LIVE-DEMO.md`](docs/LIVE-DEMO.md). Do not claim an old PR was created
by the new scan. The PHP central verifier passes its image-only checks, but
its older target-repository policy check is red; show both if using that PR.

## 6. Verify setup and understand its limits

```powershell
npm run typecheck
npm test
npm run build
```

These validate the product build and mocked checks; the judge-facing proof of
an individual repair is its **actual** Actions run and draft PR. Generic
automatic repair currently supports certain exact Python pins, direct npm or
Composer dependencies with lockfiles, and supported official PHP/nginx image
references with meaningful baseline tests. Unsupported stacks and missing
tests remain monitored or blocked. Private repository inventory can be read
with access, but the generic central verifier currently checks out public
source. ProofPatch does not automatically merge or deploy.

For exact coverage and permissions, see
[`docs/REPOSITORY-ONBOARDING.md`](docs/REPOSITORY-ONBOARDING.md). For the
judge's timed walkthrough, see [`docs/LIVE-DEMO.md`](docs/LIVE-DEMO.md).
