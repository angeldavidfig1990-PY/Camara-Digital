---
name: AI assistant LLM design
description: How the legislative AI assistant uses a real LLM grounded on official data, and the own-key model-name gotcha.
---

# AI assistant: real LLM, grounded + scoped

The `/api/ai/consult` assistant uses a real LLM (OpenAI function-calling) on top of the existing `congress.ts` data functions, replacing the old brittle keyword engine (which still exists as a fallback).

## Grounding + scope invariants (why the design looks the way it does)

- **Never answer ungrounded.** `llmConsult()` forces a tool call on turn 0 (`tool_choice: "required"`) and only returns a free-text answer once a *data* tool succeeded (`dataToolUsed`). Otherwise it returns null and the route falls back to the keyword engine. This is what prevents fabricated answers.
- **Scope = Cámara de Diputados only.** Enforced by two layers: (1) a `fuera_de_alcance` tool the model calls for off-topic questions → server returns a fixed refusal string, and (2) the grounding guarantee itself — substantive output can only echo chamber-only tool data, so the model has no off-topic facts to relay.
- **Why NOT a keyword pre-gate for scope:** a rule-based off-topic classifier reintroduces exactly the brittleness the LLM upgrade removes and would falsely reject legitimate questions. An automated code-review will keep asking for a deterministic pre-gate; this tradeoff was a deliberate decision, not an oversight.

**Why:** the user explicitly required "only Cámara de Diputados" + "never invent, only official data".
**How to apply:** if adding tools or changing the loop, keep turn-0 `required`, the `dataToolUsed` gate, and the refusal-tool path intact.

## Own-key model-name gotcha

The assistant uses the user's own `OPENAI_API_KEY` (default OpenAI base URL), NOT the Replit AI Integrations proxy. So model names must be **real OpenAI models** (e.g. `gpt-4o-mini`) — the `gpt-5.4`/`gpt-5-mini` names in the ai-integrations skill are Replit-proxy aliases and will 404 against api.openai.com.

**Setup history:** Replit OpenAI integration setup hit `awaiting_phone_verification`; the user opted to provide their own key instead. A key with no billing returns 429 `insufficient_quota` — the assistant then silently falls back to the keyword engine (look for "llm consult failed, falling back" in logs).
