package com.ayuni.app.data.repository

import com.ayuni.app.data.api.AyuniApiClient
import com.ayuni.app.data.api.BootstrapPayload
import com.ayuni.app.domain.AccountSettings
import com.ayuni.app.domain.AppPreferences
import com.ayuni.app.domain.City
import com.ayuni.app.domain.DatingPreferences
import com.ayuni.app.domain.EditableProfile

/**
 * Central repository for Ayuni app data.
 * Wraps the API client and provides a single source of truth for app state.
 */
class AyuniRepository(private val apiClient: AyuniApiClient) {

    // Auth and Onboarding
    suspend fun requestPhoneOtp(phoneNumber: String): Result<Unit> = runCatching {
        apiClient.requestPhoneOtp(phoneNumber)
        Unit
    }

    suspend fun verifyPhoneOtp(phoneNumber: String, code: String): Result<BootstrapPayload> = runCatching {
        apiClient.verifyPhoneOtp(phoneNumber, code)
    }

    suspend fun completeBasicOnboarding(
        firstName: String,
        birthDate: String,
        genderIdentity: String,
        interestedIn: String,
        city: City,
        acceptedTerms: Boolean,
    ): Result<BootstrapPayload> = runCatching {
        apiClient.completeBasicOnboarding(
            firstName = firstName,
            birthDate = birthDate,
            genderIdentity = genderIdentity,
            interestedIn = interestedIn,
            city = city,
            acceptedTerms = acceptedTerms
        )
    }

    suspend fun logout(): Result<Boolean> = runCatching {
        apiClient.logout()
    }

    // Bootstrap
    suspend fun getBootstrap(): Result<BootstrapPayload> = runCatching {
        apiClient.getBootstrap()
    }

    // Match Reactions
    suspend fun updateReaction(profileId: String, accepted: Boolean): Result<BootstrapPayload> = runCatching {
        apiClient.updateReaction(profileId, accepted)
    }

    // Profile Updates
    suspend fun updateProfile(profile: EditableProfile): Result<BootstrapPayload> = runCatching {
        apiClient.updateProfile(profile)
    }

    suspend fun updateDatingPreferences(preferences: DatingPreferences): Result<BootstrapPayload> = runCatching {
        apiClient.updateDatingPreferences(preferences)
    }

    suspend fun updateAccountSettings(settings: AccountSettings): Result<BootstrapPayload> = runCatching {
        apiClient.updateAccountSettings(settings)
    }

    suspend fun updateAppSettings(preferences: AppPreferences): Result<BootstrapPayload> = runCatching {
        apiClient.updateAppSettings(preferences)
    }
}
