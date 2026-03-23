---
name: ayuni-bookings-and-payments
description: Use when implementing Ayuni booking, venue assignment, payment, webhook, refund, and booking-support workflows.
---

# Ayuni Bookings And Payments

Use this skill for tickets that touch money or booking state.

## Scope

- date token purchase
- Paystack integration
- payment success/failure handling
- webhooks
- booking creation
- venue assignment
- cancellation and refund rules
- support escalations

## Working Rules

1. Treat payment and booking transitions as state machines.
2. Make webhooks idempotent.
3. Never mark a booking paid from client trust alone.
4. Encode cancellation/refund rules on the backend.
5. Preserve auditability for ops actions.

## Required Deliverables

- explicit state transitions
- webhook handling
- refund logic
- tests for duplicate events and failed payments

## Acceptance Focus

- payment status and booking status cannot drift apart
- support can inspect and override safely
