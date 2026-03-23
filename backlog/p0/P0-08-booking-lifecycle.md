# P0-08 Booking Lifecycle

## Objective
Implement the full server-authoritative booking flow.

## Why This Exists
Bookings currently exist as simplified state and not as a complete workflow.

## Scope

- match acceptance
- availability submission
- payment-required transition
- booking creation
- venue assignment
- booking status updates
- dates tab hydration from real data

## Non-Goals

- open-ended pre-date chat

## Dependencies

- `P0-01`
- `P0-02`
- `P0-06`
- `P0-09`

## Affected Areas

- `backend/`
- `composeApp/`
- `ops-console/`

## Acceptance Criteria

- [ ] User can move from accepted match to booking intent to confirmed booking.
- [ ] Booking appears in mobile dates tab.
- [ ] Booking is visible in ops.
- [ ] Booking status transitions are persisted.

## Review Checklist

- [ ] Booking state machine is explicit.
- [ ] Server, not client, controls booking truth.

## Test Checklist

- [ ] Booking state tests exist.
- [ ] Availability and booking creation tested.
- [ ] Mobile booking display validated.
