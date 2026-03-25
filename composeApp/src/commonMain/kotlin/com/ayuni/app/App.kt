package com.ayuni.app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import com.ayuni.app.data.api.AyuniApiClient
import com.ayuni.app.data.repository.AyuniRepository
import com.ayuni.app.platform.createTokenStorage
import com.ayuni.app.ui.AppRoute
import com.ayuni.app.ui.design.AyuniTheme
import com.ayuni.app.ui.navigation.AyuniBottomBar
import com.ayuni.app.ui.screens.onboarding.BasicProfileOnboardingScreen
import com.ayuni.app.ui.screens.onboarding.OnboardingFlowStep
import com.ayuni.app.ui.screens.onboarding.OtpVerificationScreen
import com.ayuni.app.ui.screens.onboarding.PhoneEntryScreen
import com.ayuni.app.ui.screens.onboarding.WelcomeScreen
import com.ayuni.app.ui.screens.round.*
import com.ayuni.app.ui.screens.dates.DatesScreen
import com.ayuni.app.ui.screens.dates.SafetyReportScreen
import com.ayuni.app.ui.screens.notifications.NotificationsScreen
import com.ayuni.app.ui.screens.profile.ProfileHubScreen
import com.ayuni.app.ui.screens.profile.*
import com.ayuni.app.ui.screens.profile.ProfileScreen
import com.ayuni.app.ui.state.rememberAppStateHolder
import com.ayuni.app.ui.state.rememberOnboardingStateHolder
import com.ayuni.app.ui.state.rememberProfileStateHolder
import com.ayuni.app.ui.state.rememberRoundStateHolder
import kotlinx.datetime.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.time.Clock

