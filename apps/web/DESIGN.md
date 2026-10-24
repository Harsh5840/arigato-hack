---
name: ProofPatch
description: One light repository security console that shows how an advisory becomes a reviewed, tested draft repair.
colors:
  primary: "#2d5a1b"
  primary-hover: "#234914"
  primary-text: "#f4fbe9"
  lime: "#c7ef79"
  lime-soft: "#eef8da"
  lime-ink: "#2b4a12"
  background: "#f3f5f0"
  surface: "#fbfcfa"
  surface-2: "#f1f4ee"
  surface-3: "#e8ece4"
  ink: "#172019"
  ink-2: "#445045"
  ink-3: "#646e64"
  line: "#dde2d8"
  line-strong: "#c6cdbf"
  good: "#2b7438"
  good-background: "#e3f1e0"
  warn: "#925600"
  warn-background: "#fbefd8"
  bad: "#b0281f"
  bad-background: "#fbe6e2"
  neutral-background: "#eceee9"
  role-supply: "#2a78d6"
  role-fixer: "#eb6834"
  role-reviewer: "#1baf7a"
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
  live-flow-body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "10px"
    lineHeight: 1.5
  live-mobile-role-name:
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.5
  console-heading:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "22px"
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  measured-metric:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "27px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  console-flow-title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
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
  live-mobile-role-gap: "13px"
  live-mobile-summary-after: "20px"
  console-gutter: "28px"
  console-section-gap: "27px"
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
  live-flow-agent:
    backgroundColor: "{colors.flow-node}"
    textColor: "{colors.ink}"
    typography: "{typography.flow-agent-title}"
    rounded: "{rounded.flow-node}"
    padding: "17px"
    width: "250px"
  live-flow-system:
    backgroundColor: "{colors.flow-node}"
    textColor: "{colors.ink}"
    typography: "{typography.flow-system-title}"
    rounded: "{rounded.flow-node}"
    padding: "14px 17px"
    width: "250px"
  live-source-select:
    backgroundColor: "{colors.outline-background}"
    textColor: "{colors.flow-control-ink}"
    rounded: "{rounded.control}"
    padding: "10px 8px"
  live-mobile-orientation:
    textColor: "{colors.ink}"
    padding: "0 0 16px"
  repository-control:
    backgroundColor: "{colors.card}"
    textColor: "{colors.flow-control-ink}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  repository-popover:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.flow-node}"
    padding: "20px"
    width: "340px"
  console-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  console-mobile-roles:
    textColor: "{colors.flow-control-ink}"
    padding: "17px 15px"
---

# Design System: ProofPatch

## Overview

**Creative North Star: "The Repair Line"**

A security alert travels down one visible line: connect, watch, confirm, prepare, test and review. The console makes that line literal. A light engineering workspace (green-tinted neutrals, Public Sans, one deep-green action colour and brand lime for the subject) frames a live run card, an Anatomy-built isometric bench whose lime cartridge is the candidate fix, a six-step explainer and a timeline replayed from stored events.

The user replaced the earlier dark workspace with this light direction on 25 October 2026. `src/styles/console.css` is the only routed stylesheet; `workspace.css`, `orchestration.css`, `live-orchestration.css`, `operations.css` and `monitoring.css` style historical off-route components only and are no longer imported by `src/app/layout.tsx`.

**Key Characteristics:**

- Green-tinted light neutrals in one grey family; no pure white or black.
- One deep-green action colour; brand lime marks the subject, progress and the running step.
- Status colours are reserved and always paired with a word or icon.
- Three validated role hues (Supply Chain blue, Remediation orange, DevSec aqua) shared by the explainer chips, timeline lanes and token bars.
- Every figure and chart is posed or drawn from stored run evidence; nothing is simulated in the routed console.

## Colors

Frontmatter records the normative values; `:root` in `console.css` is the implementation source and also maps the shadcn and chart tokens consumed by `globals.css` and the Bklit gauge.

