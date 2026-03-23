package com.ayuni.app.platform

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AndroidTokenStorage private constructor(context: Context) : TokenStorage {
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    override suspend fun saveTokens(
        accessToken: String,
        refreshToken: String,
        accessTokenExpiresAt: String,
        refreshTokenExpiresAt: String
    ) = withContext(Dispatchers.IO) {
        sharedPreferences.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putString(KEY_ACCESS_TOKEN_EXPIRES_AT, accessTokenExpiresAt)
            .putString(KEY_REFRESH_TOKEN_EXPIRES_AT, refreshTokenExpiresAt)
            .apply()
    }

    override suspend fun getAccessToken(): String? = withContext(Dispatchers.IO) {
        sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
    }

    override suspend fun getRefreshToken(): String? = withContext(Dispatchers.IO) {
        sharedPreferences.getString(KEY_REFRESH_TOKEN, null)
    }

    override suspend fun getAccessTokenExpiresAt(): String? = withContext(Dispatchers.IO) {
        sharedPreferences.getString(KEY_ACCESS_TOKEN_EXPIRES_AT, null)
    }

    override suspend fun clearTokens() = withContext(Dispatchers.IO) {
        sharedPreferences.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_ACCESS_TOKEN_EXPIRES_AT)
            .remove(KEY_REFRESH_TOKEN_EXPIRES_AT)
            .apply()
    }

    override suspend fun hasValidTokens(): Boolean = withContext(Dispatchers.IO) {
        val accessToken = sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
        val refreshToken = sharedPreferences.getString(KEY_REFRESH_TOKEN, null)
        !accessToken.isNullOrEmpty() && !refreshToken.isNullOrEmpty()
    }

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_ACCESS_TOKEN_EXPIRES_AT = "access_token_expires_at"
        private const val KEY_REFRESH_TOKEN_EXPIRES_AT = "refresh_token_expires_at"
        private const val PREFS_NAME = "ayuni_secure_prefs"

        private var instance: AndroidTokenStorage? = null

        fun getInstance(context: Context): AndroidTokenStorage {
            return instance ?: synchronized(this) {
                instance ?: AndroidTokenStorage(
                    context.applicationContext
                ).also { instance = it }
            }
        }
    }
}

private var platformTokenStorage: TokenStorage? = null

fun initializeTokenStorage(context: Context) {
    platformTokenStorage = AndroidTokenStorage.getInstance(context)
}

actual fun createTokenStorage(): TokenStorage {
    return platformTokenStorage ?: throw IllegalStateException(
        "TokenStorage not initialized. Call initializeTokenStorage() first."
    )
}
