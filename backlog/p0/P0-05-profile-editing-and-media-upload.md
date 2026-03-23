# P0-05 Profile Editing And Media Upload

## Objective
Replace placeholder profile media with real uploads and persistent profile editing.

## Why This Exists
The UI exists, but media and much of profile persistence are still mock-level.

## Scope

- Support up to 6 profile media items.
- Implement image upload first; video optional if feasible.
- Persist all editable profile fields.
- Support reorder and delete.
- Keep profile preview accurate.

## Non-Goals

- advanced media moderation automation beyond MVP baseline

## Dependencies

- `P0-01`
- `P0-02`

## Affected Areas

- `composeApp/`
- `backend/`

## Acceptance Criteria

- [ ] User can upload real media.
- [ ] User can reorder and remove media.
- [ ] Profile edits persist across restart/login.
- [ ] Preview reflects saved state.

## Review Checklist

- [ ] Upload failures and partial saves are handled.
- [ ] Media count limit is enforced.

## Test Checklist

- [ ] Upload flow tested on Android.
- [ ] Backend media persistence tested.
- [ ] Profile save/load regression tested.
