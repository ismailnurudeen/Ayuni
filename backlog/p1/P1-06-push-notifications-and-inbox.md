# P1-06 Push Notifications and Inbox

## Objective
Implement native push notifications (FCM for Android, APNs for iOS) and upgrade the in-app notifications screen from static display to a real-time, server-driven inbox with read/unread state and deep linking.

## Why This Exists
The current `NotificationsScreen.kt` exists but notifications are not server-driven and there are no push notifications. Users have no way to know about new rounds, booking updates, or payment reminders without opening the app. Push notifications are critical for engagement and time-sensitive booking flows.

## Scope

- Backend notification dispatch service with channel routing (push, in-app, WhatsApp/SMS via P1-02)
- FCM integration for Android push notifications
- APNs integration for iOS push notifications
- Device token registration endpoint (store per-user, per-device)
- Notification types: new round available, booking status change, payment required, reminder, verification update, safety alert
- In-app inbox backed by server data with read/unread state
- Badge count on notifications tab
- Deep linking from push notification tap to relevant screen
- Notification preferences per user (which types to receive via which channels)
- Ops-triggered notifications (manual push to specific user)

## Non-Goals

- Rich media notifications (images, action buttons in push)
- Topic-based broadcast notifications
- Email notifications
- Notification grouping/threading (defer to P2)

## Dependencies

- `P0-01` (persistence — complete)
- `P0-02` (auth — complete)
- Existing `NotificationsScreen.kt` and `NotificationRow.kt`

## Affected Areas

- `backend/src/modules/` — new `notification.service.ts`, `push.service.ts`
- `backend/src/modules/mobile.controller.ts` — device token registration, inbox endpoints
- `backend/migrations/` — notifications table, device tokens table
- `composeApp/src/commonMain/kotlin/com/ayuni/app/ui/screens/notifications/` — inbox rewrite
- `composeApp/src/androidMain/` — FCM setup, token registration
- `composeApp/src/iosMain/` — APNs setup, token registration
- `composeApp/src/commonMain/kotlin/com/ayuni/app/data/api/AyuniApiClient.kt` — notification endpoints
- `ops-console/src/` — send notification action

## Implementation Notes

- Use Firebase Cloud Messaging for Android; APNs directly or via FCM for iOS.
- Device tokens should be refreshed on each app launch and stored per-user (support multiple devices).
- Notification dispatch should be async (queue-based) to not block request handlers.
- In-app inbox sorts by timestamp descending, shows unread indicator.
- Deep link payload: `{ screen: "booking", id: "..." }` parsed on notification tap to navigate.
- Badge count = unread notification count, updated on each inbox fetch and push receipt.

## Acceptance Criteria

- [ ] Android users receive push notifications via FCM.
- [ ] iOS users receive push notifications via APNs.
- [ ] Device token registered on app launch and refreshed on token change.
- [ ] In-app inbox loads notifications from server with read/unread state.
- [ ] Tapping a push notification deep links to the relevant screen.
- [ ] Badge count reflects unread notification count.
- [ ] Users can configure notification preferences (types and channels).
- [ ] Ops can send a push notification to a specific user.
- [ ] Notifications dispatched for: new round, booking update, payment required, verification update.

## Review Checklist

- [ ] FCM server key stored securely (not in source code).
- [ ] APNs certificate/key managed securely.
- [ ] Device token storage handles multiple devices per user.
- [ ] Push dispatch does not block API request handlers.
- [ ] Deep link parsing handles missing/invalid targets gracefully.
- [ ] Notification preferences default to all-enabled for new users.

## Test Checklist

- [ ] Push notification received on Android device/emulator.
- [ ] Push notification received on iOS device/simulator.
- [ ] Device token registration and refresh tested.
- [ ] In-app inbox loads and marks notifications as read.
- [ ] Deep link navigates to correct screen.
- [ ] Badge count updates on new notification and on read.
- [ ] Notification preferences toggle respected in dispatch.
- [ ] Ops-triggered notification reaches target user.

## Completion Notes
