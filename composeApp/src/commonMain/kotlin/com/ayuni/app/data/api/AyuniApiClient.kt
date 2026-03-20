package com.ayuni.app.data.api

import com.ayuni.app.domain.AccountSettings
import com.ayuni.app.domain.AppPreferences
import com.ayuni.app.domain.City
import com.ayuni.app.domain.DatingPreferences
import com.ayuni.app.domain.EditableProfile
import com.ayuni.app.platform.ApiBaseUrl
import com.ayuni.app.platform.createPlatformHttpClient
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.put
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

class AyuniApiClient(
    private val httpClient: HttpClient = createPlatformHttpClient(),
    private val baseUrl: String = ApiBaseUrl.value,
) {
    suspend fun requestPhoneOtp(phoneNumber: String): PhoneOtpResponse =
        httpClient.post("$baseUrl/auth/phone") {
            contentType(ContentType.Application.Json)
            setBody(PhoneOtpRequest(phoneNumber = phoneNumber))
        }.body<PhoneOtpResponse>()

    suspend fun verifyPhoneOtp(phoneNumber: String, code: String): BootstrapPayload =
        httpClient.post("$baseUrl/auth/phone/verify") {
            contentType(ContentType.Application.Json)
            setBody(PhoneOtpVerifyRequest(phoneNumber = phoneNumber, code = code))
        }.body<PhoneOtpVerifyResponse>().let { response ->
            when {
                response.bootstrap != null -> response.bootstrap
                response.verified -> getBootstrap()
                else -> throw IllegalStateException("Invalid verification code")
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
}
