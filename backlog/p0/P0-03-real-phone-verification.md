# P0-03 Real Phone Verification

## Objective
Replace the stub OTP flow with a real SMS verification provider.

## Why This Exists
Phone-first signup is the preferred low-friction path for the target market, but it currently uses a fake code.

## Scope

- Integrate an SMS OTP provider.
- Add resend cooldown.
- Add verification attempt limits.
- Add expiry handling and abuse rate limits.
- Support Nigerian phone formatting and validation.

## Non-Goals

- email signup
- WhatsApp as primary auth channel

## Dependencies

- `P0-02`

## Affected Areas

- `backend/`
- `composeApp/`

## Acceptance Criteria

- [ ] A real Nigerian phone number can request OTP.
- [ ] Correct OTP verifies; wrong OTP is rejected.
- [ ] Resend is rate-limited.
- [ ] Abuse limits prevent brute-force retries.

## Review Checklist

- [ ] OTP secrets/codes are not logged insecurely.
- [ ] Error messages do not leak sensitive verification details.

## Test Checklist

- [ ] Provider integration is verified in staging/sandbox.
- [ ] Failure and timeout paths are tested.
- [ ] Mobile UI handles resend and invalid-code states.
