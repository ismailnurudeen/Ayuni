package com.ayuni.app.ui.screens.round

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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

@Composable
fun RoundProfileRail(
    suggestions: List<SuggestionProfile>,
    onProfileSelected: (SuggestionProfile) -> Unit,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        items(suggestions) { profile ->
            Card(
                modifier = Modifier
                    .width(304.dp)
                    .clickable { onProfileSelected(profile) },
                shape = RoundedCornerShape(30.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
            ) {
                Column {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(320.dp)
                            .background(BrandColors.PhotoGlow),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(profile.photoMoments.first(), color = BrandColors.Ink, style = MaterialTheme.typography.titleMedium)
                    }
                    Column(
                        modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("${profile.displayName}, ${profile.age}", color = BrandColors.Ink, style = MaterialTheme.typography.headlineSmall)
                        Text("${profile.city.name} • ${profile.neighborhood}", color = BrandColors.Muted, style = MaterialTheme.typography.bodyMedium)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(profile.interestTags.take(3)) { interest ->
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(BrandColors.PaperChip)
                                        .padding(horizontal = 10.dp, vertical = 8.dp)
                                ) {
                                    Text(interest, color = BrandColors.Ink, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
