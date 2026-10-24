# Verification interlock · Anatomy Figure

Size: Figure. One verification mechanism, 40–80 physical solids. Dark engineering instrument, transparent SVG. The patch cartridge can advance on its twin rails only after five check fingers retract. A failed benign regression leaves the central finger down, directly in the cartridge's path.

The five fingers map exactly to `apps/web/src/lib/workflow.ts`: baselineFailed, patchedPassed, regressionPassed, testHashMatches, commitMatches. This is an illustrative physical model of synthetic prototype outcomes, not a live test instrument or a security guarantee. Evidence freshness is a future PRD requirement and is not misrepresented as an implemented sixth check.

## Parts plan (before geometry)

- Base: 4 leveling feet, 4 foot pads, bedplate, recessed perimeter groove, ruler strip, engraved identity plate, 4 corner fasteners.
- Structure: 2 machined slide rails, 4 rail end stops, 2 gantry posts, 2 post shoes, transverse gantry beam, 2 gussets, 2 beam fasteners.
- Mechanism: 5 check assemblies, each with a rear bracket, 2 guide cheeks, rectangular sliding stem, and blocking shoe (25 solids). Five captured stems run in the guide channels; the beam mounts their brackets.
- Subject: cartridge tray, lime patch insert, nose, 4 bearing shoes, 2 pull uprights and pull crossbar. The cartridge is one moving assembly.
- Controls: two knurled setup knobs and two mounting pedestals, check-position witness marks and ruler ticks rooted on machined strips.

The final build script emits the authoritative part inventory and count. Screws, closed seam paths, ruler ticks and witness marks provide functional surface detail; they are not counted as extra solids unless modeled as physical fasteners.

## Finish and provenance

Original ProofPatch object and layout. Uses the installed MIT-licensed wheresryan22/anatomy skill's actual `iso-kit.mjs` (`slabOf`, `cylinder`, `fitProjection`, `solidSvg`, `sideSeam`, `knurl`, `topTicks`, `translateAlong`) and audit module, rather than tracing an image or approximating its projection. Closest reviewed examples: dial-indicator and test-rig. Material palette: charcoal, warm neutral edges, one lime subject (#c7ef79). No external media, model, font, or WebGL dependency.

## Motion and accessibility

Stage 0 seats the cartridge. Stage 1 acknowledges baseline failure; stage 2 approaches the gate. Stage 3 retracts the check fingers and advances only if all five conditions pass; blocked stage 3 holds the cartridge at the stop and leaves the benign-control shoe lowered. Stage 4 advances to the review position. A running stage does not invent extra passes. Transitions ease once on state change; reduced motion disables transitions. There is no idle loop or pointer-only control. The SVG exposes a state-specific title and description.

## Reproduction

From repository root: `node design/anatomy/build.mjs`. Add `--audit` to run the kit geometry checks. The build emits both transparent static SVGs, a standalone preview, generated React geometry, and a JSON inventory. See CHECKS.md for the actual validation run and limitations.
