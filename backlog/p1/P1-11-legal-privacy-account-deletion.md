# P1-11 Legal/Privacy/Account Deletion

## Objective
Implement account deletion, data export, and privacy compliance flows so users can exercise data rights and the product meets Nigerian Data Protection Regulation (NDPR) and app store requirements.

## Why This Exists
Apple App Store and Google Play both require apps to offer account deletion. NDPR (Nigeria's data protection law) requires data access and erasure capabilities. Without these flows, the app cannot pass store review and operates non-compliantly with data protection law.

## Scope

### Account Deletion

- User-initiated account deletion from Settings screen
- Confirmation flow with clear explanation of what will be deleted
- Grace period (e.g., 30 days) before permanent deletion, with ability to cancel
- Backend soft-delete: mark account as `pending_deletion` with scheduled hard-delete
- Hard-delete process: remove or anonymize user data, profile media files, chat messages, bookings (retain anonymized financial records for legal compliance)
- Cancel active bookings and notify matched users
- Revoke all sessions on deletion request

### Data Export

- User can request data export from Settings
- Export includes: profile data, preferences, booking history, verification status, notification history
- Delivered as downloadable JSON or sent to registered email
- Rate-limited (max 1 export per 24 hours)

### Privacy Policy Consent

- Track consent version per user (already partially in P0-04)
- Re-prompt consent when privacy policy version changes
- Store consent timestamp and version in database

### Legal

- Terms of Service and Privacy Policy links accessible from Settings and onboarding
- In-app display of current ToS/Privacy Policy version

## Non-Goals

- GDPR compliance (EU-specific requirements beyond NDPR scope)
- Right to data portability to another service
- Automated regulatory reporting
- Cookie consent (not applicable to mobile)

## Dependencies

- `P0-04` (onboarding — terms consent recording)
- `P0-01` (persistence — complete)
- `P0-02` (auth — session management)
- `P0-05` (media — file cleanup on deletion)

## Affected Areas

- `backend/src/modules/` — new `account.service.ts` or extend `app.service.ts`
- `backend/src/modules/mobile.controller.ts` — deletion and export endpoints
- `backend/src/modules/auth.service.ts` — session revocation on deletion
- `backend/migrations/` — add `deletion_requested_at`, `deletion_scheduled_at` to users table
- `composeApp/src/commonMain/kotlin/com/ayuni/app/ui/screens/profile/` — deletion and export UI in Settings
- `composeApp/src/commonMain/kotlin/com/ayuni/app/data/api/AyuniApiClient.kt` — deletion/export endpoints

## Implementation Notes

- Soft-delete sets `deletion_requested_at` and `deletion_scheduled_at = now + 30 days`.
- A scheduled job (cron or background worker) processes hard-deletes for accounts past their scheduled date.
- Hard-delete should anonymize booking/payment records (replace user ID with hash, remove name/phone) rather than deleting them, to preserve financial audit trail.
- Media files in `uploads/` directory must be physically deleted during hard-delete.
- Data export should exclude sensitive internal fields (password hashes, tokens, internal IDs).
- Re-authentication required before account deletion (confirm password or OTP).

## Acceptance Criteria

- [x] Users can request account deletion from Settings.
- [x] Deletion request shows clear confirmation with 30-day grace period explanation.
- [x] Account marked as `pending_deletion` with scheduled hard-delete date.
- [x] User can cancel deletion within grace period and restore account.
- [x] All sessions revoked immediately on deletion request.
- [x] Hard-delete process removes/anonymizes all personal data.
- [x] Media files deleted from storage during hard-delete.
- [x] Users can request data export and receive downloadable JSON.
- [x] Data export rate-limited to 1 per 24 hours.
- [x] Privacy policy consent version tracked per user.
- [x] Re-consent prompted when policy version changes.

## Review Checklist

- [x] Hard-delete anonymizes financial records instead of deleting them.
- [x] No orphaned media files after account deletion.
- [x] Re-authentication enforced before deletion request.
- [x] Export excludes password hashes, tokens, and internal IDs.
- [x] Scheduled deletion job handles edge cases (user re-registered with same phone).
- [x] NDPR compliance requirements reviewed against implementation.

## Test Checklist

- [x] Account deletion request flow tested end-to-end.
- [x] Cancellation within grace period restores account.
- [x] Hard-delete removes profile, media, and personal data.
- [x] Hard-delete retains anonymized booking/payment records.
- [x] Data export returns correct user data in JSON format.
- [x] Export rate limiting enforced.
- [x] Session revocation verified after deletion request.
- [x] Consent version tracking works on policy update.

## Completion Notes

**Implemented 2026-03-25** — 154 tests passing (11 new P1-11 tests).

### Files Changed
- `backend/migrations/013_add_account_deletion.sql` — new migration for deletion tracking and data export tables
- `backend/src/modules/app.types.ts` — added AccountDeletionRequest, DataExportPayload, DataExportRequest types
- `backend/src/modules/app.service.ts` — added requestAccountDeletion, cancelAccountDeletion, getAccountDeletionStatus, processScheduledDeletions, hardDeleteUser, requestDataExport, acceptPrivacyConsent, getConsentStatus methods
- `backend/src/modules/mobile.controller.ts` — added 6 new endpoints (account/delete, account/delete/cancel, account/deletion-status, account/export, account/consent GET/POST)
- `backend/src/modules/ops.controller.ts` — added processScheduledDeletions endpoint
- `backend/src/modules/app.service.spec.ts` — 11 new tests covering deletion, export, and consent flows
- `composeApp/.../api/ApiPayloads.kt` — added API response models for deletion, export, and consent
- `composeApp/.../api/AyuniApiClient.kt` — added 6 new API client methods
- `composeApp/.../profile/AccountDeletionScreen.kt` — new screen with data export, legal links, and deletion UI
- `composeApp/.../profile/ProfileScreenNavigation.kt` — added AccountDeletion route
- `composeApp/.../profile/ProfileSettingsScreens.kt` — wired Delete Account action to navigate to deletion screen
- `composeApp/.../App.kt` — wired AccountDeletion screen with state management