- **Action Green** (`primary`, `primary-hover`, `primary-text`): primary buttons, links, focus outline, selected tabs.
- **Brand Lime** (`lime`, `lime-soft`, `lime-ink`): the repair-line cartridge, the running step and station lamp, the flow progress line, selected rows. Never a status by itself.
- **Neutrals** (`background`, `surface`, `surface-2`, `surface-3`, `ink`, `ink-2`, `ink-3`, `line`, `line-strong`): page, cards, insets and three text levels. `ink-3` keeps at least 4.5:1 on both surfaces.
- **Status** (`good`, `warn`, `bad`, `neutral-background`): completed, held or warning, failed and cancelled. Reserved; never reused for a data series.
- **Role hues** (`role-supply`, `role-fixer`, `role-reviewer`): the three agent roles. Validated with the dataviz validator on `#fbfcfa`, all pairs: worst CVD delta E 9.2, worst normal-vision delta E 24.0. Aqua sits below 3:1 on the surface, so every role mark carries a visible text label.

**The State Has Words Rule.** Colour reinforces a written verification state. A lime cartridge alone never asserts that a patch is verified.

## Typography

**Display and Body Font:** Public Sans, loaded locally from `src/assets/fonts/PublicSans-Variable.ttf` through `next/font/local`, with sans-serif fallback.

**Code Font:** Consolas, monospace fallback, for actual patch text, model IDs, package versions and immutable identities; historical illustrative diffs use the same code voice.

The type is close-set and functional. Large case titles contrast with small, regular-weight metadata; metrics use tabular numerals. Font synthesis is disabled.

### Hierarchy

- **Current console:** body 14.5px with line-height 1.55; the hero title is fluid (32 to 46px, tracking -0.035em); section headings 20px; card headings 15 to 16px; supporting copy 13 to 13.5px; labels and chips 11.5 to 12.5px. Metrics use 30px tabular numerals (25px on mobile). Code, identities and timestamps use the system monospace stack. Timeline lane labels are 12.5px and axis ticks 11px monospace. The following earlier hierarchy remains specific to historical surfaces.
- **Journey and monitoring:** the journey heading uses (16px), step titles (12px), and supporting descriptions (11px). Mobile uses (15px), (11px) and (10px) respectively. Repository names and package versions wrap within their rows. These observed component sizes describe this implementation; they do not establish additional global type steps.

- **Headline:** page heading; desktop role is in frontmatter, adapting to (26px) on mobile.
- **Case title:** selected finding; (35px) above the large-screen breakpoint, (26px) at the intermediate width, (31px) in the stacked tablet layout and the frontmatter size on mobile.
- **Title:** section hierarchy; compact panel headings use (15px), increasing to (17px) on large screens.
- **Body:** case and evidence explanation; hero support uses (13px), with mobile adaptation. The selected case summary is bounded to (43ch) on desktop.
- **Label:** metadata, severity and status. Contextual captions range from (8px) to (11px); preserve full words and the surrounding contrast.
- **Metric:** principal count (29px), line-height (1), weight (600), tracking (-0.025em); mobile count (26px).
- **Code:** readable, horizontally scrollable diff with distinct added/removed surfaces.
- **Graph role title:** `flow-agent-title`; system nodes use `flow-system-title`, preserving the distinction between three agents and infrastructure.
- **Graph body and routing:** `flow-agent-body` describes Simulation nodes; `live-flow-body` describes Live nodes. `flow-edge-label` names the desktop handoff on its own dark backing. Live mobile edges use numbered keys with a full directional legend beneath the graph. Labels scale with the React Flow viewport.
- **Inspector title:** `inspector-title` belongs to Simulation; Live uses the existing title size for the selected execution role, followed by actual model ID, call status, summary and optional token usage. Live mobile page heading is (30px); Simulation uses (27px).
- **Mobile role names and handoff:** `live-mobile-role-name` names the three live roles beside compact responsibility text; `mobile-role-name` belongs to the retained Simulation summary. The written handoff uses `mobile-handoff` rhythm and existing pale lime.

## Layout

### Current single console

The sticky, translucent header and content share a maximum width (1320px) with desktop gutters (28px) and mobile gutters (16px). Order: hero (live run card plus the repair-line figure, columns `.78fr 1.3fr`), four metrics divided by rules, the six-step explainer, the run timeline, repositories and security watch (`1.1fr 1fr`), vulnerabilities, the selected case strip, the collapsed agent graph and event rail, workbench and review (`1.55fr 1fr`), then observations and run history.

At (1100px) the hero stacks, the step track becomes three columns without its connector line, and the event rail moves under the graph. At (960px) monitoring, developer and observation grids stack. At (740px) the header wraps with a full-width repository control, metrics become two-by-two and the station legend becomes two columns. At (560px) steps become compact rows with the icon on the left. Every single-column grid uses `minmax(0, 1fr)` so long identifiers cannot widen the page.

