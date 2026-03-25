package com.ayuni.app.platform

import android.util.Log
import androidx.activity.ComponentActivity
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import java.util.concurrent.TimeUnit

/**
 * Android implementation of [PhoneAuthBridge] using Firebase Phone Auth SDK.
 *
 * Falls back to test mode when Firebase is not configured
 * (e.g. placeholder google-services.json).
 */
class AndroidPhoneAuthBridge(private val activity: ComponentActivity) : PhoneAuthBridge {
    private val tag = "AndroidPhoneAuthBridge"
    private val auth: FirebaseAuth? = try {
        if (FirebaseApp.getApps(activity).isNotEmpty()) FirebaseAuth.getInstance() else null
    } catch (e: Exception) {
        Log.w(tag, "Firebase not available, running in test mode", e)
        null
    }

    private var verificationId: String? = null
    private var resendToken: PhoneAuthProvider.ForceResendingToken? = null

    // Stash callbacks so auto-verification can call them back
    private var pendingOnVerified: ((String) -> Unit)? = null
    private var pendingOnError: ((String) -> Unit)? = null

    override fun startVerification(
        phoneNumber: String,
        onCodeSent: () -> Unit,
        onVerified: (idToken: String) -> Unit,
        onError: (message: String) -> Unit,
    ) {
        if (auth == null) {
            handleTestModeStart(phoneNumber, onCodeSent, onVerified, onError)
            return
        }

        pendingOnVerified = onVerified
        pendingOnError = onError

        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                // Auto-verification (SMS Retriever or instant verification)
                Log.d(tag, "Phone auto-verified")
                signInWithCredential(credential, onVerified, onError)
            }

            override fun onVerificationFailed(e: FirebaseException) {
                Log.e(tag, "Verification failed", e)
                onError(e.message ?: "Phone verification failed. Please try again.")
            }

            override fun onCodeSent(
                id: String,
                token: PhoneAuthProvider.ForceResendingToken,
            ) {
                Log.d(tag, "Code sent")
                verificationId = id
                resendToken = token
                onCodeSent()
            }
        }

        val options = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(phoneNumber)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)
            .build()

        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    override fun submitVerificationCode(
        code: String,
        onVerified: (idToken: String) -> Unit,
        onError: (message: String) -> Unit,
    ) {
        if (auth == null) {
            handleTestModeVerify(code, onVerified, onError)
            return
        }

        val verId = verificationId
        if (verId == null) {
            onError("No verification in progress. Please request a new code.")
            return
        }

        val credential = PhoneAuthProvider.getCredential(verId, code)
        signInWithCredential(credential, onVerified, onError)
    }

    override fun isTestMode(): Boolean = auth == null

    private fun signInWithCredential(
        credential: PhoneAuthCredential,
        onVerified: (idToken: String) -> Unit,
        onError: (message: String) -> Unit,
    ) {
        auth!!.signInWithCredential(credential)
            .addOnSuccessListener { result ->
                result.user?.getIdToken(true)
                    ?.addOnSuccessListener { tokenResult ->
                        val idToken = tokenResult.token
                        if (idToken != null) {
                            onVerified(idToken)
                        } else {
                            onError("Could not obtain authentication token.")
                        }
                    }
                    ?.addOnFailureListener { e ->
                        Log.e(tag, "getIdToken failed", e)
                        onError(e.message ?: "Failed to get authentication token.")
                    }
            }
            .addOnFailureListener { e ->
                Log.e(tag, "signInWithCredential failed", e)
                val message = when {
                    e.message?.contains("invalid", ignoreCase = true) == true ->
                        "Invalid verification code. Please try again."
                    e.message?.contains("expired", ignoreCase = true) == true ->
                        "Verification code expired. Please request a new one."
                    else -> e.message ?: "Verification failed. Please try again."
                }
                onError(message)
            }
    }

    // ── Test mode (Firebase not configured) ─────────────────────

    private var testPhoneNumber: String? = null

    private fun handleTestModeStart(
        phoneNumber: String,
        onCodeSent: () -> Unit,
        onVerified: (idToken: String) -> Unit,
        onError: (message: String) -> Unit,
    ) {
        Log.d(tag, "[TEST MODE] Verification started for $phoneNumber")
        testPhoneNumber = phoneNumber
        pendingOnVerified = onVerified
        pendingOnError = onError
        onCodeSent()
    }

    private fun handleTestModeVerify(
        code: String,
        onVerified: (idToken: String) -> Unit,
        onError: (message: String) -> Unit,
    ) {
        val phone = testPhoneNumber
        if (phone == null) {
            onError("No verification in progress.")
            return
        }
        // In test mode, accept any 6-digit code and produce a test token
        if (code.length == 6) {
            Log.d(tag, "[TEST MODE] Code accepted, returning test token for $phone")
            onVerified("test-firebase-token:$phone")
        } else {
            onError("Invalid code format.")
        }
    }
}

private var phoneAuthBridgeInstance: PhoneAuthBridge? = null

fun initializePhoneAuthBridge(activity: ComponentActivity) {
    phoneAuthBridgeInstance = AndroidPhoneAuthBridge(activity)
}

actual fun createPhoneAuthBridge(): PhoneAuthBridge {
    return phoneAuthBridgeInstance ?: throw IllegalStateException(
        "PhoneAuthBridge not initialized. Call initializePhoneAuthBridge() from MainActivity first."
    )
}
