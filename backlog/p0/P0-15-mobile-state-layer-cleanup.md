# P0-15 Mobile State Layer Cleanup

## Objective
Replace root-level orchestration with a proper feature state/data layer.

## Why This Exists
The app still coordinates too much behavior directly in `App.kt`.

## Scope

- move API calls out of root app shell
- introduce repositories/use-cases/state holders
- localize loading/error/retry states by feature
- keep `App.kt` focused on composition and top-level routing

## Non-Goals

- full architecture rewrite beyond what current MVP needs

## Dependencies

- none

## Affected Areas

- `composeApp/`

## Acceptance Criteria

- [ ] `App.kt` no longer owns most feature mutations.
- [ ] Features have isolated state.
- [ ] Network failures are localized to relevant screens.

## Review Checklist

- [ ] New architecture is simpler, not more ceremonial.
- [ ] Feature boundaries are clear.

## Test Checklist

- [ ] Android compile passes.
- [ ] Core feature smoke tests still pass.
