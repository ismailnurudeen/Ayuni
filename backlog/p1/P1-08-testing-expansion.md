# P1-08 Testing Expansion

## Objective
Expand test coverage across backend, mobile, and ops-console to establish a reliable regression safety net — targeting critical paths first: auth, booking lifecycle, payment webhooks, and round generation.

## Why This Exists
Currently there are only 4 test files (3 backend service specs, 1 mobile rules test). Major flows like booking state machine, payment webhook processing, round generation, and verification are untested. This makes refactoring risky and regressions likely as the codebase grows.

## Scope

### Backend (Jest)

- `booking.service.spec.ts` — booking state machine transitions, invalid state transitions rejected
- `paystack.service.spec.ts` — webhook signature verification, idempotent processing, refund initiation
- `media.service.spec.ts` — upload validation, delete with cleanup, reorder, limit enforcement
- `matching.service.spec.ts` (or within app.service) — round generation, preference filtering, exclusion logic
- `safety.controller.spec.ts` — report submission, lifecycle transitions
- `verification.service.spec.ts` — selfie/ID submission, status transitions
- Controller integration tests for critical endpoints (auth, booking, mobile)

### Mobile (Kotlin/commonTest)

- `BookingRulesTest.kt` — booking state validation, cancellation eligibility
- `OnboardingValidationTest.kt` — field validation, age check, step progression
- `RoundLogicTest.kt` — round display rules, reaction state
- `ApiClientTest.kt` — request/response parsing with mock HTTP client

### Ops Console

- Basic component render tests with Vitest
- Action handler tests (resolve report, approve verification)

## Non-Goals

- End-to-end browser testing
- Visual regression testing
- Performance/load testing (see P1-10)
- 100% code coverage target

## Dependencies

- `P0-01` through `P0-11` (existing implementation to test against)
- `backend/jest.config.js` (exists)
- `composeApp/src/commonTest/` (exists with `RulesTest.kt`)

## Affected Areas

- `backend/src/modules/*.spec.ts` — new and expanded test files
- `composeApp/src/commonTest/kotlin/com/ayuni/app/` — new test files
- `ops-console/` — add test setup (vitest) and initial tests
- `ops-console/package.json` — add test dependencies

## Implementation Notes

- Backend tests should mock `DatabaseService` — no real DB in unit tests.
- Use Jest's `describe`/`it` structure with clear state-per-test setup.
- Mobile tests use kotlin.test with expect/assert. Mock API client with Ktor mock engine.
- Ops console: add Vitest + @testing-library/react for component tests.
- Prioritize tests for code with complex branching: booking state machine, webhook processing, freeze policy.
- Each new test file should be runnable independently.

## Acceptance Criteria

- [ ] Booking state machine has test coverage for all valid transitions and rejects invalid ones.
- [ ] Payment webhook processing tested with valid/invalid signatures and duplicate events.
- [ ] Round generation tested with preference filtering and exclusion.
- [ ] Media service tested for upload limits, delete cleanup, and reorder.
- [ ] Mobile onboarding validation tested (age, required fields).
- [ ] At least one ops-console component render test exists.
- [ ] All new tests pass in CI-compatible mode (`npm test`, `./gradlew commonTest`).

## Review Checklist

- [ ] Tests are deterministic — no time-dependent or order-dependent failures.
- [ ] Mocks are minimal and focused (don't over-mock).
- [ ] Test names clearly describe the scenario being verified.
- [ ] No production code changes made solely to enable testing (prefer testing public interfaces).

## Test Checklist

- [ ] `npm test` in backend passes all new and existing specs.
- [ ] `./gradlew :composeApp:desktopTest` (or equivalent) passes mobile tests.
- [ ] Ops-console tests run with `npm test`.
- [ ] No flaky tests on repeated runs.

## Completion Notes
