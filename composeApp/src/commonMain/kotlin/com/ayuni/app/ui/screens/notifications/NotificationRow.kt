package com.ayuni.app.ui.screens.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.ayuni.app.domain.InboxNotification
import com.ayuni.app.domain.NotificationCategory
import com.ayuni.app.ui.design.BrandColors

@Composable
fun NotificationRow(notification: InboxNotification) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { }
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(58.dp)
                .clip(CircleShape)
                .background(
                    when (notification.category) {
                        NotificationCategory.Update -> BrandColors.TagChip
                        NotificationCategory.Booking -> BrandColors.Petal
                        NotificationCategory.Cancellation -> BrandColors.RichCard
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                when (notification.category) {
                    NotificationCategory.Update -> "UP"
                    NotificationCategory.Booking -> "DT"
                    NotificationCategory.Cancellation -> "CA"
                },
                color = if (notification.category == NotificationCategory.Cancellation) Color.White else BrandColors.Ink,
                style = MaterialTheme.typography.titleSmall,
            )
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .border(0.5.dp, BrandColors.Cloud, RoundedCornerShape(0.dp))
                .padding(bottom = 14.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(notification.title, modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, color = BrandColors.Ink)
                Spacer(Modifier.width(8.dp))
                Text(notification.timestampLabel, style = MaterialTheme.typography.bodySmall, color = BrandColors.Muted)
            }
            Text(notification.body, style = MaterialTheme.typography.bodyMedium, color = BrandColors.Muted, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}
