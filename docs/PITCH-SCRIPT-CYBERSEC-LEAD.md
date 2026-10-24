# ProofPatch pitch for a cybersecurity lead

Use this with the Checkpoint 1 deck. Slides 11 and 12 are backup. The three-agent architecture below supersedes the earlier Scout/Challenger/Fixer names. Rehearse at roughly 125–135 words per minute and reserve time for demo actions. The five-minute timing is a target, not a guarantee of delivery speed.

Allocation follows the judging weights: problem 105 seconds, idea 90 seconds, business 75 seconds, development 30 seconds.

The spoken passages describe the proposed security workflow and distinguish it from the synthetic prototype. Do not improvise claims about live agents, actual exploit execution, paid users, or measured savings.

## Slide 1 | 0:00–0:10

ProofPatch turns a security finding into a proposed fix with evidence a reviewer can replay. Today, we are demonstrating the review workflow.

## Slide 2 | 0:10–1:00

When a security finding reaches a small SaaS team, the remaining work is application-specific. Is the affected dependency actually used? Can we reproduce the issue with the right authentication and data? Does the patch preserve legitimate behavior? Can another developer verify the result?

Those questions determine whether a fix is ready to merge. Severity scores and generated explanations help, but the reviewer still needs evidence tied to the application.

Our hypothesis is that preparing that evidence creates avoidable developer work. We have mapped the workflow and researched existing products. Customer interviews and measurements are our next validation step.

## Slide 3 | 1:00–1:45

Consider our synthetic invoice example. Tenant B requests Tenant A's invoice and receives a 200 response with the invoice data. That is an object-level authorization failure.

The proposed repair scopes the lookup to the tenant in the authenticated session. But returning 404 for every invoice would also block the attack while breaking the product.

The reviewer therefore needs two outcomes: the cross-tenant request is denied, and the invoice owner can still read the invoice.

We are starting with this narrow problem for TypeScript SaaS teams with five to thirty developers.

## Slide 4 | 1:45–2:15

Our three agents separate responsibilities. Supply Chain matches inventory to upstream advisories and compromise alerts. Remediation proposes compatible updates and code repairs. Development Security monitors local changes, freezes baseline checks, and verifies candidates with scoped security tests and legitimate-use controls.

A deterministic controller routes work. The evidence gate blocks missing checks and unresolved follow-up. Remediation cannot edit the frozen verifier, and no agent owns merge authority.

## Slide 5 | 2:15–2:45

Here, the cross-tenant request changes from 200 to 404. The owner's request remains 200.

Now consider a patch that denies both requests. Security replay passes, but the legitimate-use check fails. ProofPatch holds the draft.

That failure path is the important demonstration. Verification means the recorded checks passed for the recorded code. It does not establish that the application has no other vulnerabilities.

## Slide 6 | 2:45–3:15

Existing tools already automate dependency updates, code repair, and parts of verification. Our research includes Dependabot, GitHub Agentic Autofix, Snyk, and Aikido.

Our proposed focus is portable tenant-boundary regression packs and customer-owned execution for small teams. We must prove that this reduces setup and review work compared with their existing tools.

Three agents describe the architecture. Customer value must come from the results.

## Slide 7 | 3:15–3:40

We would test a price of 4,999 rupees per workspace per month, including three repositories and thirty bounded runs.

At an assumed twenty-five rupees per run plus infrastructure, contribution is about seventy-five percent. At one hundred rupees per run, it falls to thirty percent. Run budgets and retries therefore matter to the business.

## Slide 8 | 3:40–4:05

Before expanding, we plan ten interviews, five observations of actual remediation work, three scoped pilots, and two paid commitments.

We would ask teams to walk us through a recent finding, then compare the pilot against that workflow. These are validation targets. We have no customers, completed pilots, or measured willingness to pay yet.

## Slide 9 | 4:05–4:30

Our target is thirty percent less active remediation time on matched tasks. We will also track invalid patch promotion, review usefulness, onboarding effort, and cost including retries.

A faster workflow has little value if it gives reviewers false confidence. The pilot must show useful evidence and preserve legitimate behavior before we expand coverage.