### Historical off-route workspace

The following sidebar, standalone Live Agents and Simulation layouts document retained source. They do not describe the routed console or add destinations to it.

The desktop shell has fixed left navigation (228px) and a top bar (64px). Content has a maximum width (1590px), desktop gutters (32px), a compact header and four metrics divided by vertical rules. The selected case and machine share a single bordered review stage, with columns `minmax(0,1fr) minmax(360px,1.23fr)`. The queue/evidence grid uses `minmax(0,1.85fr) minmax(270px,1fr)` with a (20px) gap.

At (1180px) and below, navigation narrows to (196px), content gutters become (23px), and queue/evidence stack; evidence itself briefly uses two columns. At (900px) and below, case and machine stack, and coverage/activity become one column. At (680px) and below, navigation becomes an in-flow horizontal row beneath the brand, content gutters become (18px), metrics form a two-by-two grid and evidence becomes a vertical card.

All views share five destinations in order: Agents, Overview, Findings, Evidence and Roadmap. The final orchestration stylesheet makes mobile navigation a five-column grid with an icon above each label, small gaps (2px), icons (15px) and labels (9px). Keep every destination visible at the available width.

On Agents at (680px) and below, Live service places a compact semantic role summary immediately after the hero and before service status and the workbench. Three definition-list rows pair full agent names with live responsibilities in two equal columns, separated by a (13px) gap and (9px) row gap. A written handoff follows with top margin (13px), line-height (1.8) and maximum width (48ch). Bottom padding (16px), an olive divider and bottom margin (20px) separate the summary from service controls. It is hidden on desktop. The final (390 × 844) mobile first-viewport evidence exposes all three roles and the handoff before the detailed graph. Simulation retains its stacked name/verb summary with bottom padding (18px) and bottom margin (23px).

### Historical standalone Live Agents workbench

Live source selection, run intent and the primary start/cancel action share a toolbar above the connected target and stored execution identity. The case summary uses columns `1.2fr 1fr` with a (30px) gap. The observed-check list and agent execution inspector use columns `1.15fr 1fr` with a (30px) gap; a vertical divider introduces the inspector. Source evidence, bilingual review, owner tasks and the event trace follow as document sections. Execution logs and Stored runs share columns `1.5fr 1fr` below. At (1100px), the toolbar wraps and gaps narrow; at (680px), the toolbar, case summary, evidence and history become single columns and side dividers become horizontal.

Live graph nodes are (250px) wide. Desktop positions are controller (410,0), Supply Chain (0,145), DevSec (410,145), Remediation (820,145), evidence gate (410,345) and human review (820,345). The wider agent gaps give `Affected inventory` and `Frozen baseline` clear routing space. Candidate replay returns above the agent row. The desktop canvas is (485px) high, fitting measured nodes with padding (0.08).

The live mobile graph stacks controller, Supply Chain, DevSec, Remediation, gate and human review at x (0), with y increasing by (174px). Its canvas is (1080px) high. Candidate replay and checks/review use separate right-side return lanes with offsets (40px) and (72px). Six numbered edge keys map to a complete directional legend beneath the canvas. Initial and manual fit use explicit bounds `x:-8, y:-10, width:356, height:1000` and padding (0.05), reserving room for both return lanes. Fitting waits for measured nodes and nonzero canvas dimensions; zoom is bounded from (0.3) to (1.6). Preserve the route extents in default fit so labels and arrows remain discoverable without dragging.

### Retained Simulation workbench

The run toolbar, case boundary, written simulation status and sized React Flow canvas form one bordered workbench. Below it, the selected-role inspector and evidence gate share columns `minmax(0,1.15fr) minmax(0,1fr)` with a (28px) gap; the gate has a vertical divider. Trace and advisory context follow as separated document sections. At (1050px), toolbar wrapping and stacked introduction/caption preserve density. At (680px), the toolbar gives the case its own row, the inspector/gate stack and the divider becomes horizontal.

