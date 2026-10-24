# ProofPatch

Four-member hackathon package. Checkpoint 1 weights: problem 35%, idea 30%, business 25%, development 10%. Research and redesign checked 24 October 2026.

The team is in the Thapar Japan Hackathon's **Open Innovation** track. The live
flow connects Japanese PHP advisories to actual Groq analysis/repair/review,
frozen PHP checks on GitHub Actions, and an automatically created bilingual
draft PR. Read [the live demo guide](docs/LIVE-DEMO.md) for setup, the judge's
walkthrough and the exact execution boundaries.

Published review target: [SakuraShop PHP demo](https://github.com/Harsh5840/arigato-php-demo)
and its draft repair PRs. PR #1 is the earlier prepared fixture repair;
live runs and their own PR/CI links are recorded under `output/live-runs/`. Read the
[implementation handoff](docs/IMPLEMENTATION-HANDOFF.md) for exact commits,
checks, current limits and the next implementation slice.

Judge target: [live draft PR #3](https://github.com/Harsh5840/arigato-php-demo/pull/3),
[passing PHP verification](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40120547241),
and [preserved run evidence](output/live-runs/3ea42f72-8ed5-40f3-9a46-0579fbea3a68/run.json).

## Run
Requires Node 22.12+ and npm. From a fresh clone:

```sh
npm run setup
# Copy .env.example to .env and configure Groq/GitHub authentication.
npm run dev
```

Open http://127.0.0.1:3000. The command starts frontend, API and worker.
The server is a local demo; see the live guide before hosting it elsewhere.

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
The default Agents screen uses actual React Flow and persisted live execution. It shows official source evidence, Groq calls, CI progress, runtime/business results and the resulting draft PR. Select a role, inspect English/Japanese summaries, drag/zoom the graph, cancel work, recover stored runs and export evidence. The separate Simulation mode keeps the earlier dependency/local-code scenarios; Overview keeps its synthetic finding-level demo.

The live integration is deliberately scoped to one owned PHP fixture and one verified advisory case. General scanning, RCE exploitation, forum/X discovery, continuous local monitoring, multi-tenant authentication and production SaaS controls remain planned. Prepared/synthetic examples retain their labels. No automatic merge or deployment is performed.

Real Bklit Gauge source and an original 63-part Anatomy mechanism drive the review display. Skills were fetched into .agents/skills and read for this redesign. The original white/cobalt concept is now a legacy reference.

Downloaded authoring skills are local tools excluded from Git. The required
Anatomy geometry modules and MIT licence are vendored under
`design/anatomy/vendor/` so artwork generation does not depend on those tools.

## Verification
Run `npm run typecheck`, `npm test` and `npm run build` from the root. Product CI runs the same checks. Backend tests cover scoped repair, evidence identity, cancellation, provider failures and GitHub publication boundaries; browser checks cover the connected live surface and retained simulator. Actual live-run artifacts are separate from mocked unit tests.

## Team
A: frontend/demo. B: Supply Chain. C: Remediation. D: DevSec/controller. Research and pitch are shared. A 48-hour MVP window is provisional.

## Canva
Generation was blocked by account credit quota; browser import required disabled local-file access. No editable Canva design was created. The finished PPTX can be imported using Canva Upload files.
