# P0-04 Onboarding Hardening

## Objective
Make onboarding production-ready while keeping minimum signup friction.

## Why This Exists
The current flow exists, but needs legal, age, resume, and state-hardening work.

## Scope

- Keep minimum required fields:
  - phone
  - OTP
  - first name
  - birth date
  - gender identity
  - interested in
  - city
  - terms acceptance
- Enforce 18+.
- Persist progress and resume correctly.
- Record terms/privacy consent timestamp/version.
- Improve failure handling and recovery.

## Non-Goals

- adding non-essential profile fields to signup

## Dependencies

- `P0-01`
- `P0-02`
- `P0-03`

## Affected Areas

- `composeApp/`
- `backend/`

## Acceptance Criteria

- [ ] User can complete only minimum signup and enter the app.
- [ ] Under-18 users are blocked.
- [ ] Interrupted onboarding resumes correctly after app restart/login.
- [ ] Terms acceptance is recorded durably.

## Review Checklist

- [ ] Signup still feels low-friction.
- [ ] No unnecessary fields are introduced early.

## Test Checklist

- [ ] Onboarding happy path tested.
- [ ] Age gate tested.
- [ ] Resume/interruption behavior tested.
