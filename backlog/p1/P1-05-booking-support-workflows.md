# P1-05 Booking Support Workflows

## Objective
Add structured support workflows for booking issues: reschedule requests, cancellation with refund evaluation, dispute resolution, and ops escalation paths — enabling real customer support without ad-hoc intervention.

## Why This Exists
P0-08/P0-09 deliver the core booking and payment lifecycle, but real operations require handling edge cases: users requesting reschedule, cancellation after payment, disputed charges, and venue-side problems. Without structured workflows, ops will handle these manually with no consistency or audit trail.

## Scope

- User-initiated cancellation request with reason capture
- Cancellation policy enforcement (free cancellation window, late-cancel penalty)
- Refund eligibility evaluation based on cancellation timing and policy
- Reschedule request flow: user requests → ops reviews → new slot assigned
- Ops escalation queue for booking disputes
- Booking support actions in ops console: approve refund, deny refund, reschedule, force-cancel
- Audit trail for all support actions on a booking
- User-facing booking status updates reflecting support actions

## Non-Goals

- Automated refund processing without ops approval (all refunds require review)
- Self-service reschedule (ops-mediated only for now)
- Chargeback handling with payment processor (Paystack handles directly)

## Dependencies

- `P0-08` (booking lifecycle — complete)
- `P0-09` (Paystack integration — complete)
- `P0-14` (freeze policy — provides late-cancel penalty rules)
- `P0-10` (ops console — complete)

## Affected Areas

- `backend/src/modules/` — new `booking-support.service.ts` or extend `app.service.ts`
- `backend/src/modules/booking.controller.ts` — cancellation and reschedule endpoints
- `backend/src/modules/ops.controller.ts` — support action endpoints
- `backend/src/modules/paystack.service.ts` — refund initiation
- `backend/migrations/` — migration for support requests and audit log
- `composeApp/src/commonMain/kotlin/com/ayuni/app/ui/screens/dates/` — cancellation/reschedule UI
- `ops-console/src/` — support queue and action UI

## Implementation Notes

- Cancellation window: define hours before date start when cancellation is free (e.g., 24h).
- Late cancellation triggers freeze policy (P0-14) and forfeits date token.
- Refund state machine: `requested → under_review → approved → processed` or `requested → denied`.
- All support actions must record: actor (ops user), timestamp, action type, notes.
- Reschedule creates a new booking linked to the original, preserving history.

## Acceptance Criteria

- [ ] Users can request cancellation with reason from the Dates tab.
- [ ] Free cancellation within policy window triggers automatic refund eligibility.
- [ ] Late cancellation applies penalty per freeze policy and denies refund.
- [ ] Users can request reschedule; ops sees request in support queue.
- [ ] Ops can approve/deny refunds with notes.
- [ ] Ops can reschedule bookings to new time slots.
- [ ] All support actions create audit trail entries.
- [ ] User sees updated booking status after support actions.

## Review Checklist

- [ ] Cancellation policy window correctly calculated from booking date/time.
- [ ] Refund amount matches original payment (no partial refund unless specified).
- [ ] Audit trail entries are immutable (append-only).
- [ ] Reschedule preserves original booking reference for traceability.
- [ ] No refund processed without explicit ops approval action.

## Test Checklist

- [ ] Cancel within free window → refund eligible.
- [ ] Cancel outside free window → penalty applied, refund denied.
- [ ] Reschedule request appears in ops queue.
- [ ] Ops approve refund → Paystack refund API called.
- [ ] Audit trail records all support actions with correct metadata.
- [ ] User-facing status updates after each support action.
- [ ] Concurrent cancellation requests on same booking handled safely.

## Completion Notes