@Composable
fun AyuniApp() {
    // Setup repository and token storage
    val tokenStorage = remember { createTokenStorage() }
    val apiClient = remember { AyuniApiClient(tokenStorage) }
    val repository = remember { AyuniRepository(apiClient) }

    // Create state holders for each feature domain
    val appStateHolder = rememberAppStateHolder(repository, tokenStorage)

    var userMedia by remember { mutableStateOf<List<com.ayuni.app.data.api.ProfileMedia>>(emptyList()) }

    val roundStateHolder = rememberRoundStateHolder(repository) { bootstrap ->
        appStateHolder.applyBootstrap(bootstrap)
        userMedia = bootstrap.media
    }
    val onboardingStateHolder = rememberOnboardingStateHolder(repository, tokenStorage) { bootstrap ->
        appStateHolder.applyBootstrap(bootstrap)
        roundStateHolder.applyReactionsFromBootstrap(bootstrap.reactions)
        userMedia = bootstrap.media
    }
    val profileStateHolder = rememberProfileStateHolder(repository) { bootstrap ->
        appStateHolder.applyBootstrap(bootstrap)
        userMedia = bootstrap.media
    }

    // UI-level routing state
    var route by remember { mutableStateOf(AppRoute.Round) }
    var roundScreen by remember { mutableStateOf(RoundScreen.Active) }
    var profileScreen by remember { mutableStateOf(ProfileScreen.Hub) }
    var selectedDrawerProfileId by remember { mutableStateOf<String?>(null) }
    var onboardingStep by remember { mutableStateOf(OnboardingFlowStep.Welcome) }
    var reportingBooking by remember { mutableStateOf<com.ayuni.app.domain.DateBooking?>(null) }

    // Extract state from holders
    val state by appStateHolder.state
    val isLoading by appStateHolder.isLoading
    val errorMessage by appStateHolder.errorMessage

    // Sync onboarding step with backend state
    LaunchedEffect(state.onboarding.step, state.onboarding.completed) {
        onboardingStep = when (state.onboarding.step) {
            com.ayuni.app.domain.OnboardingStep.PhoneEntry -> OnboardingFlowStep.Phone
            com.ayuni.app.domain.OnboardingStep.OtpVerification -> OnboardingFlowStep.Otp
            com.ayuni.app.domain.OnboardingStep.BasicProfile -> OnboardingFlowStep.Basics
            com.ayuni.app.domain.OnboardingStep.Complete -> OnboardingFlowStep.Basics
            else -> OnboardingFlowStep.Welcome
        }
    }

    // Restore phone number for onboarding resume
    LaunchedEffect(state.onboarding.phoneNumber) {
        onboardingStateHolder.restorePendingPhone(state.onboarding.phoneNumber)
    }

    // Countdown timer logic (could be moved to a dedicated state holder later)
    LaunchedEffect(state.matchround.nextMatchroundLabel) {
        while (true) {
            val nowInstant = Clock.System.now()
            val now = nowInstant.toLocalDateTime(TimeZone.currentSystemDefault())

            val targetHour = 20
            val targetMinute = 0

            var targetDateTime = LocalDateTime(now.year, now.month, now.day, targetHour, targetMinute, 0)

            if (now.hour >= targetHour && (now.hour > targetHour || now.minute >= targetMinute)) {
                val tomorrowInstant = nowInstant.plus(1, DateTimeUnit.DAY, TimeZone.currentSystemDefault())
                val tomorrow = tomorrowInstant.toLocalDateTime(TimeZone.currentSystemDefault())
                targetDateTime = LocalDateTime(tomorrow.year, tomorrow.month, tomorrow.day, targetHour, targetMinute, 0)
            }

            val targetInstant = targetDateTime.toInstant(TimeZone.currentSystemDefault())
            val duration = targetInstant - nowInstant
            val totalSeconds = duration.inWholeSeconds

            if (totalSeconds > 0) {
                val h = totalSeconds / 3600
                val m = (totalSeconds % 3600) / 60
                val s = totalSeconds % 60
                val newCountdown = "${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}"
                appStateHolder.updateCountdown(newCountdown)
            } else {
                appStateHolder.updateCountdown("00:00:00")
            }

            delay(1000)
        }
    }

    // Compute derived state
    val acceptedProfiles = state.suggestions.filter { roundStateHolder.reactions[it.id] == RoundReaction.Accepted }
    val declinedProfiles = state.suggestions.filter { roundStateHolder.reactions[it.id] == RoundReaction.Declined }
    val activeProfiles = state.suggestions.filter { roundStateHolder.reactions[it.id] == null }
    val drawerProfile = state.suggestions.firstOrNull { it.id == selectedDrawerProfileId }

    AyuniTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Box(modifier = Modifier.fillMaxSize()) {
                when {
                    isLoading -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Loading Ayuni…", style = MaterialTheme.typography.titleMedium)
                        }
                    }

                    errorMessage != null -> {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(errorMessage!!, style = MaterialTheme.typography.titleMedium)
                        }
                    }

                    !state.onboarding.completed -> when (onboardingStep) {
                        OnboardingFlowStep.Welcome -> WelcomeScreen(
                            onContinue = {
                                onboardingStateHolder.clearError()
                                onboardingStep = OnboardingFlowStep.Phone
                            }
                        )

                        OnboardingFlowStep.Phone -> PhoneEntryScreen(
                            phoneNumber = onboardingStateHolder.pendingPhoneNumber.value,
                            isSubmitting = onboardingStateHolder.isSubmitting.value,
                            errorMessage = onboardingStateHolder.errorMessage.value,
                            onBack = { onboardingStep = OnboardingFlowStep.Welcome },
                            onSubmit = { phone ->
                                onboardingStateHolder.requestPhoneOtp(phone) {
                                    onboardingStep = OnboardingFlowStep.Otp
                                }
                            }
                        )

                        OnboardingFlowStep.Otp -> OtpVerificationScreen(
                            phoneNumber = onboardingStateHolder.pendingPhoneNumber.value,
                            isSubmitting = onboardingStateHolder.isSubmitting.value,
                            errorMessage = onboardingStateHolder.errorMessage.value,
                            onBack = { onboardingStep = OnboardingFlowStep.Phone },
                            onSubmit = { code ->
                                onboardingStateHolder.verifyPhoneOtp(
                                    onboardingStateHolder.pendingPhoneNumber.value,
                                    code
                                )
                            }
                        )

                        OnboardingFlowStep.Basics -> BasicProfileOnboardingScreen(
                            isSubmitting = onboardingStateHolder.isSubmitting.value,
                            errorMessage = onboardingStateHolder.errorMessage.value,
                            onSubmit = { firstName, birthDate, genderIdentity, interestedIn, city, acceptedTerms ->
                                onboardingStateHolder.completeBasicOnboarding(
                                    firstName = firstName,
                                    birthDate = birthDate,
                                    genderIdentity = genderIdentity,
                                    interestedIn = interestedIn,
                                    city = city,
                                    acceptedTerms = acceptedTerms
                                )
                            }
                        )
                    }

                    else -> Scaffold(
                        containerColor = MaterialTheme.colorScheme.background,
                        bottomBar = {
                            AyuniBottomBar(currentRoute = route, onRouteSelected = { route = it })
                        }
                    ) { innerPadding ->
                        when (route) {
                            AppRoute.Round -> when (roundScreen) {
                                RoundScreen.Active -> MatchroundScreen(
                                    padding = innerPadding,
                                    state = state,
                                    activeProfiles = activeProfiles,
                                    onOpenReactedPage = { roundScreen = RoundScreen.Reacted },
                                    onProfileSelected = { selectedDrawerProfileId = it.id },
                                    onOpenNotifications = { route = AppRoute.Notifications }
                                )

                                RoundScreen.Reacted -> ReactedProfilesScreen(
                                    padding = innerPadding,
                                    acceptedProfiles = acceptedProfiles,
                                    declinedProfiles = declinedProfiles,
                                    nextMatchroundLabel = state.matchround.nextMatchroundLabel,
                                    countdown = state.matchround.countdown,
                                    onBack = { roundScreen = RoundScreen.Active },
                                    onProfileSelected = { selectedDrawerProfileId = it.id }
                                )
                            }

                            AppRoute.Dates -> {
                                if (reportingBooking != null) {
                                    SafetyReportScreen(
                                        bookingId = reportingBooking!!.id,
                                        venueName = reportingBooking!!.venueName,
                                        counterpartName = reportingBooking!!.counterpartName,
                                        onSubmitReport = { category, details ->
                                            repository.createSafetyReport(reportingBooking!!.id, category, details)
                                        },
                                        onBack = { reportingBooking = null }
                                    )
                                } else {
                                    DatesScreen(
                                        padding = innerPadding,
                                        bookings = state.bookings,
                                        onOpenInbox = { route = AppRoute.Notifications },
                                        onReportBooking = { booking -> reportingBooking = booking }
                                    )
                                }
                            }

                            AppRoute.Notifications -> NotificationsScreen(
                                padding = innerPadding,
                                notifications = state.notifications,
                                onBack = { route = AppRoute.Round }
                            )

                            AppRoute.Profile -> when (profileScreen) {
                                ProfileScreen.Hub -> ProfileHubScreen(
                                    padding = innerPadding,
                                    state = state,
                                    onOpenEditProfile = { profileScreen = ProfileScreen.EditProfile },
                                    onOpenDatingPreferences = { profileScreen = ProfileScreen.DatingPreferences },
                                    onOpenAccountSettings = { profileScreen = ProfileScreen.AccountSettings },
                                    onOpenAppSettings = { profileScreen = ProfileScreen.AppSettings },
                                    onOpenSelfieVerification = { profileScreen = ProfileScreen.SelfieVerification },
                                )

                                ProfileScreen.SelfieVerification -> SelfieVerificationScreen(
                                    isVerified = state.verification.selfieVerified,
                                    onSubmitSelfie = { imageUrl ->
                                        repository.submitSelfie(imageUrl)
                                    },
                                    onBack = { profileScreen = ProfileScreen.Hub }
                                )

                                ProfileScreen.EditProfile -> EditProfileScreen(
                                    padding = innerPadding,
                                    profile = state.editableProfile,
                                    media = userMedia,
                                    isLoading = profileStateHolder.isLoading.value,
                                    errorMessage = profileStateHolder.errorMessage.value,
                                    onBack = { profileScreen = ProfileScreen.Hub },
                                    onPreview = { profileScreen = ProfileScreen.ProfilePreview },
                                    onNavigateToEdit = { profileScreen = it },
                                    onUploadMedia = { dataUrl ->
                                        profileStateHolder.uploadMedia(dataUrl)
                                    },
                                    onDeleteMedia = { mediaId ->
                                        profileStateHolder.deleteMedia(mediaId)
                                    },
                                    onReorderMedia = { mediaIds ->
                                        profileStateHolder.reorderMedia(mediaIds)
                                    },
                                    onClearError = { profileStateHolder.clearError() },
                                )

                                ProfileScreen.EditBio -> EditBioScreen(
                                    padding = innerPadding,
                                    bio = state.editableProfile.bio,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = { newBio ->
                                        profileStateHolder.updateProfile(
                                            state.editableProfile.copy(bio = newBio)
                                        ) {
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditInterests -> EditInterestsScreen(
                                    padding = innerPadding,
                                    selectedInterests = state.editableProfile.interests,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = { interests ->
                                        profileStateHolder.updateProfile(
                                            state.editableProfile.copy(interests = interests)
                                        ) {
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditDatingIntention -> EditDatingIntentionScreen(
                                    padding = innerPadding,
                                    selectedIntention = state.editableProfile.datingIntention,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = { intention ->
                                        profileStateHolder.updateProfile(
                                            state.editableProfile.copy(datingIntention = intention)
                                        ) {
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditReligion -> EditReligionScreen(
                                    padding = innerPadding,
                                    selectedReligions = state.editableProfile.religion,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = { religion ->
                                        profileStateHolder.updateProfile(
                                            state.editableProfile.copy(religion = religion)
                                        ) {
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditTraits -> EditTraitsScreen(
                                    padding = innerPadding,
                                    selectedTraits = state.editableProfile.traits,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = { traits ->
                                        profileStateHolder.updateProfile(
                                            state.editableProfile.copy(traits = traits)
                                        ) {
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditSmoking -> EditSmokingScreen(
                                    padding = innerPadding,
                                    selectedSmoking = state.editableProfile.smoking,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = { smoking ->
                                        profileStateHolder.updateProfile(
                                            state.editableProfile.copy(smoking = smoking)
                                        ) {
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditDrinking -> EditDrinkingScreen(
                                    padding = innerPadding,
                                    selectedDrinking = state.editableProfile.drinking,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = { drinking ->
                                        profileStateHolder.updateProfile(
                                            state.editableProfile.copy(drinking = drinking)
                                        ) {
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditEducation -> EditEducationScreen(
                                    padding = innerPadding,
                                    selectedEducation = state.editableProfile.education,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = { education ->
                                        profileStateHolder.updateProfile(
                                            state.editableProfile.copy(education = education)
                                        ) {
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditJob -> EditJobScreen(
                                    padding = innerPadding,
                                    job = state.editableProfile.job,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = { job ->
                                        profileStateHolder.updateProfile(
                                            state.editableProfile.copy(job = job)
                                        ) {
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.ProfilePreview -> ProfilePreviewScreen(
                                    padding = innerPadding,
                                    profile = state.editableProfile,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                )

                                ProfileScreen.DatingPreferences -> DatingPreferencesScreen(
                                    padding = innerPadding,
                                    preferences = state.datingPreferences,
                                    onBack = { profileScreen = ProfileScreen.Hub },
                                    onSave = { preferences ->
                                        profileStateHolder.updateDatingPreferences(preferences) {
                                            profileScreen = ProfileScreen.Hub
                                        }
                                    }
                                )

                                ProfileScreen.AccountSettings -> AccountSettingsScreen(
                                    padding = innerPadding,
                                    settings = state.accountSettings,
                                    onBack = { profileScreen = ProfileScreen.Hub },
                                    onSave = { settings ->
                                        profileStateHolder.updateAccountSettings(settings) {
                                            profileScreen = ProfileScreen.Hub
                                        }
                                    },
                                    onOpenAccountDeletion = { profileScreen = ProfileScreen.AccountDeletion },
                                )

                                ProfileScreen.AppSettings -> AppSettingsScreen(
                                    padding = innerPadding,
                                    preferences = state.appPreferences,
                                    onBack = { profileScreen = ProfileScreen.Hub },
                                    onSave = { preferences ->
                                        profileStateHolder.updateAppSettings(preferences) {
                                            profileScreen = ProfileScreen.Hub
                                        }
                                    }
                                )

                                ProfileScreen.AccountDeletion -> {
                                    var deletionStatus by remember { mutableStateOf<String?>(null) }
                                    var deletionScheduledAt by remember { mutableStateOf<String?>(null) }
                                    var deletionLoading by remember { mutableStateOf(false) }
                                    var deletionError by remember { mutableStateOf<String?>(null) }
                                    val deletionScope = rememberCoroutineScope()

                                    LaunchedEffect(Unit) {
                                        try {
                                            val status = apiClient.getAccountDeletionStatus()
                                            deletionStatus = status.status
                                            deletionScheduledAt = status.scheduledAt
                                        } catch (_: Exception) { }
                                    }

                                    AccountDeletionScreen(
                                        padding = innerPadding,
                                        deletionStatus = deletionStatus,
                                        deletionScheduledAt = deletionScheduledAt,
                                        isLoading = deletionLoading,
                                        errorMessage = deletionError,
                                        onRequestDeletion = {
                                            deletionLoading = true
                                            deletionError = null
                                            deletionScope.launch {
                                                try {
                                                    val result = apiClient.requestAccountDeletion()
                                                    deletionStatus = result.status
                                                    deletionScheduledAt = result.deletionScheduledAt
                                                    tokenStorage.clearTokens()
                                                } catch (e: Exception) {
                                                    deletionError = e.message ?: "Failed to request deletion"
                                                } finally {
                                                    deletionLoading = false
                                                }
                                            }
                                        },
                                        onCancelDeletion = {
                                            deletionLoading = true
                                            deletionError = null
                                            deletionScope.launch {
                                                try {
                                                    apiClient.cancelAccountDeletion()
                                                    deletionStatus = null
                                                    deletionScheduledAt = null
                                                } catch (e: Exception) {
                                                    deletionError = e.message ?: "Failed to cancel deletion"
                                                } finally {
                                                    deletionLoading = false
                                                }
                                            }
                                        },
                                        onRequestExport = {
                                            deletionLoading = true
                                            deletionError = null
                                            deletionScope.launch {
                                                try {
                                                    apiClient.requestDataExport()
                                                    deletionError = null
                                                } catch (e: Exception) {
                                                    deletionError = e.message ?: "Export failed"
                                                } finally {
                                                    deletionLoading = false
                                                }
                                            }
                                        },
                                        onClearError = { deletionError = null },
                                        onBack = { profileScreen = ProfileScreen.AccountSettings },
                                    )
                                }
                            }
                        }
                    }
                }

                // Profile drawer overlay
                if (drawerProfile != null) {
                    ProfileDrawer(
                        profile = drawerProfile,
                        reaction = roundStateHolder.reactions[drawerProfile.id],
                        acceptanceLocked = roundStateHolder.reactions[drawerProfile.id] != RoundReaction.Accepted && acceptedProfiles.size >= 5,
                        onDismiss = { selectedDrawerProfileId = null },
                        onAccept = {
                            roundStateHolder.updateReaction(drawerProfile.id, accepted = true)
                            if (roundScreen == RoundScreen.Active) {
                                selectedDrawerProfileId = null
                            }
                        },
                        onDecline = {
                            roundStateHolder.updateReaction(drawerProfile.id, accepted = false)
                            if (roundScreen == RoundScreen.Active) {
                                selectedDrawerProfileId = null
                            }
                        }
                    )
                }
            }
        }
    }
}
