package com.ayuni.app.platform

/**
 * Platform-agnostic secure token storage
 */
interface TokenStorage {
    suspend fun saveTokens(accessToken: String, refreshToken: String, accessTokenExpiresAt: String, refreshTokenExpiresAt: String)
    suspend fun getAccessToken(): String?
    suspend fun getRefreshToken(): String?
    suspend fun getAccessTokenExpiresAt(): String?
    suspend fun clearTokens()
    suspend fun hasValidTokens(): Boolean
}

/**
 * Platform-specific factory function for creating TokenStorage instances
 */
expect fun createTokenStorage(): TokenStorage
