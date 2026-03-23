# P0-09 Paystack Integration

## Objective
Make date-token payment real with Paystack.

## Why This Exists
The payment initiation flow is still stubbed.

## Scope

- Paystack checkout integration
- support card, transfer, USSD
- webhook handling
- payment reconciliation
- refund state support

## Non-Goals

- alternative payment providers

## Dependencies

- `P0-08`

## Affected Areas

- `backend/`
- `composeApp/`

## Acceptance Criteria

- [ ] Successful payment marks token/booking paid.
- [ ] Failed payment is not treated as paid.
- [ ] Webhooks are idempotent.
- [ ] Mobile can start the payment flow cleanly.

## Review Checklist

- [ ] No client-only trust of payment completion.
- [ ] Refund/retry semantics are clear.

## Test Checklist

- [ ] Sandbox payment flow tested.
- [ ] Webhook duplicate delivery tested.
- [ ] Failure and cancellation tested.
