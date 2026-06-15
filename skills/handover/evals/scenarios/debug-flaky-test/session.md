# Working session notes — flaky test investigation

We're chasing a flaky test: `payments.test.ts > refunds > issues a partial refund`.
It passes locally every time but fails ~1 in 4 runs on CI. Been at this for two hours.

## What we tried

- First guess was a timeout — the test has a 5s default. Bumped it to 30s. No change,
  still flakes at the same rate. So it's not slowness.
- Wondered if the DB connection pool was exhausted under the parallel test runner.
  Added logging for pool checkouts. Pool never went above 4 of 20. Ruled that out.
- Tried mocking the system clock with sinon to make timestamps deterministic. Got it
  half-wired but it fought with the existing fake-timers setup in the test harness and
  I gave up on that approach — too invasive.

## What we actually found

Eventually traced it: there's a race between the Stripe webhook handler and the refund
writer. When the webhook for `charge.refunded` arrives before our own `RefundWriter`
has committed its row, the writer's upsert clobbers the webhook's `status` field. The
race window is in the refund handler — see `refunds/handler.ts` around line 88 where it
reads-then-writes without a transaction.

Big realization that cost us an hour: the test only flakes on **CI**, never locally,
because CI sets `TZ=UTC` and one assertion compares a `toLocaleString()` timestamp
against a hardcoded string. Locally we're in CET so the formats happen to line up. This
is NOT in any docs and we only found it by diffing the CI env against local. Do not lose
this — it'll waste someone another hour.

## Decision

Talked it through. Two options to fix the race:
- A row-level lock around the read-write. Rejected — the webhook handler and writer run
  in different processes and we'd risk a cross-process deadlock under load.
- Serialize refund mutations through a small per-charge queue so the writer and webhook
  can't interleave. Going with this.

## Where we stopped

Haven't written any fix yet. Next is to implement the per-charge queue in
`refunds/writer.ts` and have the webhook handler enqueue instead of writing directly.
The `TZ` assertion bug should be fixed separately — it's a real test bug, just swap the
`toLocaleString()` compare for an ISO compare.

Branch: `fix/refund-race`. Ticket: PAY-2231. No commits yet.
