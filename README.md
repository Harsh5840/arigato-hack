# ProofPatch

Four-member Open Innovation hackathon project. Checkpoint 1 weights: problem 35%, idea 30%, business 25%, development 10%. Implementation status checked **25 October 2026 (Asia/Calcutta)**; earlier pitch and research assets retain their original dates.

ProofPatch is a separate-server supply-chain watch service: connect GitHub repositories, match their exact dependency inventory against corroborated advisories, and route supported fixes through **LangGraph + LangChain ChatGroq** to a draft PR for human review. One dashboard shows a six-step explanation, the technical React Flow graph, source health, findings, actual model calls, tests, diffs and PRs. Read [the live demo guide](docs/LIVE-DEMO.md) for setup and the judging walkthrough.

Generic inventory supports exact Python requirements, npm package-lock files and Composer lockfiles. Newly added repositories are monitored; automatic repair requires a maintainer-reviewed policy. The current Python policy upgrades Requests while preserving application source. The retained Japanese PHP policy repairs three reviewed runtime/configuration declarations. This is extensible orchestration, not a claim that arbitrary framework migrations already work.

Published targets: [Sakura Python demo](https://github.com/Harsh5840/arigato-python-demo) and [SakuraShop PHP demo](https://github.com/Harsh5840/arigato-php-demo). Their main branches deliberately retain affected baselines; never deploy them. PHP PR #1 is the earlier prepared fixture repair;
live runs and their own PR/CI links are recorded under `output/live-runs/`. Read the
[implementation handoff](docs/IMPLEMENTATION-HANDOFF.md) for exact commits,
checks, current limits and the next implementation slice.

Current LangGraph example: [automatically generated Python draft PR #1](https://github.com/Harsh5840/arigato-python-demo/pull/1), [actual passing verification](https://github.com/Harsh5840/arigato-python-demo/actions/runs/40126005250) and [preserved run evidence](output/live-runs/444cd3c2-0d9d-4cc4-b53c-2f08d67cf33e/run.json). It upgraded Requests 2.31.0 → 2.34.2, recorded 11 passing controller/evidence checks including the five runner gates and 12 business assertions, and created one draft for the grouped advisories.

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
The default screen is one component-based operations dashboard. Connect/select repositories, enable scheduled watch, request **Watch now**, and inspect confirmed findings. The separate worker checks every 300 seconds by default while it is running. Source failures stay visible. A read-only Groq scout triages newly observed forum leads; OSV corroboration and exact installed versions establish repair findings. Several advisories for the same package/version/target are coalesced into one repair run and draft.

Follow the simple six-step journey or expand the real React Flow graph, checks, candidate diff and observed analytics. Model tokens, phase timings and outcomes come from stored runs with visible sample counts. Historical synthetic prototype source/assets are not routed into the developer experience.

Companies can currently add accessible repository URLs using the server's GitHub identity. A selected-repository GitHub App, customer identity and tenant isolation remain planned. Read [repository onboarding and exact coverage](docs/REPOSITORY-ONBOARDING.md). There is no X connector, universal exploit discovery, continuous local-file pentesting or automatic merge/deployment. One SQLite worker handles monitoring and queued runs; checkpoints preserve graph history but do not automatically replay side effects after worker loss.

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
