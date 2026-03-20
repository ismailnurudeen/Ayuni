package com.sway.app.data

import com.sway.app.domain.CheckInStatus
import com.sway.app.domain.City
import com.sway.app.domain.DatingPreferences
import com.sway.app.domain.DateBooking
import com.sway.app.domain.DateType
import com.sway.app.domain.DatingIntent
import com.sway.app.domain.EditableProfile
import com.sway.app.domain.HighlightTone
import com.sway.app.domain.InboxNotification
import com.sway.app.domain.MatchroundState
import com.sway.app.domain.NotificationCategory
import com.sway.app.domain.AccountSettings
import com.sway.app.domain.AppPreferences
import com.sway.app.domain.ProfileBadge
import com.sway.app.domain.ProfileHighlight
import com.sway.app.domain.ProfileQa
import com.sway.app.domain.SafetyState
import com.sway.app.domain.ShareChannel
import com.sway.app.domain.SuggestionProfile
import com.sway.app.domain.UserSummary
import com.sway.app.domain.VerificationStatus
import com.sway.app.domain.BadgeTone

object DemoSeed {
    val verification = VerificationStatus(
        phoneVerified = true,
        selfieVerified = true,
        governmentIdVerified = false,
    )

    val suggestions = listOf(
        SuggestionProfile(
            id = "sug-1",
            displayName = "Amaka",
            age = 28,
            city = City.Lagos,
            bio = "Product designer who likes brunch dates and long walks by the water.",
            intent = DatingIntent.SeriousRelationship,
            preferredDateType = DateType.Brunch,
            trustScore = 92,
            occupation = "Product Designer",
            education = "UNILAG, Visual Communication",
            neighborhood = "Lekki Phase 1",
            languages = listOf("English", "Yoruba"),
            compatibilityHeadline = "You both prefer day dates, good conversation, and soft-launch energy.",
            profilePrompt = "Proudest of building a side studio from scratch and still making time for Sunday brunch.",
            venuePreview = "If you match, we will line up brunch in Lekki or Victoria Island.",
            photoMoments = listOf("Golden hour portrait", "Brunch patio", "Gallery night"),
            traitTags = listOf("Curious", "Kind", "Intentional", "Playful"),
            interestTags = listOf("Brunch", "Design", "Afrobeats", "Art fairs", "Road trips"),
            preferenceTags = listOf("Serious dating", "Monogamous", "Open to kids", "Occasional drinks"),
            badges = listOf(
                ProfileBadge("Phone verified", BadgeTone.Trust),
                ProfileBadge("Intentional", BadgeTone.Intentional),
            ),
            highlights = listOf(
                ProfileHighlight("Personal motto", "Slow burn, strong values, clean communication.", HighlightTone.Rich),
                ProfileHighlight("Ideal first date", "Small plates, mocktails, and somewhere we can actually hear each other.", HighlightTone.Light),
            ),
        ),
        SuggestionProfile(
            id = "sug-2",
            displayName = "Tosin",
            age = 31,
            city = City.Lagos,
            bio = "Finance lead, into live music, books, and quiet cafes.",
            intent = DatingIntent.IntentionalDating,
            preferredDateType = DateType.Cafe,
            trustScore = 88,
            occupation = "Finance Lead",
            education = "Covenant University",
            neighborhood = "Yaba",
            languages = listOf("English"),
            compatibilityHeadline = "Both of you want a calm first meeting instead of endless texting.",
            profilePrompt = "Most awkward moment: joining the wrong wedding table and staying for jollof anyway.",
            venuePreview = "If you match, we will set up coffee and dessert around Yaba or Ikoyi.",
            photoMoments = listOf("Bookshop stop", "Cafe booth", "Live set night"),
            traitTags = listOf("Calm", "Bookish", "Warm", "Direct"),
            interestTags = listOf("Coffee", "Books", "Jazz bars", "Padel", "Museums"),
            preferenceTags = listOf("Intentional dating", "No smoking", "Weekend dates"),
            badges = listOf(
                ProfileBadge("ID ready", BadgeTone.Trust),
                ProfileBadge("New tonight", BadgeTone.Boost),
            ),
            highlights = listOf(
                ProfileHighlight("Proud of", "Helping my younger siblings through school without turning bitter.", HighlightTone.Light),
                ProfileHighlight("Best energy", "Low-noise places, witty banter, and good pie.", HighlightTone.Rich),
            ),
        ),
        SuggestionProfile(
            id = "sug-3",
            displayName = "Ifeanyi",
            age = 30,
            city = City.Abuja,
            bio = "Consultant who prefers dessert spots over loud bars.",
            intent = DatingIntent.SeriousRelationship,
            preferredDateType = DateType.DessertSpot,
            trustScore = 90,
            occupation = "Management Consultant",
            education = "UNN, Economics",
            neighborhood = "Wuse II",
            languages = listOf("English", "Igbo"),
            compatibilityHeadline = "You both want a real date plan, not a week of vague chat.",
            profilePrompt = "I am proud of becoming softer without losing my ambition.",
            venuePreview = "If you match, expect dessert or tea in Wuse, not a loud club.",
            photoMoments = listOf("City rooftop", "Dessert run", "Weekend wedding"),
            traitTags = listOf("Empathetic", "Driven", "Spontaneous", "Funny"),
            interestTags = listOf("Dessert", "Travel", "Football", "Comedy", "Faith"),
            preferenceTags = listOf("Serious dating", "Family minded", "Non-smoker"),
            badges = listOf(
                ProfileBadge("Selfie checked", BadgeTone.Trust),
                ProfileBadge("High fit", BadgeTone.Intentional),
            ),
            highlights = listOf(
                ProfileHighlight("Personal motto", "Show up clearly or not at all.", HighlightTone.Rich),
                ProfileHighlight("Favorite type of date", "A sweet place with enough privacy for a proper conversation.", HighlightTone.Light),
            ),
        ),
    )