## Slide 10 | 4:30–5:00

This checkpoint implements the React Flow orchestration view and review workflow with synthetic outcomes. Real agent execution, scanning, isolated tests and GitHub integration come next.

Here, a failed legitimate-use check holds the patch. Passing every check enables developer review. We are seeking three design partners to test that handoff.

## Demo setup and actions

Before presenting, open http://127.0.0.1:3000. The Agents screen is the new default. Show the three roles and the deterministic control layer during slide 4. Then open Overview, reset the demo, click Run demo, and wait for the finding dialog. Select Regression fails. This returns the candidate to the verification step. Leave the dialog ready on slide 10. Keep the PDF and a screenshot available as fallback.

During the final 30 seconds:

1. Click Verify. Point to the failed benign regression and the blocked draft.
2. Select All checks pass. Click Verify again.
3. Point to the satisfied gate and Prepare draft action. Say that a human still owns the merge.
4. If time remains, prepare the local draft and identify it as a preview. It does not create a GitHub PR.

The mechanical interlock illustrates the same seeded conditions. The animation and gauge do not execute security tests.

## If the judge interrupts

### Is this an end-to-end, fault-proof system?

"End-to-end describes the intended handoff from advisory or local finding through repair, verification and review. It is not a security-completeness claim. Coverage is bounded by the adapters, test oracle, fixtures and environment. Unknown or inconclusive evidence must remain unresolved."

### How would your Supply Chain Agent handle the recent PHP issue?

"First distinguish a vulnerable runtime from a compromised package. Our PHP snapshot retains the October 23 environment follow-up after the October 21 runtime advisory. The separate Composer compromise snapshot retains incident and credential response. Both stay ineligible for draft promotion despite represented passing checks. These are researched scenarios, not executed PHP scans."

### Why exactly three agents?

"They have different tools and write permissions: upstream intelligence, candidate repair, and independent verification/local monitoring. The controller is deterministic infrastructure. The architecture earns its complexity only if the scoped handoffs produce more useful evidence than a simpler workflow. Separate names alone do not establish independence."

### What is actually built?

"The React Flow graph, selectable agent contracts, handoff simulator, stop/reset, trace export, per-finding workflow, eligibility logic and local draft preview are implemented. The demo supplies seeded results. No scanner, model agent, file watcher, exploit test, sandbox, or GitHub integration runs today. Gate and transition tests validate frontend behavior, not the security of an application."

### Why would I trust a test written by an LLM?

"A generated test is a candidate that needs an oracle. For tenant isolation, we define the expected policy and authenticated fixture users independently. The planned verifier combines a frozen security regression with reviewer-owned legitimate-use controls and held-out benchmark cases. Freezing a wrong test does not make it correct."

### Who verifies the verifier?

"The gate checks whether required evidence exists and agrees. It cannot prove that the test covers the right behavior. We still need reviewer-approved security properties, trustworthy execution, adversarial benchmark cases, and human review. Separate agent names or a second model opinion do not establish independence."

### How do you prevent Remediation from changing the tests?

"The MVP design puts the verification harness outside Remediation's writable branch. DevSec records the baseline before candidate writes. The runner replays the harness against pinned commits; the controller checks test and code identities before draft eligibility. These permission boundaries are planned requirements, not controls enforced by today's frontend."

### Could a model invent passing evidence?

"Today, the evidence is explicitly synthetic, including the commit and test labels. In the MVP, results must come from the runner and be bound to the executed code and tests. The controller must not accept model-authored success text as a test result. Hashes alone would not make a compromised runner trustworthy."

### What if you cannot reproduce a finding?

"Return not reproduced or inconclusive and preserve the evidence. A timeout, failed setup, or missing fixture cannot become a pass. Failure to reproduce is not proof that the issue is absent."

### Is this continuous pentesting?

"Our first implementation target is bounded, authorized regression checks in an owned fixture or approved staging environment. General autonomous pentesting is outside the current scope. Passive configuration checks are labeled separately from active security tests."

### What prevents your agents from becoming the attack path?

