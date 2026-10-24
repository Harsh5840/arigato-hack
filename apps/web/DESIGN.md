---
name: ProofPatch
description: A dark engineering workspace where evidence controls patch progression.
colors:
  primary: "#c7ef79"
  primary-hover: "#d6f99d"
  primary-text: "#18220e"
  background: "#151713"
  sidebar: "#11130f"
  panel: "#1a1d17"
  card: "#1b1e19"
  machine-panel: "#1e211b"
  ink: "#f1f1eb"
  muted: "#a0a29c"
  line: "#32352f"
  border: "#34392e"
  outline-background: "#252c1e"
  outline-text: "#d3efb0"
  critical-background: "#39231f"
  critical-text: "#ffb2a8"
  high-background: "#332c1c"
  high-text: "#eac38a"
  medium-background: "#2f3020"
  medium-text: "#d1d59c"
  destructive: "#f69790"
  flow-canvas: "#181c16"
  flow-toolbar: "#20251c"
  flow-node: "#22291d"
  flow-node-border: "#536144"
  flow-node-active: "#2d3823"
  flow-node-body: "#bac7ac"
  flow-edge: "#69795b"
  flow-arrow: "#879878"
  flow-edge-label: "#c5cdbb"
  flow-handle: "#9daf8d"
  flow-held: "#f4b0a1"
  flow-held-border: "#e9a08e"
  flow-control: "#2a3322"
  flow-control-hover: "#3b482f"
  flow-control-border: "#505c43"
  flow-control-ink: "#d6e5c6"
  role-selected: "#303d24"
  role-selected-border: "#8fba60"
  role-selected-ink: "#ddf8bc"
typography:
  headline:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  case-title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
  label:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "10px"
  button:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
  code:
    fontFamily: "Consolas, monospace"
    fontSize: "12px"
    lineHeight: 1.8
  flow-agent-title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  flow-system-title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  flow-agent-body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "11px"
    lineHeight: 1.45
  flow-edge-label:
    fontSize: "11px"
    fontWeight: 500
  inspector-title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  mobile-role-name:
    fontSize: "12px"
    fontWeight: 600
  mobile-handoff:
    fontSize: "10px"
    lineHeight: 1.8
rounded:
  chip: "4px"
  control: "6px"
  button: "7px"
  inset: "8px"
  panel: "12px"
  review-stage: "13px"
  dialog: "14px"
  flow-node: "10px"
  flow-controls: "5px"
spacing:
  icon-gap: "8px"
  control-x: "15px"
  mobile-gutter: "18px"
  panel: "20px"
  section: "24px"
  desktop-gutter: "32px"
  flow-node: "17px"
  flow-toolbar-x: "22px"
  mobile-summary-after: "23px"
  mobile-summary-row-y: "9px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.outline-background}"
    textColor: "{colors.outline-text}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 15px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  severity-critical:
    backgroundColor: "{colors.critical-background}"
    textColor: "{colors.critical-text}"
    rounded: "{rounded.chip}"
    padding: "3px 6px"
  scenario-select:
    backgroundColor: "#242f19"
    textColor: "#dae9c7"
    rounded: "{rounded.control}"
    padding: "9px"
  flow-agent:
    backgroundColor: "{colors.flow-node}"
    textColor: "{colors.ink}"
    typography: "{typography.flow-agent-title}"
    rounded: "{rounded.flow-node}"
    padding: "17px 17px 0"
    width: "250px"
  flow-agent-active:
    backgroundColor: "{colors.flow-node-active}"
  flow-system:
    backgroundColor: "{colors.flow-node}"
    textColor: "{colors.ink}"
    typography: "{typography.flow-system-title}"
    rounded: "{rounded.flow-node}"
    padding: "13px 16px"
    width: "250px"
  role-selected:
    backgroundColor: "{colors.role-selected}"
    textColor: "{colors.role-selected-ink}"
    rounded: "{rounded.control}"
    padding: "8px 11px"
  mobile-agent-summary:
    textColor: "{colors.ink}"
    padding: "0 0 18px"
---

# Design System: ProofPatch

## Overview

