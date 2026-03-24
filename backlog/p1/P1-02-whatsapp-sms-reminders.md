# P1-02 WhatsApp/SMS Reminder System

## Objective
Send automated booking reminders and key lifecycle notifications via WhatsApp (preferred) and SMS fallback so users never miss a confirmed date.

## Why This Exists
Users in the Nigerian market rely heavily on WhatsApp. Push notifications alone are insufficient — missed dates hurt trust and revenue. Timely reminders for upcoming bookings, payment deadlines, and booking confirmations reduce no-shows and late cancellations.

## Scope

- Integrate WhatsApp Business API provider (e.g., Twilio WhatsApp, Africa's Talking, or Meta Cloud API)
- Add SMS fallback via existing `sms.service.ts` infrastructure
- Send reminders at configurable intervals before a booked date (24h, 2h)
- Send booking confirmation notification after payment success
- Send payment-required nudge when booking enters `payment_required` state
- Send cancellation/reschedule notifications
- Add delivery status tracking (sent, delivered, read, failed)
- Add opt-out/preference control per user
- Add admin visibility into delivery logs from ops console

## Non-Goals

- Marketing/promotional messages
- Two-way conversational WhatsApp bot
- In-app chat (see P1-03)
- Push notification channel (see P1-06)

## Dependencies

- `P0-08` (booking lifecycle — complete)
- `P0-09` (Paystack — complete)
- `P0-03` (phone verification — complete, provides phone numbers)

## Affected Areas

- `backend/src/modules/` — new `reminder.service.ts`, `whatsapp.service.ts`
- `backend/src/modules/webhook.controller.ts` — delivery status webhooks
- `backend/src/modules/app.module.ts` — service registration
- `backend/migrations/` — new migration for reminder logs and preferences
- `ops-console/src/` — delivery log viewer

## Implementation Notes

- Use WhatsApp message templates (pre-approved by Meta) for transactional messages.
- Reminder scheduling should be cron-based or use a lightweight job queue (e.g., `bull` or `agenda`).
- Store all outbound message attempts with status for auditability.
- Nigerian phone formatting validated in P0-03 should be reused.
- Rate-limit outbound messages per user to prevent spam.

## Acceptance Criteria

- [ ] Booking confirmation sent via WhatsApp after successful payment.
- [ ] 24-hour and 2-hour reminders sent before confirmed dates.
- [ ] Payment nudge sent when booking enters `payment_required` state.
- [ ] SMS fallback triggers when WhatsApp delivery fails.
- [ ] Delivery status tracked and visible in ops console.
- [ ] Users can opt out of non-critical reminders.
- [ ] Reminder logs persisted in database with timestamps and status.

## Review Checklist

- [ ] WhatsApp templates comply with Meta Business API policies.
- [ ] No PII logged beyond phone number and message template ID.
- [ ] Rate limiting prevents message flooding.
- [ ] Fallback logic tested with WhatsApp unavailable.
- [ ] Reminder scheduling handles timezone (WAT) correctly.

## Test Checklist

- [ ] Unit tests for reminder scheduling logic.
- [ ] Integration test for WhatsApp send + delivery webhook.
- [ ] SMS fallback tested with mock WhatsApp failure.
- [ ] Opt-out preference respected in reminder dispatch.
- [ ] Ops console delivery log displays correct statuses.

## Completion Notes