"The planned runner is ephemeral, uses no production secrets, denies network egress except approved destinations, and has short-lived scoped credentials and run budgets. Repository text, advisories, and logs are untrusted input. They cannot grant tool permissions. We must test those boundaries before real customer execution."

### Does a customer-owned runner keep all code private?

"It gives the customer control over execution. It does not automatically settle model data access. We would still need an explicit code-sharing policy, minimum necessary context, secret redaction, provider retention settings, and clear artifact retention. We have not implemented or validated that data path yet."

### Why three agents?

"The roles separate responsibilities, permissions, and artifacts. The number of model calls can change. Deterministic workers should handle tasks that do not need model reasoning. We must measure reliability and cost rather than assume that more agents produce better security."

### How is this different from Dependabot, GitHub, or Aikido?

"Existing tools overlap materially. Our testable focus is small-team onboarding, portable tenant-boundary regression packs, and customer-controlled execution. We have not demonstrated a product advantage yet. A scoped comparison must show less review effort or more useful evidence."

### What do you mean by updating to the latest version?

"The intended policy is a supported, compatible release that fixes the advisory, followed by lockfile regeneration and application tests. A major migration is a review decision. The newest release is not automatically the right repair."

### Does a passing replay mean the vulnerability is fixed?

"It supports a narrower statement: the tested failure did not occur on the recorded candidate under the tested conditions, and the selected legitimate-use controls passed. Untested paths, incomplete properties, and environment differences remain possible."

### What would convince you this works?

"The MVP must demonstrate a real failure-before and pass-after loop, plus bad candidates that stay blocked. The proposed 12-case benchmark includes seeded vulnerable cases, clean controls, and near-misses. It should include broad-denial patches, changed tests, stale commits, and timeouts. Then pilot teams must reproduce the evidence and show a useful reduction in active review work."

### How will you measure the thirty percent target?

"Compare active developer remediation time on matched tasks against the team's existing workflow. Track review acceptance, invalid promotions, onboarding, and compute costs as well. Thirty percent is a target. We have no measured result yet."

### Why would a small team pay?

"They might pay if the workflow saves meaningful developer time and produces evidence reviewers use. We do not know that yet. The proposed pilot price tests willingness to pay, and observed workflows tell us whether reproduction and review are expensive enough to justify it."

## A sixty-second version

"ProofPatch focuses on a specific security review decision: does this proposed patch stop the reported failure while preserving legitimate behavior?

Our synthetic example is a tenant-authorization bug. Tenant B can read Tenant A's invoice. A repair must deny that request while still allowing the owner to read it.

Supply Chain identifies upstream risk, Remediation proposes the repair, and DevSec monitors local changes and verifies candidates. A deterministic gate holds a failed regression even when security replay passes. A human owns the merge.

Today, we have an interactive prototype with seeded outcomes. The next milestone is one real loop in an isolated fixture, with evidence tied to the executed code and tests.

We are seeking three design partners to compare that evidence and review effort with their existing workflow."

## Optional four-person handover

| Presenter | Slides | Time | Handover |
|---|---|---:|---|
| A | 1–3 | 105 seconds | "That review requirement defines our architecture." |
| B | 4–6 | 90 seconds | "We also need to show that teams value this workflow." |
| C | 7–9 | 75 seconds | "Here is the workflow we can demonstrate at this checkpoint." |
| D | 10 | 30 seconds | Demo and design-partner request |

One presenter can deliver the full script if handovers would slow the pitch.

## Delivery notes

Speak as someone proposing an engineering system that can be examined. Use the authorization example to make the security property concrete. Spend the technical explanation on the gate, the negative control, and the boundary between a model's proposal and runner evidence.

Keep the distinction between design and implementation explicit. Use "the proposed runner" and "the MVP will" for controls that do not exist yet. Use "the prototype demonstrates" for the synthetic workflow.

Useful closing sentence for follow-up discussion:

"For this finding, on this commit, we want to show what failed, what changed, and what passed, so the reviewer can make the decision."

Existing research citations and full competitor links are in PRD.md and the deck's speaker notes. This script adds no new research or customer claims.
