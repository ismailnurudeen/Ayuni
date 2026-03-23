# P0-06 Real Round Generation

## Objective
Implement real server-driven daily rounds at 8:00 PM WAT.

## Why This Exists
The rounds UI is in place, but suggestions are still seeded and not truly generated per user.

## Scope

- Create round records per user.
- Generate max 5 profiles per daily round.
- Exclude already-reacted profiles from active round.
- Keep accepted/declined history.
- Persist reactions and round completion state.

## Non-Goals

- advanced AI ranking

## Dependencies

- `P0-01`
- `P0-02`
- `P0-07`

## Affected Areas

- `backend/`
- `composeApp/`

## Acceptance Criteria

- [ ] Each user gets a user-specific round.
- [ ] Round contains at most 5 profiles.
- [ ] Reacted profiles leave active round and move to history.
- [ ] Round survives restart and cross-device access.

## Review Checklist

- [ ] Daily round rules match product spec.
- [ ] Reaction state cannot drift between app and backend.

## Test Checklist

- [ ] Round generation tested.
- [ ] Reaction persistence tested.
- [ ] Empty round / exhausted pool behavior tested.
