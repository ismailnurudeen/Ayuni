package com.ayuni.app.ui

import com.ayuni.app.data.DemoSeed
import com.ayuni.app.domain.DateBooking
import com.ayuni.app.domain.DatingPreferences
import com.ayuni.app.domain.EditableProfile
import com.ayuni.app.domain.InboxNotification
import com.ayuni.app.domain.MatchroundState
import com.ayuni.app.domain.AccountSettings
import com.ayuni.app.domain.AppPreferences
import com.ayuni.app.domain.SafetyState
import com.ayuni.app.domain.SuggestionProfile
import com.ayuni.app.domain.UserSummary
import com.ayuni.app.domain.VerificationStatus
import kotlinx.serialization.Serializable

@Serializable
data class AppScreenState(
    val verification: VerificationStatus,
    val suggestions: List<SuggestionProfile>,
    val bookings: List<DateBooking>,
    val safety: SafetyState,
    val matchround: MatchroundState,
    val userSummary: UserSummary,
    val notifications: List<InboxNotification>,
    val editableProfile: EditableProfile,
    val datingPreferences: DatingPreferences,
    val accountSettings: AccountSettings,
    val appPreferences: AppPreferences,
) {
    companion object {
        fun demo(): AppScreenState = AppScreenState(
            verification = DemoSeed.verification,
            suggestions = DemoSeed.suggestions,
            bookings = DemoSeed.bookings,
            safety = DemoSeed.safety,
            matchround = DemoSeed.matchround,
            userSummary = DemoSeed.userSummary,
            notifications = DemoSeed.notifications,
            editableProfile = DemoSeed.editableProfile,
            datingPreferences = DemoSeed.datingPreferences,
            accountSettings = DemoSeed.accountSettings,
            appPreferences = DemoSeed.appPreferences,
        )
    }
}