Desktop graph positions are authored in diagram coordinates: intake (0,0), controller (350,0), Supply Chain (0,160), DevSec (350,160), Remediation (700,160), shared evidence (0,430), gate (350,430), and human review (700,430). Nodes are (250px) wide before viewport scaling. The mobile graph is a vertical adaptation with controller, Supply Chain, DevSec, Remediation, gate and review; intake/evidence infrastructure is condensed out of the visible mobile canvas, while the inspector and captions preserve its meaning. Preserve the baseline, candidate replay and failed-check return routes at both sizes.

The actual canvas is explicitly sized by the component to (570px) desktop and (1160px) mobile. Mobile node coordinates use x (0) and y (0, 135, 365, 595, 825, 980) in that vertical order. `InitialFit` waits for both measured nodes (`useNodesInitialized`) and nonzero React Flow store width/height before fitting with zero-duration movement; built-in initial fit is omitted to avoid racing those measurements. Padding is (0.08) desktop and (0.3) mobile, including the manual fit control; zoom is bounded from (0.3) to (1.8). Rebuild the authored positions when crossing the mobile breakpoint. Keep the viewport fit tied to measured canvas dimensions so the vertical graph occupies the available width rather than collapsing into an unreadable corner.

Desktop candidate replay returns above the agent row; DevSec results descend to the gate, and the dashed failed-check route returns to Remediation. Mobile candidate verification and gate retry return on the right, while the Results route passes Remediation on the left. This routing preserves the repair loop without reversing its causal order.

Mobile findings use a **grid per table row**, not a wide scrolling table. The visually hidden header remains in the markup. Each row has columns (58px), a flexible text column and (20px): severity at left, title then visible status then repository in the middle, and the action at right. Selected and blocked rows remain understandable without horizontal discovery. The later mobile CSS block overrides the earlier table minimum-width rule.

The dialog is bounded to (860px), scrolls internally and stays within the viewport. On mobile its backdrop padding drops to (8px), comparison columns stack and footer controls flow vertically. Roadmap phase timing follows the phase heading as integrated metadata.

## Elevation & Depth

The current console keeps the flat panel-and-divider vocabulary. Its native repository and Run options popovers use the functional shadow `0 12px 32px #11130f`; the header remains sticky above the document. Journey, repository and watch panels use tonal separation, one-pixel borders and inset rows. Inventory, scout, unconfirmed leads and technical orchestration use native disclosures rather than additional floating cards. The older modal and machine treatments below belong to retained, off-route components.

Resting surfaces use tonal layering and one-pixel borders. The isometric machine supplies literal depth through faces, edges, rails, feet and occlusion. Avoid adding shadow to each evidence panel; the implemented shadow belongs to the modal (`0 24px 90px #0008`), separated from the page by its dark translucent backdrop.

The Agents canvas uses a quiet dotted field, flat bordered nodes and labelled orthogonal routes. React Flow controls explicitly have no box shadow. Active and selected nodes gain a lime border or outline; held gates gain a peach border. These are state treatments rather than elevation.

**The Evidence Before Ornament Rule.** Geometry must explain the selected finding's progression. Journey steps and graph routes follow recorded state; the historical machine's five gate fingers and cartridge movement remain tied to its represented evidence state.

## Shapes

Panels have gently rounded corners; controls are tighter and severity chips tighter still. Use the frontmatter radius roles, thin olive boundaries and aligned edges. Circular pipeline nodes and check indicators distinguish sequence and result from rectangular evidence surfaces. The machine uses crisp isometric solids and fine non-scaling strokes; its chamfered industrial silhouette is distinct from UI container corners.

Flow nodes use the dedicated `flow-node` radius. Live nodes have minimum height (128px), while live infrastructure nodes use (90px); retained Simulation agent nodes use (170px) and infrastructure (88px). Small circular port handles (6px) and closed arrowheads distinguish connection points from status dots. Routes are smooth-step orthogonal paths; Simulation's failed-check return uses a dashed stroke (`5 5`).

## Components

### Current console composition

`OperationsDashboard` composes `DashboardHeader`, `ConsoleHero`, `RunMetrics`, `SecurityJourney` (the six-step explainer), `RunTimeline`, `RepositoryPanel`, `SecurityWatchPanel`, `FindingsPanel`, the disclosed `OrchestrationPanel`, `VerificationWorkbench`, `ReviewPanel` and `RunAnalytics`. `flow-model.ts` is the single source of the six steps: actor, receives, does, produces, cannot, the run-status to step mapping and the evidence line under each title. Selecting a step in the explainer or a station in the figure legend sets one shared focus.

