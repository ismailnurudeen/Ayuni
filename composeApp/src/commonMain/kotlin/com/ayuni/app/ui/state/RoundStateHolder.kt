package com.ayuni.app.ui.state

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshots.SnapshotStateMap
import com.ayuni.app.data.api.BootstrapPayload
import com.ayuni.app.data.repository.AyuniRepository
import com.ayuni.app.platform.logError
import com.ayuni.app.ui.screens.round.RoundReaction
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * State holder for match round functionality (suggestions, reactions, accepted/declined tracking).
 */
class RoundStateHolder(
    private val repository: AyuniRepository,
    private val scope: CoroutineScope,
    private val onBootstrapReceived: (BootstrapPayload) -> Unit,
) {
    private val _reactions = mutableStateMapOf<String, RoundReaction>()
    val reactions: SnapshotStateMap<String, RoundReaction> = _reactions

    private val _isLoading = mutableStateOf(false)
    val isLoading: State<Boolean> = _isLoading

    private val _errorMessage = mutableStateOf<String?>(null)
    val errorMessage: State<String?> = _errorMessage

    fun updateReaction(profileId: String, accepted: Boolean) {
        scope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            repository.updateReaction(profileId, accepted)
                .onSuccess { bootstrap ->
                    onBootstrapReceived(bootstrap)
                }
                .onFailure { error ->
                    logError("RoundStateHolder", "Failed to update reaction", error)
                    _errorMessage.value = error.message ?: "Could not update reaction."
                }

            _isLoading.value = false
        }
    }

    fun applyReactionsFromBootstrap(bootstrapReactions: Map<String, String>) {
        _reactions.clear()
        _reactions.putAll(
            bootstrapReactions.mapValues { (_, value) ->
                if (value == "Accepted") RoundReaction.Accepted else RoundReaction.Declined
            }
        )
    }

    fun clearError() {
        _errorMessage.value = null
    }
}

@Composable
fun rememberRoundStateHolder(
    repository: AyuniRepository,
    onBootstrapReceived: (BootstrapPayload) -> Unit,
): RoundStateHolder {
    val scope = rememberCoroutineScope()
    return remember {
        RoundStateHolder(
            repository = repository,
            scope = scope,
            onBootstrapReceived = onBootstrapReceived
        )
    }
}
