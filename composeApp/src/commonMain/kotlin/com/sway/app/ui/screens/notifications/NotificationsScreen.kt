package com.sway.app.ui.screens.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.sway.app.domain.InboxNotification
import com.sway.app.ui.components.SecondaryHeader
import com.sway.app.ui.design.BrandColors

@Composable
fun NotificationsScreen(padding: PaddingValues, notifications: List<InboxNotification>, onBack: () -> Unit) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding),
        contentPadding = PaddingValues(bottom = 20.dp),
    ) {
        item {
            SecondaryHeader(
                title = "Notifications",
                onBack = onBack
            )
        }
        items(notifications) { notification ->
            NotificationRow(notification)
        }
    }
}
