# P0-01 Persistent Backend Data Model

## Objective
Replace singleton in-memory backend state with durable persistence.

## Why This Exists
Ayuni currently loses users, onboarding, reactions, bookings, reports, and notifications on restart.

## Scope

- Introduce PostgreSQL-backed persistence for core product state.
- Add migrations.
- Replace in-memory storage in `/backend/src/modules/app.service.ts`.
- Persist at minimum:
  - users
  - onboarding state
  - verification state
  - profiles
  - profile media
  - dating preferences
  - rounds
  - reactions
  - bookings
  - payments
  - notifications
  - safety reports
  - venues

## Non-Goals

- final ranking quality improvements
- analytics warehouse work

## Dependencies

- none

## Affected Areas

- `backend/`

## Implementation Notes

- Choose a clear ORM/query layer and stick to it.
- All records must be user-scoped.
- Seed/demo data should become optional dev-only fixtures.

## Acceptance Criteria

- [ ] Core data survives restart/redeploy.
- [ ] Bootstrap data is loaded from persistence, not singleton memory.
- [ ] Two users can exist without shared state leakage.
- [ ] Migrations can build a clean local database.

## Review Checklist

- [ ] No singleton in-memory state remains for core user/product flows.
- [ ] User scoping is enforced everywhere.
- [ ] Schema matches current mobile/backend contract.

## Test Checklist

- [ ] Backend build passes.
- [ ] Migration test on empty database passes.
- [ ] Restart test confirms data remains.
- [ ] At least one multi-user isolation test exists.
