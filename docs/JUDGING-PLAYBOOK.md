# Checkpoint 1 playbook

## Pitch allocation

For a five-minute presentation, mirror the judging weights. Slides 11–12 are backup and not in the timed pitch.

| Criterion | Weight | Pitch time | Evidence |
|---|---:|---:|---|
| Problem statement understanding | 35% | 105 seconds | Persona, current workflow, friction, industry context, interview hypotheses |
| Idea judgement | 30% | 90 seconds | Three roles, verification gate, competitor reality, proposed wedge |
| Business understanding | 25% | 75 seconds | Buyer, pricing hypothesis, cost sensitivity, distribution and validation |
| Development | 10% | 30 seconds | Clickable prototype and honest implementation status |

Suggested sequence: slides 1–3 problem (105 sec total); slides 4–6 idea (90 sec); slides 7–9 business (75 sec); slide 10 and a short demo development (30 sec). Allocate approximately 10/50/45, 30/30/30, 25/25/25, and 30 seconds respectively. If judges provide another duration, scale proportionally.

## Opening

“Imagine a small SaaS team receives an authorization finding before a release. A dependency bot cannot fix the team's custom tenant logic. A generated patch is useful, but the reviewer still needs to know that the bad request is blocked and the real customer journey still works. ProofPatch is our attempt to package that evidence into the remediation workflow.”

Do not claim all tools lack verification. Acknowledge incumbents before explaining the narrow audience and proposed product focus.

## 30-second demo

Click Run demo and explain the invoice scenario. Open the patch tab, then Review. Point to the legitimate-use regression requirement. Prepare the local draft and say: “This checkpoint demonstrates the workflow using synthetic data. The next phase connects a real scanner and isolated runner.” If time permits, show the blocked-regression path. Keep a screenshot and recording ready for unreliable presentation Wi-Fi.

## 90-second follow-up demo

1. 0–15 sec: explain cross-tenant impact, then Run demo.
2. 15–35 sec: show the patch and before/after security expectation.
3. 35–55 sec: choose Regression fails, rerun verification, show blocked promotion.
4. 55–75 sec: choose All checks pass, verify, prepare the local draft.
5. 75–90 sec: export JSON; identify synthetic labels and future integration work.

## Questions judges will ask

**How is this different from Dependabot?** Dependabot already raises dependency security-update PRs. Our initial hypothesis focuses on custom tenant-boundary logic and the review evidence around a fix. We still need to prove teams value this packaging.

**How is it different from GitHub or Aikido?** Both overlap materially. We are not claiming invention of autonomous remediation. We are testing whether small teams prefer portable regression packs, customer-controlled execution, and bounded onboarding/cost. A benchmark and interviews must establish any advantage.

**Why three agents?** Different permissions and explicit artifacts make the workflow understandable and auditable. Agent count is not a moat. The same architecture could use fewer model calls or conventional workers where appropriate.

**Who verifies the verifier?** Frozen test identities, deterministic promotion rules, benign controls, adversarial benchmark cases and human review. A second model opinion alone is insufficient.

**What if the latest package breaks the app?** Choose a supported compatible fixed release, update the lockfile, and run contract and application tests. Major migrations remain a review decision.

**Does this continuously pentest production?** No. The prototype performs no scanning. The planned MVP runs bounded, authorized checks against owned ephemeral fixtures or approved staging. Passive checks are labeled separately.

**What is actually built?** Interactive Next.js frontend, per-finding states, filters, failure gate, local draft preview, persistence, evidence export and roadmap. Scanner adapters, model agents, sandbox and GitHub integration are future phases.

**Will customers pay?** Unknown. ₹4,999 is a testable pilot price, not validated demand. The plan is 10 interviews, 5 workflow observations, 3 pilots and 2 paid commitments.

**What is your TAM?** We have not estimated it credibly yet. We will build a reachable customer list. The ₹59.988 lakh figure is only a 100-customer annual-revenue scenario.

**What happens if it cannot reproduce the issue?** Report not reproduced or inconclusive, preserve the evidence, and request human investigation. Do not silently mark the app safe.

## Interview script

Ask about concrete past behavior before presenting the product:

1. Walk me through the last security finding your team resolved.
2. Which step took the most active work? Can we see the artifacts?
3. What did the reviewer need before merging?
4. Which current tools do you use and pay for? What do they already solve?
5. Have tenant-boundary or authorization issues occurred? How were they caught?
6. What access or runner setup would be unacceptable?
7. Which evidence would change your decision to merge?
8. Would you run one scoped pilot on a non-production fixture? What success condition would justify paying?

Record consent, team size, stack, tools, recent task evidence, time estimates with uncertainty, objections and follow-up. Do not write fictional interview quotes or claim recruitments that have not happened.

## Submission checklist

- A specific buyer and developer user.
- A problem rooted in observable workflow, with assumptions marked.
- A clear explanation of Supply Chain, Remediation, Development Security, the deterministic controller and the gate. Use the current THREE-AGENT-ARCHITECTURE.md and cybersecurity-lead pitch script.
- Acknowledged competition with dated sources.
- Pricing arithmetic and uncertainty, not fabricated market claims.
- Roadmap with exit criteria and four-member ownership.
- Working prototype with an explicit simulated-data notice.
- One failure-path demonstration, not just a happy-path animation.
- A concrete request: three design partners and feedback on trust/onboarding/payment.
