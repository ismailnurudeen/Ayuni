# P0-13 Safety Reporting And Incidents

## Objective
Make safety reporting and incident handling production-ready.

## Why This Exists
The current reporting flow is simplified and not fully operational.

## Scope

- report submission for:
  - late arrival
  - no-show
  - unsafe behavior
- backend lifecycle:
  - open
  - investigating
  - resolved
- ops resolution actions
- audit trail

## Non-Goals

- ML moderation

## Dependencies

- `P0-01`
- `P0-10`

## Affected Areas

- `backend/`
- `composeApp/`
- `ops-console/`

## Acceptance Criteria

- [ ] Users can submit reports from booking context.
- [ ] Ops can see, investigate, and resolve reports.
- [ ] Report history is persisted.

## Review Checklist

- [ ] Severity logic is explicit.
- [ ] Unsafe behavior path is prioritized.

## Test Checklist

- [ ] Report creation and resolution tested.
- [ ] Mobile submission path validated.
