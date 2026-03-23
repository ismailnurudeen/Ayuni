# P0-10 Ops Console Core

## Objective
Replace the static ops dashboard with a real operational console.

## Why This Exists
Ops cannot currently manage real users, reports, bookings, or venues from the UI.

## Scope

- API-backed dashboard
- moderation queue
- booking queue
- venue readiness
- verification status
- user/profile lookup
- reaction history view
- core ops actions

## Non-Goals

- advanced BI/reporting dashboards

## Dependencies

- `P0-01`
- `P0-08`
- `P0-11`
- `P0-12`
- `P0-13`

## Affected Areas

- `ops-console/`
- `backend/`

## Acceptance Criteria

- [ ] Console shows live data from backend.
- [ ] Reports can be resolved.
- [ ] Bookings can be escalated.
- [ ] Venue readiness can be managed.

## Review Checklist

- [ ] No hardcoded mock rows remain in core screens.
- [ ] Operator actions are reflected in backend state.

## Test Checklist

- [ ] Ops build passes.
- [ ] Live action flows tested against backend.
