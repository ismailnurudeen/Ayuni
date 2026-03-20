package com.sway.app.domain

import kotlin.time.Duration
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours

data class VerificationStatus(
    val phoneVerified: Boolean,
    val selfieVerified: Boolean,
    val governmentIdVerified: Boolean,
    val idRequiredBeforeDate: Boolean = true,
)

data class SuggestionProfile(
    val id: String,
    val displayName: String,
    val age: Int,
    val city: City,
    val bio: String,
    val intent: DatingIntent,
    val preferredDateType: DateType,
    val trustScore: Int,
    val occupation: String,
    val education: String,
    val neighborhood: String,
    val languages: List<String>,
    val compatibilityHeadline: String,
    val profilePrompt: String,
    val venuePreview: String,
    val photoMoments: List<String>,
    val traitTags: List<String>,
    val interestTags: List<String>,
    val preferenceTags: List<String>,
    val badges: List<ProfileBadge>,
    val highlights: List<ProfileHighlight>,
)

data class Match(
    val id: String,
    val userId: String,
    val counterpartId: String,
    val createdAtIso: String,
    val expiresAfter: Duration = 2.days,
)

data class AvailabilityWindow(
    val dayLabel: String,
    val startsAtIso: String,
    val endsAtIso: String,
)

data class DateToken(
    val id: String,
    val amountNgn: Int,
    val paid: Boolean,
    val paymentMethod: PaymentMethod,
)

data class DateBooking(
    val id: String,
    val venueName: String,
    val city: City,
    val dateType: DateType,
    val startAt: String,
    val logisticsChatOpensBefore: Duration = 2.hours,
    val checkInStatus: CheckInStatus,
)

data class SafetyState(
    val trustedContactName: String,
    val trustedContactChannel: ShareChannel,
)

data class MatchroundState(
    val currentWindowLabel: String,
    val nextMatchroundLabel: String,
    val countdown: String,
    val usersLeftToday: Int,
)

data class UserSummary(
    val firstName: String,
    val completionScore: Int,
    val completionLabel: String,
    val profilePhotoMood: String,
    val badges: List<ProfileBadge>,
)

data class EditableProfile(
    val mediaSlots: List<String>,
    val interests: List<String>,
    val traits: List<String>,
    val bio: String,
    val qas: List<ProfileQa>,
    val religion: List<String>,
    val smoking: String,
    val drinking: String,
    val education: String,
    val job: String,
    val datingIntention: String,
    val sexualOrientation: String,
    val languages: List<String>,
)

data class ProfileQa(
    val question: String,
    val answer: String,
)

data class DatingPreferences(
    val ageRange: String,
    val genderIdentity: String,
    val heightRange: String,
    val dateCities: List<String>,
    val dateAreas: List<String>,
    val preferredDateActivities: List<String>,
)

data class AccountSettings(
    val name: String,
    val gender: String,
    val birthDate: String,
    val height: String,
    val residence: String,
    val educationLevel: String,
    val email: String,
    val phoneNumber: String,
)

data class AppPreferences(
    val notifications: String,
    val appLanguage: String,
)

data class InboxNotification(
    val id: String,
    val title: String,
    val body: String,
    val timestampLabel: String,
    val category: NotificationCategory,
)

data class ProfileBadge(
    val label: String,
    val tone: BadgeTone,
)

data class ProfileHighlight(
    val title: String,
    val body: String,
    val tone: HighlightTone,
)

data class FreezeAction(
    val freezeDays: Int,
    val reason: String,
)

enum class City {
    Lagos,
    Abuja,
    PortHarcourt,
}

enum class DatingIntent {
    SeriousRelationship,
    IntentionalDating,
}

enum class DateType {
    Cafe,
    Lounge,
    DessertSpot,
    Brunch,
    CasualRestaurant,
    HotelLobby,
}

enum class PaymentMethod {
    Card,
    BankTransfer,
    USSD,
}

enum class CheckInStatus {
    Pending,
    Confirmed,
    SupportFlagged,
}

enum class ShareChannel {
    WhatsApp,
    SMS,
}

enum class NotificationCategory {
    Update,
    Booking,
    Cancellation,
}

enum class BadgeTone {
    Trust,
    Intentional,
    Boost,
}

enum class HighlightTone {
    Light,
    Rich,
}
