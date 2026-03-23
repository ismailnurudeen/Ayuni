package com.ayuni.app.data.api

import com.ayuni.app.ui.AppScreenState
import kotlinx.serialization.Serializable

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
    val reason: String? = null,
    val nextStep: String? = null,
    val bootstrap: BootstrapPayload,
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
