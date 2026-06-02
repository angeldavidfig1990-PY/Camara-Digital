---
name: Codegen stale after merge
description: Generated API client/zod can be out of date after a task merge even though the OpenAPI spec is correct.
---

When a typecheck fails with "Property 'X' does not exist on type 'DashboardData'" (or similar) after a merge, but `lib/api-spec/openapi.yaml` already defines X, the generated files are stale.

**Fix:** `pnpm --filter @workspace/api-spec run codegen`

**Why:** Task agents merge source + spec changes, but the regenerated `lib/api-client-react` / `lib/api-zod` outputs may not be in sync until codegen runs again locally.

**How to apply:** Run codegen before assuming a type error is a real contract bug.
