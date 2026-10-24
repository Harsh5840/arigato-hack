# Japan use case and verified source register

Research checked on 24 October 2026. This is a design proposal; it does not claim that live ingestion, translation or remediation is implemented.

## Hackathon fit

The official Thapar Japan Hackathon site gives **24–25 October 2026** as the offline build dates and **3–4 members** as the team size. Its **OPEN-PS-01** track accepts a real-world problem of local, national or global scope. [Event details](https://hack.tslasconnect.com/), [Problem statements](https://hack.tslasconnect.com/problem-statements)

The user has confirmed participation in **Open Innovation (OPEN-PS-01)**. The requirement to add a Japan connection comes from **the user's report of judges' feedback**. The public open-track description does not impose that requirement. Do not present a Japan-specific feature requirement as a published event rule.

Proposed positioning: **ProofPatch helps Japanese SMEs and their development partners turn relevant security advisories into bilingual, reviewable remediation PRs.** Japanese sources and operational context are part of the workflow.

## Real PHP incident available in Japanese feeds

JPCERT/CC and IPA published Japanese advisories for **CVE-2026-109618** and **CVE-2026-109619**. Their affected-version guidance includes PHP 8.3 versions before **8.3.36**; the advisories link to the upstream PHP security announcement. The JPCERT advisory calls for testing before applying the update and cautions that absence of attack indicators does not establish absence of compromise. [JPCERT-AT-2026-0033](https://www.jpcert.or.jp/at/2026/at260033.html), [IPA advisory](https://www.ipa.go.jp/security/security-alert/2026/alert20261022.html)

The following are direct retrieval observations from this development machine on 24 October, rather than service-availability guarantees:

| Source | Feed | Result | PHP item in retrieved feed |
| --- | --- | --- | --- |
| JPCERT/CC | [jpcert.rdf](https://www.jpcert.or.jp/rss/jpcert.rdf) | HTTP 200; 30 items parsed | JPCERT-AT-2026-0033; `2026-10-22T13:11+09:00` |
| JVN | [jvn.rdf](https://jvn.jp/rss/jvn.rdf) | HTTP 200; 20 items parsed | [JVNVU#99905564](https://jvn.jp/vu/JVNVU99905564/); `2026-10-23T17:10:00+09:00` |
| JPCERT/CC combined | [jpcert-all.rdf](https://www.jpcert.or.jp/rss/jpcert-all.rdf) | HTTP 200; 41 items parsed | Combined discovery option; deduplicate overlapping items |

Store the original timestamp and a normalized UTC value. The JPCERT timestamp above is `2026-10-22T04:11:00Z`; JVN's is `2026-10-23T08:10:00Z`. These are feed entry dates, not claims about vulnerability discovery time or the earliest public disclosure.

For the demo, use the Japanese feed as the discovery channel and the upstream vendor advisory as the patch authority. Corroboration by several sources increases traceability; it does not prove exploitation or make each source an independent discovery.

### Correlation and update rules proposed for the demo

- Keep **one record per canonical CVE**. Preserve the separate identities of CVE-2026-109618 and CVE-2026-109619 even when one advisory covers both.
- Attach `JPCERT-AT-2026-0033`, `JVNVU#99905564`, URLs, source titles, publication/update times and content hashes as evidence references; these advisory IDs can map to multiple CVEs.
- Group the two CVEs into a PHP2shell incident and create at most one remediation job per repository, base commit and normalized patch target. Several feed items should not create duplicate PRs.
- Keep source revisions. Changed guidance triggers a new assessment of the existing job rather than silently replacing its evidence.
- The separate **23 October PHP session-configuration advisory** needs its own applicability review; an upgrade for the earlier CVEs must not imply that every later PHP issue is closed. [PHP announcements](https://www.php.net/archive/2026.php#2026-10-23-1)
- Forum/X posts are unverified leads. Preserve their provenance, then require authoritative corroboration before an automated patch proposal. They must not supply executable instructions to the worker.

## Three achievable Japan features

### 1. Japanese advisory intake

Read JPCERT/JVN RSS, extract structured facts, match them against the connected repository's inventory, and show the original Japanese advisory beside an English summary. Display both source time and retrieval time so judges can inspect freshness. JPCERT publishes RSS for alerts and weekly reports; its combined feed also includes JVN items. [Official RSS documentation](https://www.jpcert.or.jp/rss/index.html), [JVN feed documentation](https://jvn.jp/rss/index.html)

### 2. Bilingual review packet

Generate English and Japanese summaries of affected assets, proposed changes, test results, unresolved follow-ups and rollback steps. Keep CVE IDs, package names, versions, commands and source links unchanged. Label generated translations and preserve the original text for review.

Suggested UI labels: **影響あり** (affected), **要確認** (needs investigation), **人によるレビュー待ち** (awaiting human review). This is proposed product copy, not an official translation or an endorsement by JPCERT/IPA.

### 3. Fictional Sakura Shop PHP fixture

Use a small Japanese merchant portal with Japanese product names, yen prices, customer sessions and order lookup. The repository's intentionally outdated inventory can pin PHP 8.3.35; the candidate PR can propose PHP 8.3.36 with source evidence and separately justified configuration changes.

Check that Japanese UTF-8 names survive, integer-yen totals remain correct, and authenticated customer order access works after the update. Include a negative authorization case. These checks establish bounded application behavior; they **do not reproduce the runtime RCE or prove complete security**. Label every customer, order and merchant as fictional. Keep the intentionally outdated fixture isolated from public production deployment.

## Buyer and business hypothesis

The proposed buyer is a Japanese SME's development partner or small software team responsible for several customer repositories. The hypothesis is that inventory matching, Japanese explanations and a tested PR reduce the work between receiving an advisory and reviewing a repair. Validate this with interviews and measured review time; no customer traction or willingness to pay has been established.

IPA maintains security guidance for SMEs, including small businesses and sole proprietors. That supports the relevance of the customer segment, not a market-size, revenue or certification claim. [IPA SME guidance](https://www.ipa.go.jp/security/guide/sme/about.html)

## Source use and fallback constraints

| Source | Verified condition | Design consequence |
| --- | --- | --- |
| JPCERT RSS | RSS documentation says the feeds are freely usable. | Retrieve at a modest interval; retain source URLs and timestamps. [RSS terms](https://www.jpcert.or.jp/rss/index.html) |
| JPCERT website | Quotations require source name, document title and URL; republication/redistribution and individual documents have separate conditions. Logos have their own rights. | Prefer normalized facts, brief attributed summaries and links; do not copy full advisories or use logos as endorsement. [Usage conditions](https://www.jpcert.or.jp/guide.html) |
| MyJVN API | Its official FAQ states that commercial use has no special restriction, subject to API terms; it advises restrained access and differential retrieval. | Cache and use incremental retrieval; attribute MyJVN-provided information. Recheck applicable terms before service launch. [FAQ](https://jvndb.jvn.jp/apis/myjvnapi_faq.html), [API overview](https://jvndb.jvn.jp/apis/), [Terms](https://jvndb.jvn.jp/apis/termsofuse.html) |
| MyJVN migration | The official notice describes the newer OKA/JSON interface and changing feed locations. | Do not assume old feed URLs are permanent. [Migration notice](https://jvndb.jvn.jp/nav/sys_announce.html) |

Direct requests to the MyJVN FAQ and a `getVulnOverviewList` HND endpoint returned **HTTP 503** during this research, while the three RSS feeds above returned HTTP 200. API documentation was available through indexed official pages, but a working MyJVN API integration was **not** verified.

Hackathon fallback: retain a dated advisory fixture and show **Cached replay** when used. Keep **Live source retrieval**, **Cached replay**, **Inventory match**, **Model-generated proposal** and **Executed test result** distinct in the evidence packet. A network failure must not appear as a successful live scan. Recheck source revisions before raising the human-review PR.

No Japanese regulatory compliance, government affiliation or certification is claimed by these features.
