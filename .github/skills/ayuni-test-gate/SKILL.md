---
name: ayuni-test-gate
description: Use when validating an Ayuni backlog item. Defines the minimum verification expected for backend, mobile, ops-console, and product workflow completion.
---

# Ayuni Test Gate

Use this skill after implementation.

## Required Validation Categories

- build/compile
- automated tests relevant to the change
- API behavior checks
- UX/manual smoke checks for user-facing changes
- regression checks on adjacent flows

## Minimum By Area

- Backend:
  - build passes
  - changed endpoints have tests or direct verification
- Mobile:
  - Android compile passes
  - affected flow can be exercised manually
- Ops:
  - build passes
  - API-backed screens/actions verified

## Output Format

- checks run
- pass/fail per check
- anything not run and why
- residual risk
