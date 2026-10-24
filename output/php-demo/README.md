# Actual PHP candidate evidence

These files were downloaded from the successful
[GitHub Actions run](https://github.com/Harsh5840/arigato-php-demo/actions/runs/40111416786)
for [draft PR #1](https://github.com/Harsh5840/arigato-php-demo/pull/1).

| File | What it establishes |
|---|---|
| `candidate-policy.json` | Exact base/head identities, unchanged frozen verifier, approved three-file diff and static candidate policy |
| `runtime-probe.json` | Observed PHP 8.3.36, disabled startup upload progress and expected serializer in the CI candidate container |
| `business-checks.txt` | 15 actual PHP assertions for Japanese UTF-8, integer JPY and customer/order behavior |
| `built-image-id.txt` | The locally built candidate image's configuration identity; different from the registry's multi-platform base-image index digest |
| `manifest.json` | Provenance, identities, hashes and explicit limits |

No Groq call, RCE exploit, production deployment or human approval occurred.
The prepared PR remains a draft, and its finding is not closed. These are
foundation artifacts for implementing the proposed service, not a recorded
execution of an already complete orchestration product.