**Creative North Star: "Verification Interlock"**

A patch moves only when its proof aligns. The user-selected dark engineering workspace gives the evidence workflow the character of a precise instrument: charcoal surfaces, warm white type, restrained lime and an isometric mechanism whose position carries meaning.

The workspace is compact and operational. Selected findings, before/after evidence and explicit verification states carry the hierarchy. Public Sans keeps interface copy direct; thin borders and small tonal shifts organize dense information. The machine provides the signature silhouette and makes the gate tangible.

**Key Characteristics:**

- Charcoal surfaces with a muted olive cast and warm white text.
- Restrained lime for primary action, selection and satisfied evidence gates.
- Compact evidence surfaces with explicit status and human review authority.
- Functional isometric geometry tied to the selected finding's state.

This is the built frontend in `src/styles/workspace.css`, imported after the general stylesheet by `src/app/layout.tsx`. Its tokens override the starter dark theme. Implementation uses Next.js (16.4.3), React (19.3.1), Tailwind (4), locally loaded Public Sans, the installed Bklit gauge source and generated Anatomy geometry. `PRODUCT.md` and the layout direction contract constrain this document; the earlier root `design/DESIGN-SPEC.md` describes a rejected concept and is not visual authority.

Agents is the default view. It extends this identity with a real `@xyflow/react` orchestration canvas; Overview retains the isometric interlock and original evidence workspace. `src/styles/orchestration.css` follows the workspace stylesheet. The three product roles and their handoffs are governed by `../../docs/THREE-AGENT-ARCHITECTURE.md`, rather than inferred from decorative graph arrangement.

## Colors

The palette combines olive charcoal neutrals with a clear lime signal and warm severity colors. Frontmatter records the normative values; application custom properties remain the implementation source.

### Primary

- **Instrument Lime** (`primary`): primary action, focus outline, raised evidence gates and the patch cartridge. The legacy CSS name `--blue` resolves to this lime.
- **Light Lime** (`primary-hover`): primary button hover.
- **Dark Olive Ink** (`primary-text`): readable foreground on the lime action.

### Secondary

- **Critical Clay** (`critical-background`, `critical-text`): critical severity badge.
- **High Amber** (`high-background`, `high-text`): high severity badge.
- **Medium Khaki** (`medium-background`, `medium-text`): medium severity badge.
- **Regression Coral** (`destructive`): failed and blocked feedback; always paired with words or an icon.
- **Held Peach** (`flow-held`, `flow-held-border`): written held status and gate outline in the Agents surface.

### Neutral

- **Workspace Charcoal** (`background`) and **Navigation Charcoal** (`sidebar`): page and fixed navigation.
- **Evidence Charcoal** (`panel`, `card`): grouped findings and evidence.
- **Instrument Charcoal** (`machine-panel`): the slightly raised machine field.
- **Warm White** (`ink`): headings and main text.
- **Sage Grey** (`muted`): supporting copy and metadata.
- **Olive Dividers** (`line`, `border`): panel outlines, rows and structural divisions.
- **Diagram Charcoal** (`flow-canvas`) and **Toolbar Olive** (`flow-toolbar`): canvas field and grouped run controls.
- **Agent Olive** (`flow-node`, `flow-node-border`, `flow-node-active`): graph cards at rest and during the current simulated step. Completed role headings brighten to existing pale lime.
- **Routing Sage** (`flow-edge`, `flow-arrow`, `flow-edge-label`, `flow-handle`): visible connections, arrow direction, labels and port dots. `flow-node-body` carries secondary node copy.
- **Control Olive** (`flow-control`, `flow-control-hover`, `flow-control-border`, `flow-control-ink`): React Flow zoom/fit controls.
- **Selected Role Olive** (`role-selected`, `role-selected-border`, `role-selected-ink`): the inspector's pressed agent selector.

These Agents additions are intentional design advisory drift from the earlier saved record: adjacent olive tones and functional state colors, not a new visual world. Their exact built values are merged into frontmatter. The sidecar supplies named color metadata and derived tonal ramps; generated ramp steps are panel aids, not additional shipped application colors.

