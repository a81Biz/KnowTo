# Backend Unification — Deviations from Plan

This document records decisions made during the FASE 0–7 backend unification
(April 2026) that deviate from the original `ARQUITECTURA-UNIFICACION.md` plan,
together with the rationale for each deviation.

---

## 1. `render()` signature change in PromptRegistry (FASE 6)

**Plan:** Preserve the existing `render(id: PromptId, vars)` call signature for
backward compatibility.

**Actual:** `render()` was changed to `render(template: string, vars)` (template
string, not an ID). A new `renderById(id, vars)` method was added for the
ID-based use case.

**Why:** The `IPromptRegistry` interface must be shared by CCE and DCFL. CCE
already used template-string rendering; DCFL used ID-based rendering. The only
non-breaking way to define one interface was to make the primary `render()`
method template-based (simpler, more composable) and add `renderById()` as a
convenience wrapper. All call sites were updated.

---

## 2. `PipelineOrchestratorService` — constructor injection instead of `fs.readFileSync`

**Plan:** The orchestrator would read `flow-map.yaml` from disk internally.

**Actual:** The orchestrator accepts a `SiteConfig` object (with `flow_map`
already parsed) as its first constructor argument. The `loadXxxSiteConfig()`
helper in each site's `router.ts` handles the `fs.readFileSync` + `yaml.load`
call at startup.

**Why:** Cloudflare Workers do not support `fs.readFileSync` at runtime. Moving
the file read to startup time (Node.js context) keeps the orchestrator fully
testable without mocking `fs`, and allows tests to inject a `MOCK_SITE_CONFIG`
object directly with no filesystem dependency.

---

## 3. `createProject()` abstract method signature

**Plan:** `BaseSupabaseService.createProject()` to have a typed signature shared
by all sites.

**Actual:** `createProject()` is declared `abstract` with
`params: Record<string, unknown> & { userId: string; name: string }` in the
base class, allowing each site subclass to narrow the type with its own required
fields.

**Why:** DCFL requires an `industry` field; CCE does not. A single concrete
signature would either be too broad (all optional) or would require two
incompatible overloads. The abstract approach enforces the common fields while
letting subclasses add their own required fields type-safely.

---

## 4. `CrawlerService` error message format

**Plan:** No change to existing error messages.

**Actual:** The core `CrawlerService.scrape()` returns
`[ERROR DE CRAWLER]: URL inválida (debe comenzar con http/https): <url>`
for invalid URLs, whereas the old CCE crawler returned a Spanish-dictionary URL
string (`https://www.spanishdict.com/translate/inv%C3%A1lida: <url>`).

**Why:** The old format was an accidental artifact of the original implementation
(the error string happened to match a URL-encoded Spanish word). The new format
is an explicit, readable error prefix. Two test assertions in
`crawler.cce.test.ts` and `ai.cce.test.ts` were updated to match the actual
behavior.

---

## 5. `site_prompts` table — DCFL prompts remain file-based (no DB seed for prod)

**Plan:** Migration `009_dcfl_seed_prompts.sql` would seed DCFL prompts into the
unified `site_prompts` table as the primary source.

**Actual:** The migration file was created but DCFL production still resolves
prompts from local `.md` files via `CorePromptRegistry` fallback. The `site_prompts`
table is available as an override layer (DB has priority when a row exists) but
is not required for DCFL to function.

**Why:** DCFL prompts are edited frequently during active development; keeping
them in `.md` files under version control is more ergonomic than seeding the DB
on every change. The `getAsync()` method in `PromptRegistry` already implements
DB-first resolution with local fallback, so the migration to full DB-driven
prompts can happen incrementally per site without any code changes.

---

## 6. No separate `prompts` Supabase RPC for DCFL (uses shared `sp_get_prompt`)

**Plan:** Each site might have its own `sp_<site>_get_prompt` stored procedure.

**Actual:** A single shared `sp_get_prompt(site_id, prompt_id)` RPC is used
(introduced in `008_unify_prompts_table.sql`). The `siteId` parameter
discriminates rows within the unified `site_prompts` table.

**Why:** A shared RPC reduces DB object count, simplifies permission grants
(one procedure to GRANT EXECUTE on), and makes it easier to add new sites
without a new migration just for the prompt lookup.
