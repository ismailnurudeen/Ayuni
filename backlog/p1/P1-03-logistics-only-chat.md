# P1-03 Logistics-Only Chat

## Objective
Enable a limited in-app messaging channel between matched users for confirmed bookings, restricted to logistics coordination (time, location, arrival updates) with no free-text before the date is confirmed.

## Why This Exists
Once a booking is confirmed and a venue assigned, both users need a way to coordinate arrival without exchanging personal contact details. This keeps communication inside the app (safer, auditable) while preventing pre-date chatting that undermines the real-dates-first product model.

## Scope

- Backend chat service with message persistence
- Chat channel auto-created when booking reaches `confirmed` state
- Chat channel deactivated when booking reaches `completed`, `cancelled`, or `no_show` state
- Message types: text (logistics only), predefined quick replies ("Running 10 min late", "I'm here", "On my way")
- Mobile chat UI accessible from the Dates tab on confirmed bookings
- Backend message storage with sender, timestamp, booking reference
- Real-time delivery via WebSocket or SSE (polling fallback)
- Ops visibility: ability to view chat logs for safety investigations
- Content filtering: block phone numbers, social media handles, URLs

## Non-Goals

- Pre-booking messaging or icebreakers
- Media/image sharing in chat
- Group chat
- AI-moderated conversation
- Read receipts or typing indicators (defer to P2)

## Dependencies

- `P0-08` (booking lifecycle — complete)
- `P0-01` (persistence — complete)
- `P0-02` (auth — complete)

## Affected Areas

- `backend/src/modules/` — new `chat.service.ts`, `chat.controller.ts`
- `backend/migrations/` — new migration for chat messages
- `composeApp/src/commonMain/kotlin/com/ayuni/app/ui/screens/dates/` — chat UI
- `composeApp/src/commonMain/kotlin/com/ayuni/app/data/api/AyuniApiClient.kt` — chat endpoints
- `ops-console/src/` — chat log viewer for investigations

## Implementation Notes

- WebSocket gateway via NestJS `@WebSocketGateway` for real-time delivery.
- Fallback to polling for platforms where WebSocket setup is unreliable.
- Content filter should use regex to detect phone patterns (+234..., 080..., 090...) and common social handles (@username, instagram.com, etc.).
- Chat messages tied to booking ID — no orphaned channels.
- Quick-reply buttons reduce free-text and keep conversations focused.

## Acceptance Criteria

- [ ] Chat channel opens automatically when booking is confirmed.
- [ ] Chat channel closes when booking completes, is cancelled, or results in no-show.
- [ ] Users can send text messages and use quick-reply buttons.
- [ ] Phone numbers, URLs, and social handles are blocked/filtered.
- [ ] Messages persist and load correctly on app reopen.
- [ ] Real-time delivery works via WebSocket with polling fallback.
- [ ] Ops can view chat transcripts for any booking.

## Review Checklist

- [ ] No personal contact info leaks through message content.
- [ ] Chat only available for confirmed bookings (state guard enforced server-side).
- [ ] WebSocket connections authenticated and scoped to booking participants.
- [ ] Message storage includes booking ID foreign key.
- [ ] Content filter tested with Nigerian phone number formats.

## Test Checklist

- [ ] Send/receive messages between two users on a confirmed booking.
- [ ] Chat unavailable before booking confirmation.
- [ ] Chat deactivated after booking completion.
- [ ] Content filter blocks phone numbers and social handles.
- [ ] Quick-reply buttons send correct predefined messages.
- [ ] Ops console displays chat transcript for a given booking.
- [ ] WebSocket reconnection tested after network interruption.

## Completion Notes
