package com.ayuni.app.ui.screens.dates

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.ayuni.app.domain.ChatPolicy
import com.ayuni.app.domain.DateBooking
import com.ayuni.app.ui.design.BrandColors

@Composable
fun BookingCard(booking: DateBooking, onReport: () -> Unit) {
    Card(
        modifier = Modifier
            .padding(horizontal = 20.dp)
            .fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("${booking.venueName} • ${booking.city}", style = MaterialTheme.typography.titleLarge, color = BrandColors.Ink)
            Text("Start: ${booking.startAt}", style = MaterialTheme.typography.bodyMedium, color = BrandColors.Muted)
            Text("Format: ${booking.dateType}", style = MaterialTheme.typography.bodyMedium, color = BrandColors.Muted)
            Text(ChatPolicy.describe(booking), style = MaterialTheme.typography.bodyMedium, color = BrandColors.Muted)
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = onReport,
                    colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFDC3545))
                ) {
                    Text("Report Issue", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}
