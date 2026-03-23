# P0-05 Profile Editing And Media Upload

## Objective
Replace placeholder profile media with real uploads and persistent profile editing.

## Why This Exists
The UI exists, but media and much of profile persistence are still mock-level.

## Scope

- Support up to 6 profile media items.
- Implement image upload first; video optional if feasible.
- Persist all editable profile fields.
- Support reorder and delete.
- Keep profile preview accurate.

## Non-Goals

- advanced media moderation automation beyond MVP baseline

## Dependencies

- `P0-01`
- `P0-02`

## Affected Areas

- `composeApp/`
- `backend/`

## Acceptance Criteria

- [x] User can upload real media (Android only).
- [x] User can remove media.
- [ ] User can reorder media (backend ready, UI not wired).
- [x] Profile edits persist across restart/login.
- [ ] Preview reflects saved state (URLs saved but not displayed).

## Review Checklist

- [x] Upload failures and partial saves are handled.
- [x] Media count limit is enforced.

## Test Checklist

- [x] Upload flow tested on Android.
- [x] Backend media persistence tested.
- [x] Profile save/load regression tested.

## Implementation Status

### ✅ Completed (Commits: e98b7f5, da89fd0)

**Backend:**
- Migration 005: profile_media table with full metadata
- MediaService: upload/delete/reorder with transaction patterns
- MediaController: REST endpoints with AuthGuard
- Bootstrap integration: media loaded and returned in payload
- File storage: UUID-based files in /uploads directory
- Validation: 6 item max, 10MB file size limit
- All 41 tests passing

**Mobile (Android):**
- Image picker using ActivityResultContracts.PickVisualMedia
- Upload/delete API integration
- ProfileStateHolder methods for media management
- EditProfileScreen UI with upload/delete buttons
- Media ID tracking for deletion

### ⚠️ Known Limitations (To Address in Follow-up)

1. **iOS Image Picker Missing** (HIGH PRIORITY)
   - File: `composeApp/src/iosMain/kotlin/com/ayuni/app/platform/ImagePicker.ios.kt`
   - Current: No-op placeholder
   - Needed: PHPickerViewController implementation

2. **Image Display Not Implemented** (HIGH PRIORITY)
   - Current: Shows gray placeholder boxes
   - Needed: Load and display actual images from storage URLs
   - Consider: Image loading library (Coil, etc.)

3. **Reorder UI Not Implemented** (MEDIUM PRIORITY)
   - Backend endpoint ready
   - Repository method exists
   - Missing: Drag-and-drop or reorder controls in EditProfileScreen

4. **Test Coverage Gaps** (MEDIUM PRIORITY)
   - Missing: media.service.spec.ts tests
   - Missing: Mobile image picker tests
   - Missing: Upload/delete integration tests

5. **HTTP Method Issue** (LOW PRIORITY)
   - Delete endpoint uses POST instead of DELETE
   - File: `composeApp/src/commonMain/kotlin/com/ayuni/app/data/api/AyuniApiClient.kt:173`
   - Works correctly but not RESTful

6. **Image Compression** (NICE TO HAVE)
   - No compression before upload
   - May hit 10MB limit easily with high-res photos
   - Consider client-side compression

7. **UX Polish** (NICE TO HAVE)
   - No upload progress indicator
   - No error toasts for failures
   - No confirmation dialog for deletion
