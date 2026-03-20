package com.ayuni.app.ui.screens.round

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.unit.dp
import com.ayuni.app.domain.SuggestionProfile
import com.ayuni.app.ui.design.BrandColors
import com.ayuni.app.ui.components.PhotoGallery
import com.ayuni.app.ui.components.DetailPane
import com.ayuni.app.ui.components.CompactInfoGrid
import com.ayuni.app.ui.components.CompactTagSection
import com.ayuni.app.ui.components.ActionButton
import com.ayuni.app.ui.screens.round.RoundReaction

@Composable
fun ProfileDrawer(
    profile: SuggestionProfile,
    reaction: RoundReaction?,
    acceptanceLocked: Boolean,
    onDismiss: () -> Unit,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.35f))
            .clickable { onDismiss() }
    ) {
        Card(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
            shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
            colors = CardDefaults.cardColors(containerColor = BrandColors.Shell),
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = false) {},
                contentPadding = PaddingValues(18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("${profile.displayName}, ${profile.age}", style = MaterialTheme.typography.headlineSmall, color = BrandColors.Ink)
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(999.dp))
                                .background(BrandColors.PaperChip)
                                .clickable { onDismiss() }
                                .padding(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Text("Close", color = BrandColors.Ink, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                item { PhotoGallery(profile.photoMoments) }
                item {
                    DetailPane("About", fillWidth = true) {
                        Text(profile.compatibilityHeadline, style = MaterialTheme.typography.titleMedium, color = BrandColors.Ink)
                        Spacer(Modifier.height(8.dp))
                        Text(profile.bio, style = MaterialTheme.typography.bodyMedium, color = BrandColors.Muted)
                    }
                }
                item {
                    DetailPane("Info", fillWidth = true) {
                        CompactInfoGrid(profile)
                    }
                }
                item {
                    DetailPane("Preferences", fillWidth = true) {
                        Spacer(Modifier.height(10.dp))
                        CompactTagSection("Traits", profile.traitTags.take(4), Color.White)
                        Spacer(Modifier.height(10.dp))
                        CompactTagSection("Interests", profile.interestTags.take(6), BrandColors.PaperChip)
                    }
                }
                item {
                    DetailPane("Date preview", fillWidth = true) {
                        Text(profile.venuePreview, style = MaterialTheme.typography.bodyMedium, color = BrandColors.Muted)
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        ActionButton(
                            label = if (reaction == RoundReaction.Declined) "Declined" else "Decline",
                            background = if (reaction == RoundReaction.Declined) BrandColors.Muted else BrandColors.PaperChip,
                            textColor = if (reaction == RoundReaction.Declined) Color.White else BrandColors.Ink,
                            enabled = true,
                            onClick = onDecline
                        )
                        ActionButton(
                            label = when {
                                reaction == RoundReaction.Accepted -> "Accepted"
                                acceptanceLocked -> "Max 5"
                                else -> "Accept"
                            },
                            background = when {
                                reaction == RoundReaction.Accepted -> BrandColors.Coral
                                acceptanceLocked -> BrandColors.Cloud
                                else -> BrandColors.Ink
                            },
                            textColor = Color.White,
                            enabled = !acceptanceLocked || reaction == RoundReaction.Accepted,
                            onClick = onAccept
                        )
                    }
                }
            }
        }
    }
}
