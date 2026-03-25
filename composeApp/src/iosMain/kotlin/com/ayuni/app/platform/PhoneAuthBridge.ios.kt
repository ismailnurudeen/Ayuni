package com.ayuni.app.platform

/**
 * iOS test-mode stub for [PhoneAuthBridge].
 * Firebase Phone Auth is not yet wired on iOS; this implementation accepts any
 * 6-digit code and returns a test token that the backend test-mode will accept.
 */
class IosPhoneAuthBridge : PhoneAuthBridge {
    private var pendingPhoneNumber: String? = null

    override fun startVerification(
        phoneNumber: String,
        onCodeSent: () -> Unit,
        onVerified: (idToken: String) -> Unit,
        onError: (message: String) -> Unit,
    ) {
        println("[TEST MODE] iOS phone verification started for $phoneNumber")
        pendingPhoneNumber = phoneNumber
        onCodeSent()
    }

    override fun submitVerificationCode(
        code: String,
        onVerified: (idToken: String) -> Unit,
        onError: (message: String) -> Unit,
    ) {
        val phone = pendingPhoneNumber
        if (phone == null) {
            onError("No verification in progress.")
            return
        }
        if (code.length == 6) {
            println("[TEST MODE] iOS code accepted, returning test token for $phone")
            onVerified("test-firebase-token:$phone")
        } else {
            onError("Invalid code format.")
        }
    }

    override fun isTestMode(): Boolean = true
}

actual fun createPhoneAuthBridge(): PhoneAuthBridge = IosPhoneAuthBridge()
