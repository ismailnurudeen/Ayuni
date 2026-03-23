package com.ayuni.app.domain

import kotlinx.serialization.Serializable

@Serializable
data class VerificationStatus(
    val phoneVerified: Boolean,
    val selfieVerified: Boolean,
    val governmentIdVerified: Boolean,
    val idRequiredBeforeDate: Boolean = true,
    val govIdStatus: String? = null, // not_submitted, pending_review, approved, rejected
    val govIdSubmissionId: String? = null,
    val govIdRejectionReason: String? = null,
)

@Serializable
data class OnboardingState(
    val signupMethod: SignupMethod,
    val step: OnboardingStep,
    val completed: Boolean,
    val phoneNumber: String = "",
)

@Serializable
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

@Serializable
data class Match(
    val id: String,
    val userId: String,
    val counterpartId: String,
    val createdAtIso: String,
    val expiresAfterHours: Int = 48,
)

@Serializable
data class AvailabilityWindow(
    val dayLabel: String,
    val startsAtIso: String,
    val endsAtIso: String,
)

@Serializable
data class DateToken(
    val id: String,
    val amountNgn: Int,
    val paid: Boolean,
    val paymentMethod: PaymentMethod,
)

@Serializable
data class DateBooking(
    val id: String,
    val venueName: String,
    val city: City,
    val dateType: DateType,
    val startAt: String,
    val logisticsChatOpensBeforeHours: Int = 2,
    val checkInStatus: CheckInStatus,
    val tokenAmountNgn: Int = 3500,
    val bothPaid: Boolean = true,
    val counterpartName: String = "",
    val venueAddress: String = "",
)

@Serializable
data class SafetyState(
    val trustedContactName: String,
    val trustedContactChannel: ShareChannel,
)

@Serializable
data class MatchroundState(
    val currentWindowLabel: String,
    val nextMatchroundLabel: String,
    val countdown: String,
    val usersLeftToday: Int,
)

@Serializable
data class UserSummary(
    val firstName: String,
    val completionScore: Int,
    val completionLabel: String,
    val profilePhotoMood: String,
    val badges: List<ProfileBadge>,
)

@Serializable
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

@Serializable
data class ProfileQa(
    val question: String,
    val answer: String,
)

@Serializable
data class DatingPreferences(
    val ageRange: String,
    val genderIdentity: String,
    val heightRange: String,
    val dateCities: List<String>,
    val dateAreas: List<String>,
    val preferredDateActivities: List<String>,
)

@Serializable
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

@Serializable
data class AppPreferences(
    val notifications: String,
    val appLanguage: String,
)

@Serializable
data class InboxNotification(
    val id: String,
    val title: String,
    val body: String,
    val timestampLabel: String,
    val category: NotificationCategory,
)

@Serializable
data class ProfileBadge(
    val label: String,
    val tone: BadgeTone,
)

@Serializable
data class ProfileHighlight(
    val title: String,
    val body: String,
    val tone: HighlightTone,
)

@Serializable
data class FreezeAction(
    val freezeDays: Int,
    val reason: String,
)

@Serializable
enum class City {
    Lagos,
    Abuja,
    PortHarcourt,
}

@Serializable
enum class DatingIntent {
    SeriousRelationship,
    IntentionalDating,
}

@Serializable
enum class DateType {
    Cafe,
    Lounge,
    DessertSpot,
    Brunch,
    CasualRestaurant,
    HotelLobby,
}

@Serializable
enum class PaymentMethod {
    Card,
    BankTransfer,
    USSD,
}

@Serializable
enum class CheckInStatus {
    Pending,
    Confirmed,
    SupportFlagged,
}

@Serializable
enum class ShareChannel {
    WhatsApp,
    SMS,
}

@Serializable
enum class NotificationCategory {
    Update,
    Booking,
    Cancellation,
}

@Serializable
enum class BadgeTone {
    Trust,
    Intentional,
    Boost,
}

@Serializable
enum class HighlightTone {
    Light,
    Rich,
}

@Serializable
enum class SignupMethod {
    Phone,
}

@Serializable
enum class OnboardingStep {
    Welcome,
    PhoneEntry,
    OtpVerification,
    BasicProfile,
    Complete,
}
