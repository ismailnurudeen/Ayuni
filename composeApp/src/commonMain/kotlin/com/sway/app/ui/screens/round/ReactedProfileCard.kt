package com.sway.app.ui.screens.round

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sway.app.domain.SuggestionProfile
import com.sway.app.ui.design.BrandColors

@Composable
fun ReactedProfileCard(
    profile: SuggestionProfile,
    statusLabel: String,
    statusColor: Color,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .padding(horizontal = 20.dp)
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp)
                    .background(BrandColors.PhotoGlow)
                    .padding(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(statusColor)
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(statusLabel, color = Color.White, style = MaterialTheme.typography.labelLarge)
                }
                Text(
                    profile.photoMoments.first(),
                    modifier = Modifier.align(Alignment.Center),
                    color = BrandColors.Ink,
                    style = MaterialTheme.typography.titleMedium
                )
            }
            Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("${profile.displayName}, ${profile.age}", color = BrandColors.Ink, style = MaterialTheme.typography.headlineSmall)
                Text("${profile.city.name} • ${profile.neighborhood}", color = BrandColors.Muted, style = MaterialTheme.typography.bodyMedium)
                Text(profile.bio, color = BrandColors.Muted, style = MaterialTheme.typography.bodyMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(6.dp))
        }
    }
}
