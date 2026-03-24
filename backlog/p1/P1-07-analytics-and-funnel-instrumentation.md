# P1-07 Analytics and Funnel Instrumentation

## Objective
Instrument key user funnels and product events across mobile and backend to enable data-driven decisions on onboarding completion, round engagement, booking conversion, and payment success rates.

## Why This Exists
Without analytics, there is no visibility into where users drop off, which features drive engagement, or what conversion rates look like. This data is essential for prioritizing P2+ work, identifying UX friction, and measuring the impact of changes.

## Scope

- Define event taxonomy covering core funnels: onboarding, rounds, booking, payment, verification
- Mobile event tracking library (lightweight wrapper, not a full SDK)
- Backend event emission for server-side events (payment success, booking state changes, verification decisions)
- Event transport: batch POST to backend analytics endpoint or third-party (Mixpanel, Amplitude, or PostHog)
- Onboarding funnel: step entered, step completed, step abandoned, onboarding complete
- Round funnel: round received, profile viewed, reaction submitted, round completed
- Booking funnel: match accepted, availability submitted, payment initiated, payment completed, booking confirmed
- Verification funnel: selfie submitted, selfie approved/rejected, ID submitted, ID approved/rejected
- Ops dashboard: basic funnel visualization or export capability
- Privacy-safe: no PII in event payloads, use anonymized user IDs

## Non-Goals

- A/B testing framework
- Real-time analytics dashboard (batch/daily is sufficient)
- Revenue analytics (Paystack dashboard covers this)
- Session replay or heatmaps
- Marketing attribution

## Dependencies

- `P0-04` (onboarding — complete)
- `P0-06` (rounds — complete)
- `P0-08` (booking — complete)
- `P0-02` (auth — provides user identity)

## Affected Areas

- `composeApp/src/commonMain/kotlin/com/ayuni/app/` — new `analytics/` package with tracker
- `composeApp/src/commonMain/kotlin/com/ayuni/app/ui/screens/` — event calls at key interaction points
- `backend/src/modules/` — new `analytics.service.ts`, `analytics.controller.ts`
- `backend/migrations/` — events table (if self-hosted) or config for third-party
- `ops-console/src/` — funnel summary view

## Implementation Notes

- Event naming convention: `snake_case`, e.g., `onboarding_step_completed`, `round_profile_viewed`.
- Mobile tracker should batch events and flush periodically or on app background.
- Backend events emitted inline in service methods (e.g., after `paymentCompleted()` → emit event).
- If using third-party: PostHog is open-source and self-hostable, good fit for early stage.
- If self-hosted: simple events table with `user_id`, `event_name`, `properties` (JSONB), `timestamp`.
- Anonymize user IDs in analytics payloads — use a hash or separate analytics ID, not the primary user ID.

## Acceptance Criteria

- [ ] Onboarding funnel events tracked: each step start/complete/abandon.
- [ ] Round funnel events tracked: received, viewed, reacted, completed.
- [ ] Booking funnel events tracked: match accepted through booking confirmed.
- [ ] Verification events tracked: submitted, approved, rejected.
- [ ] Mobile events batched and sent to analytics endpoint.
- [ ] Backend events emitted for server-side state changes.
- [ ] No PII present in event payloads.
- [ ] Ops can view funnel summary or export raw events.

## Review Checklist

- [ ] Event taxonomy documented and consistent across mobile/backend.
- [ ] No PII (name, phone, email) in any event payload.
- [ ] Mobile event batching does not block UI thread.
- [ ] Analytics endpoint authenticated (no public event ingestion).
- [ ] Event volume estimated — storage and transport capacity considered.

## Test Checklist

- [ ] Mobile events fire at correct interaction points (verified via logs).
- [ ] Backend events emitted during booking and verification flows.
- [ ] Event batching and flush tested on mobile.
- [ ] Analytics endpoint accepts and stores events correctly.
- [ ] Funnel visualization (or raw export) shows correct event sequence.
- [ ] PII scrubbing verified on sample events.

## Completion Notes
