package com.sway.app.ui.screens.round

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.sway.app.domain.SuggestionProfile
import com.sway.app.ui.AppScreenState
import com.sway.app.ui.components.HeaderAction
import com.sway.app.ui.components.HeroHeader
import com.sway.app.ui.design.BrandColors

@Composable
fun MatchroundScreen(
    padding: PaddingValues,
    state: AppScreenState,
    activeProfiles: List<SuggestionProfile>,
    onOpenReactedPage: () -> Unit,
    onProfileSelected: (SuggestionProfile) -> Unit,
    onOpenNotifications: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding),
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            HeroHeader(
                title = "Sway",
                subtitle = state.matchround.currentWindowLabel,
                actions = listOf(
                    HeaderAction("24", onOpenReactedPage),
                    HeaderAction("()", onOpenNotifications),
                    HeaderAction("!", {}),
                )
            )
        }
        if (activeProfiles.isEmpty()) {
            item {
                NextRoundReadyCard(state.matchround.nextMatchroundLabel, state.matchround.countdown)
            }
        } else {
            item {
                RoundProfileRail(
                    suggestions = activeProfiles,
                    onProfileSelected = onProfileSelected,
                )
            }
        }
    }
}
