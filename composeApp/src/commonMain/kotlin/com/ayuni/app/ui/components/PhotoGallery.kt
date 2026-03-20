package com.ayuni.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.ayuni.app.ui.design.BrandColors

@Composable
fun PhotoGallery(photoMoments: List<String>) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        items(photoMoments) { label ->
            Box(
                modifier = Modifier
                    .width(172.dp)
                    .height(132.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(BrandColors.PhotoGlow),
                contentAlignment = Alignment.Center
            ) {
                Text(label, color = BrandColors.Ink, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
