---
name: Official news has no API — scraped HTML
description: How the Diputados dashboard news carousel gets data, and the fragility to guard against
---

# Source
The Honorable Cámara de Diputados has NO JSON API/RSS for news. The only source is the
server-rendered HTML at `https://www.diputados.gov.py/noticias/noticias` (concrete5 CMS).
Each news item is an `<article class="item ...">` block with: link `noticias/noticias/{id}`,
absolute image URL under `storage/noticias/{ULID}.jpeg`, an `item-title > h2`, an
`item-date > p` (YYYY-MM-DD), and an `item-summary`.

# Decision: degrade, never fabricate
Backend architecture forbids fabricated mock data. For news specifically we surface real
items or nothing — the mobile dashboard hides the whole news section when the list is empty
or the request errors, rather than showing placeholder articles. Image URLs are absolute, so
they load directly on mobile.

# Why the empty-parse guard exists
**Why:** A scrape can fail *silently* — upstream returns HTTP 200 but with changed markup or an
anti-bot/interstitial page. `parseNoticias()` then yields `[]`, which would otherwise be cached
for the full TTL (30 min) and look like "no news" instead of "scraper broke".

**How to apply:** `getNoticias()` throws when a successful fetch parses to zero articles, so the
empty result is never cached and the route returns 502. If the CMS markup changes, broaden the
regexes in `parseNoticias` (e.g. attribute ordering, alternate image attributes) — the guard is
what will alert you that markup drifted.
