package com.ayuni.app.platform

/**
 * Platform-agnostic bridge for phone number authentication.
 *
 * On Android: uses Firebase Phone Auth SDK.
 * On iOS: test-mode stub (calls backend Twilio flow).
 */
interface PhoneAuthBridge {
    /**
     * Start phone number verification (sends SMS).
     *
     * @param phoneNumber E.164 format phone number
     * @param onCodeSent  Called when SMS is sent and user needs to enter the code
     * @param onVerified  Called when phone is auto-verified (e.g. SMS Retriever) with the Firebase ID token
     * @param onError     Called on failure
     */
    fun startVerification(
        phoneNumber: String,
        onCodeSent: () -> Unit,
        onVerified: (idToken: String) -> Unit,
        onError: (message: String) -> Unit,
    )

    /**
     * Submit the OTP code the user entered manually.
     *
     * @param code       The 6-digit verification code
     * @param onVerified Called on success with the Firebase ID token
     * @param onError    Called on failure
     */
    fun submitVerificationCode(
        code: String,
        onVerified: (idToken: String) -> Unit,
        onError: (message: String) -> Unit,
    )

    /** Whether this bridge is running in test/stub mode. */
    fun isTestMode(): Boolean
}

/**
 * Platform-specific factory.
 * On Android: call [initializePhoneAuthBridge] from MainActivity first.
 */
expect fun createPhoneAuthBridge(): PhoneAuthBridge
