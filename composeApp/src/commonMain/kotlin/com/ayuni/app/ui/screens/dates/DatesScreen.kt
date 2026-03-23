package com.ayuni.app.ui.screens.dates

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ayuni.app.domain.DateBooking
import com.ayuni.app.ui.components.HeaderAction
import com.ayuni.app.ui.components.HeroHeader
import com.ayuni.app.ui.design.BrandColors

@Composable
fun DatesScreen(
    padding: PaddingValues,
    bookings: List<DateBooking>,
    onOpenInbox: () -> Unit,
    onReportBooking: (DateBooking) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            HeroHeader(
                title = "Upcoming dates",
                subtitle = "Compact date cards with venue, timing, and chat availability.",
                actions = listOf(
                    HeaderAction("()", onOpenInbox),
                    HeaderAction("!", {}),
                )
            )
        }
        items(bookings) { booking ->
            BookingCard(
                booking = booking,
                onReport = { onReportBooking(booking) }
            )
        }
    }
}
