package com.ayuni.app.ui.state

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import com.ayuni.app.data.api.BootstrapPayload
import com.ayuni.app.data.repository.AyuniRepository
import com.ayuni.app.domain.City
import com.ayuni.app.platform.TokenStorage
import com.ayuni.app.platform.logError
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * State holder for onboarding flow (auth, phone verification, basic profile).
 */
class OnboardingStateHolder(
    private val repository: AyuniRepository,
    private val tokenStorage: TokenStorage,
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

    fun requestPhoneOtp(phoneNumber: String, onSuccess: () -> Unit = {}) {
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

    fun verifyPhoneOtp(phoneNumber: String, code: String) {
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
    onBootstrapReceived: (BootstrapPayload) -> Unit,
): OnboardingStateHolder {
    val scope = rememberCoroutineScope()
    return remember {
        OnboardingStateHolder(
            repository = repository,
            tokenStorage = tokenStorage,
            scope = scope,
            onBootstrapReceived = onBootstrapReceived
        )
    }
}
