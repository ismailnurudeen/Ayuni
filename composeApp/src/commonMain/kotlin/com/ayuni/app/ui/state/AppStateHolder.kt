package com.ayuni.app.ui.state

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import com.ayuni.app.data.api.BootstrapPayload
import com.ayuni.app.data.repository.AyuniRepository
import com.ayuni.app.platform.TokenStorage
import com.ayuni.app.platform.logError
import com.ayuni.app.ui.AppScreenState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Top-level app state holder for bootstrap data and initial loading.
 */
class AppStateHolder(
    private val repository: AyuniRepository,
    private val tokenStorage: TokenStorage,
    private val scope: CoroutineScope,
) {
    private val _state = mutableStateOf(AppScreenState.empty())
    val state: State<AppScreenState> = _state

    private val _isLoading = mutableStateOf(true)
    val isLoading: State<Boolean> = _isLoading

    private val _errorMessage = mutableStateOf<String?>(null)
    val errorMessage: State<String?> = _errorMessage

    init {
        // Check for existing session on app start
        scope.launch {
            val hasTokens = tokenStorage.hasValidTokens()
            if (hasTokens) {
                // User has saved tokens, try to load bootstrap
                repository.getBootstrap()
                    .onSuccess { bootstrap ->
                        applyBootstrap(bootstrap)
                        _isLoading.value = false
                    }
                    .onFailure { error ->
                        // Token might be invalid, clear and show onboarding
                        logError("AppStateHolder", "Failed to load bootstrap with token", error)
                        tokenStorage.clearTokens()
                        _isLoading.value = false
                    }
            } else {
                // No saved tokens, show onboarding
                _isLoading.value = false
            }
        }
    }

    fun applyBootstrap(bootstrap: BootstrapPayload) {
        _state.value = bootstrap.toScreenState()
    }

    fun refreshBootstrap() {
        scope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            repository.getBootstrap()
                .onSuccess { bootstrap ->
                    applyBootstrap(bootstrap)
                    _isLoading.value = false
                }
                .onFailure { error ->
                    logError("AppStateHolder", "Failed to refresh bootstrap", error)
                    _errorMessage.value = error.message ?: "Could not load Ayuni right now."
                    _isLoading.value = false
                }
        }
    }

    fun updateCountdown(countdown: String) {
        _state.value = _state.value.copy(
            matchround = _state.value.matchround.copy(countdown = countdown)
        )
    }

    fun clearError() {
        _errorMessage.value = null
    }
}

@Composable
fun rememberAppStateHolder(
    repository: AyuniRepository,
    tokenStorage: TokenStorage,
): AppStateHolder {
    val scope = rememberCoroutineScope()
    return remember {
        AppStateHolder(
            repository = repository,
            tokenStorage = tokenStorage,
            scope = scope
        )
    }
}
