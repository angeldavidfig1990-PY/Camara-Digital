---
name: AI assistant design (deterministic, zero-cost)
description: Why the legislative AI assistant is a deterministic fuzzy engine over official data, not an LLM, and the false-positive guardrail.
---

# AI assistant: deterministic fuzzy engine, no LLM

The `/api/ai/consult` assistant is a **deterministic, zero-cost** engine (no LLM, no external API, no API keys). It detects an intent, then resolves the entity with fuzzy matching over **live official data**.

**Why no LLM:** the user explicitly required zero cost — no OpenAI billing AND no Replit credits. An LLM path (OpenAI own-key, or the Replit AI integration) was built and then removed for this reason. (An OpenAI own-key with no billing also just 429s.) Don't reintroduce an LLM unless the user funds one.

## Key decisions

- **Fuzzy matching beats keyword `includes`.** The original engine failed on partial/typo/reordered names (e.g. "comisión de industrial y comercio" → real name "Industria, Comercio, Turismo y Cooperativismo"). Fix = accent-insensitive normalization + grammar/domain stopword stripping + token similarity (Levenshtein + prefix/substring shortcut), averaged over query tokens.
- **Derive filters from data, never hardcode.** Departments and parties for deputy queries come from the dataset itself (matches the existing congress-api-data-quirks lesson).
- **`strict` mode guards the no-trigger-word fallback.** When a query has no domain trigger word, an `unknown`-intent fallback fuzzy-matches commissions then deputies. There it disables the loose substring/prefix shortcut, otherwise a bare off-topic token false-matches (the canonical bug: "clima" → "climático" commission). Explicit "comisión …" queries keep the loose shortcut for better recall.

**Why the strict guardrail matters:** without it, single off-topic tokens that are prefixes of a commission word get scored 0.9 and return a bogus commission instead of the scope/help message.
**How to apply:** any new no-trigger fuzzy entry point must pass `strict = true`; explicit-intent paths can stay loose.

## Scope / no-fabrication

The engine only ever emits official data; anything it can't ground returns the `NO_DATA` phrase or the scope-clarifying help message, so it cannot invent. Scope is Cámara de Diputados only — enforced structurally (it can only echo chamber data), not by a brittle off-topic keyword pre-gate.
