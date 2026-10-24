# ProofPatch

Four-member hackathon package. Checkpoint 1 weights: problem 35%, idea 30%, business 25%, development 10%. Research and redesign checked 24 October 2026.

The team is in the Thapar Japan Hackathon's **Open Innovation** track. The next
build proposal connects Japanese PHP advisories to repository inventory and a
bilingual human-review PR. Read [the end-to-end system-design draft](docs/HACKATHON-END-TO-END-PLAN.md)
and [the verified Japan use case](docs/JAPAN-USE-CASE.md) before building the backend.
Current agent execution in the frontend remains simulated.

## Run
Requires Node 22.12+ and npm. From a fresh clone:

```sh
cd apps/web
npm ci
npm run dev
```

Open http://127.0.0.1:3000. For production use `npm run build` then `npm start`.

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
The default Agents screen uses actual React Flow. Select a role, inspect its inputs/outputs/permissions, drag nodes, zoom or fit the diagram, then simulate a dependency or local-code handoff. Regression failures hold the draft. PHP and Composer snapshots retain owner follow-up even when represented checks pass. Stop/reset and JSON trace export work. The existing Overview keeps its finding-level demo, local draft and persistent evidence workflow.

This is a synthetic frontend prototype. No scanner, model agent, external pentest, repository mutation, GitHub write or recurring monitor is implemented. The dependency example uses a fictional package. Production controls in the PRD are planned requirements.

Real Bklit Gauge source and an original 63-part Anatomy mechanism drive the review display. Skills were fetched into .agents/skills and read for this redesign. The original white/cobalt concept is now a legacy reference.

Downloaded authoring skills are local tools excluded from Git. The required
Anatomy geometry modules and MIT licence are vendored under
`design/anatomy/vendor/` so artwork generation does not depend on those tools.

## Verification
Run npm run typecheck, npm test and npm run build from apps/web. Tests reject a patch if any evidence gate fails, including benign regression. Browser checks cover the main workflow, failure/retry, local draft, persistence, reset, filter, navigation, console and mobile layout.

## Team
A: frontend/demo. B: Supply Chain. C: Remediation. D: DevSec/controller. Research and pitch are shared. A 48-hour MVP window is provisional.

## Canva
Generation was blocked by account credit quota; browser import required disabled local-file access. No editable Canva design was created. The finished PPTX can be imported using Canva Upload files.