**The State Has Words Rule.** Color reinforces a written verification state. A lime cartridge alone never asserts that a patch is verified.

## Typography

**Display and Body Font:** Public Sans, loaded locally from `src/assets/fonts/PublicSans-Variable.ttf` through `next/font/local`, with sans-serif fallback.

**Code Font:** Consolas, monospace fallback, for the illustrative patch diff.

The type is close-set and functional. Large case titles contrast with small, regular-weight metadata; metrics use tabular numerals. Font synthesis is disabled.

### Hierarchy

- **Headline:** page heading; desktop role is in frontmatter, adapting to (26px) on mobile.
- **Case title:** selected finding; (35px) above the large-screen breakpoint, (26px) at the intermediate width, (31px) in the stacked tablet layout and the frontmatter size on mobile.
- **Title:** section hierarchy; compact panel headings use (15px), increasing to (17px) on large screens.
- **Body:** case and evidence explanation; hero support uses (13px), with mobile adaptation. The selected case summary is bounded to (43ch) on desktop.
- **Label:** metadata, severity and status. Contextual captions range from (8px) to (11px); preserve full words and the surrounding contrast.
- **Metric:** principal count (29px), line-height (1), weight (600), tracking (-0.025em); mobile count (26px).
- **Code:** readable, horizontally scrollable diff with distinct added/removed surfaces.
- **Graph role title:** `flow-agent-title`; system nodes use `flow-system-title`, preserving the distinction between three agents and infrastructure.
- **Graph body and routing:** `flow-agent-body` describes each agent; `flow-edge-label` names the handoff on its own dark backing. Graph labels are authored at their recorded size and scale with the React Flow viewport.
- **Inspector title:** `inspector-title`; the selected role's inputs, outputs and permissions use the incumbent compact body and label styles. The Agents mobile page heading is (27px).
- **Mobile role names and handoff:** `mobile-role-name` names all three agents in the first viewport; verbs use the existing label size and `flow-node-body` color. `mobile-handoff` uses existing lime for the written baseline → repair → replay → review sequence.

## Layout

The desktop shell has fixed left navigation (228px) and a top bar (64px). Content has a maximum width (1590px), desktop gutters (32px), a compact header and four metrics divided by vertical rules. The selected case and machine share a single bordered review stage, with columns `minmax(0,1fr) minmax(360px,1.23fr)`. The queue/evidence grid uses `minmax(0,1.85fr) minmax(270px,1fr)` with a (20px) gap.

At (1180px) and below, navigation narrows to (196px), content gutters become (23px), and queue/evidence stack; evidence itself briefly uses two columns. At (900px) and below, case and machine stack, and coverage/activity become one column. At (680px) and below, navigation becomes an in-flow horizontal row beneath the brand, content gutters become (18px), metrics form a two-by-two grid and evidence becomes a vertical card.

All views share five destinations in order: Agents, Overview, Findings, Evidence and Roadmap. The final orchestration stylesheet makes mobile navigation a five-column grid with an icon above each label, small gaps (2px), icons (15px) and labels (9px). Keep every destination visible at the available width.

On Agents at (680px) and below, a mobile-only role summary appears immediately after the hero and before the introduction/workbench. It uses three vertically stacked definition-list rows, then a written handoff. Each row has vertical padding (9px), each verb sits (4px) below its name, and the handoff has top margin (11px) and maximum width (48ch). Bottom padding (18px), an olive divider and bottom margin (23px) separate it from the introduction. It is hidden on desktop. The supplied (390 × 900) first-viewport capture exposes all three names, verbs and the handoff before the graph.

### Agents workbench

The run toolbar, case boundary, live written status and sized React Flow canvas form one bordered workbench. Below it, the selected-role inspector and evidence gate share columns `minmax(0,1.15fr) minmax(0,1fr)` with a (28px) gap; the gate has a vertical divider. Trace and advisory context follow as separated document sections, rather than an additional field of cards. At (1050px), toolbar wrapping and stacked introduction/caption preserve density. At (680px), the toolbar gives the case its own row, the inspector/gate stack and the divider becomes horizontal.

