package com.ayuni.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ayuni.app.ui.design.BrandColors

@Composable
fun SectionTitle(title: String, body: String) {
    Column(
        modifier = Modifier.padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(title, style = MaterialTheme.typography.titleLarge, color = BrandColors.Ink)
        Text(body, style = MaterialTheme.typography.bodyMedium, color = BrandColors.Muted)
    }
}
