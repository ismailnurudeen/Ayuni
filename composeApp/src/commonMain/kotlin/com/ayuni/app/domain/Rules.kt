package com.ayuni.app.domain

object MatchingRules {
    const val DailySuggestions = 5
    const val SuggestionDropHourWAT = 20
    const val FreezeThresholdIn90Days = 2
    const val FreezeDurationDays = 30
    const val PilotTokenPriceNgn = 3500

    fun shouldFreeze(noShowsIn90Days: Int, lateCancellationsIn90Days: Int): Boolean {
        return (noShowsIn90Days + lateCancellationsIn90Days) >= FreezeThresholdIn90Days
    }

    fun determineFreeze(noShowsIn90Days: Int, lateCancellationsIn90Days: Int): FreezeAction? {
        if (!shouldFreeze(noShowsIn90Days, lateCancellationsIn90Days)) return null
        return FreezeAction(
            freezeDays = FreezeDurationDays,
            reason = "Repeated no-shows or late cancellations in 90 days",
        )
    }
}

object ChatPolicy {
    fun isLogisticsChatOpen(hoursUntilDate: Int): Boolean = hoursUntilDate <= 2

    fun describe(booking: DateBooking): String {
        return "Logistics-only, opens ${booking.logisticsChatOpensBeforeHours} hours before start"
    }
}

object RefundPolicy {
    fun shouldRefund(platformCancelled: Boolean, venueCancelled: Boolean, counterpartTimedOut: Boolean): Boolean {
        return platformCancelled || venueCancelled || counterpartTimedOut
    }
}
