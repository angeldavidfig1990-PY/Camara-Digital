---
name: Congress API data quirks (partido / departamento)
description: How the Paraguay Congress Open API returns party and department values, and why filters must be derived from data.
---

# Congress API data quirks

The upstream "Datos Abiertos Legislativos v2.0" API (proxied via `congress.ts`)
returns **full descriptive party names**, not the short acronyms users expect:

- `partido` examples: "Asociación Nacional Republicana ANR", "Partido Liberal
  Radical Auténtico PLRA", "Movimiento Conciencia Democrática Nacional",
  "Partido País Solidario PPS", "Partido Patria Querida PPQ", "INDEPENDIENTE",
  "CRUZADA NACIONAL".
- `departamento` examples differ from common labels: "Capital" (NOT "Asunción"),
  "Concepcion" (no accent), "Pte. Hayes", "Ñeembucú", "Boquerón".
- `foto` URLs (e.g. `https://silpy.congreso.gov.py/images/<id>.jpg`) return a 302
  redirect to `/web/images/<id>.jpg` which serves the real `image/jpeg`. RN
  `Image` and web `<img>` follow the redirect fine.

**Rule:** Never hardcode filter chip values (party/department) and compare with
strict equality — they will never match the API and every filter returns 0.
Derive filter options dynamically from the loaded data (unique values, sorted).

**Why:** A previous version hardcoded `["ANR","PLRA",...]` and `["Asunción",...]`;
strict `l.partido === selectedParty` always failed → "0 diputados / Sin resultados".

**How to apply:** In any list with party/department filters, build the option set
from `data` at render time. For compact chip labels use a helper that extracts the
trailing acronym; for colors map full names via substring/token matching (see
`getPartyColor`/`getPartyShort`/`partyKey` in `DeputyCard.tsx`).
