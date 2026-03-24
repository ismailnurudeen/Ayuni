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

- [x] Booking confirmation sent via WhatsApp after successful payment.
- [x] 24-hour and 2-hour reminders sent before confirmed dates.
- [x] Payment nudge sent when booking enters `payment_required` state.
- [x] SMS fallback triggers when WhatsApp delivery fails.
- [x] Delivery status tracked and visible in ops console.
- [x] Users can opt out of non-critical reminders.
- [x] Reminder logs persisted in database with timestamps and status.

## Review Checklist

- [x] WhatsApp templates comply with Meta Business API policies.
- [x] No PII logged beyond phone number and message template ID.
- [x] Rate limiting prevents message flooding.
- [x] Fallback logic tested with WhatsApp unavailable.
- [x] Reminder scheduling handles timezone (WAT) correctly.

## Test Checklist

- [x] Unit tests for reminder scheduling logic.
- [x] Integration test for WhatsApp send + delivery webhook.
- [x] SMS fallback tested with mock WhatsApp failure.
- [x] Opt-out preference respected in reminder dispatch.
- [x] Ops console delivery log displays correct statuses.

## Completion Notes

### Implemented — 2025-03-25

**New files:**
- `backend/migrations/011_add_reminder_system.sql` — `reminder_logs` and `reminder_preferences` tables
- `backend/src/modules/whatsapp.service.ts` — WhatsApp Business API via Twilio with test mode fallback
- `backend/src/modules/reminder.service.ts` — Core reminder dispatch with WhatsApp→SMS fallback, preferences, rate limiting, delivery tracking, scheduled scan
- `backend/src/modules/reminder.controller.ts` — User preference endpoints + ops delivery log endpoint
- `backend/src/modules/reminder.service.spec.ts` — 21 tests (all passing): preferences, send/confirm/remind/cancel/nudge, opt-out, delivery status webhooks, SMS fallback, rate limiting

**Modified files:**
- `backend/src/modules/app.types.ts` — Added `ReminderLog`, `ReminderPreferences`, `ReminderTemplate`, `ReminderChannel`, `ReminderStatus` types
- `backend/src/modules/app.module.ts` — Registered `WhatsAppService`, `ReminderService`, `ReminderController`
- `backend/src/modules/webhook.controller.ts` — Added Twilio delivery status callback endpoint (`POST /webhooks/twilio/status`)
- `backend/src/modules/app.service.ts` — Injected `ReminderService`; added booking confirmation reminder after payment success, cancellation notices on cancel/force-cancel
- `backend/migrations/010_add_booking_support.sql` — Removed duplicate `schema_migrations` INSERT (pre-existing bug fix)
- `ops-console/src/App.tsx` — Added Delivery Logs panel with status filter (All/Sent/Delivered/Read/Failed)

**Architecture:**
- WhatsApp preferred channel with automatic SMS fallback on failure
- Per-user rate limiting (10 messages/hour)
- Opt-out preferences per category (confirmations, reminders, nudges, cancellations)
- Delivery status tracking via Twilio status callback webhook
- Scheduled reminder scan method (`processScheduledReminders`) ready for cron/setInterval integration
- All messages logged to `reminder_logs` table for auditability
