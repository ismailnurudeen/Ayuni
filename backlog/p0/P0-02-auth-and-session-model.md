# P0-02 Auth And Session Model

## Objective
Add real authenticated identity and persistent sessions after phone verification.

## Why This Exists
Current onboarding behaves like one shared demo user with no durable auth state.

## Scope

- Add user identity creation after OTP verification.
- Add access token and refresh token model.
- Add authenticated request handling for user-specific endpoints.
- Add logout and session invalidation.
- Store auth state securely on device.

## Non-Goals

- social login
- multi-device session management UI

## Dependencies

- `P0-01`

## Affected Areas

- `backend/`
- `composeApp/`

## Acceptance Criteria

- [ ] User receives authenticated session after OTP verify.
- [ ] App remains logged in across restart.
- [ ] Logout clears local auth and invalidates backend session.
- [ ] Bootstrap and update endpoints are user-scoped by auth, not implicit singleton state.

## Review Checklist

- [ ] Tokens are not trusted from client without backend validation.
- [ ] Protected routes are actually protected.
- [ ] No user data can be fetched without session context.

## Test Checklist

- [ ] Backend auth tests cover login, refresh, logout.
- [ ] Mobile startup works with existing session.
- [ ] Unauthorized requests fail correctly.
