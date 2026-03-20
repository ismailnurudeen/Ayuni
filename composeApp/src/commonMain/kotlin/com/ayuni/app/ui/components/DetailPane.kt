package com.ayuni.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ayuni.app.ui.design.BrandColors

@Composable
fun DetailPane(title: String, fillWidth: Boolean = false, content: @Composable () -> Unit) {
    Card(
        modifier = if (fillWidth) Modifier.fillMaxWidth() else Modifier.width(264.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = BrandColors.PaperChip),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = BrandColors.Ink)
            Spacer(Modifier.height(10.dp))
            content()
        }
    }
}
