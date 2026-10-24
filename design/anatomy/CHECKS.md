# Figure checks · 24 October 2026

- `node design/anatomy/build.mjs --audit`: **audit passed** for both stage-3 pass and stage-3 blocked poses. 63 true recorded kit solids; zero support, sunk-pair, depth-order, clearance, terminal, loose-end, fold, self-overlap, wobble, saddle, coverage, and crowding failures. The order solver uses a 2 px sampling step for the ten output pose orderings; the final audit uses the kit's default finer sampling.
- `node .agents/skills/anatomy/scripts/lines.mjs design/anatomy/preview.html --out design/anatomy/line-check.png`: **line ends: 0** of 180 ends on 88 lines float. Console clean.
- The same command with `--select '.iso-plate:nth-child(2)' --out design/anatomy/line-check-blocked.png`: **line ends: 0**, console clean.
- Both transparent 1600 × 960 SVG raster outputs inspected. Material contrast, real rail bearings, five retained fingers, corner fasteners, closed inset seams, ruler strip, engraved plate, handle, and blocked central shoe are visible. The source viewBox is 800 × 480; colors are resolved to literal values for SVG importers that do not inherit CSS custom properties reliably.
- 390 × 234 phone-scale renders and 3200 × 1920 4× renders are reproducible with `node design/anatomy/render.mjs`; generated from the same SVGs with Sharp, preserving alpha. These are static raster checks, not a claim to browser interaction testing.
- App typecheck ran twice. The first found only the parent's in-progress missing evidence-coverage module. The next found only missing d3-shape declarations and implicit chart callback types in pie-center-shell.tsx. No machine file errors were reported. Final app-wide typecheck is owned by the integrating agent.
- The integrating agent caught the SVG title's multiple React text children; title is now one string expression to avoid the React SVG hydration mismatch.

## Scope and limits

The numeric state and geometry are deterministic. The cartridge has a short delayed advance after the check fingers begin to retract; the blocked state never advances past the stop. CSS disables transitions under reduced motion. Both shipping static poses have been audited; a per-frame continuous-motion clearance audit, light-theme rendering, and an independent security audit were **not** run. No WebGL is used. The figure illustrates synthetic demo evidence and does not claim real scanner or agent execution.

## Assets

- `design/verification-machine.svg` and `design/verification-machine-blocked.svg`
- Matching alpha PNGs in `design/`
- `design/anatomy/preview.html`: both poses
- `design/anatomy/line-check.png` and `line-check-blocked.png`: browser line verification
- `design/anatomy/parts.json`: complete 63-solid inventory and projection
- `design/anatomy/CONCEPT.md`: mapping, parts plan, original-object provenance, motion model
- `apps/web/src/components/features/verification-machine.tsx`: component
- `verification-machine.geometry.ts`: trusted generated kit markup used by the component
