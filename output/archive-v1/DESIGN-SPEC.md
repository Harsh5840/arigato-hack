# Visual implementation specification

Concept: `concept.png`, generated with the built-in imagegen tool on 24 October 2026. Concept dimensions: 1536 × 1024. No external raster assets are needed for the app; controls and icons are native components.

Direction: white reviewer workspace, pale cool-gray left navigation, navy typography, cobalt actions, thin gray rules. A 265px desktop rail and 71px header frame the main content. Use restrained radii and no decorative gradients. Primary task is reviewing evidence.

Tokens: ink #101633, muted #596785, blue #064df5, line #e0e6ef, pale #f7f9fc, green #128053, red #c82c35. Inter with Arial fallback; accessible system fallback if the font service is unavailable. Outline icons use lucide at roughly 1.8–2px strokes. Desktop H1 ~49px, section titles 20–22px, UI 13–17px.

Allowed overview copy: ProofPatch; Acme / Engineering; Overview; Findings; Evidence; Roadmap; Checkpoint 1; Interactive prototype; Workspace / Overview; Demo data; Reset demo; Ship the fix. Keep the proof.; Three agents. One reviewable security workflow.; Run demo; Open findings; Reproduced; Verified fixes; Human; Merge approval; Your security crew; Scout; Find what matters; Dependencies + code signals; Challenger; Prove the failure; Scoped regression checks; Fixer; Repair and recheck; Patch + evidence bundle; Priority queue; findings; All; Critical; High; Medium; Severity; Finding; Repository · Area; Status; Cross-tenant invoice access; Vulnerable dependency range; Missing security headers; billing-api; web-app; Authorization; Dependency; Configuration; Reproduced; Needs verification; Evidence preview; Synthetic demo fixture; Tenant B can read Tenant A’s invoice.; Before; After; 200 · unauthorized access; Not run; A fix is ready only after the check fails before and passes after.; Open finding; Activity; Workspace ready. Run the demo to follow the full workflow.

Required functional extensions: dialog for evidence/diff/review; local draft preview; explicit simulation notice; outcome selector with blocked path; JSON download; evidence library; roadmap/business view. These extend the initial concept using the same tokens and component styles. No product screenshot is used as application UI.

Responsive behavior: navigation becomes a horizontal row on mobile, metrics become 2×2, crew becomes vertical, queue keeps a horizontally scrollable table, evidence sits below it, and the dialog remains bounded by viewport height. Reduced-motion preference removes transitions.

Intentional departures from the generated concept: consistent real icon family; mobile layout; accessible dialogs; slightly denser table typography where required for real content; functional states beyond the static overview. Numeric values change as the synthetic workflow advances.
