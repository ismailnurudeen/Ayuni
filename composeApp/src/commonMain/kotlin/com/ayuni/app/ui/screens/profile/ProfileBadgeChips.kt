package com.ayuni.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.ui.unit.dp
import com.ayuni.app.domain.BadgeTone
import com.ayuni.app.domain.ProfileBadge
import com.ayuni.app.ui.design.BrandColors

@Composable
fun ProfileBadgeChips(badges: List<ProfileBadge>) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(badges) { badge ->
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(
                        when (badge.tone) {
                            BadgeTone.Trust -> BrandColors.BlueBadge
                            BadgeTone.Intentional -> BrandColors.Coral
                            BadgeTone.Boost -> BrandColors.Gold
                        }
                    )
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(badge.label, color = Color.White, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}
