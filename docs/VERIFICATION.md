# Verification record

## Current generic central-verifier release — 25 October 2026 (Asia/Calcutta)

The current code selects repair policy from repository manifests, exact package/manifest targets and baseline tests, without owner/name allowlists. Supported public repositories can update exact PyPI requirements, direct npm/Composer dependencies with committed locks and official PHP/nginx images in Dockerfiles or Compose YAML. Up to 1,000 dependencies are queried in OSV batches of at most 100. New supported connections default to automatic draft preparation. Read-only access, missing tests, unsupported stacks and private central checkout remain explicit boundaries.

The trusted `.github/workflows/repository-repair.yml` runs in `arigato-hack`; no custom workflow is required in the target repository. npm/Composer preparation uses the real package manager to generate lock metadata, then a separate final pass verifies the committed exact candidate. The controller checks scope, frozen baseline test identity, actual version, business assertions, advisory evidence, central workflow/Actions identity and artifact hashes. Empty suites, changed tests and stale evidence cannot authorize a draft.

Three registered judging repositories exercise the generic path:

| Repository | Observed central-runner evidence |
|---|---|
| [Python](https://github.com/Harsh5840/arigato-python-demo) | Run `85a102f8-c69a-424d-8f0d-8a5b653bf816` completed. [Central CI 40128567277 passed](https://github.com/Harsh5840/arigato-hack/actions/runs/40128567277), 12 actual business assertions passed, and [draft PR #2](https://github.com/Harsh5840/arigato-python-demo/pull/2) was created at candidate `2291e66959c292547792346e77c88b8d25c8685c`. |
| [Container YAML](https://github.com/Harsh5840/arigato-container-demo) | Run `1159357a-7e93-4c2d-ab11-efa91a56aa59` completed. [Central CI 40128986019 passed](https://github.com/Harsh5840/arigato-hack/actions/runs/40128986019), seven live HTTP assertions and 11 controller/runner gates passed, and [draft PR #1](https://github.com/Harsh5840/arigato-container-demo/pull/1) was created at `0300b01cedd3133c42e95176d0d5c8087e19cdcd`. Three real Groq role calls reported 7,136 tokens. |
| [PHP](https://github.com/Harsh5840/arigato-php-demo) | Run `00cd66dd-c269-4b93-83a3-c690fb8f8932` completed. [Central CI 40129110636 passed](https://github.com/Harsh5840/arigato-hack/actions/runs/40129110636), PHP 8.3.36 passed 15 storefront assertions and 11 controller/runner gates, and [draft PR #6](https://github.com/Harsh5840/arigato-php-demo/pull/6) was created at `870aea9893c3d7c6341938c0b76541ee2125bad0`. Three real Groq role calls reported 6,210 tokens. |

Real Trivy scans inspect both affected and candidate images. The affected baseline is never executed. Supported vendor advisories independently corroborate selected CVEs and replacement versions. A selected CVE remaining in the candidate blocks publication; other scanner findings and coverage gaps are retained for owner review. PHP image updates leave INI, deployed configuration and incident follow-up to the human owner.

The successful container changes nginx 1.26.0 → 1.30.6 with digest `sha256:a7675fcee220f59b4a99f7098c06a0d5d999c2c0ee37c0211efb780536e5cb20` in `compose.yaml`. Actual Trivy output records 831 baseline and 391 candidate findings across all severities. These scanner-entry counts do not imply the image is clean or that all 391 residuals are exploitable. [The complete stored run](../output/live-runs/1159357a-7e93-4c2d-ab11-efa91a56aa59/run.json) retains the evidence and senior review.

The successful PHP candidate changes the Dockerfile image to `php:8.3.36-cli-bookworm@sha256:cdb77e306d6bb99db40e513fbe036ecc6c53b575cbcb7e581387845fef26d755`. [Its stored run](../output/live-runs/00cd66dd-c269-4b93-83a3-c690fb8f8932/run.json) records the real senior approval and open draft. INI/startup/web configuration, deployment and incident tasks remain human follow-up; the CLI test result does not establish deployed exposure is resolved.

**PHP's legacy target check is failing:** [Fixture evidence run 40129179437](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40129179437) fails its policy gate before building. The target's old `ci-candidate` policy expects the earlier three-file configuration repair; current [central image-only verification 40129110636](https://github.com/Harsh5840/arigato-hack/actions/runs/40129110636) separately passed 15 storefront assertions. The owner must reconcile the legacy policy and INI/web follow-ups before merge. This record does not hide or skip the target check, and does not claim all CI is green.

Read-only comparison confirmed that API-selected baseline context and runner full-tree discovery produced identical frozen hashes for all three fixture policies: PHP (five files), Python (two files) and container (eight files). The fixtures emit supported real assertion formats. Earlier failed central attempts remain blocked and do not count as successful repairs.

GitHub readback confirmed all three new PRs are open, unmerged drafts at their verified candidate SHAs. Each changes only its intended file: Python `requirements.txt`, container `compose.yaml`, and PHP `Dockerfile`. A separate backend review found two lockfile-size compatibility inconsistencies; both were corrected without weakening candidate identity, exact-content reuse or aggregate limits. Regression tests cover large lockfiles, Unicode byte bounds, omitted oversized display patches and stale comparisons.

Final root tests and type checks passed: 125 API and 21 frontend tests, 146 total. The optimized Next production build passed after the final repair-strip label removal. The updated dev stack was restarted. Ten valid PNGs in `apps/web/.impeccable/review/generic-autofix` include the nine original desktop/mobile captures and mobile repair confirmation. Browser checks recorded zero errors; the standard reduced-motion informational warning remains. The fresh `generic-autofix/VERDICT.md` disposition is **SHIP**, scoped to the two scored fixes: stale design documentation and the removed repair-strip kicker. It does not establish scanner/security correctness or clear the failing legacy PHP target check. Mocked unit tests remain separate from actual hosted execution.

No remote service deployment, private central checkout credential, end-user login, tenant isolation, GitHub App install, X connector, universal pentesting, arbitrary code migration, automatic merge or automatic deployment is claimed. The main branches of the three demo repositories intentionally retain affected declarations and must not be deployed.

## Historical fixture-specific LangGraph service — 25 October 2026 (Asia/Calcutta)

This section describes the earlier verifier installed in the Python fixture, before the generic central workflow. Its scope and runner identity are historical.

Actual scheduled monitoring inventoried Requests 2.31.0, corroborated three OSV advisory groups and coalesced them into one LangGraph repair. [Python draft PR #1](https://github.com/Harsh5840/arigato-python-demo/pull/1) was created automatically after [Actions40126005250 passed](https://github.com/Harsh5840/arigato-python-demo/actions/runs/40126005250). Run444cd3c2 preserves 11 passing controller/runner gates, 12 executed frozen Japanese business assertions, actual Python3.12.15/Requests2.34.2 and 6,230 reported role tokens. A separate read-only forum scout recorded4,556tokens. Eleven durable graph checkpoints were read back from SQLite after the worker stopped; external-write crash replay is deliberately unsupported.

Root `npm test`, API/web type checks and optimized Next production build passed. Tests include real LangGraph branching, bounded retries, durable checkpoint reopen, strict ChatGroq transport, generic inventory/OSV matching, repository/profile/write guards, advisory coalescing, changed-target reopening, pin-only repair policy, server-token/Host/origin protection and server-only fixed-destination proxy behavior. Mocked tests are distinct from actual hosted run evidence.

Browser QA verified repository selection and settings, live worker/graph progress, real findings, exact loaded GitHub diff, actual draft handoff, grouped generic runtime/business/provenance checks, observed analytics and no document overflow at1440px or390px. The nine actual captures in `apps/web/.impeccable/review/generic-service` carry embedded origin metadata. Two premature workbench captures were replaced with loaded unobscured diffs. The independent full finish review returned **ship**; its record is REVIEW.md. The frontend source remains one route, with beginner six-step flow and expandable React Flow details.

The GitHub advisory Atom source returned HTTP406 and is visibly unavailable; no success was substituted. Python forum leads remained unconfirmed, and actual Groq triage selected none as establishing this vulnerability. OSV established the exact inventory findings independently. A source failure does not establish a clean result.

Model summaries are interpretations, not version-range authority. The first run's analyst overgeneralized an advisory range from the selected upgrade. The controller already used exact OSV matching and a rechecked published safe target. The adapter now provides actual advisory range events and separates selectedSafeUpgradeVersion from the individual advisory's first fixed release in model input. Historical model output is retained rather than silently edited; a separate actual read-only triage recheck is saved beside the run. Never present free-text model claims as independently verified source facts.

Compose configuration was validated with dummy values; API/proxy security tests passed. Docker engine was unavailable, so container images, startup/volume permissions and remote hosting remain unverified. Arbitrary connected repos support bounded inventory/advisory monitoring; automatic fixes require an approved policy. Current Python policy preserves source; the PHP advisory demo retains its three-file runtime policy. No end-user SaaS login, tenant isolation, GitHub App install, X connector, universal pentesting, automatic merge or deployment is claimed.

## Historical verification records

The sections below describe earlier product revisions and retain their original scope and dates.

# Redesign verification — 24 October 2026

## One-page dashboard — 25 October 2026 (Asia/Calcutta)

The default route now renders a component-based OperationsDashboard. Static multi-view navigation and seeded Simulation/Overview content are absent from the routed interface. Real run history drives metrics, outcome bars, phase durations and actual token usage; sample sizes and recorded-data limits are visible. The workbench fetches the exact stored base/candidate GitHub comparison, rejects out-of-scope files/identities and displays actual added/deleted lines.

Browser interaction with **Run live demo** created run `bc7050bc-a41e-4f47-a903-fe00c22e3734`, ending in [draft PR #4](https://github.com/Harsh5840/arigato-php-demo/pull/4) after [successful hosted PHP checks](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40123778532). All 35 recorded checks passed, including 15 business regressions. Three Groq calls reported 8,080 tokens. Reload recovered the actual run, 20 events and its three-file diff.

All 46 automated tests and the production build pass. Initial browser QA recorded zero console errors/page exceptions, no horizontal document overflow at 390px, correct diff line highlighting and no literal backslash-newline artifacts. Repository connection and run-option popovers work; the connection panel explicitly distinguishes the current owned repo from planned GitHub App onboarding. Eight actual captures are in `.impeccable/review/dashboard/`, all with embedded origin metadata. The independent review records own the final visual disposition.

The reviewer found one contradictory queued-state instruction. The event rail now distinguishes no run, queued, active and terminal states. All eight captures were refreshed; a scrolled desktop frame was replaced with a verified scroll-top capture. The reviewer scored that copy fix resolved (`dashboard/VERDICT.md`); ship covers the scored fix. The queued-state capture used an actual new job with briefly delayed SSE delivery, then the actual Cancel button stopped it before any model call, candidate or PR. No API payload or model output was fabricated for this test.

[Dashboard product CI](https://github.com/Harsh5840/arigato-hack/actions/runs/40124192043) passed on `3b83b8d3696dd2a162f10bc6cd13bbb4e999f9c9`, including installation, type checks, all 46 tests and production build. [PR4's post-publication candidate CI](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40123840597) passed too.

## Live integration verification — 24 October 2026 UTC

The default Agents surface now connects to the Hono API and separate SQLite worker. Live run `3ea42f72-8ed5-40f3-9a46-0579fbea3a68` fetched JPCERT/vendor evidence, made three actual Groq calls (8,129 tokens), pushed candidate `d1d7341d7ecf64179203c742c12aca8aef70ae5a`, observed [successful hosted PHP checks](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40120547241), and automatically created [draft PR #3](https://github.com/Harsh5840/arigato-php-demo/pull/3). All 35 recorded checks passed, including 15 real business assertions. [Preserved run](../output/live-runs/3ea42f72-8ed5-40f3-9a46-0579fbea3a68/run.json).

29 backend tests and seven frontend tests pass, with TypeScript and Next production build. Tests cover source/redirect limits, strict model output, missing credentials, parser directives, candidate scope, artifact identities, stale heads, cancellation at write boundaries and stale worker recovery. Dummy CI has 11 policy tests and actionlint validation. Actual hosted execution is separate from mocked network tests.

Browser integration verified immediate SSE snapshots through the Next rewrite, persisted trace recovery after reload, real CI/PR links, model summaries, Japanese switch, six rendered React Flow nodes and no horizontal overflow at 390px. Desktop/mobile review captures and disposition are in `apps/web/.impeccable/review/live/`; all seven rasters have embedded origin metadata. A premature top capture was replaced after measured nodes fully painted. Final finish-review records own the visual verdict.

This is real execution of a bounded fixture workflow, not a general pentesting service. Baseline classification does not execute the affected runtime; passing CLI checks do not verify deployment or prove absence of compromise. The historical redesign/simulation evidence below applies to the retained Simulation/Overview and checkpoint deck.

Independent live UI review identified graph-label occlusion and missing mobile role orientation. Both were fixed in one batch; all seven recaptures passed and the reviewer scored both fixes resolved (`live/VERDICT.md`). The ship verdict covers that scored list. [Product CI](https://github.com/Harsh5840/arigato-hack/actions/runs/40121067871) passed after push; [PR3 candidate CI](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40120596310) passed as well. Root `npm run dev` was restarted successfully and recovered the completed 35-check run through the frontend proxy.

User selected a dark engineering workspace and an isometric machine.

## Three-agent extension

The current default Agents screen uses @xyflow/react 12.12.0. It presents Supply Chain, Remediation and Development Security with a deterministic controller, evidence store, gate and human review. Role details, node selection/drag, zoom/fit, simulation, stop/reset and JSON trace export are implemented. Baseline-first upstream and local-change loops agree with the architecture contract.

Seven unit tests pass: the two original evidence-gate tests plus five orchestration tests covering regression rejection, both entry points, baseline-before-write ordering, required PHP/compromise follow-up, and cancellation. TypeScript and production build pass after the final UI changes. Browser checks passed for all four scenarios, successful/blocked/needs-review states, local DevSec→Remediation→DevSec sequence, stop/reset, export, role inspection and node dragging. At 390px there is no page overflow. A fresh full scenario check reported zero console errors, warnings or page exceptions; hot reload warnings during source editing were not counted as product failures.

The first fresh review found unreadable initial mobile fit, incomplete return routing and undocumented new style roles. Corrections wait for measured nodes plus nonzero React Flow dimensions, preserve baseline/candidate/results/retry paths, and add a first-viewport mobile role summary. Final scoped ship verdict clears those scored fixes. It is not an independent audit of scanner or agent execution. DESIGN.md and sidecar were updated after the last correction. Current captures are orchestration-* under design/ and apps/web/.impeccable/review/; the detector ran once and returned advisory new color/type metadata, which the documenter recorded. The older no-findings statement below applies to the preceding redesign.

The orchestration deck has 12 slides, editable text, one native chart and two native tables. Updated cover/role/diagram slides were rendered and inspected; unchanged slides retain the reviewed design. Package/layout/font/chart/import validators and Anthropic Office validation pass. Current receipt: .codex-finalizer/orchestration-deck-final-validation.json. SHA256: 008f6fa0936b80e8035c85607ed58ee44c74df83e03f77867aef7552885513bb. PDF 12 pages matches the slide renders with maximum mean pixel error 0.652/255; see orchestration-pdf-validation.json. Native PowerPoint rendering was not performed.

29 design/review rasters carry embedded origin metadata. Final keyboard-node selection, zoom and legacy Findings/Overview navigation also pass; opening the Bklit view under the reduced-motion test setting emits one informational Motion warning. There were no page exceptions or console errors. PHP and Composer references are research snapshots; fictional inventory and simulated execution remain explicit. No affected package, real exploit, live agent or continuous monitor executes. Canva status remains unchanged below.

## Frontend
Final TypeScript and production build passed. Both workflow gate tests passed. Browser checks passed: demo, blocked regression, successful retry, local draft, reload persistence, filtering, evidence library and roadmap. At 390px, document width remains 390px and every finding shows its verification status without horizontal scrolling. Fresh captures collected zero console errors and zero page exceptions.

Actual Bklit Gauge source was installed through shadcn. It is loaded on the client to avoid server/browser floating-point SVG path differences. Its five segments and numeric measure use the same conditions as the Anatomy mechanism.

The Impeccable detector returned no findings on authored targets. A fresh reviewer identified the developer issue overlay, mobile status visibility and roadmap eyebrows; these were resolved. A follow-up caught an unsettled gauge in screenshots. Settled reduced-motion captures show four lit segments beside 4/5. Final ship verdict covers that scored fix list, not a new whole-surface audit. Reports are in apps/web/.impeccable/review/.

Desktop 1440×1000, mobile 390×844, blocked state, dialog and roadmap were captured. The direction contract survives production HTML. This is a code-led redesign with no new approved raster comp. The original white/cobalt concept is superseded.

## Anatomy
The original interlock has 63 actual kit solids. Passing and blocked static poses passed geometry and line-end audits with zero failures. Phone views and 4× mechanism crops were inspected. Continuous-motion clearance and light-theme audits were not performed. See design/anatomy/CHECKS.md.

## Presentation
12-slide editable PPTX: native doughnut on slide 2 and native tables on slides 6 and 7. All slide renders inspected individually. Package, geometry, font, first-party import, native chart and workbook checks passed with zero findings and warnings. Anthropic Office validator: All validations PASSED. Native Microsoft PowerPoint rendering was not performed.

PptxGenJS emitted absent slide-master content-type overrides and one default chart font. A reproducible normalization script removes only those absent-master overrides and sets the chart default to chosen Calibri. Final validators run on the normalized package.

The 12-page PDF is an image-based preview of the inspected renders. The PPTX retains editable text, tables and chart. The original filenames now point to this revision; rejected files are preserved in output/archive-v1.

## Provenance
20 design/review raster files have embedded origin metadata; scan reports zero missing. Public Sans OFL and Bklit MIT licenses ship with their sources. Anatomy concept, inventory and build source are included. Built visual truth is in apps/web/DESIGN.md and its sidecar.

## Scope and Canva
Findings and outcomes remain synthetic. No live scanner, agent service, external pentest, repository mutation or GitHub write occurred. Pricing, savings, demand and differentiation are hypotheses. Four-person plan retained; 48-hour window is provisional.

Earlier Canva MCP generation returned quota_exceeded. PDF upload did not create a design; browser PPTX import required disabled extension local-file access. No Canva presentation was created and this revision has not been imported. Editable PPTX is delivered locally.
