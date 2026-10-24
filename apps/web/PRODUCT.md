# ProofPatch

<!-- impeccable:product-schema 1 -->

## Platform

Responsive web application: Next.js dashboard, separate Hono API, background worker, shared contracts and SQLite persistence. LangChain ChatGroq supplies model calls; LangGraph controls the repair workflow. The services can run locally or on a private server. No remote deployment has been performed here.

## Purpose and users

A development team connects GitHub repositories, watches package advisories and unconfirmed forum signals, and reviews tested dependency repairs as draft PRs. Exactly three agent roles are shown: Supply Chain, Remediation, and Development Security/senior review. The deterministic controller, hosted verifier, publication gate and human reviewer are separate authorities.

The four-person team entered the Japanese hackathon's Open Innovation track. The fictional SakuraShop fixtures exercise Japanese UTF-8, yen calculations and authorization. Pricing, customer demand, savings and broader enterprise personas remain hypotheses; no customer traction is claimed.

## Confirmed visual direction

The user selected a dark engineering workspace with warm white Public Sans, restrained lime and precise diagrams, then requested a single component-based developer dashboard with a beginner-readable flow. Preserve this identity. The simple six-step journey is the main explanation; the interactive React Flow graph and detailed agent/event trace are expandable technical evidence. Bklit Gauge presents actual check coverage. Historical Anatomy and pitch assets remain available but off-route.

## Implemented behavior

The repository registry accepts clean GitHub HTTPS URLs, verifies server-credential access, reads immutable manifests and persists enable/automatic-repair settings. Inventory supports exact pinned PyPI requirements, npm package-lock files and Packagist composer.lock files. Unsupported declarations are disclosed. New connections do not automatically grant repair permission.

An independent worker checks enabled repositories every 300 seconds by default, with immediate requested scans. Heartbeat, next poll, source failures, last inventory check and actual findings are visible. Allowlisted forum RSS signals are unconfirmed. A real Groq scout triages new leads in read-only context and records its model, summary and reported token usage. Exact OSV package/version matching and published registry evidence govern findings and safe upgrade targets. X ingestion is not configured. A source failure never becomes a clean security result.

The shared LangGraph traverses source, inventory, triage, baseline, repair, verify, review, gate and publish nodes, with a blocked path and at most two candidate attempts. It persists checkpoints and events. Worker loss fails closed; automatic replay of external writes is not implemented. Supply Chain uses actual openai/gpt-oss-20b, while fixer and senior reviewer use separate contexts of openai/gpt-oss-120b through Groq. They are not Claude models or independent-model assurance. A repair run has at most five role calls and a 16-minute deadline.

Generic monitoring is broader than automatic repair. The reviewed Python Requests policy upgrades requirements.txt while preserving source. The retained Japanese PHP advisory demo permits three exact runtime/configuration changes. Other repositories remain monitor-only until a maintainer-reviewed verification policy exists. Arbitrary AI-generated commands, code migrations and exploit execution are not supported.

The worker freezes trusted baseline tests before repair, writes a candidate branch, dispatches a workflow from main and validates candidate/base/workflow/run/verifier/artifact identities. Isolated candidate containers run real business and runtime checks. Senior review inspects the actual change and observed evidence. Publication creates an open draft at the verified head. Coalesced advisories for the same package/version repair share one run and PR. A human reviews, merges, deploys and verifies the running service; mergeReady and findingClosed remain false.

## Developer experience

One route renders the sticky repository/action header, recorded metrics, six-step journey, repository/source controls, corroborated findings, expandable technical orchestration, developer workbench, review and analytics. Repository selection filters runs, history, elapsed times, outcomes and reported tokens. Missing data stays absent. Counts identify their actual sample and are not security scores or distinct-vulnerability counts.

SSE follows stored events with bounded polling fallback. Checks are grouped into source, policy, runtime, business and provenance. The candidate diff comes from the immutable GitHub comparison. Runner output retains actual logs and identities. English/Japanese senior review, actual PR links and owner follow-ups remain visible. Cancellation prevents later promotion while already in-flight CI or writes can remain recorded. Reload recovers durable results.

The Python demonstration created draft PR #1 at https://github.com/Harsh5840/arigato-python-demo/pull/1 in run 444cd3c2-0d9d-4cc4-b53c-2f08d67cf33e. It records 11 controller/runner gates, a frozen suite of 12 Japanese business assertions, three model calls and 6,230 reported tokens. The separate forum scout recorded 4,556 tokens. Actual evidence is preserved under output/live-runs. The existing PHP evidence and PRs remain valid historical runs; older runs must not be relabeled as LangGraph executions.

## Truth, access and accessibility

Model explanations are untrusted interpretations; authoritative findings, frozen tests and controller decisions are the evidence. A selected safe target is not necessarily the first fixed version for an individual advisory. Manifest matching is not exploit reproduction, deployed exposure assessment or proof of complete security. The affected baseline is never executed.

The server-only web proxy supports a separate API with a private bearer token. The current product has no end-user login, tenant isolation or implemented GitHub App installation flow. Keep the operator dashboard private. The deployable Compose configuration has not been image-built or deployed because the local Docker engine is unavailable.

Keyboard navigation, visible focus, readable contrast, written status next to color, reduced motion, responsive sizing and accessible graph descriptions are required. Historical synthetic prototype surfaces remain off-route and labeled as illustrative.
