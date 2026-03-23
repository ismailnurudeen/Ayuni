# P0-11 Selfie Verification

## Objective
Implement selfie capture and verification review flow.

## Why This Exists
Selfie verification is in the original trust model but is currently only stubbed.

## Scope

- native selfie capture
- submission flow
- verification state:
  - pending
  - approved
  - rejected
- ops review path
- trust badge update in user profile

## Non-Goals

- biometric face matching sophistication beyond MVP need

## Dependencies

- `P0-01`
- `P0-02`

## Affected Areas

- `composeApp/`
- `backend/`
- `ops-console/`

## Acceptance Criteria

- [ ] User can submit selfie.
- [ ] Backend stores review state.
- [ ] Ops can review status.
- [ ] Mobile reflects updated trust state.

## Review Checklist

- [ ] Sensitive media handling is explicit.
- [ ] Rejection state is user-visible and recoverable.

## Test Checklist

- [ ] Capture/submission flow tested.
- [ ] Status transitions tested.