Desktop graph positions are authored in diagram coordinates: intake (0,0), controller (350,0), Supply Chain (0,160), DevSec (350,160), Remediation (700,160), shared evidence (0,430), gate (350,430), and human review (700,430). Nodes are (250px) wide before viewport scaling. The mobile graph is a vertical adaptation with controller, Supply Chain, DevSec, Remediation, gate and review; intake/evidence infrastructure is condensed out of the visible mobile canvas, while the inspector and captions preserve its meaning. Preserve the baseline, candidate replay and failed-check return routes at both sizes.

The actual canvas is explicitly sized by the component to (570px) desktop and (1160px) mobile. Mobile node coordinates use x (0) and y (0, 135, 365, 595, 825, 980) in that vertical order. `InitialFit` waits for both measured nodes (`useNodesInitialized`) and nonzero React Flow store width/height before fitting with zero-duration movement; built-in initial fit is omitted to avoid racing those measurements. Padding is (0.08) desktop and (0.3) mobile, including the manual fit control; zoom is bounded from (0.3) to (1.8). Rebuild the authored positions when crossing the mobile breakpoint. Keep the viewport fit tied to measured canvas dimensions so the vertical graph occupies the available width rather than collapsing into an unreadable corner.

Desktop candidate replay returns above the agent row; DevSec results descend to the gate, and the dashed failed-check route returns to Remediation. Mobile candidate verification and gate retry return on the right, while the Results route passes Remediation on the left. This routing preserves the repair loop without reversing its causal order.

Mobile findings use a **grid per table row**, not a wide scrolling table. The visually hidden header remains in the markup. Each row has columns (58px), a flexible text column and (20px): severity at left, title then visible status then repository in the middle, and the action at right. Selected and blocked rows remain understandable without horizontal discovery. The later mobile CSS block overrides the earlier table minimum-width rule.

The dialog is bounded to (860px), scrolls internally and stays within the viewport. On mobile its backdrop padding drops to (8px), comparison columns stack and footer controls flow vertically. Roadmap phase timing follows the phase heading as integrated metadata.

## Elevation & Depth

Resting surfaces use tonal layering and one-pixel borders. The isometric machine supplies literal depth through faces, edges, rails, feet and occlusion. Avoid adding shadow to each evidence panel; the implemented shadow belongs to the modal (`0 24px 90px #0008`), separated from the page by its dark translucent backdrop.

The Agents canvas uses a quiet dotted field, flat bordered nodes and labelled orthogonal routes. React Flow controls explicitly have no box shadow. Active and selected nodes gain a lime border or outline; held gates gain a peach border. These are state treatments rather than elevation.

**The Evidence Before Ornament Rule.** Geometry must explain the selected finding's progression. Keep the machine's five gate fingers and cartridge movement tied to evidence state.

## Shapes

Panels have gently rounded corners; controls are tighter and severity chips tighter still. Use the frontmatter radius roles, thin olive boundaries and aligned edges. Circular pipeline nodes and check indicators distinguish sequence and result from rectangular evidence surfaces. The machine uses crisp isometric solids and fine non-scaling strokes; its chamfered industrial silhouette is distinct from UI container corners.

Flow nodes use the dedicated `flow-node` radius; agent nodes have a larger minimum height (170px) than infrastructure nodes (88px). Small circular port handles (6px) and closed arrowheads distinguish connection points from status dots. Routes are smooth-step orthogonal paths; failed-check return uses a dashed stroke (`5 5`).

## Components

### Buttons and controls

Primary buttons are compact lime actions with dark text; outline buttons use a dark olive fill, pale lime text and a visible stroke. Subtle buttons support export and secondary actions with a quiet surface. Main buttons use the frontmatter padding, an icon gap (9px) and a transparent one-pixel border. Hover transitions run (160ms). Disabled buttons use a not-allowed cursor and opacity (0.5).

Keyboard focus uses a lime outline (2px) with offset (4px) on buttons, links, selects and focusable elements. The scenario chooser is a native select with a visible olive border. There is no text-entry field in this surface; do not infer one from the generic starter library.

### Navigation and filters

