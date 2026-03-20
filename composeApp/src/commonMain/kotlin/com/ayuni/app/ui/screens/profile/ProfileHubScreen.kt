package com.ayuni.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.ayuni.app.ui.AppScreenState
import com.ayuni.app.ui.design.BrandColors

@Composable
fun ProfileHubScreen(
    padding: PaddingValues,
    state: AppScreenState,
    onOpenEditProfile: () -> Unit,
    onOpenDatingPreferences: () -> Unit,
    onOpenAccountSettings: () -> Unit,
    onOpenAppSettings: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BrandColors.Ink)
                    .padding(horizontal = 20.dp, vertical = 22.dp)
            ) {
                Text("Ayuni", color = Color.White, style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.height(12.dp))
                Text(state.userSummary.firstName, color = Color.White, style = MaterialTheme.typography.headlineLarge)
                Spacer(Modifier.height(12.dp))
                ProfileBadgeChips(state.userSummary.badges)
            }
        }
        item {
            CompletionCard(
                score = state.userSummary.completionScore,
                label = state.userSummary.completionLabel,
                subtitle = "You are in it to win it"
            )
        }
        item {
            SettingsListCard(
                items = listOf(
                    SettingAction("Edit profile", onOpenEditProfile),
                    SettingAction("Dating preferences", onOpenDatingPreferences),
                    SettingAction("Date wallet", {}),
                    SettingAction("Account settings", onOpenAccountSettings),
                    SettingAction("App settings", onOpenAppSettings),
                )
            )
        }
    }
}