**Repair-line figure.** Built by `design/anatomy/repair-line/build.mjs` with the vendored Anatomy kit into `repair-line.geometry.ts` (78 solids, seven settled paint orders). Six numbered stations map to the six steps. The cartridge moves to the active or last recorded station; when a run is blocked it stops at the lowered gate arm, which lifts only when a draft is allowed. Lamps are lime while running and ink once recorded; focusing a step dims the other stations. The kit audit passes in the rest, pressing, published and blocked poses and the line-end check reports 0 floating ends. It is an illustration posed from stored state and says so in its caption and SVG description.

**Run timeline.** One lane per actor; phase bars come from `phaseSegments` (tested) and take the owner's role hue; dashed verticals mark handoffs; event dots have hover and focus tooltips; one elapsed-time axis starts when work starts, with queue wait and post-run events reported in text. A disclosed event log is the table view. A running run draws a moving "now" line.

**Observations.** A run-history chart (bar height is elapsed time, colour plus a legend word give the outcome, click selects the run), token usage as direct-labelled role bars, and the run history table. Phase time now lives in the timeline.

### Repository connection and security watch

The connection form accepts a clean GitHub HTTPS URL with **Connect & inspect**, changing to **Detecting stack…** while pending. Repository rows use `aria-pressed` for selection, written **Watching / Paused** states and a wrapping owner/name. The selected repository shows **Detected stack**, **Verification plan** and a native **How this repository will be tested** disclosure with actual test commands in the code face. The concise **Verified fixes available / Monitoring available** status stays beside the GitHub link. **Packages & container images** expands the declared inventory.

Native checkboxes control **Watch for new vulnerabilities** and **Automatically prepare a draft fix**. Supported new public connections enable automatic draft preparation by default; reconnect preserves the saved toggle. Capability is determined by detected stack, relevant baseline tests, exact supported manifests and verified write access rather than repository names. The current adapters cover exact PyPI requirements, direct npm/Composer dependencies with committed locks, and official PHP/nginx image references in Dockerfiles or Compose YAML. Private, read-only, untested and unsupported connections retain written monitoring or owner-action reasons. The generic central verifier requires no custom target workflow. These constraints appear as concise capability text and test-plan disclosure, not extra setup steps.

Security watch displays the separate worker's heartbeat, next check and configured cadence, defaulting to (300 seconds), beside an immediate **Check sources now** action. Each source carries written health, timestamp and error text. Amber unconfirmed forum leads and recorded scout output remain in separate disclosures. The scout's model, summary and reported token count do not confirm a vulnerability or authorize repair. Source failure remains visible and never becomes a clean result. Scout tokens remain separate from the selected repair's reported usage; historical capture counts are observations, not specimen defaults.

### Six-step journey and affected findings

The ordered journey reads **Connect & inspect → Watch for alerts → Confirm the risk → Prepare the update → Test & review → You review the PR**. Supporting copy describes detected stack/tests, the exact affected package or image, the candidate branch, observed checks and the actual draft number when available. Drawn icons, numerals and words explain each step; completed icons and active olive fill reinforce the recorded state. A compact status rail gives the latest stored event and JST timestamp. The sequence is the primary beginner explanation; the interactive agent graph is available under technical details.

**Vulnerabilities found** pairs each affected package or image's installed and selected safe version, manifest and written status with a reachable action. Matching advisories for the same update share one row and one repair/test run; an **advisory matches · one repair** disclosure preserves each advisory's aliases and source evidence. Header counts distinguish affected packages/images from advisory matches. Container rows say **Old image → proposed update** or **Old image → tested updated image**. Eligible rows permit **Prepare draft fix**, existing runs offer **View fix & tests**, and unsupported rows retain **Owner action required**. Mobile keeps the status and action together below the evidence. Forum discovery leads do not appear as confirmed repair findings without corroborated advisory and installed-version evidence.

### Buttons and controls

Primary buttons are compact lime actions with dark text; outline buttons use a dark olive fill, pale lime text and a visible stroke. Subtle buttons support export and secondary actions with a quiet surface. Main buttons use the frontmatter padding, an icon gap (9px) and a transparent one-pixel border. Hover transitions run (160ms). Disabled buttons use a not-allowed cursor and opacity (0.5).

