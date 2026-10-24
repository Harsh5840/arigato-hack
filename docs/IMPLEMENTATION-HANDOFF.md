# Published baseline and implementation handoff

Updated 24 October 2026. The system design remains a proposal for discussion.
Publication and the prepared PHP repair below are complete foundation work;
they are not an operating Groq remediation service.

## Repositories and review artifact

- [Product source](https://github.com/Harsh5840/arigato-hack): Next.js prototype,
  React Flow orchestration, PRD, pitch and current system-design draft.
- [SakuraShop target](https://github.com/Harsh5840/arigato-php-demo): fictional
  Japanese merchant with intentionally affected PHP inventory. Do not deploy
  its main-branch baseline.
- [Draft repair PR #1](https://github.com/Harsh5840/arigato-php-demo/pull/1):
  prepared three-file PHP update for human review. Its origin is explicitly
  labelled; no Groq, Sonnet or Opus invocation generated it.
- [Baseline classification CI](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40111298358):
  completed successfully. Success means it correctly identifies the fixture as
  affected, not that baseline security policy passes.
- [Candidate CI](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40111416786):
  completed successfully. The observed runtime is PHP 8.3.36 with startup
  upload progress disabled; all 15 business checks passed. Preserved outputs
  and their SHA-256 manifest are in [output/php-demo](../output/php-demo/manifest.json).

| Identity | Value |
|---|---|
| Initial product commit | `aeed508145a7cdfaacb2e4cfc31dcd7146251fce` |
| PHP affected baseline | `78d4958740c08fc55380469133876f89141d4d8a` |
| Prepared PHP candidate | `04f139929f4ae068620c346c786db00b72c1b3e6` |
| Frozen five-file verifier SHA-256 | `1273fbfe1bab9b71594dfa7d3cc3434b9958bbb590737c56fb77e9f97daa0f30` |

Candidate changes are limited to Dockerfile, Composer PHP floor and startup
configuration. No application, CI or verifier source changed in the PR.
The CI guard rejects other changed paths, different verifier identities, extra
Docker instructions, Composer scripts or unrelated configuration changes.

## Validation and limits

- Product: seven tests and production build passed before publication.
- Fixture: seven Node tests passed; affected-baseline classification and
  temporary application of the proposed repair passed. Static candidate policy
  passed against a clone of the exact frozen baseline oracle.
- Hosted candidate CI builds only the fixed image, then runs the frozen PHP
  runtime/configuration probe and Japanese UTF-8, integer-JPY and order-access
  regressions. Those steps passed in the linked run. The runner has no publication/model credential, no test-container
  network, a read-only filesystem and bounded resource use.
- No exploit, production deployment, incident-containment test or live Groq
  call occurs. A passing configuration/behavior check cannot prove absence of
  other vulnerabilities. Human configuration and deployment review remain open.

GitHub access was verified through Git Credential Manager. No Groq key was
configured. Local PHP was absent and Docker Desktop's Linux engine was stopped;
hosted CI supplies the separate runtime execution path. These environment facts
are not saved credentials and should be checked again before live integration.

## Runbook and ownership

Clone the product, enter `apps/web`, run `npm ci` and `npm run dev`, then open
`http://127.0.0.1:3000`. Its frontend run outcomes remain synthetic. To inspect
the real prepared repair, open PR #1, its three-file diff and its CI logs.
The fixture README explains baseline assessment and candidate-only execution.

A owns frontend/API events; B owns source ingestion and inventory; C owns
candidate repair; D owns DevSec/controller/runner and PR integration. All four
own judging rehearsal. Proposed time blocks and exact acceptance criteria are
in [the design draft](HACKATHON-END-TO-END-PLAN.md).

## Release, rollback and operational evidence

Publication pushed source only. No production host was deployed. PR #1 remains
draft; human merge authority is unchanged. An unsuccessful repair branch cannot
replace the baseline without an explicit merge. Recovery for the demonstration
is to stop the run, retain evidence and return an isolated clone to its known
main-branch commit; never reset or force-push another teammate's work.

There is no production rollout to roll back. A later rollout must record the
approved image digest, environment, worker restart and post-deployment checks.
Rolling back to the affected image is not a safe security default.

Current operational evidence is Git commits, draft-PR state, Actions steps and
artifacts. The proposed job lease/event log, SSE reconnection, token/cost metrics
and service alerts remain implementation work. There is no claimed uptime SLO.

## Maintenance and next vertical slice

This fixture preserves one historical PHP 8.3 advisory scenario. Its pinned
8.3.36 policy is a demonstration oracle, not a rule to keep production systems
on that release forever. Preserve the original advisory revision and retest
new guidance separately. Keep Japanese CVE aliases correlated to avoid duplicate
PRs; retain generated-translation labels and human review.

The next implementation slice is one source fetch, one repository inventory,
one durable run, actual Groq role calls, actual runner evidence and an idempotent
draft-PR connector. The live provider must be configured before calling the
service automated. X ingestion, billing, broad pentesting, filesystem watchers,
multi-host queues and local-model downloads are deferred.

## Delivery checklist

| Item | Evidence or explicit limit |
|---|---|
| Problem and success criteria | [Design draft](HACKATHON-END-TO-END-PLAN.md), [Japan use case](JAPAN-USE-CASE.md) |
| Tests and evidence | Product verification record; fixture tests, frozen-oracle check, linked CI |
| Release plan | Source publication and draft-only review above; backend release remains proposed |
| Rollback | No production deployment; isolated-run recovery and digest policy above |
| Runbook and owner | Setup and four-person allocation above; fixture README |
| Observability | Git/PR/CI evidence now; durable service telemetry explicitly deferred |
| Maintenance | Historical fixture, advisory revision and provider availability notes above |
| Security/data boundary | Fictional data; no committed credentials; frozen oracle, scoped edits, isolated checks; no production target |
