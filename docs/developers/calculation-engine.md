# Calculation engine

The local-first calculation engine rebuilds derived data from subscriptions, payments, and settings.

## Main rules

- Calculators declare explicit dependencies.
- The engine uses topological order.
- Dexie mutations trigger a debounced run.
- Startup, interval, stale-check, and manual runs are supported.
- A calculator writes only when its business result changed.
- `payments` is the single synchronized source for financial occurrences.
- `calculationState` only stores device-local engine metadata.

## Default graph

`projected-payments` depends on `next-renewal-date`. A full run therefore updates the renewal boundary before rebuilding the payment schedule.

The former `projected-charge-dates` calculator no longer exists. It stored a second schedule in `calculationState`, but the UI and financial summaries use `payments`.

## RF-01 recurrence

`findFirstOccurrenceOnOrAfter` returns the first occurrence greater than or equal to a civil reference date.

Monthly and yearly occurrences are always calculated from the original anchor:

```text
anchor 2026-01-30
index 1 -> 2026-02-28
index 2 -> 2026-03-30
```

This avoids an accidental switch to end-of-month after February. A real end-of-month anchor keeps that policy:

```text
anchor 2026-01-31
index 1 -> 2026-02-28
index 2 -> 2026-03-31
```

The helper functions live in `src/services/civilDate.ts`.

## Adaptive projection window

`projectSubscriptionPayments` starts at the first billing occurrence on or after the reference date.

- Yearly billing produces one future occurrence.
- Monthly billing covers up to twelve months and at most `ceil(12 / intervalCount)` occurrences.
- Daily and weekly billing cover up to twelve months, with a 366 occurrence safety cap.
- `nextRenewalDate` is an inclusive upper bound.
- `serviceEndDate` is also an inclusive upper bound.
- A paused subscription resumes from `pauseUntil` when that date is deterministic.

An explicit test window can still be supplied for focused financial calculations and tests.

## Differential reconciliation

`materializeProjectedPaymentsWithStats` loads all active payments for one subscription.

A payment is replaceable only when all conditions are true:

- `source === 'GENERATED'`;
- `status === 'PROJECTED'`;
- `correctedAt` is absent.

Every other payment is protected. A protected date blocks creation of another projection.

The reconciliation is date-based:

1. Keep an unchanged projection without writing.
2. Update an existing projection in place when only amount, currency, or status changed.
3. Create a missing projection with `pym-projected-<subscriptionId>-<date>`.
4. Delete only replaceable projections whose dates are no longer desired.

Old projections with random IDs are reused by date. This makes the migration progressive and avoids a bulk rewrite.

The result reports `createCount`, `updateCount`, and `deleteCount`. The calculation log contains only these counters and identifiers needed for diagnostics, not full business records.

## Local-first and synchronization flow

```text
subscription change
       |
       v
local Dexie transaction
       |
       v
calculation engine
       |
       v
minimal payment writes
       |
       v
Dexie Cloud synchronization
```

The local transaction does not wait for the network. Deterministic IDs let two devices converge on the same new projected occurrence. Idempotence prevents a synchronization echo from producing another write.

## Loop protection

Mutation runs are debounced. A circuit breaker blocks excessive mutation runs after five runs in ten seconds for thirty seconds. Manual, startup, interval, and stale-check runs are not blocked.

Each browser session has an `inst-<uuid>` identifier in diagnostic logs. Calculation writes are temporarily suppressed from mutation scheduling while a run is active.

## Renewal calculation

`next-renewal-date` uses the same inclusive RF-01 convention and anchored calendar calculation.

The anchor order is:

1. `renewalPeriodStartDate`;
2. `subscriptionDate`;
3. no calculation.

Ended subscriptions and cancelled subscriptions past `serviceEndDate` have no future renewal. User-defined alert settings are preserved.

## Tests

The main regression tests are:

- `src/services/civilDate.test.ts`;
- `src/services/finance.test.ts`;
- `src/services/payments.test.ts`;
- `src/services/calculationEngine.test.ts`.
