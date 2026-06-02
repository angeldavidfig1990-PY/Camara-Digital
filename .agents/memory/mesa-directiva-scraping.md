---
name: Mesa Directiva (chamber authorities) scraping
description: Where the chamber's board (president/VPs/secretaries) comes from and how the AI assistant routes to it
---

The chamber's authorities (presidente, vicepresidentes, secretarios parlamentarios) are NOT in the Open Data API (datosv2.congreso.gov.py). The legislador endpoint only carries `tipoParlamentario` (Titular/Suplente) and `cargoBancada` — never the Mesa Directiva.

**Source:** scraped HTML from `diputados.gov.py/institucional/mesa-directiva`. Structure per role: a cargo label (`PRESIDENTE`, `VICEPRESIDENTE PRIMERO/SEGUNDO`) followed by `Diputado/a Nacional: NAME (PARTY)`; the secretariat block follows a `SECRETARÍA PARLAMENTARIA` header. The board's period block (`PERIODO LEGISLATIVO YYYY - YYYY`) differs from the legislative term (e.g. 2024-2025 within 2023-2028).

**Why:** users ask "¿quién es el presidente de la Cámara?" — a top question with no API answer.

**How to apply:** guard the scraper against silent empty-parse breakage (throw, don't cache `[]`), same as the news scraper. In the AI intent classifier, the `autoridades` rule MUST run before the `diputado` branch — "presidente de la cámara de diputados" contains "diputados" and would otherwise misroute to the legislators list. Keep "presidente de la comisión …" routing to comision_detail (the autoridades rule requires camara/honorable/directiva context, not "comision").
