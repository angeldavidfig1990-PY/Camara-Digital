---
name: Paraguay Congress API quirks
description: Non-obvious behaviors of datosv2.congreso.gov.py used by Diputados Paraguay backend
---

# Paraguay Congress Open API (datosv2.congreso.gov.py/web/api)

Quirks that are NOT obvious from the response shape and bit us during integration.

## Legislador list returns ALL historical periods
`/legislador?idCamara=D` returns legisladores across **every** legislative period
(1993-1998 … 2023-2028), most with `activo: true`. Filtering on `activo` alone
yields ~561 records — wrong for an 80-seat chamber.

**Rule:** keep only members whose `periodoLegislativo` start year equals the
**latest** period present in the response (currently `2023-2028` → 80 diputados).
Filter dynamically (max start year), do not hardcode the period string.

**Why:** the chamber has a fixed seat count per period; surfacing all periods
inflates every count (dashboard totals, by-party analytics) and shows people who
no longer hold a seat.

## HTTP 404 means "no record", not an outage
For detail-by-id endpoints (`/legislador/{id}`, `/comision/{id}`,
`/proyecto/{id}/tramitaciones`, `/sesion/{id}/proyectos`, `/votacion/{id}`) a
missing/unknown id returns **HTTP 404**. There is also a separate
`codigoEstado: 404` *inside* the JSON envelope for empty results.

**Rule:** the low-level fetch must treat HTTP 404 as an empty array (same as the
in-envelope 404), so `get*ById` returns `null` and routes answer 404 — reserve
502 for genuine upstream failures (5xx / network / timeout).

**How to apply:** normalize both 404s in the single `rawFetch` helper, not per
call site, so every detail endpoint behaves consistently.

## Other notes
- Envelope is `{ codigoEstado, mensaje, datos }`; success is `codigoEstado === 200`.
- Dates arrive as `DD/MM/YYYY` and need ISO conversion.
- `size` query param is sometimes ignored (the list endpoint may return the full
  set regardless), so don't rely on it for pagination — slice client-side.
- Votaciones must be filtered to `camaraTramite === "CAMARA DE DIPUTADOS"`.
