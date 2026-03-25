package com.ayuni.app.ui.state

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import com.ayuni.app.data.api.BootstrapPayload
import com.ayuni.app.data.repository.AyuniRepository
import com.ayuni.app.domain.City
import com.ayuni.app.platform.PhoneAuthBridge
import com.ayuni.app.platform.TokenStorage
import com.ayuni.app.platform.logError
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * State holder for onboarding flow (auth, phone verification, basic profile).
 * Supports both Firebase Phone Auth (MVP default) and Twilio OTP as fallback.
 */
class OnboardingStateHolder(
    private val repository: AyuniRepository,
    private val tokenStorage: TokenStorage,
    private val phoneAuthBridge: PhoneAuthBridge,
    private val scope: CoroutineScope,
    private val onBootstrapReceived: (BootstrapPayload) -> Unit,
) {
    private val _isSubmitting = mutableStateOf(false)
    val isSubmitting: State<Boolean> = _isSubmitting

    private val _errorMessage = mutableStateOf<String?>(null)
    val errorMessage: State<String?> = _errorMessage

    private val _pendingPhoneNumber = mutableStateOf("")
    val pendingPhoneNumber: State<String> = _pendingPhoneNumber

    private val _resendCooldownSeconds = mutableStateOf(0)
    val resendCooldownSeconds: State<Int> = _resendCooldownSeconds

    /** "firebase" (default) or "twilio" */
    private val _authProvider = mutableStateOf("firebase")
    val authProvider: State<String> = _authProvider

    init {
        // Fetch the configured auth provider from the backend
        scope.launch {
            repository.getAuthProvider()
                .onSuccess { provider -> _authProvider.value = provider }
                .onFailure { /* default stays "firebase" */ }
        }
    }

    // ── Phone entry: start verification ─────────────────────────

    fun requestPhoneOtp(phoneNumber: String, onSuccess: () -> Unit = {}) {
        if (_authProvider.value == "firebase") {
            requestFirebaseVerification(phoneNumber, onSuccess)
        } else {
            requestTwilioOtp(phoneNumber, onSuccess)
        }
    }

    private fun requestFirebaseVerification(phoneNumber: String, onSuccess: () -> Unit) {
        _isSubmitting.value = true
        _errorMessage.value = null

        phoneAuthBridge.startVerification(
            phoneNumber = phoneNumber,
            onCodeSent = {
                _pendingPhoneNumber.value = phoneNumber
                _resendCooldownSeconds.value = 60
                _isSubmitting.value = false
                onSuccess()
            },
            onVerified = { idToken ->
                // Auto-verified (e.g. SMS Retriever) — send token to backend
                _pendingPhoneNumber.value = phoneNumber
                scope.launch { sendFirebaseTokenToBackend(idToken) }
            },
            onError = { message ->
                _isSubmitting.value = false
                _errorMessage.value = message
            },
        )
    }

    private fun requestTwilioOtp(phoneNumber: String, onSuccess: () -> Unit) {
        scope.launch {
            _isSubmitting.value = true
            _errorMessage.value = null

            repository.requestPhoneOtp(phoneNumber)
                .onSuccess { retryAfterSeconds ->
                    _pendingPhoneNumber.value = phoneNumber
                    _resendCooldownSeconds.value = retryAfterSeconds
                    onSuccess()
                }
                .onFailure { error ->
                    logError("OnboardingStateHolder", "Failed to request OTP", error)
                    _errorMessage.value = error.message ?: "Could not send code right now."
                }

            _isSubmitting.value = false
        }
    }

    // ── OTP entry: verify code ──────────────────────────────────

    fun verifyPhoneOtp(phoneNumber: String, code: String) {
        if (_authProvider.value == "firebase") {
            verifyFirebaseCode(code)
        } else {
            verifyTwilioCode(phoneNumber, code)
        }
    }

    private fun verifyFirebaseCode(code: String) {
        _isSubmitting.value = true
        _errorMessage.value = null

        phoneAuthBridge.submitVerificationCode(
            code = code,
            onVerified = { idToken ->
                scope.launch { sendFirebaseTokenToBackend(idToken) }
            },
            onError = { message ->
                _isSubmitting.value = false
                _errorMessage.value = message
            },
        )
    }

    private fun verifyTwilioCode(phoneNumber: String, code: String) {
        scope.launch {
            _isSubmitting.value = true
            _errorMessage.value = null

            repository.verifyPhoneOtp(phoneNumber, code)
                .onSuccess { bootstrap ->
                    onBootstrapReceived(bootstrap)
                }
                .onFailure { error ->
                    logError("OnboardingStateHolder", "Failed to verify OTP", error)
                    _errorMessage.value = error.message ?: "That code did not work."
                }

            _isSubmitting.value = false
        }
    }

    // ── Firebase backend verification ───────────────────────────

    private suspend fun sendFirebaseTokenToBackend(idToken: String) {
        _isSubmitting.value = true
        _errorMessage.value = null

        repository.verifyFirebaseToken(idToken)
            .onSuccess { bootstrap ->
                _isSubmitting.value = false
                onBootstrapReceived(bootstrap)
            }
            .onFailure { error ->
                logError("OnboardingStateHolder", "Failed to verify Firebase token", error)
                _isSubmitting.value = false
                _errorMessage.value = error.message ?: "Verification failed. Please try again."
            }
    }

    // ── Basic profile completion ────────────────────────────────

    fun completeBasicOnboarding(
        firstName: String,
        birthDate: String,
        genderIdentity: String,
        interestedIn: String,
        city: City,
        acceptedTerms: Boolean,
    ) {
        scope.launch {
            _isSubmitting.value = true
            _errorMessage.value = null

            repository.completeBasicOnboarding(
                firstName = firstName,
                birthDate = birthDate,
                genderIdentity = genderIdentity,
                interestedIn = interestedIn,
                city = city,
                acceptedTerms = acceptedTerms
            )
                .onSuccess { bootstrap ->
                    onBootstrapReceived(bootstrap)
                }
                .onFailure { error ->
                    logError("OnboardingStateHolder", "Failed to complete onboarding", error)
                    _errorMessage.value = error.message ?: "Could not finish signup right now."
                }

            _isSubmitting.value = false
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    /**
     * Restore pending phone number for onboarding resume
     */
    fun restorePendingPhone(phoneNumber: String) {
        if (phoneNumber.isNotEmpty()) {
            _pendingPhoneNumber.value = phoneNumber
        }
    }
}

@Composable
fun rememberOnboardingStateHolder(
    repository: AyuniRepository,
    tokenStorage: TokenStorage,
    phoneAuthBridge: PhoneAuthBridge,
    onBootstrapReceived: (BootstrapPayload) -> Unit,
): OnboardingStateHolder {
    val scope = rememberCoroutineScope()
    return remember {
        OnboardingStateHolder(
            repository = repository,
            tokenStorage = tokenStorage,
            phoneAuthBridge = phoneAuthBridge,
            scope = scope,
            onBootstrapReceived = onBootstrapReceived
        )
    }
}
