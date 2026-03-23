package com.ayuni.app.data.api

import com.ayuni.app.domain.AccountSettings
import com.ayuni.app.domain.AppPreferences
import com.ayuni.app.domain.City
import com.ayuni.app.domain.DatingPreferences
import com.ayuni.app.domain.EditableProfile
import com.ayuni.app.platform.ApiBaseUrl
import com.ayuni.app.platform.TokenStorage
import com.ayuni.app.platform.createPlatformHttpClient
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpSend
import io.ktor.client.plugins.plugin
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.put
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import kotlinx.datetime.Instant

class AyuniApiClient(
    private val tokenStorage: TokenStorage,
    private val httpClient: HttpClient = createPlatformHttpClient(),
    private val baseUrl: String = ApiBaseUrl.value,
) {
    init {
        // Set up automatic token refresh on 401 responses
        httpClient.plugin(HttpSend).intercept { request ->
            val accessToken = tokenStorage.getAccessToken()
            if (accessToken != null) {
                request.header(HttpHeaders.Authorization, "Bearer $accessToken")
            }

            val originalCall = execute(request)

            if (originalCall.response.status == HttpStatusCode.Unauthorized && accessToken != null) {
                // Try to refresh the token
                val refreshToken = tokenStorage.getRefreshToken()
                if (refreshToken != null) {
                    try {
                        val refreshResponse = httpClient.post("$baseUrl/auth/refresh") {
                            contentType(ContentType.Application.Json)
                            setBody(RefreshTokenRequest(refreshToken = refreshToken))
                        }.body<RefreshTokenResponse>()

                        if (refreshResponse.success) {
                            tokenStorage.saveTokens(
                                refreshResponse.accessToken,
                                refreshResponse.refreshToken,
                                refreshResponse.accessTokenExpiresAt,
                                refreshResponse.refreshTokenExpiresAt
                            )

                            // Retry the original request with the new token
                            request.header(HttpHeaders.Authorization, "Bearer ${refreshResponse.accessToken}")
                            return@intercept execute(request)
                        }
                    } catch (e: Exception) {
                        // Refresh failed, clear tokens
                        tokenStorage.clearTokens()
                    }
                }
            }

            originalCall
        }
    }

    suspend fun requestPhoneOtp(phoneNumber: String): PhoneOtpResponse =
        httpClient.post("$baseUrl/auth/phone") {
            contentType(ContentType.Application.Json)
            setBody(PhoneOtpRequest(phoneNumber = phoneNumber))
        }.body<PhoneOtpResponse>()

    suspend fun verifyPhoneOtp(phoneNumber: String, code: String, deviceInfo: String? = null): BootstrapPayload {
        val response = httpClient.post("$baseUrl/auth/phone/verify") {
            contentType(ContentType.Application.Json)
            setBody(PhoneOtpVerifyRequest(phoneNumber = phoneNumber, code = code, deviceInfo = deviceInfo))
        }.body<PhoneOtpVerifyResponse>()

        // Store tokens if verification was successful
        if (response.verified && response.accessToken != null && response.refreshToken != null) {
            tokenStorage.saveTokens(
                response.accessToken,
                response.refreshToken,
                response.accessTokenExpiresAt ?: "",
                response.refreshTokenExpiresAt ?: ""
            )
        }

        return when {
            response.bootstrap != null -> response.bootstrap
            response.verified -> getBootstrap()
            else -> throw IllegalStateException("Invalid verification code")
        }
    }

    suspend fun logout(): Boolean {
        return try {
            httpClient.post("$baseUrl/auth/logout") {
                contentType(ContentType.Application.Json)
            }.body<LogoutResponse>().success.also {
                if (it) {
                    tokenStorage.clearTokens()
                }
            }
        } catch (e: Exception) {
            // Even if the backend request fails, clear local tokens
            tokenStorage.clearTokens()
            false
        }
    }

    suspend fun completeBasicOnboarding(
        firstName: String,
        birthDate: String,
        genderIdentity: String,
        interestedIn: String,
        city: City,
        acceptedTerms: Boolean,
    ): BootstrapPayload =
        httpClient.put("$baseUrl/auth/onboarding/basic-profile") {
            contentType(ContentType.Application.Json)
            setBody(
                BasicOnboardingRequest(
                    firstName = firstName,
                    birthDate = birthDate,
                    genderIdentity = genderIdentity,
                    interestedIn = interestedIn,
                    city = city,
                    acceptedTerms = acceptedTerms,
                )
            )
        }.body<BootstrapPayload>()

    suspend fun getBootstrap(): BootstrapPayload =
        httpClient.get("$baseUrl/mobile/bootstrap").body<BootstrapPayload>()

    suspend fun updateReaction(profileId: String, accepted: Boolean): BootstrapPayload =
        httpClient.post("$baseUrl/matches/$profileId/respond") {
            contentType(ContentType.Application.Json)
            setBody(MatchResponseRequest(response = if (accepted) "accept" else "reject"))
        }.body<MatchResponseEnvelope>().bootstrap

    suspend fun updateProfile(profile: EditableProfile): BootstrapPayload =
        httpClient.put("$baseUrl/mobile/profile") {
            contentType(ContentType.Application.Json)
            setBody(profile)
        }.body<BootstrapPayload>()

    suspend fun updateDatingPreferences(preferences: DatingPreferences): BootstrapPayload =
        httpClient.put("$baseUrl/mobile/preferences/dating") {
            contentType(ContentType.Application.Json)
            setBody(preferences)
        }.body<BootstrapPayload>()

    suspend fun updateAccountSettings(settings: AccountSettings): BootstrapPayload =
        httpClient.put("$baseUrl/mobile/settings/account") {
            contentType(ContentType.Application.Json)
            setBody(settings)
        }.body<BootstrapPayload>()

    suspend fun updateAppSettings(preferences: AppPreferences): BootstrapPayload =
        httpClient.put("$baseUrl/mobile/settings/app") {
            contentType(ContentType.Application.Json)
            setBody(preferences)
        }.body<BootstrapPayload>()

    // Media management
    suspend fun uploadMedia(dataUrl: String, mediaType: String): MediaUploadResponse =
        httpClient.post("$baseUrl/mobile/media/upload") {
            contentType(ContentType.Application.Json)
            setBody(MediaUploadRequest(dataUrl = dataUrl, mediaType = mediaType))
        }.body<MediaUploadResponse>()

    suspend fun deleteMedia(mediaId: String): DeleteMediaResponse =
        httpClient.post("$baseUrl/mobile/media/$mediaId") {
            contentType(ContentType.Application.Json)
        }.body<DeleteMediaResponse>()

    suspend fun reorderMedia(mediaIds: List<String>): ReorderMediaResponse =
        httpClient.put("$baseUrl/mobile/media/reorder") {
            contentType(ContentType.Application.Json)
            setBody(ReorderMediaRequest(mediaIds = mediaIds))
        }.body<ReorderMediaResponse>()
}
