---
name: ayuni-trust-and-verification
description: Use when implementing Ayuni trust systems: phone OTP, selfie verification, government ID checks, trust badges, safety reporting, no-show rules, freezes, and abuse prevention.
---

# Ayuni Trust And Verification

Use this skill for tickets involving user trust, abuse prevention, or safety.

## Scope

- phone verification
- selfie verification
- ID verification
- trust badges
- report intake and triage
- no-show/late cancellation penalties
- freeze logic
- anti-abuse controls

## Working Rules

1. Keep signup friction low; defer deeper checks where the product allows.
2. Enforce booking gates server-side.
3. Make trust states explicit and reviewable by ops.
4. Never silently auto-approve sensitive verification without an audit trail.

## Required Deliverables

- state model changes
- user-visible trust status
- ops review surfaces where needed
- abuse/failure-path tests
