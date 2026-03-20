package com.ayuni.app.ui.screens.round

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ayuni.app.domain.SuggestionProfile
import com.ayuni.app.ui.components.SecondaryHeader
import com.ayuni.app.ui.components.SectionTitle
import com.ayuni.app.ui.design.BrandColors
import com.ayuni.app.ui.screens.round.ReactedProfileCard
import com.ayuni.app.ui.screens.round.EmptyReactedCard

@Composable
fun ReactedProfilesScreen(
    padding: PaddingValues,
    acceptedProfiles: List<SuggestionProfile>,
    declinedProfiles: List<SuggestionProfile>,
    nextMatchroundLabel: String,
    onBack: () -> Unit,
    onProfileSelected: (SuggestionProfile) -> Unit,
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
            SecondaryHeader(
                title = "24 hour activity",
                subtitle = nextMatchroundLabel,
                onBack = onBack,
            )
        }
        if (acceptedProfiles.isNotEmpty()) {
            item {
                SectionTitle("Accepted", "Tap any card to open the full profile and change your decision.")
            }
            items(acceptedProfiles) { profile ->
                ReactedProfileCard(profile = profile, statusLabel = "Accepted", statusColor = BrandColors.Coral, onClick = { onProfileSelected(profile) })
            }
        }
        if (declinedProfiles.isNotEmpty()) {
            item {
                SectionTitle("Declined", "You can reopen any declined profile and switch it to accepted.")
            }
            items(declinedProfiles) { profile ->
                ReactedProfileCard(profile = profile, statusLabel = "Declined", statusColor = BrandColors.Muted, onClick = { onProfileSelected(profile) })
            }
        }
        if (acceptedProfiles.isEmpty() && declinedProfiles.isEmpty()) {
            item {
                EmptyReactedCard()
            }
        }
    }
}