Navigation rows pair line icons with clear text. Active rows use an olive surface and pale lime text; hover brightens text and surface. Mobile navigation remains labeled. Queue filters use a dark segmented container with a filled selected segment. Preserve their distinct treatment from severity badges.

The saved navigation specimen contains all five destinations and the mobile icon-over-label grid. The Agents inspector's three role selectors use `aria-pressed`, a selected border and fill; selecting a system node changes the inspector to that infrastructure role without inventing another agent.

### Evidence panels and finding rows

Panels contain a heading, concise evidence and one clear review action. Before/after rows have their own inset surface and divider. Severity badges use a small radius, tinted background, outline and text. The selected queue row uses an olive fill; status includes both a dot and words. Evidence records open the same review workflow. Preserve the mobile row grid described in Layout.

### Review dialog

The dialog contains explicit synthetic notice, four-step progress, evidence/diff/review tabs, before/after comparison, check results, scenario control and action footer. A passing security replay alongside a failed benign regression remains blocked. Successful retry unlocks local draft preparation; the result is a local preview and is labeled accordingly. The current surface uses dialog semantics, keyboard handling and visible focus styling.

### Verification interlock

The Anatomy-generated SVG is composed of (63) parts in an (800 × 480) viewBox. Five physical check fingers represent baseline failure, candidate pass, benign controls, test identity and commit identity, in that order. The same five booleans feed the evidence gate count and the draft predicate.

At stage (0), no fingers are raised. At stages (1–2), baseline failure is established; candidate evidence remains pending. At verified stage (3), all five fingers rise and the lime cartridge passes the gate. In the regression-blocked state, the third finger stays down, four of five checks align and the cartridge stops before the gate. Stage (4) advances the cartridge further to represent a locally prepared draft. This is state-driven illustration, not a draggable machine or a live execution monitor.

Movement uses transform transitions (740ms) with `cubic-bezier(.22,.7,.25,1)`; successful cartridge movement waits (220ms) for the gates. SVG title/description expose the state and check mapping. Reduced motion disables this transition.

### Evidence gate

The compact gauge uses the actual installed Bklit `Gauge` source, dynamically imported with `ssr:false` from `evidence-coverage.tsx`. It is client-only. Five uniform notches use solid chart lime and the inactive border color, without a gradient. Each satisfied check adds (20%) and one notch; blocked regression is visibly **four lime notches and one dark notch**, beside “4 / 5 satisfied.” The written count and accessible section label carry the result while the client chart mounts.

### Simulation cues

The shell says “Synthetic workspace,” the machine says “Synthetic model,” evidence identifies synthetic fixtures, and activity copy says “Simulation only.” Preserve this repetition at the points where evidence could otherwise imply execution. No scanner, live agent, repository mutation or GitHub PR is implemented. JSON exports declare `SIMULATED_DEMO`, synthetic identifiers and limitations. Merge authority remains human.

### Agents and deterministic infrastructure

Exactly three graph nodes are product agents: **Supply Chain Agent** reads inventory and approved sources, **Remediation Agent** prepares candidate repairs in a planned disposable branch, and **Development Security Agent** establishes baselines and verifies candidates in a planned bounded fixture. The controller, repository/advisory intake, evidence store, deterministic gate and developer review are infrastructure or a human role. Node headers explicitly distinguish “Agent” from “Control layer”; the inspector states each selected role's inputs, outputs, planned tools and permission boundary.

The mobile-only summary is a semantic `dl` containing the same full agent names and responsibility verbs as the graph/inspector: “Discover upstream risk,” “Propose the repair,” and “Watch, test and verify.” It ends with “Supply Chain → DevSec baseline → Remediation → DevSec replay → human review.” This orientation remains legible before entering the longer interactive graph. Its `dt` rules explicitly reset inherited evidence-table width, padding and background; its `dd` rules reset inherited padding and margins so names/verbs read as stacked role descriptions rather than before/after cells.

