package com.sway.app.ui

import com.sway.app.data.DemoSeed
import com.sway.app.domain.DateBooking
import com.sway.app.domain.DatingPreferences
import com.sway.app.domain.EditableProfile
import com.sway.app.domain.InboxNotification
import com.sway.app.domain.MatchroundState
import com.sway.app.domain.AccountSettings
import com.sway.app.domain.AppPreferences
import com.sway.app.domain.SafetyState
import com.sway.app.domain.SuggestionProfile
import com.sway.app.domain.UserSummary
import com.sway.app.domain.VerificationStatus

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