    val bookings = listOf(
        DateBooking(
            id = "book-1",
            venueName = "The Lobby, Victoria Island",
            city = City.Lagos,
            dateType = DateType.HotelLobby,
            startAt = "2026-03-22T18:30:00+01:00",
            checkInStatus = CheckInStatus.Pending,
        ),
    )

    val safety = SafetyState(
        trustedContactName = "Ada",
        trustedContactChannel = ShareChannel.WhatsApp,
    )

    val matchround = MatchroundState(
        currentWindowLabel = "Tonight's round",
        nextMatchroundLabel = "Next matchround at 8:00 PM",
        countdown = "06:52:51",
        usersLeftToday = 0,
    )

    val userSummary = UserSummary(
        firstName = "Nuru",
        completionScore = 92,
        completionLabel = "Intentional profile",
        profilePhotoMood = "Night portrait",
        badges = listOf(
            ProfileBadge("Verified", BadgeTone.Trust),
            ProfileBadge("Intentional", BadgeTone.Intentional),
            ProfileBadge("Boosted", BadgeTone.Boost),
        ),
    )

    val notifications = listOf(
        InboxNotification(
            id = "note-1",
            title = "Date confirmed for Saturday",
            body = "We booked your first date at The Lobby, Victoria Island. Logistics chat opens 2 hours before.",
            timestampLabel = "Today",
            category = NotificationCategory.Booking,
        ),
        InboxNotification(
            id = "note-2",
            title = "One profile left in tonight's round",
            body = "Your final curated profile is waiting. Review before the round closes.",
            timestampLabel = "Today",
            category = NotificationCategory.Update,
        ),
        InboxNotification(
            id = "note-3",
            title = "Cancellation policy reminder",
            body = "Late cancellations reduce trust score and can lock future bookings for 30 days.",
            timestampLabel = "Wed Mar 18",
            category = NotificationCategory.Cancellation,
        ),
    )

    val editableProfile = EditableProfile(
        mediaSlots = listOf(
            "Slot 1 • portrait",
            "Slot 2 • full look",
            "Slot 3 • brunch clip",
            "Slot 4 • wedding snap",
            "Slot 5 • gym mirror",
            "Slot 6 • travel reel",
        ),
        interests = listOf("Brunch", "Art fairs", "Afrobeats", "Road trips", "Padel", "Late night drives"),
        traits = listOf("Intentional", "Warm", "Playful", "Curious", "Direct"),
        bio = "Creative, affectionate, and low-drama. I like thoughtful people who can plan an actual date and still have fun.",
        qas = listOf(
            ProfileQa("A green flag I love", "Consistency without being dry."),
            ProfileQa("My ideal first date", "Mocktails, small plates, and a place where we can talk properly."),
            ProfileQa("A random thing about me", "I will always order dessert if the place is serious about it."),
        ),
        religion = listOf("Christian"),
        smoking = "Never",
        drinking = "Sometimes",
        education = "University degree",
        job = "Product Designer",
        datingIntention = "Serious relationship",
        sexualOrientation = "Straight",
        languages = listOf("English", "Yoruba"),
    )

    val datingPreferences = DatingPreferences(
        ageRange = "27-36",
        genderIdentity = "Men",
        heightRange = "168-195 cm",
        dateCities = listOf("Lagos", "Abuja"),
        dateAreas = listOf("Victoria Island", "Lekki", "Ikoyi", "Wuse II"),
        preferredDateActivities = listOf("Coffee", "Brunch", "Dessert", "Drinks", "Art gallery", "Casual dinner"),
    )

    val accountSettings = AccountSettings(
        name = "Nuru A.",
        gender = "Woman",
        birthDate = "1998-07-14",
        height = "170 cm",
        residence = "Lekki Phase 1, Lagos",
        educationLevel = "University degree",
        email = "nuru@example.com",
        phoneNumber = "+234 800 000 0000",
    )

    val appPreferences = AppPreferences(
        notifications = "Enabled for matches, bookings, and cancellations",
        appLanguage = "English",
    )
}
