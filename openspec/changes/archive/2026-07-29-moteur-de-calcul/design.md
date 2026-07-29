## Context

Financial and scheduling figures shown in the app (monthly/annual equivalent cost, 30/90-day upcoming disbursements, next charge dates) are derived from `subscriptions` and `payments`. Today these are recomputed ad hoc:

- `materializeProjectedPayments()` (in `src/services/payments.ts`) writes `PROJECTED` rows into the synchronized `payments` table.
- `getFinancialSummary()` (in `src/services/payments.ts`, delegating to `buildFinancialSummary` in `src/services/finance.ts`) is a pure function, never persisted, recomputed on every call.
- Both are invoked together, in a fixed order, from a single `refreshFinance()` helper duplicated across 6 call sites in `src/App.tsx` (subscription create/update/delete, payment correction, import, snapshot restore).
- Nothing runs periodically, nothing runs "because time passed", and nothing reacts to data arriving through Dexie Cloud sync from another device — `refreshFinance()` is only called from local mutation handlers.
- There is no dependency ordering concept, no way to run a subset of calculations, and no visibility into how long calculations take or when they last ran.

This design introduces a dedicated **calculation engine** that owns the *shared, reusable* derived data (referred to as "category A" below), while display-only derived values (referred to as "category B", e.g. `buildFinancialSummary`'s output) remain plain functions called directly by components, unchanged in nature.

## Goals / Non-Goals

**Goals:**
- Provide a registry of named calculators, each with an explicit list of dependencies, covering only category A (shared/reusable derived data — starting with projected payments and upcoming due dates).
- Support 5 trigger types feeding the same execution path: `mutation` (Dexie table hooks on `subscriptions`, `payments`, `settings` — covers local writes and changes pulled in by sync), `startup`, `interval` (configurable, default disabled/opt-in), `stale-check` (elapsed time since last full successful run vs. a global threshold), and `manual` (button / programmatic API).
- Coalesce (debounce) triggers that occur in a short time window into a single run.
- Let each calculator persist its result in whichever table fits its data's nature (existing synced business table, or a new local-only table for purely internal derived data) — the engine does not mandate one storage location.
- Make the UI reactive to persisted category A data via `dexie-react-hooks`'s `useLiveQuery`, removing the need for manual refetch after a run.
- Log every run (trigger origin, per-calculator duration, total duration, skipped/failed calculators) to the existing `diagnosticLogs` table (already unsynced) for a simple, readable execution history.
- Expose a simple textual (non-graphical) view of the declared dependency graph for debugging.
- Expose a manual trigger API that can run the full registry or an explicit subset of calculator IDs.
- Keep execution on the main thread, but shape the registry/orchestrator API so a future move to a Web Worker does not require changing calculator definitions or callers.
- Document the concept for developers (`docs/developers/`) since it introduces a new architectural pattern, and document any user-visible behavior change (`docs/users/`).

**Non-Goals:**
- No Web Worker in this iteration.
- No graphical rendering of the dependency graph (text list only).
- No per-calculator staleness threshold — a single global threshold for the `stale-check` trigger.
- No synchronization of the new purely-internal derived table, the last-run watermark, or the diagnostic logs via Dexie Cloud.
- No migration of category B (display-only) selectors into the engine — they stay as-is.
- No change to the existing business meaning or sync behavior of `payments` rows with `source: 'GENERATED'` — they remain synced business records, only their write path moves behind a registered calculator.

## Decisions

### 1. Registry scope: category A only

The engine registry only contains calculators whose output is either consumed by another calculator or expensive/shared enough to warrant caching and timing (e.g. `projected-payments`, `upcoming-due-dates`). Purely presentational aggregates (e.g. `buildFinancialSummary`) stay as plain functions invoked by components/pages, reading from source tables and from category A's persisted output.

**Alternative considered**: put every derived value (including display aggregates) in the registry. Rejected — it would force simple, cheap, render-scoped computations through an orchestration layer for no benefit, and blur the line between "shared state" and "view computation".

### 2. Dependency graph as a declarative registry

Each calculator is declared with a stable string `id`, a `dependsOn: string[]` list of other calculator IDs, and a `run` function. The orchestrator topologically sorts the requested subset (plus their transitive dependencies) before executing a run, so callers never need to know the correct order.

**Alternative considered**: rely on manual call ordering (as `refreshFinance()` does today, calling `materializeProjectedPayments()` before `getFinancialSummary()`). Rejected — not introspectable, error-prone as more calculators are added, and impossible to expose in a debug view.

### 3. Change detection via Dexie table hooks, not manual notifications

The `mutation` trigger source is implemented with Dexie's native `table.hook('creating' | 'updating' | 'deleting', ...)` on `subscriptions`, `payments`, and `settings`, registered once when the engine initializes. Existing service functions (`createSubscription`, `updateSubscription`, `updatePaymentStatus`, import, snapshot restore, ...) require **no changes** to trigger recomputation.

**Alternative considered**: have each service function call `engine.notifyChange('subscription')` explicitly. Rejected — it would miss changes arriving through Dexie Cloud sync from another device (a real scenario mentioned in the proposal), and requires ongoing discipline at every future call site.

### 4. Persistence follows data nature, not a single rule

- The `projected-payments` calculator keeps writing to the existing synced `payments` table (`source: 'GENERATED'`), exactly as `materializeProjectedPayments` does today — this is real business data (users can confirm/skip/correct these rows), not an internal cache, and other devices should see the same projected payments without recomputing them independently.
- New calculators whose output has no independent business meaning (e.g. a future `upcoming-due-dates` aggregate, or the engine's own bookkeeping) are stored in a new **local-only, unsynced** Dexie table (e.g. `engineRuns` for run metadata, or a small `calculationCache` table keyed by calculator ID for aggregate outputs), following the existing convention already used by `localSettings` / `diagnosticLogs` / `importPreview` / `drafts` (see `unsyncedTables` in `src/data/db.ts`).
- The last-successful-run watermark (used by the `stale-check` trigger) is stored in the existing `localSettings` table (key/value, already unsynced) rather than a new table, since it is a single scalar.

**Alternative considered**: force all category A output into one new unsynced table regardless of nature. Rejected after review — it would change the sync behavior of `payments` PROJECTED rows, which is an existing, intentional, cross-device business behavior unrelated to this change's scope.

### 5. UI reactivity via `useLiveQuery`

Components read category A data (e.g. `db.payments`, the new cache table) with `useLiveQuery` from `dexie-react-hooks` (new dependency). Dexie re-runs the query automatically whenever a transaction touches the involved table(s), whether the write came from the engine, a local mutation, or an incoming sync pull. This removes the need for the manual `refreshFinance()` calls scattered in `src/App.tsx`.

**Alternative considered**: keep the current manual-refetch style and add a custom event emitter (`engine.on('calc:completed', ...)`) that components subscribe to. Rejected as the primary mechanism because it duplicates what Dexie's reactivity already provides for free and would not react to sync-originated changes without also wiring Dexie hooks — but see Decision 6, the engine still emits lifecycle information for observability.

### 6. Execution history via the existing `diagnosticLogs` table

Each run writes one or more `DiagnosticLog` rows (`category: 'calc-engine'`) capturing: run ID, trigger origin, per-calculator status (`ok` / `error` / `skipped-debounced`) and duration in ms, and total run duration. The debug/diagnostic panel reads this table with `useLiveQuery` too, so the execution history is live without any custom bus. This directly satisfies the requirement to keep recomputation observable even though UI refresh no longer depends on an explicit event.

### 7. Trigger taxonomy (5 types, one execution path)

| Trigger | Source | Notes |
|---|---|---|
| `mutation` | Dexie hooks on source tables | Debounced; captures local and sync-originated changes |
| `startup` | App mount | Always runs the full registry once |
| `interval` | Configurable timer | Off by default in v1; interval stored as app setting |
| `stale-check` | Compares `now - lastRunAt` (from `localSettings`) to a single global threshold | Evaluated at startup and on `interval` ticks |
| `manual` | Button / programmatic API (`engine.run()` or `engine.run(['calc-id'])`) | Always available, awaitable, exposes an in-progress state |

All 5 converge on the same orchestrator path: resolve requested calculator IDs (default: all) → expand to include transitive dependencies → topologically sort → debounce window → execute in order → log to `diagnosticLogs`.

### 8. Debounce / coalescing

Triggers of type `mutation` (and any other rapid-fire trigger) are coalesced within a short debounce window (e.g. a few hundred ms) so that bulk operations (CSV import, snapshot restore) produce a single run instead of one per row. Coalesced-away triggers are still logged as `skipped-debounced` entries so they remain visible in the execution history, directly addressing the risk of silently misconfigured debounce.

### 9. Main-thread execution, Worker-ready shape

The orchestrator and calculator `run` functions only depend on `db` (Dexie) and plain data — no direct DOM/React access — so the same registry could later run inside a Web Worker with a message-passing shim, without changing calculator definitions. This is documented as a forward-looking note, not implemented now.

### 10. Developer and user documentation

Per the updated `openspec/config.yaml` documentation rules, this change:
- introduces a new architectural pattern → requires a developer guide at `docs/developers/calculation-engine.md` (simplified English).
- does not introduce new user-facing workflows or settings on its own (the engine replaces internal plumbing; existing screens keep the same figures) → no `docs/users/` guide is required for this iteration. If a manual "recalculate" control is added to a settings/diagnostic screen, it must get a short mention in `docs/users/`.

## Risks / Trade-offs

- **[Risk] Dexie hooks fire on every write, including writes made by the calculators themselves (e.g. `projected-payments` writing to `payments`) → risk of infinite trigger loops.** → Mitigation: the engine marks its own writes (e.g. a transient flag on the write context, or comparing against an in-flight run ID) so hook-originated triggers caused by the engine's own output do not re-trigger the same run; covered by an automated test.
- **[Risk] Introducing `useLiveQuery` is a new reactivity paradigm not used anywhere in the current codebase (verified: zero occurrences today).** → Mitigation: scope its use to the components that read category A tables affected by this change; do not force a repository-wide rewrite of unrelated `useEffect`/`useState` patterns in this change.
- **[Risk] Global staleness threshold may be too coarse if a future calculator is expensive.** → Mitigation: explicitly a non-goal for v1; the per-run duration logging (Decision 6) gives the data needed to revisit this later.
- **[Risk] Debounce window misconfiguration could delay visible updates after a single user action.** → Mitigation: debounce window is short (sub-second) and only applies to `mutation` triggers; `manual` triggers bypass debounce entirely.
- **[Trade-off] Keeping `payments` PROJECTED rows synced (Decision 4) means projection logic must stay deterministic across devices** — already true today, no regression introduced.

## Migration Plan

1. Add `dexie-react-hooks` dependency.
2. Add new unsynced Dexie table(s) for engine bookkeeping (bump schema version following the existing versioning pattern in `src/data/db.ts`; add the new table(s) to `unsyncedTables`).
3. Implement the registry + orchestrator + debounce + Dexie hooks as a new module, with `projected-payments` as the first registered calculator (wrapping existing `materializeProjectedPayments` logic, unchanged behavior).
4. Wire `startup`, `manual` triggers first; add `interval` and `stale-check` after the core path is verified.
5. Replace the 6 manual `refreshFinance()` call sites in `src/App.tsx` with engine initialization + `useLiveQuery`-based reads.
6. Add the debug execution-history/dependency-graph text view.
7. Write `docs/developers/calculation-engine.md`.
8. No rollback complexity beyond standard Dexie schema versioning (additive table, no destructive migration of existing data).

## Open Questions

- None blocking; the specific new table name(s) and exact debounce duration are implementation details to finalize during coding, guided by the decisions above.
