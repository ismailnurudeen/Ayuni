package com.ayuni.app.data.api

import com.ayuni.app.ui.AppScreenState
import kotlinx.serialization.Serializable

@Serializable
data class BootstrapPayload(
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
