package com.sway.app.domain

interface SuggestionRepository {
    fun getDailySuggestions(city: City): List<SuggestionProfile>
}

interface MatchRepository {
    fun getActiveMatches(userId: String): List<Match>
}

interface BookingRepository {
    fun getBookings(userId: String): List<DateBooking>
}

interface VerificationRepository {
    fun getVerification(userId: String): VerificationStatus
}

interface PaymentRepository {
    fun getToken(userId: String): DateToken
}

interface SafetyRepository {
    fun getSafetyState(userId: String): SafetyState
}
