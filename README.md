# ProofPatch

Four-member Open Innovation hackathon project. Checkpoint 1 weights: problem 35%, idea 30%, business 25%, development 10%. Implementation status checked **25 October 2026 (Asia/Calcutta)**; earlier pitch and research assets retain their original dates.

ProofPatch is a separate-server supply-chain watch service: connect GitHub repositories, match their exact dependency inventory against corroborated advisories, and route supported fixes through **LangGraph + LangChain ChatGroq** to a draft PR for human review. One dashboard shows a six-step explanation, the technical React Flow graph, source health, findings, actual model calls, tests, diffs and PRs. Read [the live demo guide](docs/LIVE-DEMO.md) for setup and the judging walkthrough.

Automatic repair is selected from the repository's detected stack and baseline tests, rather than its owner or name. Supported public repositories can use exact Python requirements, direct npm or Composer dependencies with committed lockfiles, and official PHP or nginx image references in Dockerfiles or Compose YAML. New supported connections enable automatic draft preparation by default; the setting can be paused. Missing tests, unsupported declarations and private repositories remain explicit boundaries. Arbitrary application-code migrations are not implemented.

The three judging repositories are [SakuraShop PHP](https://github.com/Harsh5840/arigato-php-demo), [Sakura Python](https://github.com/Harsh5840/arigato-python-demo), and [Sakura container service](https://github.com/Harsh5840/arigato-container-demo). Their main branches deliberately retain affected baselines; never deploy them. The container story is: **change one YAML image reference, test live HTTP behavior, review the actual draft PR**. PHP PR #1 is the earlier prepared fixture repair;
live runs and their own PR/CI links are recorded under `output/live-runs/`. Read the
[implementation handoff](docs/IMPLEMENTATION-HANDOFF.md) for exact commits,
checks, current limits and the next implementation slice.

The central verifier runs from this service repository. Target repositories do not need a custom ProofPatch workflow. It freezes baseline tests, validates the scoped candidate, installs dependencies without application hooks, and runs relevant tests in an isolated container. npm and Composer use a separate package-manager lock-preparation pass followed by final exact-commit verification. Models cannot invent lockfile integrity metadata. Container candidates receive real Trivy scans and vendor advisory checks; selected CVEs still reported in the updated image block publication, while unrelated findings remain visible for human review.

The generic central path created all three real drafts: [Python PR #2](https://github.com/Harsh5840/arigato-python-demo/pull/2) after [12 business assertions passed](https://github.com/Harsh5840/arigato-hack/actions/runs/40128567277), [container PR #1](https://github.com/Harsh5840/arigato-container-demo/pull/1) after [seven live HTTP assertions passed](https://github.com/Harsh5840/arigato-hack/actions/runs/40128986019), and [PHP PR #6](https://github.com/Harsh5840/arigato-php-demo/pull/6) after [15 storefront assertions passed](https://github.com/Harsh5840/arigato-hack/actions/runs/40129110636). The container PR changes nginx 1.26.0 → 1.30.6 with a digest in `compose.yaml`. Trivy reported 831 baseline and 391 candidate findings across all severities; residuals remain for human review. The image is not declared clean. The PHP PR updates the Dockerfile image to PHP 8.3.36; INI, web configuration, deployment and incident follow-up remain human tasks.

PHP PR #6 also has a [failing legacy target-repository check](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40129179437). That fixture policy expects the earlier three-file configuration repair; the current central image-only checks passed. The owner must reconcile the policy and INI/web follow-ups before merge. All CI is not green.

Earlier [Python draft PR #1](https://github.com/Harsh5840/arigato-python-demo/pull/1) used the fixture-specific verifier. Its evidence remains historical and is not relabeled as central-runner execution.

Earlier completed PHP judging record: [dashboard-generated draft PR #4](https://github.com/Harsh5840/arigato-php-demo/pull/4),
[passing PHP verification](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40123778532),
and [preserved run evidence](output/live-runs/bc7050bc-a41e-4f47-a903-fe00c22e3734/run.json).

## Run
Requires Node 22.12+ and npm. From a fresh clone:

```sh
npm run setup
# Copy .env.example to .env and configure Groq/GitHub authentication.
npm run dev
```

Open http://127.0.0.1:3000. The command starts frontend, API and worker.
The API, watcher/queue worker and frontend are separate processes. [Deployment configuration](docs/SEPARATE-SERVER-DEPLOYMENT.md) explains the server layout; no remote host has been deployed by this implementation.

## Deliverables
- docs/PRD.md: phased product requirements, research, architecture and business model.
- docs/THREE-AGENT-ARCHITECTURE.md: current agent roles, typed handoffs, repair loops, phases and PHP/Composer distinctions.
- docs/JUDGING-PLAYBOOK.md: weighted pitch, demo script and judge Q&A.
- docs/PITCH-SCRIPT-CYBERSEC-LEAD.md: five-minute spoken script, demo cues, short version and technical judge Q&A.
- output/ProofPatch-Checkpoint-1-Orchestration.pptx: current editable 12-slide pitch, updated roles/diagram, speaker notes, native chart and two native tables.
- output/ProofPatch-Checkpoint-1-Orchestration.pdf: image-based PDF preview.
- output/sample-demo-evidence.json: actual synthetic workflow export.
- design/deck-overview.png and orchestration-desktop-flow.png: current previews. prototype-desktop.png retains the Overview machine view.
- apps/web/DESIGN.md: built design system.
- docs/SKILLS-USED.md and docs/VERIFICATION.md: provenance and verification.

Original presentation filenames also point to the current orchestration revision. The earlier Redesigned filenames retain the preceding revision. Historical files are preserved in output/archive-v1.

## Prototype
The default screen is one component-based operations dashboard. Add a repository with **Connect & inspect**, inspect its detected stack and verification plan, request **Scan now**, and inspect confirmed findings. Inventory covers up to 1,000 exact dependencies; OSV queries are split into batches of at most 100. The separate worker checks every 300 seconds by default while it is running. Source failures stay visible. A read-only Groq scout triages newly observed forum leads; OSV or the supported image vendor establishes corroborated findings. Advisories for the same package, manifest, installed version and exact target share one repair run and draft, with expandable advisory evidence.

Follow the simple six-step journey or expand the real React Flow graph, checks, candidate diff and observed analytics. Model tokens, phase timings and outcomes come from stored runs with visible sample counts. Historical synthetic prototype source/assets are not routed into the developer experience.

Companies can currently add repository URLs using the server's GitHub identity. Automatic central verification requires public source, branch-write access and an exact supported package/manifest test plan. A selected-repository GitHub App, private-repository checkout, customer identity and tenant isolation remain planned. Read [repository onboarding and exact coverage](docs/REPOSITORY-ONBOARDING.md). There is no X connector, universal exploit discovery, continuous local-file pentesting or automatic merge/deployment. One SQLite worker handles monitoring and queued runs; checkpoints preserve graph history but do not automatically replay side effects after worker loss.

The real Bklit Gauge displays observed check coverage. The original 63-part Anatomy mechanism remains in historical pitch/prototype assets, off-route. Skills were fetched into .agents/skills and read for the design work. The original white/cobalt concept is a legacy reference.

Downloaded authoring skills are local tools excluded from Git. The required
Anatomy geometry modules and MIT licence are vendored under
`design/anatomy/vendor/` so artwork generation does not depend on those tools.

## Verification
Run `npm run typecheck`, `npm test` and `npm run build` from the root. Product CI runs the same checks. Tests cover graph routing/checkpoints, bounded inventories and sources, scoped repair, evidence identity, cancellation, provider failures and GitHub publication boundaries. Actual live-run artifacts are separate from mocked unit tests and retained synthetic prototype tests.

## Team
A: frontend/demo. B: Supply Chain. C: Remediation. D: DevSec/controller. Research and pitch are shared. A 48-hour MVP window is provisional.

## Canva
Generation was blocked by account credit quota; browser import required disabled local-file access. No editable Canva design was created. The finished PPTX can be imported using Canva Upload files.
