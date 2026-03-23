# P1-01 Profile Media Polish

## Objective
Complete remaining profile media functionality: iOS support, image display, reorder UI, and test coverage.

## Why This Exists
P0-05 delivered core Android media upload/delete but has gaps in iOS, visual display, and reorder functionality.

## Scope

- Implement iOS image picker (PHPickerViewController)
- Display uploaded images (not gray placeholders)
- Wire up reorder UI (drag-and-drop or arrows)
- Add backend tests for MediaService
- Polish UX (loading indicators, error toasts, confirmations)
- Fix HTTP method for delete endpoint

## Non-Goals

- Video upload (defer to P1 or P2)
- Advanced image editing or filters
- Cloud storage migration (currently using local /uploads)

## Dependencies

- `P0-05` (backend and Android upload complete)

## Affected Areas

- `composeApp/src/iosMain/` - iOS image picker
- `composeApp/src/commonMain/kotlin/com/ayuni/app/ui/screens/profile/ProfileSettingsScreens.kt` - Image display and reorder
- `backend/src/modules/media.service.spec.ts` - Tests
- `composeApp/src/commonMain/kotlin/com/ayuni/app/data/api/AyuniApiClient.kt` - HTTP method fix

## Tasks

### High Priority

1. **iOS Image Picker**
   - File: `composeApp/src/iosMain/kotlin/com/ayuni/app/platform/ImagePicker.ios.kt`
   - Implement PHPickerViewController
   - Convert to base64 data URL
   - Test on iOS device/simulator

2. **Image Display**
   - Add image loading library (e.g., Coil for Compose Multiplatform)
   - Update `PhotoSlot` composable to load from URLs
   - Handle loading states and errors
   - Test with real uploaded images

3. **Backend Tests**
   - Create `backend/src/modules/media.service.spec.ts`
   - Test upload validation (file size, count limit)
   - Test delete with filesystem cleanup
   - Test reorder logic
   - Test getUserMedia ordering

### Medium Priority

4. **Reorder UI**
   - Add drag-and-drop to EditProfileScreen grid
   - Or add up/down arrow buttons per slot
   - Call `profileStateHolder.reorderMedia()` with new order
   - Show visual feedback during reorder

5. **UX Improvements**
   - Add CircularProgressIndicator during upload
   - Show error Snackbar on upload failure
   - Add confirmation dialog before deletion
   - Disable upload button when at 6-item limit

### Low Priority

6. **HTTP Method Fix**
   - Change `httpClient.post("$baseUrl/mobile/media/$mediaId")` to `httpClient.delete(...)`
   - Update backend route if needed (should already support DELETE)

7. **Image Compression**
   - Add client-side compression before upload
   - Target ~2MB max per image
   - Use platform-specific APIs or library

## Acceptance Criteria

- [ ] iOS users can pick and upload images.
- [ ] Uploaded images display correctly in profile edit view.
- [ ] Users can reorder media via drag-and-drop or buttons.
- [ ] Backend media tests cover upload/delete/reorder.
- [ ] Upload shows loading indicator and error messages.
- [ ] Delete prompts for confirmation.

## Review Checklist

- [ ] iOS implementation tested on device.
- [ ] Image loading handles network failures gracefully.
- [ ] Reorder persists across app restart.
- [ ] MediaService tests achieve >80% coverage.

## Test Checklist

- [ ] iOS image picker tested on simulator and device.
- [ ] Image display tested with various image sizes.
- [ ] Reorder tested with 6 images.
- [ ] Backend tests run in CI.
