# Anatomy geometry dependency

The four files under `kit/` are unmodified excerpts of the MIT-licensed
[Anatomy kit](https://github.com/wheresryan22/anatomy), retrieved on 24 October
2026. Its copyright and licence are preserved in LICENSE.

ProofPatch's `design/anatomy/build.mjs` imports this local copy so artwork can be
regenerated from a fresh clone without installing authoring-agent skills.
Application rendering uses the generated React/SVG source and does not load the
kit at runtime. The downloaded skill collections remain local authoring tools
and are excluded from Git.
