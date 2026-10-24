# ProofPatch

<!-- impeccable:product-schema 1 -->

## Platform

Responsive web application: Next.js dashboard, separate Hono API, background worker, shared contracts and SQLite persistence. LangChain ChatGroq supplies model calls; LangGraph controls the repair workflow. The services can run locally or on a private server. No remote deployment has been performed here.

## Purpose and users

A development team connects GitHub repositories, watches package advisories and unconfirmed forum signals, and reviews tested dependency repairs as draft PRs. Exactly three agent roles are shown: Supply Chain, Remediation, and Development Security/senior review. The deterministic controller, hosted verifier, publication gate and human reviewer are separate authorities.

The four-person team entered the Japanese hackathon's Open Innovation track. The fictional SakuraShop fixtures exercise Japanese UTF-8, yen calculations and authorization. Pricing, customer demand, savings and broader enterprise personas remain hypotheses; no customer traction is claimed.

## Confirmed visual direction

On 25 October 2026 the user replaced the earlier dark workspace with a light theme and asked for a more presentable console that shows how the flow works. The current direction is a light engineering workspace: Public Sans, green-tinted neutrals, one deep-green action colour, brand lime for the subject and progress, and precise diagram geometry. The first viewport pairs a live run card with the Anatomy-built repair-line figure, which is posed from stored run state. A six-step explainer (who acts, what each step receives, does, produces and cannot do) and a run timeline replayed from stored events follow. The interactive React Flow graph and event rail remain expandable technical evidence. Bklit Gauge presents actual check coverage.

## Implemented behavior

The repository registry accepts clean GitHub HTTPS URLs, verifies server-credential access, reads immutable manifests and persists watch/automatic-repair settings. Inventory supports exact pinned PyPI requirements, npm package-lock files, Packagist composer.lock files and supported Dockerfile or Compose image references. It inventories at most 1,000 dependencies and splits OSV queries into batches of at most 100. Unsupported declarations are disclosed. Adding a URL cannot grant GitHub permissions that the server identity lacks. New supported public connections enable automatic draft preparation by default, while preserving settings on reconnect.

An independent worker checks enabled repositories every 300 seconds by default, with immediate requested scans. Heartbeat, next poll, source failures, last inventory check and actual findings are visible. Allowlisted forum RSS signals are unconfirmed. A real Groq scout triages new leads in read-only context and records its model, summary and reported token usage. Exact OSV package/version matching and published registry evidence govern findings and safe upgrade targets. X ingestion is not configured. A source failure never becomes a clean security result.

The shared LangGraph traverses source, inventory, triage, baseline, repair, verify, review, gate and publish nodes, with a blocked path and at most two candidate attempts. It persists checkpoints and events. Worker loss fails closed; automatic replay of external writes is not implemented. Supply Chain uses actual openai/gpt-oss-20b, while fixer and senior reviewer use separate contexts of openai/gpt-oss-120b through Groq. They are not Claude models or independent-model assurance. A repair run has at most five role calls and a 16-minute deadline.

Automatic repair uses detected stack, relevant baseline tests and exact ecosystem/package/manifest capabilities, without owner/name allowlists. Supported adapters update exact PyPI requirements, direct npm or Composer dependencies with committed locks, and official PHP or nginx image references in Dockerfiles or Compose YAML. A supported ecosystem elsewhere in a monorepo does not grant repair permission to an untested manifest. Unknown stacks, empty/missing test suites and unsupported image behavior remain blocked or monitored. Arbitrary application-code migrations and exploit execution are not supported. The historical PHP runtime/configuration workflow remains identifiable in its existing evidence.

The worker freezes baseline tests before repair, writes a candidate branch and dispatches the central verifier in arigato-hack. A target does not need a custom ProofPatch workflow. npm and Composer first resolve a lockfile with the real package manager, then verify the final candidate commit. Models do not generate integrity metadata. The controller validates candidate/base/central-workflow/run/verifier/artifact identities. Candidate containers execute tests with no external network, credentials or Docker socket. Images receive real before/after Trivy scans plus supported vendor-version corroboration. A selected CVE still reported in the candidate blocks publication; unrelated scanner findings and coverage gaps remain visible. The vulnerable baseline is scanned, never executed.

Senior review inspects the actual change and observed evidence. Publication creates an open draft at the verified head. Coalesced advisories for the same package/version/manifest/target share one run and PR. A human reviews, merges, deploys and verifies the running service; mergeReady and findingClosed remain false. A generic PHP image update leaves INI, deployed web configuration and incident follow-up to the human owner.

## Developer experience

One route renders the sticky repository/action header, recorded metrics, six-step journey, repository/source controls, grouped corroborated findings, expandable technical orchestration, developer workbench, review and analytics. The journey reads Connect & inspect → Watch for alerts → Confirm the risk → Prepare the update → Test & review → You review the PR. The repository panel shows detected stack and the actual verification plan. Repeated advisory matches share one repair row with expandable source evidence. A container diff explains that the image reference selects the container's software. Repository selection filters runs, history, elapsed times, outcomes and reported tokens. Missing data stays absent. Counts identify their actual sample and are not security scores or distinct-vulnerability counts.

SSE follows stored events with bounded polling fallback. Checks are grouped into source, policy, runtime, business and provenance. The candidate diff comes from the immutable GitHub comparison. Runner output retains actual logs and identities. English/Japanese senior review, actual PR links and owner follow-ups remain visible. Cancellation prevents later promotion while already in-flight CI or writes can remain recorded. Reload recovers durable results.

The three judging repositories are arigato-php-demo, arigato-python-demo and arigato-container-demo. Their affected main branches are demonstration inventories, never deployed baselines. The generic central path created Python draft PR #2 (https://github.com/Harsh5840/arigato-python-demo/pull/2) in run 85a102f8-c69a-424d-8f0d-8a5b653bf816 with 12 actual business assertions. It created container draft PR #1 (https://github.com/Harsh5840/arigato-container-demo/pull/1) in run 1159357a-7e93-4c2d-ab11-efa91a56aa59 with seven live HTTP assertions and 11 passing controller/runner gates. It created PHP draft PR #6 (https://github.com/Harsh5840/arigato-php-demo/pull/6) in run 00cd66dd-c269-4b93-83a3-c690fb8f8932 with PHP 8.3.36, 15 actual storefront assertions and 11 passing controller/runner gates. PHP's Dockerfile image update retains human INI/web/deployment/incident follow-ups. The Compose update is nginx 1.26.0 → 1.30.6 with a digest. Actual Trivy output records 831 baseline and 391 candidate findings across all severities; residuals remain for human review. Historical Python PR #1 and existing PHP fixture-specific records retain their original provenance. Evidence is preserved under output/live-runs.

## Truth, access and accessibility

Model explanations are untrusted interpretations; authoritative findings, frozen tests and controller decisions are the evidence. A selected safe target is not necessarily the first fixed version for an individual advisory. Manifest matching is not exploit reproduction, deployed exposure assessment or proof of complete security. The affected baseline is never executed.

The server-only web proxy supports a separate API with a private bearer token. The central verifier currently checks out public repositories anonymously. A private repository is explicitly ineligible for generic automatic fixes until an isolated checkout credential is configured. The current product has no end-user login, tenant isolation or implemented GitHub App installation flow. Keep the operator dashboard private. The deployable Compose configuration has not been image-built or deployed because the local Docker engine is unavailable.

Keyboard navigation, visible focus, readable contrast, written status next to color, reduced motion, responsive sizing and accessible graph descriptions are required. Historical synthetic prototype surfaces remain off-route and labeled as illustrative.
