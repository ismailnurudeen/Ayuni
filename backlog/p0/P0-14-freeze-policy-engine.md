# P0-14 Freeze Policy Engine

## Objective
Enforce no-show and late-cancellation penalties on durable backend state.

## Why This Exists
The rules exist conceptually, but they are not yet enforced as a real policy system.

## Scope

- 48-hour response expiry
- no-show and late-cancellation incident counting
- 90-day lookback
- warnings, token loss, freeze creation
- frozen-user restrictions

## Non-Goals

- manual appeal system UI beyond ops basics

## Dependencies

- `P0-01`
- `P0-08`
- `P0-13`

## Affected Areas

- `backend/`
- `ops-console/`

## Acceptance Criteria

- [ ] Repeat incidents trigger freeze according to policy.
- [ ] Frozen users cannot create new bookings.
- [ ] Ops can inspect freeze reason and period.

## Review Checklist

- [ ] Policy logic is backend-authoritative.
- [ ] Time-window calculations are deterministic.

## Test Checklist

- [ ] 48-hour expiry tested.
- [ ] freeze threshold tests exist.
- [ ] booking restrictions for frozen users tested.
