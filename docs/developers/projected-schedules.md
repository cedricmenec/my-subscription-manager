# Projected schedules

This document is the technical reference for projected subscription payments. It describes the business rule, calendar calculation, persistence, and synchronization behavior.

## Business concepts

A projected occurrence is a future payment stored in `payments` with:

```ts
status: 'PROJECTED'
source: 'GENERATED'
```

The `payments` table is the single business source of truth for both projected and observed payments. There is no separate projected schedule in `calculationState`.

An occurrence is replaceable by schedule regeneration only when all three conditions are true:

```ts
payment.source === 'GENERATED'
payment.status === 'PROJECTED'
payment.correctedAt === undefined
```

Every other occurrence is protected. This includes assumed or confirmed payments, skipped payments, refunds, corrected projections, and records created by the user, an import, or n8n.

## Required subscription data

A subscription can produce projected payments only when it has:

- a supported status and is not archived or deleted;
- a current price and currency;
- a valid `nextChargeDate` civil date;
- a billing interval unit and a positive interval count.

An `ENDED` subscription never produces a new occurrence. A `CANCELLED_PENDING_END` subscription also requires `serviceEndDate`. A paused subscription produces nothing when `pauseUntil` is unknown.

`nextChargeDate` is the billing anchor. `nextRenewalDate` is not a fallback billing anchor. It is an inclusive upper bound only when `hasDistinctContractualRenewal` confirms a fixed contractual renewal. `ROLLING` never has this bound. The legacy automatic case where billing and renewal cycles are identical is also treated as continuous.

## RF-01: first occurrence

The recurrence convention is inclusive:

> Return the first occurrence greater than or equal to the reference date.

Examples for a monthly anchor on the 15th:

| Reference date | First occurrence |
|---|---|
| 2026-07-15 | 2026-07-15 |
| 2026-07-16 | 2026-08-15 |
| 2026-06-01 | the future anchor, when the anchor is later |

The implementation uses `findFirstOccurrenceOnOrAfter` in `src/services/civilDate.ts`.

## Calendar policy

Monthly and yearly occurrences are calculated from the original anchor and an occurrence index. They are not calculated by repeatedly adding an interval to the previous result.

This prevents a short month from changing the original billing day:

```text
anchor 2026-01-30
occurrence 1: 2026-02-28
occurrence 2: 2026-03-30
```

An anchor that is a real end-of-month date keeps the end-of-month policy:

```text
anchor 2026-01-31
occurrence 1: 2026-02-28
occurrence 2: 2026-03-31
```

The same anchored rule restores a leap-day anniversary when possible:

```text
anchor 2024-02-29
2025 occurrence: 2025-02-28
2028 occurrence: 2028-02-29
```

All contract dates remain civil `YYYY-MM-DD` values. The calculation does not perform local timezone conversion.

## Adaptive projection window

The default window depends on the billing interval:

| Billing interval | Default projection |
|---|---|
| Yearly | One future occurrence |
| Monthly `ROLLING` or identical legacy cycle | Twelve occurrences at most |
| Monthly with a distinct annual contract | Through `nextRenewalDate`, twelve occurrences at most |
| Daily or weekly | Twelve occurrences at most |

The following dates shorten the window when they occur earlier:

- a distinct contractual `nextRenewalDate`;
- `serviceEndDate`.

Both bounds are inclusive. A payment scheduled exactly on the renewal or service-end date can therefore be included.

For a paused subscription, projection resumes at the first billing occurrence greater than or equal to `pauseUntil`.

### Examples

Monthly billing without a renewal bound:

```text
nextChargeDate: 2026-08-15
result: 2026-08-15 ... 2027-07-15 (12 occurrences)
```

Monthly billing bounded by renewal:

```text
nextChargeDate: 2026-08-15
nextRenewalDate: 2026-12-15
result: 2026-08-15, 09-15, 10-15, 11-15, 12-15
```

An old automatic monthly/monthly record ignores an equal `nextRenewalDate` and produces twelve occurrences. Version 9 migrates the deterministic form of this record to `ROLLING`; the fallback keeps schedules correct before every device has migrated.

Yearly billing:

```text
nextChargeDate: 2026-09-01
result: 2026-09-01
```

## Differential reconciliation

`materializeProjectedPaymentsWithStats` calculates the desired schedule and reconciles it with current payments by civil date.

For each subscription:

1. Load active payments.
2. Separate replaceable projections from protected occurrences.
3. Remove desired dates already occupied by a protected occurrence.
4. Keep an identical projection without writing.
5. Update an existing projection in place when its amount, currency, or status differs.
6. Create a missing projection.
7. Delete only replaceable projections whose dates are no longer desired.

New projections use a deterministic identifier:

```text
pym-projected-<subscriptionId>-<YYYY-MM-DD>
```

Existing legacy projections keep their original identifier when reconciled by date. A date change is represented by deleting the obsolete replaceable projection and creating the newly desired date.

The result exposes `createCount`, `updateCount`, and `deleteCount`. A second run with unchanged inputs produces zero business writes.

## Calculation order and triggers

`projected-payments` depends on `next-renewal-date`. A full engine run updates the renewal boundary before calculating the payment schedule.

Regeneration runs:

- at application startup;
- after relevant Dexie mutations, including synchronized changes received from another device;
- during configured interval and stale-check runs;
- after a manual recalculation.

Mutation runs are debounced and protected by the calculation engine circuit breaker.

## Local-first synchronization

Reconciliation runs against local IndexedDB and does not wait for the network. Dexie Cloud synchronizes only the minimal resulting writes.

Deterministic IDs make concurrent creation converge on the same logical occurrence. Idempotence prevents a synchronized result from generating a write-back loop on another device.

Projected payments remain available offline after they have been calculated locally or synchronized. Processing while the browser is closed requires an external scheduled workflow such as n8n.

## Main implementation files

- `src/services/civilDate.ts`: anchored recurrence and RF-01;
- `src/services/finance.ts`: eligibility and adaptive schedule generation;
- `src/services/payments.ts`: protected occurrence rules and differential reconciliation;
- `src/services/calculationEngine.ts`: dependencies, triggers, and diagnostics;
- `src/pages/SubscriptionDetailPage.tsx`: display of the first twelve future occurrences.

## Regression tests

- `src/services/civilDate.test.ts`;
- `src/services/finance.test.ts`;
- `src/services/payments.test.ts`;
- `src/services/calculationEngine.test.ts`;
- `src/pages/SubscriptionDetailPage.test.tsx`.
