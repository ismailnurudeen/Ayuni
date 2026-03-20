package com.ayuni.app.ui.components

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
import androidx.compose.ui.unit.dp
import com.ayuni.app.ui.design.BrandColors

@Composable
fun CompactTagSection(title: String, tags: List<String>, chipColor: Color) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = BrandColors.Ink)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(tags) { tag ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .background(chipColor)
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Text(tag, style = MaterialTheme.typography.bodyMedium, color = BrandColors.Ink)
                }
            }
        }
    }
}