Keyboard focus uses a lime outline (2px) with offset (4px) on buttons, links, selects and focusable elements. The repository URL field has a dark inset surface, olive border, restrained rounding (5px) and visible label. Repository/watch settings use native checkboxes with the existing lime accent. The repository and live source choosers are native selects with visible olive borders; the historical scenario chooser retains its select treatment.

### Historical navigation and filters

Navigation rows pair line icons with clear text. Active rows use an olive surface and pale lime text; hover brightens text and surface. Mobile navigation remains labeled. Queue filters use a dark segmented container with a filled selected segment. Preserve their distinct treatment from severity badges.

The saved navigation specimen contains all five destinations and the mobile icon-over-label grid. The Agents inspector's three role selectors use `aria-pressed`, a selected border and fill; selecting a system node changes the inspector to that infrastructure role without inventing another agent.

### Historical evidence panels and finding rows

Panels contain a heading, concise evidence and one clear review action. Before/after rows have their own inset surface and divider. Severity badges use a small radius, tinted background, outline and text. The selected queue row uses an olive fill; status includes both a dot and words. Evidence records open the same review workflow. Preserve the mobile row grid described in Layout.

### Historical review dialog

The off-route dialog contains explicit synthetic notice, four-step progress, evidence/diff/review tabs, before/after comparison, check results, scenario control and action footer. A passing security replay alongside a failed benign regression remains blocked. Successful retry unlocks local draft preparation; the result is a local preview and is labeled accordingly. This retained surface uses dialog semantics, keyboard handling and visible focus styling.

### Historical verification interlock

The Anatomy-generated SVG is composed of (63) parts in an (800 × 480) viewBox. Five physical check fingers represent baseline failure, candidate pass, benign controls, test identity and commit identity, in that order. The same five booleans feed the evidence gate count and the draft predicate.

At stage (0), no fingers are raised. At stages (1–2), baseline failure is established; candidate evidence remains pending. At verified stage (3), all five fingers rise and the lime cartridge passes the gate. In the regression-blocked state, the third finger stays down, four of five checks align and the cartridge stops before the gate. Stage (4) advances the cartridge further to represent a locally prepared draft. This is state-driven illustration, not a draggable machine or a live execution monitor.

Movement uses transform transitions (740ms) with `cubic-bezier(.22,.7,.25,1)`; successful cartridge movement waits (220ms) for the gates. SVG title/description expose the state and check mapping. Reduced motion disables this transition.

### Historical five-condition evidence gate

The compact gauge uses the actual installed Bklit `Gauge` source, dynamically imported with `ssr:false` from `evidence-coverage.tsx`. It is client-only. Five uniform notches use solid chart lime and the inactive border color, without a gradient. Each satisfied check adds (20%) and one notch; blocked regression is visibly **four lime notches and one dark notch**, beside “4 / 5 satisfied.” The written count and accessible section label carry the result while the client chart mounts.

### Live execution, service state and results

The routed console uses the live service. It shows connecting, connected, reconnecting, offline and setup-required states with written feedback; missing service or credentials never substitute a fabricated result. Keys remain on the server. The retained manual PHP source chooser distinguishes fetched Japanese/vendor sources from a recorded advisory snapshot; both choices still use real models, checks and draft publication. The old Live service/Simulation switch exists only in historical off-route source.

The controller uses a persisted SQLite queue and a separate worker. The current repair pipeline traverses the shared LangGraph source, inventory, triage, baseline, repair, verify, review, gate and publish nodes, with an explicit blocked path. The frontend loads readiness and stored history, recovers the active or latest selected-repository run after reload, consumes SSE snapshots/events and uses a bounded (10-second) polling fallback while active. Selecting a Stored run retrieves its evidence. The live trace uses JST timestamps. Export includes the stored run and event record; browser state is not the source of execution truth. Cancel requests stop later stages, while already in-flight external writes or CI can remain recorded. Earlier PHP records retain their original execution provenance and must not be relabeled as LangGraph runs.

Supply Chain uses actual Groq model `openai/gpt-oss-20b`; Remediation and the DevSec senior reviewer use `openai/gpt-oss-120b` in separate contexts. The inspector exposes actual model IDs, call status, recorded summaries and token usage. Model review cannot override a failed deterministic check. These contexts do not establish independent-model assurance.

