package com.sway.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sway.app.domain.SuggestionProfile
import com.sway.app.ui.design.BrandColors

@Composable
fun CompactInfoGrid(profile: SuggestionProfile) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        CompactInfoRow("Job", profile.occupation)
        CompactInfoRow("Studied", profile.education)
        CompactInfoRow("Living in", profile.city.name)
        CompactInfoRow("Languages", profile.languages.joinToString())
    }
}

@Composable
fun CompactInfoRow(label: String, value: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
        Text(label, modifier = Modifier.width(72.dp), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = BrandColors.Ink)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = BrandColors.Muted)
    }
}