Actual React Flow provides selection, dragging, zoom and fit controls. Nodes have target/source handles on all four sides; edges bind named `in-*`/`out-*` ports, use smooth-step routing, written handoff labels and closed arrows. Connections cannot be edited (`nodesConnectable:false`) and delete is disabled. Selected nodes use an outline (2px) offset (4px), matching the interface focus language. The graph is dynamically loaded client-side with a written loading state.

**The Baseline Before Candidate Rule.** Supply Chain sends its risk brief to DevSec; DevSec records an affected baseline and freezes checks before Remediation writes. Remediation returns the candidate to DevSec. Local-change jobs enter through DevSec and request repair directly. Gate failure routes the failed evidence back to Remediation for another candidate; passing security checks never erase failed legitimate-use controls.

### Run controls, gate and trace

Native case and candidate-outcome selects reset the prior run when changed and are disabled while running. “Simulate handoff” becomes “Stop simulation” during a run and “Run again” after it. Each step advances on a deterministic timer (850ms); no model executes. Written statuses cover idle, running, blocked, ready for human review, follow-up required and stopped. Reset clears the run and restores diagram positions; shell reset also remounts the Agents surface. Leaving Agents unmounts it and clears its run, while the existing per-finding demo stages retain local persistence.

The local-change sequence is controller → DevSec baseline/finding → Remediation → DevSec replay → gate. Other cases add Supply Chain before DevSec baseline. The five listed gate conditions cover baseline, candidate security pass, legitimate behavior, frozen test identity and code identity. Regression produces four recorded passes and an explicit failed legitimate-behavior row. PHP environment review and Composer incident/credential response remain **follow-up required even with five represented checks passed**. Stopped and incomplete runs cannot be draft eligible. Human review owns merge authority throughout.

The trace lists numbered role events and enables JSON export once an event exists. Export records `SIMULATED_DEMO`, run, roles, checks, eligibility, outstanding follow-up and limitations; no PR is created. Advisory source cards link researched PHP/Composer snapshots with a retrieval date; inventory, local events and execution outcomes are fictional. Keep real research context separate from simulated execution evidence.

Only edges incident to the currently running node animate. The reduced-motion rule disables edge-path animation and keeps scrolling automatic. The global reduced-motion rule also reduces interface transitions; motion cannot be required to understand the written trace or result.

## Do's and Don'ts

### Do:

- **Do** use the charcoal, warm white and lime roles to extend this engineering workspace.
- **Do** show a written status next to every meaningful color or gauge result.
- **Do** preserve all five gate conditions and the blocked middle finger when regression fails.
- **Do** retain visible status and a reachable action in every mobile finding row.
- **Do** preserve synthetic labels, human review authority, visible focus and reduced motion.
- **Do** treat `workspace.css` and the current feature components as the built visual source.
- **Do** preserve exactly three product agents and identify controller, evidence, gate and human review separately.
- **Do** keep DevSec baseline/frozen checks before repair, candidate replay and failed-check return visible at both graph sizes.
- **Do** keep advisory snapshots, fictional inventory and simulated test results explicitly distinguishable.
- **Do** retain owner follow-up as a hold even when all five represented checks pass.

### Don't:

- **Don't** describe simulated evidence, placeholder identifiers or local draft previews as live execution or a sent pull request.
- **Don't** advance the machine through a blocked gate or display five active gauge notches for four satisfied checks.
- **Don't** hide mobile status behind horizontal table discovery.
- **Don't** turn every panel into a floating shadow card or add decorative animation to verification states.
- **Don't** restore the earlier rejected concept from the root design specification.
- **Don't** present the deterministic controller as a fourth agent or grant an agent merge authority.
- **Don't** turn a ready graph state into an automatic merge or a guarantee of complete security.

Documentation basis: current source, the original desktop/mobile/blocked captures and the refreshed `orchestration-desktop.png`, `orchestration-mobile.png`, `orchestration-mobile-flow.png`, `orchestration-mobile-first-viewport.png` and `orchestration-blocked.png` in `.impeccable/review`. `REVIEW.md` and `VERDICT.md` record the original resolved material fixes. The Agents documentation update is recorded in `ORCHESTRATION-DOCUMENTATION.md`; separate review records own the disposition of the orchestration repairs. This document records built design truth rather than extending either review's scope.
