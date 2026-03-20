package com.ayuni.app.ui.screens.round

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ayuni.app.domain.SuggestionProfile
import com.ayuni.app.ui.design.BrandColors

@Composable
fun HandledProfileSection(title: String, profiles: List<SuggestionProfile>, chipColor: Color) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = BrandColors.Ink)
        if (profiles.isEmpty()) {
            Text("None yet", style = MaterialTheme.typography.bodySmall, color = BrandColors.Muted)
        } else {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(profiles) { profile ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .background(chipColor)
                            .padding(horizontal = 10.dp, vertical = 8.dp)
                    ) {
                        Text("${profile.displayName}, ${profile.age}", color = BrandColors.Ink, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}
