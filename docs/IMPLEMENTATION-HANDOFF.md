# Live implementation handoff

Updated 24 October 2026 UTC. The owned Japanese PHP advisory-to-PR integration executed with actual Groq responses, GitHub Actions PHP checks, and automatic draft publication. It is a local hackathon service scoped to one repository and one advisory case.

## Inspect the result

- [Product source](https://github.com/Harsh5840/arigato-hack): Next.js frontend, Hono API, separate worker, SQLite records, shared contracts, tests, PRD and pitch artifacts.
- [Owned SakuraShop fixture](https://github.com/Harsh5840/arigato-php-demo): fictional Japanese merchant. Main deliberately declares affected PHP 8.3.35; do not deploy it.
- [Final live draft PR #3](https://github.com/Harsh5840/arigato-php-demo/pull/3): automatically created after live Japanese/vendor intake, three actual Groq role calls, frozen hosted checks and a separate senior-review context.
- [Exact pre-publication verification](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40120547241): passed. Observed PHP 8.3.36, upload progress disabled and serializer `php`; all 15 business regressions passed.
- [Preserved live evidence](../output/live-runs/3ea42f72-8ed5-40f3-9a46-0579fbea3a68/run.json): actual model IDs/usage, sources/digests, checks, events, CI and PR identity. Raw outputs are retained beside it.

| Identity | Final live run |
|---|---|
| Run | `3ea42f72-8ed5-40f3-9a46-0579fbea3a68` |
| Baseline | `07ab564e46c0775b42b28a981101c9c510db3cc3` |
| Candidate | `d1d7341d7ecf64179203c742c12aca8aef70ae5a` |
| Frozen verifier SHA256 | `e1f9c9bbc040965549fc09b755359aeec4a1dac5c05256b7ce19602b0926f069` |
| Built image ID | `sha256:212eab9f90590fba2a60c2c46622a7f170ba32e8d825f6f26cdb6aaa07c1a010` |
| Recorded checks | 35 passed, including 15 PHP business assertions |
| Actual Groq usage | 8,129 tokens across three calls |
| Final authority | Draft allowed; merge ready false; finding closed false |

## Runbook and ownership

Follow [LIVE-DEMO.md](LIVE-DEMO.md). Run `npm run setup`, configure the ignored `.env`, and run `npm run dev` from the root. The command starts API, worker and frontend. Open `http://127.0.0.1:3000` → Agents → Live service. Stored runs survive reload. Simulation and Overview retain synthetic demonstrations.

A owns frontend/events; B owns source intake/inventory; C owns candidate repair; D owns controller/checks/GitHub integration. All four rehearse source → diff → actual results → owner follow-up.

## Verified boundaries

The target and source URLs are fixed by server policy. Supply Chain uses `openai/gpt-oss-20b`; fixer/reviewer use separate contexts of `openai/gpt-oss-120b`. Authenticated discovery and strict JSON are required. These are actual Groq models, not Sonnet/Opus. Separate contexts are not independent-model assurance. The cap is five role calls, two candidates and 16 minutes per run.

Only the reviewed Docker image reference, Composer PHP floor and upload-progress setting may change. Extra files, executable Docker instructions, parser directives, Composer scripts and other INI changes are rejected. The trusted workflow checks base/head/frozen-verifier identity before building only the fixed candidate. Actual PHP tests run without network, with a read-only filesystem, non-root user, dropped capabilities and resource bounds. Artifacts bind the workflow/run/base/head/verifier. Branch and PR heads are checked against the verified SHA; a changed main blocks promotion.

Independent review found parser-directive injection, cancellation timing, stale-worker and PR-head issues during implementation. Focused regressions cover the fixes: parser guards in API/CI, cancellation checks at every external write, terminal-state fences and PR-head equality. An external write already in flight cannot be atomically cancelled; any returned PR remains recorded without a successful promotion.

Declaration matching is not exploit reproduction. The affected baseline is never executed. Passing CLI behavior does not verify a deployed web environment or prove absence of compromise. Review, deployment/restarts, actual web configuration and incident assessment remain open tasks in the bilingual draft.

## Validation and release

29 backend tests, seven retained frontend tests, TypeScript and Next production build pass. Dummy-repo tests pass (11), and actionlint passes. Hosted PHP execution linked above is separate evidence from mocked adapter tests. Product CI repeats install/typecheck/tests/build without provider credentials.

The API is loopback-only with origin/JSON checks and one fixed target; it is not a production tenant/authentication boundary. No hosting, merge or deployment occurred. Hosted CI supplies PHP execution, so the laptop needs no PHP or running Docker engine. Credentials and SQLite files are ignored; exports contain no credentials.

Restart all three processes after interruption. Expired leases fail closed. Inspect retained runs, branches and CI before retrying. Matching Git writes reconcile without force pushes. New completed runs remain separate experiments. Pricing, demand and defensibility remain hypotheses.

## Historical artifacts and next phases

[PR #1](https://github.com/Harsh5840/arigato-php-demo/pull/1) is the prepared repair ([old evidence](../output/php-demo/manifest.json)); it was not model-generated. [PR #2](https://github.com/Harsh5840/arigato-php-demo/pull/2) is the first actual Groq run before parser hardening. Its own record is preserved. PR #3 is the final hardened demonstration. These drafts remain unmerged.

The PHP 8.3.36 pin preserves this historical case, not a permanent production upgrade rule. New guidance needs a separately reviewed policy pack. JVN expansion, forum/X leads, general repairs, continuous local watch, arbitrary code testing, onboarding, tenant authentication, billing, production operations and single-agent comparison evaluations remain future phases.
