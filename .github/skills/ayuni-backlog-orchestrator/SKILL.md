---
name: ayuni-backlog-orchestrator
description: Use when executing an Ayuni backlog ticket. Reads a backlog spec, selects the correct Ayuni execution skills, splits work for parallel agents, assigns file ownership, and defines required review and test gates before a ticket can be marked complete.
---

# Ayuni Backlog Orchestrator

Use this skill whenever the user asks to implement, continue, or complete an Ayuni backlog item.

## Inputs

- A backlog ticket under `/Users/elnuru/Documents/New project/backlog/`
- The current repo state

## Workflow

1. Read the ticket spec fully.
2. Extract:
   - objective
   - scope
   - non-goals
   - dependencies
   - acceptance criteria
   - required verification
3. Choose the smallest set of Ayuni execution skills needed.
4. Split work into parallelizable slices only when file ownership can stay disjoint.
5. Assign:
   - one implementer
   - one reviewer using `ayuni-review-gate`
   - one tester using `ayuni-test-gate`
6. Keep the critical path local when the next result blocks progress immediately.

## Execution Skill Routing

- Persistence, auth, API contracts, migrations: `ayuni-backend-foundation`
- App UX, onboarding, profile, rounds, state management: `ayuni-mobile-product`
- Booking lifecycle, venue assignment, payments, refunds: `ayuni-bookings-and-payments`
- OTP, selfie, ID, trust, freezes, reporting: `ayuni-trust-and-verification`
- Admin tools and support workflows: `ayuni-ops-console`
- Deployment, CI, observability, release readiness: `ayuni-release-hardening`

## Parallelization Rules

- Do parallelize backend and mobile work when API contracts are already defined.
- Do parallelize implementation and review/testing.
- Do not parallelize two workers touching the same file set.
- Do not start mobile wiring before backend contract decisions are stable.

## Required Completion Output

Every completed ticket must end with:

- files changed
- acceptance criteria status
- review findings or explicit “no findings”
- test evidence
- unresolved risks

## Definition Of Done

A ticket is not done until:

- implementation matches the backlog spec
- review gate passes
- test gate passes
- any new config/env/setup impact is documented
