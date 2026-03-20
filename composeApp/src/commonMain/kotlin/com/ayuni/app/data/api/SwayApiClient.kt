package com.ayuni.app.data.api

import com.ayuni.app.domain.AccountSettings
import com.ayuni.app.domain.AppPreferences
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

class AyuniApiClient(
    private val httpClient: HttpClient = createPlatformHttpClient(),
    private val baseUrl: String = ApiBaseUrl.value,
) {
    suspend fun getBootstrap(): BootstrapPayload =
        httpClient.get("$baseUrl/mobile/bootstrap").body<BootstrapPayload>()

    suspend fun updateReaction(profileId: String, accepted: Boolean): BootstrapPayload =
        httpClient.post("$baseUrl/matches/$profileId/respond") {
            setBody(MatchResponseRequest(response = if (accepted) "accept" else "reject"))
        }.body<MatchResponseEnvelope>().bootstrap

    suspend fun updateProfile(profile: EditableProfile): BootstrapPayload =
        httpClient.put("$baseUrl/mobile/profile") {
            setBody(profile)
        }.body<BootstrapPayload>()

    suspend fun updateDatingPreferences(preferences: DatingPreferences): BootstrapPayload =
        httpClient.put("$baseUrl/mobile/preferences/dating") {
            setBody(preferences)
        }.body<BootstrapPayload>()

    suspend fun updateAccountSettings(settings: AccountSettings): BootstrapPayload =
        httpClient.put("$baseUrl/mobile/settings/account") {
            setBody(settings)
        }.body<BootstrapPayload>()

    suspend fun updateAppSettings(preferences: AppPreferences): BootstrapPayload =
        httpClient.put("$baseUrl/mobile/settings/app") {
            setBody(preferences)
        }.body<BootstrapPayload>()
}
