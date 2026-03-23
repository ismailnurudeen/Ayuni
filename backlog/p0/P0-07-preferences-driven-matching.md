# P0-07 Preferences Driven Matching

## Objective
Use saved dating preferences as real matching filters.

## Why This Exists
Preferences are editable, but not yet enforced as true round-generation input.

## Scope

- Filter candidates using:
  - age range
  - gender identity
  - height range
  - cities
  - date areas
  - preferred date activities
- Start with deterministic rule-based filtering.

## Non-Goals

- learned ranking or compatibility ML

## Dependencies

- `P0-01`

## Affected Areas

- `backend/`

## Acceptance Criteria

- [ ] Preference changes affect future rounds.
- [ ] Out-of-range candidates are excluded.
- [ ] City and area filtering work correctly.

## Review Checklist

- [ ] Filtering logic is explicit and testable.
- [ ] No hidden defaults produce misleading matches.

## Test Checklist

- [ ] Preference filter tests exist.
- [ ] Edge cases with narrow filters are covered.
