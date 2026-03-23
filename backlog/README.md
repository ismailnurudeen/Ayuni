# Ayuni Backlog

This backlog is the execution source of truth for Ayuni.

## Structure

- `TICKET_TEMPLATE.md`: template for new tickets
- `p0/`: required for real MVP readiness
- `p1/`: hardening and scale-up work
- `p2/`: post-MVP improvements

## Execution Rules

- Every ticket must define scope, non-goals, dependencies, acceptance criteria, review checklist, and test checklist.
- Tickets should be executed with the Ayuni skill system.
- A ticket is not complete until implementation, review, and test gates all pass.

## Skill Mapping

- `ayuni-backlog-orchestrator`: ticket decomposition and agent routing
- `ayuni-backend-foundation`: backend platform work
- `ayuni-mobile-product`: app UX and feature wiring
- `ayuni-bookings-and-payments`: money and booking state
- `ayuni-trust-and-verification`: trust, safety, abuse prevention
- `ayuni-ops-console`: admin/support tooling
- `ayuni-release-hardening`: deployment and operational readiness
- `ayuni-review-gate`: code review
- `ayuni-test-gate`: verification
- `ayuni-product-qa`: product rule validation
