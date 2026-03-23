# P0-12 Government ID Verification

## Objective
Require and process government ID before first booked date.

## Why This Exists
The original spec requires stronger trust gating before a real booked date.

## Scope

- ID upload/scan flow
- backend review state
- ops review UI
- booking gate enforcement

## Non-Goals

- forcing ID at initial signup

## Dependencies

- `P0-08`
- `P0-10`

## Affected Areas

- `composeApp/`
- `backend/`
- `ops-console/`

## Acceptance Criteria

- [ ] User without approved ID cannot finalize first booked date.
- [ ] Approved user receives trust badge.
- [ ] Ops can approve/reject ID review.

## Review Checklist

- [ ] Booking gate is server-side.
- [ ] Sensitive document state is protected.

## Test Checklist

- [ ] Pre-booking gate tested.
- [ ] ID status transitions tested.
