package com.ayuni.app.ui

import com.ayuni.app.domain.DateBooking
import com.ayuni.app.domain.DatingPreferences
import com.ayuni.app.domain.EditableProfile
import com.ayuni.app.domain.InboxNotification
import com.ayuni.app.domain.MatchroundState
import com.ayuni.app.domain.AccountSettings
import com.ayuni.app.domain.AppPreferences
import com.ayuni.app.domain.OnboardingState
import com.ayuni.app.domain.OnboardingStep
import com.ayuni.app.domain.ProfileQa
import com.ayuni.app.domain.SafetyState
import com.ayuni.app.domain.ShareChannel
import com.ayuni.app.domain.SignupMethod
import com.ayuni.app.domain.SuggestionProfile
import com.ayuni.app.domain.UserSummary
import com.ayuni.app.domain.VerificationStatus
import kotlinx.serialization.Serializable

@Serializable
data class AppScreenState(
    val onboarding: OnboardingState,
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
        fun empty(): AppScreenState = AppScreenState(
            onboarding = OnboardingState(
                signupMethod = SignupMethod.Phone,
                step = OnboardingStep.Welcome,
                completed = false,
            ),
            verification = VerificationStatus(
                phoneVerified = false,
                selfieVerified = false,
                governmentIdVerified = false,
            ),
            suggestions = emptyList(),
            bookings = emptyList(),
            safety = SafetyState(
                trustedContactName = "",
                trustedContactChannel = ShareChannel.WhatsApp,
            ),
            matchround = MatchroundState(
                currentWindowLabel = "",
                nextMatchroundLabel = "",
                countdown = "00:00:00",
                usersLeftToday = 0,
            ),
            userSummary = UserSummary(
                firstName = "",
                completionScore = 0,
                completionLabel = "",
                profilePhotoMood = "",
                badges = emptyList(),
            ),
            notifications = emptyList(),
            editableProfile = EditableProfile(
                mediaSlots = emptyList(),
                interests = emptyList(),
                traits = emptyList(),
                bio = "",
                qas = emptyList(),
                religion = emptyList(),
                smoking = "",
                drinking = "",
                education = "",
                job = "",
                datingIntention = "",
                sexualOrientation = "",
                languages = emptyList(),
            ),
            datingPreferences = DatingPreferences(
                ageRange = "",
                genderIdentity = "",
                heightRange = "",
                dateCities = emptyList(),
                dateAreas = emptyList(),
                preferredDateActivities = emptyList(),
            ),
            accountSettings = AccountSettings(
                name = "",
                gender = "",
                birthDate = "",
                height = "",
                residence = "",
                educationLevel = "",
                email = "",
                phoneNumber = "",
            ),
            appPreferences = AppPreferences(
                notifications = "",
                appLanguage = "English",
            ),
        )
    }
}
