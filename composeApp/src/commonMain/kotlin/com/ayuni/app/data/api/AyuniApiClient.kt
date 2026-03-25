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
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.HttpSend
import io.ktor.client.plugins.plugin
import io.ktor.client.request.get
import io.ktor.client.request.delete
import io.ktor.client.request.header
import io.ktor.client.request.put
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import kotlinx.datetime.*

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

            val originalCall = try {
                execute(request)
            } catch (e: ClientRequestException) {
                if (e.response.status != HttpStatusCode.Unauthorized || accessToken == null) throw e

                // 401 — attempt token refresh before failing
                val refreshToken = tokenStorage.getRefreshToken() ?: throw e
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
                } catch (refreshError: ClientRequestException) {
                    // Refresh endpoint also failed, clear tokens
                    tokenStorage.clearTokens()
                    throw e
                } catch (refreshError: Exception) {
                    tokenStorage.clearTokens()
                    throw e
                }

                throw e
            }

            originalCall
        }
    }

    suspend fun requestPhoneOtp(phoneNumber: String): PhoneOtpResponse =
        httpClient.post("$baseUrl/auth/phone") {
            contentType(ContentType.Application.Json)
            setBody(PhoneOtpRequest(phoneNumber = phoneNumber))
        }.body<PhoneOtpResponse>()

    suspend fun verifyPhoneOtp(phoneNumber: String, code: String, deviceInfo: String? = null): PhoneOtpVerifyResponse {
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

        return response
    }

    /** Ask the backend which auth provider to use (firebase or twilio). */
    suspend fun getAuthProvider(): AuthProviderResponse =
        httpClient.get("$baseUrl/auth/provider").body<AuthProviderResponse>()

    /** Verify a Firebase Phone Auth ID token with the backend. */
    suspend fun verifyFirebaseToken(idToken: String, deviceInfo: String? = null): FirebaseVerifyResponse {
        val response = httpClient.post("$baseUrl/auth/firebase/verify") {
            contentType(ContentType.Application.Json)
            setBody(FirebaseVerifyRequest(idToken = idToken, deviceInfo = deviceInfo))
        }.body<FirebaseVerifyResponse>()

        if (response.verified && response.accessToken != null && response.refreshToken != null) {
            tokenStorage.saveTokens(
                response.accessToken,
                response.refreshToken,
                response.accessTokenExpiresAt ?: "",
                response.refreshTokenExpiresAt ?: ""
            )
        }

        return response
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
        httpClient.delete("$baseUrl/mobile/media/$mediaId") {
            contentType(ContentType.Application.Json)
        }.body<DeleteMediaResponse>()

    suspend fun reorderMedia(mediaIds: List<String>): ReorderMediaResponse =
        httpClient.put("$baseUrl/mobile/media/reorder") {
            contentType(ContentType.Application.Json)
            setBody(ReorderMediaRequest(mediaIds = mediaIds))
        }.body<ReorderMediaResponse>()

    // Verification
    suspend fun submitSelfie(imageUrl: String): SelfieSubmissionResponse =
        httpClient.post("$baseUrl/verification/selfie") {
            contentType(ContentType.Application.Json)
            setBody(SelfieSubmissionRequest(imageUrl = imageUrl))
        }.body<SelfieSubmissionResponse>()

    suspend fun submitGovId(
        frontImageUrl: String,
        idType: String,
        backImageUrl: String? = null
    ): GovIdSubmissionResponse =
        httpClient.post("$baseUrl/verification/gov-id") {
            contentType(ContentType.Application.Json)
            setBody(GovIdSubmissionRequest(
                frontImageUrl = frontImageUrl,
                idType = idType,
                backImageUrl = backImageUrl
            ))
        }.body<GovIdSubmissionResponse>()

    // Safety Reporting
    suspend fun createSafetyReport(bookingId: String, category: String, details: String): SafetyReportResponse =
        httpClient.post("$baseUrl/bookings/$bookingId/report") {
            contentType(ContentType.Application.Json)
            setBody(SafetyReportRequest(category = category, details = details))
        }.body<SafetyReportResponse>()

    // ── P1-11: Account Deletion & Privacy ───────────────────────────

    suspend fun requestAccountDeletion(): AccountDeletionResponse =
        httpClient.post("$baseUrl/mobile/account/delete") {
            contentType(ContentType.Application.Json)
        }.body<AccountDeletionResponse>()

    suspend fun cancelAccountDeletion(): CancelDeletionResponse =
        httpClient.post("$baseUrl/mobile/account/delete/cancel") {
            contentType(ContentType.Application.Json)
        }.body<CancelDeletionResponse>()

    suspend fun getAccountDeletionStatus(): DeletionStatusResponse =
        httpClient.get("$baseUrl/mobile/account/deletion-status").body<DeletionStatusResponse>()

    suspend fun requestDataExport(): DataExportResponse =
        httpClient.post("$baseUrl/mobile/account/export") {
            contentType(ContentType.Application.Json)
        }.body<DataExportResponse>()

    suspend fun getConsentStatus(): ConsentStatusResponse =
        httpClient.get("$baseUrl/mobile/account/consent").body<ConsentStatusResponse>()

    suspend fun acceptPrivacyConsent(termsVersion: String, privacyVersion: String): ConsentAcceptResponse =
        httpClient.post("$baseUrl/mobile/account/consent") {
            contentType(ContentType.Application.Json)
            setBody(ConsentAcceptRequest(termsVersion = termsVersion, privacyVersion = privacyVersion))
        }.body<ConsentAcceptResponse>()

    // ── Analytics ───────────────────────────────────────────────────

    suspend fun sendAnalyticsBatch(events: List<AnalyticsEventPayload>): AnalyticsBatchResponse =
        httpClient.post("$baseUrl/analytics/events") {
            contentType(ContentType.Application.Json)
            setBody(AnalyticsBatchRequest(events = events))
        }.body<AnalyticsBatchResponse>()
}