Observed checks, the real GitHub Actions link, runtime/policy output, candidate identity and a returned draft PR appear only from recorded results. English/Japanese display controls switch available senior-review and advisory text; owner tasks remain visible. A passing gate creates or reuses the matching draft PR at the verified candidate head, then presents its actual number and review link. Draft publication leaves merge readiness and finding closure false; a human reviews, merges, deploys and verifies the running service.

The current generic demonstrations link to actual Python [draft PR #2](https://github.com/Harsh5840/arigato-python-demo/pull/2), PHP [draft PR #6](https://github.com/Harsh5840/arigato-php-demo/pull/6) and Compose [draft PR #1](https://github.com/Harsh5840/arigato-container-demo/pull/1). The Compose update has seven HTTP assertions and (11) passing controller/runner gates, while the candidate scan still records (391) findings across all severities. A passed selected update therefore keeps residual findings and deployment follow-up visible. These counts are recorded examples, not permanent metric targets. Python PR #1, PHP PR #3 and earlier fixture-specific runtime/configuration records remain historical evidence with their original provenance.

### Retained Simulation and Overview cues

Simulation and Overview keep their synthetic fixture, machine and activity labels at the points where illustrative evidence could imply execution. They perform no external agent call, repository mutation or GitHub PR creation. Their JSON exports declare `SIMULATED_DEMO`, synthetic identifiers and limitations; their local draft previews remain labeled. These statements apply to the retained demonstrations, not the default Live service. Merge authority remains human across both modes.

### Agents and deterministic infrastructure

Exactly three graph nodes are product agents. Live **Supply Chain Agent** matches corroborated advisories to declared inventory; **Remediation Agent** proposes the supported package or image update; **Development Security Agent** denotes worker-controlled baseline/check execution and senior review in a separate model context. The generic path uses the detected test plan; package/lockfile changes and mechanical image-reference edits remain bounded to supported adapters. The controller, hosted verifier, publication gate and human reviewer are visibly distinct infrastructure or human roles. Retained manual PHP and Simulation profiles keep their historical inputs and boundaries; they do not define current generic eligibility.

Inside the current console's technical details, the mobile-only semantic `dl` names all three roles with “Advisory → inventory,” “Scoped candidate repair,” and “Baseline, checks, senior review.” It ends with “Supply Chain → DevSec baseline → Remediation → DevSec checks → human review.” The summary precedes the longer interactive graph. Its definition terms and descriptions reset inherited evidence-table width, padding, backgrounds and margins. Historical standalone Live source retains its earlier matching/repair descriptions, and Simulation retains its original discover/propose/watch descriptions.

Actual React Flow provides selection, dragging, zoom and fit controls. Live nodes expose named top/left/right target handles and bottom/right/top source handles; Simulation retains its four-sided ports. Smooth-step routes use closed arrows, with full desktop labels and the live mobile numbered legend. Connections cannot be edited (`nodesConnectable:false`) and delete is disabled. Selected nodes use an outline (2px) offset (4px), matching the interface focus language. The graph is loaded client-side with a written loading state.

**The Baseline Before Candidate Rule.** Supply Chain sends its risk brief to DevSec; the worker records the declared affected baseline and freezes trusted tests before Remediation writes. The affected baseline is never executed. The candidate returns to DevSec for actual checks and separate senior review. Historical Simulation retains local-change intake and illustrative failed-check repair loops. Passing security checks never erase failed legitimate-use controls.

### Retained Simulation controls, gate and trace

Native case and candidate-outcome selects reset the prior run when changed and are disabled while running. “Simulate handoff” becomes “Stop simulation” during a run and “Run again” after it. Each step advances on a deterministic timer (850ms); no model executes. Written statuses cover idle, running, blocked, ready for human review, follow-up required and stopped. Reset clears the run and restores diagram positions; shell reset also remounts the Agents surface. Leaving Agents unmounts it and clears its run, while the existing per-finding demo stages retain local persistence.

The local-change sequence is controller → DevSec baseline/finding → Remediation → DevSec replay → gate. Other cases add Supply Chain before DevSec baseline. The five listed gate conditions cover baseline, candidate security pass, legitimate behavior, frozen test identity and code identity. Regression produces four recorded passes and an explicit failed legitimate-behavior row. PHP environment review and Composer incident/credential response remain **follow-up required even with five represented checks passed**. Stopped and incomplete runs cannot be draft eligible. Human review owns merge authority throughout.

The trace lists numbered role events and enables JSON export once an event exists. Export records `SIMULATED_DEMO`, run, roles, checks, eligibility, outstanding follow-up and limitations; no PR is created. Advisory source cards link researched PHP/Composer snapshots with a retrieval date; inventory, local events and execution outcomes are fictional. Keep real research context separate from simulated execution evidence.

Only edges incident to the currently running node animate. The reduced-motion rule disables edge-path animation and keeps scrolling automatic. The global reduced-motion rule also reduces interface transitions; motion cannot be required to understand the written trace or result.

## Do's and Don'ts

### Do:

- **Do** use the light neutrals, action green and brand lime roles from `console.css`; keep status colours for status only.
- **Do** show a written status next to every meaningful color or gauge result.
- **Do** preserve all five gate conditions and the blocked middle finger when regression fails.
- **Do** retain visible status and a reachable action in every mobile finding row.
- **Do** preserve synthetic labels in Simulation and Overview, human review authority, visible focus and reduced motion.
- **Do** treat `console.css`, the operations components and `design/anatomy/repair-line/build.mjs` as the built visual source.
- **Do** preserve exactly three product agents and identify controller, evidence, gate and human review separately.
- **Do** keep DevSec baseline/frozen checks before repair, candidate replay and failed-check return visible at both graph sizes.
- **Do** distinguish Live service results from the fictional inventory and test outcomes in Simulation and Overview.
- **Do** retain owner follow-up after live draft publication; Simulation follow-up cases remain held even when all five represented checks pass.
- **Do** preserve the compact live mobile role summary, six directional legend entries and return-lane fit bounds.
- **Do** expose actual model IDs, observed checks and the CI/PR identity without implying merge approval.
- **Do** compose the current product through the operations components on one route; keep legacy prototype surfaces off-route.
- **Do** lead with the live run card, the repair-line figure and all six plain-language steps; use disclosures for inventory, unconfirmed leads, scout output and technical orchestration.
- **Do** make verified access and supported repair capability visible beside repository controls.
- **Do** show the detected stack, actual test plan and written capability reason before automatic repair controls.
- **Do** group advisory matches into one package/image update while preserving expandable source evidence.
- **Do** explain container reference changes beside the actual diff and retain residual findings and owner follow-ups.
- **Do** label observed chart samples and timing/token sources; count unique runs and draft URLs rather than implying distinct vulnerabilities.
- **Do** keep read-only scout usage separate from the selected repository's repair-run metrics.

### Don't:

- **Don't** describe simulated evidence, placeholder identifiers or local draft previews as live execution or a sent pull request.
- **Don't** advance the machine through a blocked gate or display five active gauge notches for four satisfied checks.
- **Don't** hide mobile status behind horizontal table discovery.
- **Don't** turn every panel into a floating shadow card or add decorative animation to verification states.
- **Don't** restore the earlier rejected concept from the root design specification, or reintroduce the retired dark theme in the routed console.
- **Don't** hide content behind scroll-driven entry animation; it blanks print, export and full-page capture.
- **Don't** present the deterministic controller as a fourth agent or grant an agent merge authority.
- **Don't** turn a ready graph state into an automatic merge or a guarantee of complete security.
- **Don't** treat an unconfirmed lead, unavailable source or monitor-only connection as authority to repair.

Documentation basis: current `PRODUCT.md`, operations/monitoring components and styles, and the five-block direction contract in `src/app/layout.tsx`, including retained seed `7e7cad5f`. `.impeccable/review/generic-autofix/DOCUMENTATION.md` records the authorized generic-autofix merge. Its fresh review initially requested the documentation merge and removal of the selected-repair eyebrow; the post-fix verdict is recorded separately in that review folder. Ten current captures cover desktop/mobile, monitoring, journey, flow, workbench, analytics and the repaired mobile finding strip. The earlier generic-service ship review, dashboard, live and Simulation records remain historical evidence. This document records built design truth without declaring a new review verdict or rerunning browser review, detection, build or tests.

Not canonized: the removed Selected repair / 日本の脅威情報 eyebrow is not a component rule; source-language provenance belongs beside actual source evidence and Japanese review. Historical font-step advisories and one-off capture counts do not establish new type tokens or metric targets.
