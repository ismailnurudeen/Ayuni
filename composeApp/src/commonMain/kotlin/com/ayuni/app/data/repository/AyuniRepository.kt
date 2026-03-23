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
    suspend fun requestPhoneOtp(phoneNumber: String): Result<Int> = runCatching {
        val response = apiClient.requestPhoneOtp(phoneNumber)
        
        if (!response.otpSent) {
            val errorMessage = when (response.error) {
                "rate_limit" -> "Please wait ${response.retryAfterSeconds} seconds before requesting another code."
                "blocked" -> "Too many requests. Please try again later."
                "invalid_phone" -> "Please enter a valid Nigerian phone number."
                else -> "Could not send verification code. Please try again."
            }
            throw Exception(errorMessage)
        }
        
        response.retryAfterSeconds
    }

    suspend fun verifyPhoneOtp(phoneNumber: String, code: String): Result<BootstrapPayload> = runCatching {
        val response = apiClient.verifyPhoneOtp(phoneNumber, code)
        
        if (!response.verified) {
            val errorMessage = when (response.error) {
                "invalid_code" -> "Incorrect verification code. Please try again."
                "expired" -> "This code has expired. Please request a new one."
                "max_attempts" -> "Too many incorrect attempts. Please request a new code."
                "not_found" -> "No verification code found. Please request a new one."
                else -> "Verification failed. Please try again."
            }
            throw Exception(errorMessage)
        }
        
        response.bootstrap ?: throw Exception("Verification successful but no data received")
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

    // Media management
    suspend fun uploadMedia(dataUrl: String, mediaType: String = "image"): Result<String> = runCatching {
        val response = apiClient.uploadMedia(dataUrl, mediaType)
        if (!response.success || response.storageUrl == null) {
            throw Exception(response.error ?: "Failed to upload media")
        }
        response.storageUrl
    }

    suspend fun deleteMedia(mediaId: String): Result<Unit> = runCatching {
        val response = apiClient.deleteMedia(mediaId)
        if (!response.success) {
            throw Exception(response.error ?: "Failed to delete media")
        }
    }

    suspend fun reorderMedia(mediaIds: List<String>): Result<Unit> = runCatching {
        val response = apiClient.reorderMedia(mediaIds)
        if (!response.success) {
            throw Exception(response.error ?: "Failed to reorder media")
        }
    }

    // Verification
    suspend fun submitSelfie(imageUrl: String): Result<String> = runCatching {
        val response = apiClient.submitSelfie(imageUrl)
        if (response.status != "pending") {
            throw Exception(response.message ?: "Failed to submit selfie")
        }
        response.message ?: "Selfie submitted successfully"
    }
}
