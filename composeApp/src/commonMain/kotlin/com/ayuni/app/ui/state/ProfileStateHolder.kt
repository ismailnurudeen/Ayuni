package com.ayuni.app.ui.state

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import com.ayuni.app.data.api.BootstrapPayload
import com.ayuni.app.data.repository.AyuniRepository
import com.ayuni.app.domain.AccountSettings
import com.ayuni.app.domain.AppPreferences
import com.ayuni.app.domain.DatingPreferences
import com.ayuni.app.domain.EditableProfile
import com.ayuni.app.platform.logError
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * State holder for profile editing, dating preferences, and settings.
 */
class ProfileStateHolder(
    private val repository: AyuniRepository,
    private val scope: CoroutineScope,
    private val onBootstrapReceived: (BootstrapPayload) -> Unit,
) {
    private val _isLoading = mutableStateOf(false)
    val isLoading: State<Boolean> = _isLoading

    private val _errorMessage = mutableStateOf<String?>(null)
    val errorMessage: State<String?> = _errorMessage

    fun updateProfile(profile: EditableProfile, onSuccess: () -> Unit = {}) {
        scope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            repository.updateProfile(profile)
                .onSuccess { bootstrap ->
                    onBootstrapReceived(bootstrap)
                    onSuccess()
                }
                .onFailure { error ->
                    logError("ProfileStateHolder", "Failed to update profile", error)
                    _errorMessage.value = error.message ?: "Could not update profile."
                }

            _isLoading.value = false
        }
    }

    fun updateDatingPreferences(preferences: DatingPreferences, onSuccess: () -> Unit = {}) {
        scope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            repository.updateDatingPreferences(preferences)
                .onSuccess { bootstrap ->
                    onBootstrapReceived(bootstrap)
                    onSuccess()
                }
                .onFailure { error ->
                    logError("ProfileStateHolder", "Failed to update dating preferences", error)
                    _errorMessage.value = error.message ?: "Could not update preferences."
                }

            _isLoading.value = false
        }
    }

    fun updateAccountSettings(settings: AccountSettings, onSuccess: () -> Unit = {}) {
        scope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            repository.updateAccountSettings(settings)
                .onSuccess { bootstrap ->
                    onBootstrapReceived(bootstrap)
                    onSuccess()
                }
                .onFailure { error ->
                    logError("ProfileStateHolder", "Failed to update account settings", error)
                    _errorMessage.value = error.message ?: "Could not update settings."
                }

            _isLoading.value = false
        }
    }

    fun updateAppSettings(preferences: AppPreferences, onSuccess: () -> Unit = {}) {
        scope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            repository.updateAppSettings(preferences)
                .onSuccess { bootstrap ->
                    onBootstrapReceived(bootstrap)
                    onSuccess()
                }
                .onFailure { error ->
                    logError("ProfileStateHolder", "Failed to update app settings", error)
                    _errorMessage.value = error.message ?: "Could not update app settings."
                }

            _isLoading.value = false
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }
}

@Composable
fun rememberProfileStateHolder(
    repository: AyuniRepository,
    onBootstrapReceived: (BootstrapPayload) -> Unit,
): ProfileStateHolder {
    val scope = rememberCoroutineScope()
    return remember {
        ProfileStateHolder(
            repository = repository,
            scope = scope,
            onBootstrapReceived = onBootstrapReceived
        )
    }
}
