package com.ayuni.app.platform

import platform.Foundation.*
import platform.Security.*

class IosTokenStorage : TokenStorage {

    override suspend fun saveTokens(
        accessToken: String,
        refreshToken: String,
        accessTokenExpiresAt: String,
        refreshTokenExpiresAt: String
    ) {
        saveToKeychain(KEY_ACCESS_TOKEN, accessToken)
        saveToKeychain(KEY_REFRESH_TOKEN, refreshToken)
        saveToKeychain(KEY_ACCESS_TOKEN_EXPIRES_AT, accessTokenExpiresAt)
        saveToKeychain(KEY_REFRESH_TOKEN_EXPIRES_AT, refreshTokenExpiresAt)
    }

    override suspend fun getAccessToken(): String? {
        return getFromKeychain(KEY_ACCESS_TOKEN)
    }

    override suspend fun getRefreshToken(): String? {
        return getFromKeychain(KEY_REFRESH_TOKEN)
    }

    override suspend fun getAccessTokenExpiresAt(): String? {
        return getFromKeychain(KEY_ACCESS_TOKEN_EXPIRES_AT)
    }

    override suspend fun clearTokens() {
        deleteFromKeychain(KEY_ACCESS_TOKEN)
        deleteFromKeychain(KEY_REFRESH_TOKEN)
        deleteFromKeychain(KEY_ACCESS_TOKEN_EXPIRES_AT)
        deleteFromKeychain(KEY_REFRESH_TOKEN_EXPIRES_AT)
    }

    override suspend fun hasValidTokens(): Boolean {
        val accessToken = getFromKeychain(KEY_ACCESS_TOKEN)
        val refreshToken = getFromKeychain(KEY_REFRESH_TOKEN)
        return !accessToken.isNullOrEmpty() && !refreshToken.isNullOrEmpty()
    }

    private fun saveToKeychain(key: String, value: String) {
        // Delete any existing item first
        deleteFromKeychain(key)

        // Prepare the query to add the item
        val query = mapOf<Any?, Any?>(
            kSecClass to kSecClassGenericPassword,
            kSecAttrAccount to key,
            kSecValueData to (value as NSString).dataUsingEncoding(NSUTF8StringEncoding),
            kSecAttrAccessible to kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        )

        SecItemAdd(query as CFDictionaryRef, null)
    }

    private fun getFromKeychain(key: String): String? {
        val query = mapOf<Any?, Any?>(
            kSecClass to kSecClassGenericPassword,
            kSecAttrAccount to key,
            kSecReturnData to kCFBooleanTrue,
            kSecMatchLimit to kSecMatchLimitOne
        )

        val result = memScoped {
            val resultPtr = alloc<CFTypeRefVar>()
            val status = SecItemCopyMatching(query as CFDictionaryRef, resultPtr.ptr)

            if (status == errSecSuccess) {
                val data = resultPtr.value as? NSData
                data?.let {
                    NSString.create(it, NSUTF8StringEncoding) as String?
                }
            } else {
                null
            }
        }

        return result
    }

    private fun deleteFromKeychain(key: String) {
        val query = mapOf<Any?, Any?>(
            kSecClass to kSecClassGenericPassword,
            kSecAttrAccount to key
        )

        SecItemDelete(query as CFDictionaryRef)
    }

    companion object {
        private const val KEY_ACCESS_TOKEN = "ayuni_access_token"
        private const val KEY_REFRESH_TOKEN = "ayuni_refresh_token"
        private const val KEY_ACCESS_TOKEN_EXPIRES_AT = "ayuni_access_token_expires_at"
        private const val KEY_REFRESH_TOKEN_EXPIRES_AT = "ayuni_refresh_token_expires_at"
    }
}

actual fun createTokenStorage(): TokenStorage {
    return IosTokenStorage()
}
