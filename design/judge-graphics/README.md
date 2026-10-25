# Judge graphics

Five 1920 × 1080 PNGs live in [`output/judge-graphics`](../../output/judge-graphics).
The matching SVGs preserve editable vector text and geometry. Regenerate both
formats after `npm run setup` with:

```sh
node design/judge-graphics/generate.mjs
```

The diagrams use the current ProofPatch implementation. LangGraph coordinates
the workflow; LangChain `ChatGroq` calls `openai/gpt-oss-20b` for supply-chain
triage and `openai/gpt-oss-120b` in separate fixer and reviewer contexts.
GitHub Actions and controller checks gate publication of a draft PR. A human
owns merge and deployment. The four organisation graphics are **illustrative
pilot proposals**, not existing integrations or endorsements.

The use-case framing was supplied in the hackathon screenshot and checked
against these primary organisation pages on 25 October 2026:

- [JETRO: support for Japanese SMEs expanding overseas](https://www.jetro.go.jp/en/jetro/activities/business/)
- [Geek Pictures India: studio and IP services](https://www.geekpictures.in/)
- [Value Create: advice, overseas and investment services](https://english.valuecreate.net/)
- [Hakuhodo India: creative and integrated digital services](https://www.hakuhodoindia.com/)

The Value Create proposal shows separate client deployments because the
current service has no shared multi-tenant portfolio dashboard. The JETRO
brief is a proposed pilot deliverable assembled from findings and PR evidence.
