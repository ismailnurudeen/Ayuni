# P0-16 Environment And Release Config

## Objective
Remove source-level environment coupling and make builds deployable cleanly.

## Why This Exists
The app and services still rely on source-level environment assumptions and ad hoc deployment steps.

## Scope

- move API base URL to environment/build config
- define dev/staging/prod behavior
- add deploy-time secrets/config guidance
- keep backend and ops deployable without code edits

## Non-Goals

- full CI/CD pipeline if handled in later ticket

## Dependencies

- none

## Affected Areas

- `composeApp/`
- `backend/`
- `ops-console/`

## Acceptance Criteria

- [ ] Switching environments does not require source edits.
- [ ] Backend and ops can deploy via config only.
- [ ] Mobile builds can target staging or prod cleanly.

## Review Checklist

- [ ] No secrets are committed.
- [ ] No hardcoded prod endpoints remain.

## Test Checklist

- [ ] Dev and prod config paths verified.
- [ ] Existing deployments still work after config extraction.
