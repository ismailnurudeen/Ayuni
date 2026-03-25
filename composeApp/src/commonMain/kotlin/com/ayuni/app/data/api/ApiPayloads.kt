package com.ayuni.app.data.api

import com.ayuni.app.ui.AppScreenState
import kotlinx.serialization.Serializable

@Serializable
data class ProfileMedia(
    val id: String,
    val userId: String,
    val mediaType: String,
    val storageUrl: String,
    val displayOrder: Int,
    val uploadedAt: String,
)

@Serializable
data class BootstrapPayload(
    val onboarding: com.ayuni.app.domain.OnboardingState = com.ayuni.app.domain.OnboardingState(
        signupMethod = com.ayuni.app.domain.SignupMethod.Phone,
        step = com.ayuni.app.domain.OnboardingStep.Welcome,
        completed = false
    ),
    val verification: com.ayuni.app.domain.VerificationStatus,
    val suggestions: List<com.ayuni.app.domain.SuggestionProfile>,
    val bookings: List<com.ayuni.app.domain.DateBooking>,
    val safety: com.ayuni.app.domain.SafetyState,
    val matchround: com.ayuni.app.domain.MatchroundState,
    val userSummary: com.ayuni.app.domain.UserSummary,
    val notifications: List<com.ayuni.app.domain.InboxNotification>,
    val editableProfile: com.ayuni.app.domain.EditableProfile,
    val datingPreferences: com.ayuni.app.domain.DatingPreferences,
    val accountSettings: com.ayuni.app.domain.AccountSettings,
    val appPreferences: com.ayuni.app.domain.AppPreferences,
    val reactions: Map<String, String> = emptyMap(),
    val media: List<ProfileMedia> = emptyList(),
) {
    fun toScreenState(): AppScreenState = AppScreenState(
        onboarding = onboarding,
        verification = verification,
        suggestions = suggestions,
        bookings = bookings,
        safety = safety,
        matchround = matchround,
        userSummary = userSummary,
        notifications = notifications,
        editableProfile = editableProfile,
        datingPreferences = datingPreferences,
        accountSettings = accountSettings,
        appPreferences = appPreferences,
    )
}

@Serializable
data class MatchResponseRequest(
    val response: String,
)

@Serializable
data class MatchResponseEnvelope(
    val success: Boolean,
    val nextStep: String? = null,
    val reason: String? = null,
    val bootstrap: BootstrapPayload
)

@Serializable
data class PhoneOtpRequest(
    val phoneNumber: String,
)

@Serializable
data class PhoneOtpVerifyRequest(
    val phoneNumber: String,
    val code: String,
    val deviceInfo: String? = null,
)

@Serializable
data class BasicOnboardingRequest(
    val firstName: String,
    val birthDate: String,
    val genderIdentity: String,
    val interestedIn: String,
    val city: com.ayuni.app.domain.City,
    val acceptedTerms: Boolean,
)

@Serializable
data class PhoneOtpResponse(
    val phoneNumber: String,
    val otpSent: Boolean,
    val deliveryChannel: String = "SMS",
    val country: String = "NG",
    val retryAfterSeconds: Int = 0,
    val error: String? = null,
    val blockedUntil: String? = null,
)

@Serializable
data class PhoneOtpVerifyResponse(
    val verified: Boolean = false,
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val accessTokenExpiresAt: String? = null,
    val refreshTokenExpiresAt: String? = null,
    val bootstrap: BootstrapPayload? = null,
    val error: String? = null,
)

@Serializable
data class MediaUploadRequest(
    val dataUrl: String,
    val mediaType: String,
)

@Serializable
data class MediaUploadResponse(
    val success: Boolean,
    val mediaId: String? = null,
    val storageUrl: String? = null,
    val error: String? = null,
)

@Serializable
data class DeleteMediaResponse(
    val success: Boolean,
    val error: String? = null,
)

@Serializable
data class ReorderMediaRequest(
    val mediaIds: List<String>,
)

@Serializable
data class ReorderMediaResponse(
    val success: Boolean,
    val error: String? = null,
)

@Serializable
data class RefreshTokenRequest(
    val refreshToken: String,
)

@Serializable
data class RefreshTokenResponse(
    val success: Boolean,
    val accessToken: String = "",
    val refreshToken: String = "",
    val accessTokenExpiresAt: String = "",
    val refreshTokenExpiresAt: String = "",
    val error: String? = null,
)

@Serializable
data class LogoutResponse(
    val success: Boolean,
)

// ── Firebase Phone Auth ─────────────────────────────────────────────

@Serializable
data class AuthProviderResponse(
    val provider: String, // "firebase" or "twilio"
)

@Serializable
data class FirebaseVerifyRequest(
    val idToken: String,
    val deviceInfo: String? = null,
)

@Serializable
data class FirebaseVerifyResponse(
    val verified: Boolean = false,
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val accessTokenExpiresAt: String? = null,
    val refreshTokenExpiresAt: String? = null,
    val bootstrap: BootstrapPayload? = null,
    val error: String? = null,
)

@Serializable
data class SelfieSubmissionRequest(
    val imageUrl: String,
)

@Serializable
data class SelfieSubmissionResponse(
    val submissionId: String = "",
    val status: String,
    val message: String? = null,
)

@Serializable
data class GovIdSubmissionRequest(
    val frontImageUrl: String,
    val idType: String, // national_id, drivers_license, passport, voters_card
    val backImageUrl: String? = null,
)

@Serializable
data class GovIdSubmissionResponse(
    val submissionId: String = "",
    val status: String,
    val message: String? = null,
)

@Serializable
data class SafetyReportRequest(
    val category: String, // LateArrival, NoShow, UnsafeBehavior
    val details: String,
)

@Serializable
data class SafetyReportResponse(
    val success: Boolean,
    val reportId: String = "",
    val message: String? = null,
)

// ── P1-11: Account Deletion & Privacy ───────────────────────────────

@Serializable
data class AccountDeletionResponse(
    val deletionRequestedAt: String = "",
    val deletionScheduledAt: String = "",
    val status: String = "",
    val gracePeriodDays: Int = 30,
)

@Serializable
data class CancelDeletionResponse(
    val cancelled: Boolean,
)

@Serializable
data class DeletionStatusResponse(
    val status: String? = null,
    val scheduledAt: String? = null,
)

@Serializable
data class DataExportResponse(
    val exportedAt: String = "",
    val profile: com.ayuni.app.domain.EditableProfile? = null,
    val accountSettings: com.ayuni.app.domain.AccountSettings? = null,
    val datingPreferences: com.ayuni.app.domain.DatingPreferences? = null,
)

@Serializable
data class ConsentStatusResponse(
    val latestTermsVersion: String? = null,
    val latestPrivacyVersion: String? = null,
    val acceptedAt: String? = null,
)

@Serializable
data class ConsentAcceptRequest(
    val termsVersion: String,
    val privacyVersion: String,
)

@Serializable
data class ConsentAcceptResponse(
    val accepted: Boolean,
)

// ── Analytics ──────────────────────────────────────────────────────

@Serializable
data class AnalyticsEventPayload(
    val eventName: String,
    val properties: Map<String, String> = emptyMap(),
    val timestamp: String? = null,
)

@Serializable
data class AnalyticsBatchRequest(
    val events: List<AnalyticsEventPayload>,
)

@Serializable
data class AnalyticsBatchResponse(
    val ingested: Int = 0,
)
