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
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import com.ayuni.app.domain.SuggestionProfile
import com.ayuni.app.data.api.AyuniApiClient
import com.ayuni.app.ui.AppRoute
import com.ayuni.app.ui.AppScreenState
import com.ayuni.app.ui.design.AyuniTheme
import com.ayuni.app.ui.navigation.AyuniBottomBar
import com.ayuni.app.ui.screens.round.*
import com.ayuni.app.ui.screens.dates.DatesScreen
import com.ayuni.app.ui.screens.notifications.NotificationsScreen
import com.ayuni.app.ui.screens.profile.ProfileHubScreen
import com.ayuni.app.ui.screens.profile.*
import com.ayuni.app.ui.screens.profile.ProfileScreen
import kotlinx.coroutines.launch

@Composable
fun AyuniApp() {
    val apiClient = remember { AyuniApiClient() }
    val coroutineScope = rememberCoroutineScope()
    var route by remember { mutableStateOf(AppRoute.Round) }
    var roundScreen by remember { mutableStateOf(RoundScreen.Active) }
    var profileScreen by remember { mutableStateOf(ProfileScreen.Hub) }
    var selectedDrawerProfileId by remember { mutableStateOf<String?>(null) }
    var state by remember { mutableStateOf(AppScreenState.demo()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val reactions = remember { mutableStateMapOf<String, RoundReaction>() }

    fun applyBootstrap(payload: com.ayuni.app.data.api.BootstrapPayload) {
        state = payload.toScreenState()
        reactions.clear()
        reactions.putAll(
            payload.reactions.mapValues { (_, value) ->
                if (value == "Accepted") RoundReaction.Accepted else RoundReaction.Declined
            }
        )
    }

    LaunchedEffect(Unit) {
        runCatching { apiClient.getBootstrap() }
            .onSuccess {
                applyBootstrap(it)
                isLoading = false
            }
            .onFailure {
                errorMessage = it.message ?: "Could not load Ayuni right now."
                isLoading = false
            }
    }

    val acceptedProfiles = state.suggestions.filter { reactions[it.id] == RoundReaction.Accepted }
    val declinedProfiles = state.suggestions.filter { reactions[it.id] == RoundReaction.Declined }
    val activeProfiles = state.suggestions.filter { reactions[it.id] == null }
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
                                    onBack = { roundScreen = RoundScreen.Active },
                                    onProfileSelected = { selectedDrawerProfileId = it.id }
                                )
                            }

                            AppRoute.Dates -> DatesScreen(
                                padding = innerPadding,
                                bookings = state.bookings,
                                onOpenInbox = { route = AppRoute.Notifications }
                            )
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
                                )

                                ProfileScreen.EditProfile -> EditProfileScreen(
                                    padding = innerPadding,
                                    profile = state.editableProfile,
                                    onBack = { profileScreen = ProfileScreen.Hub },
                                    onPreview = { profileScreen = ProfileScreen.ProfilePreview },
                                    onNavigateToEdit = { profileScreen = it }
                                )

                                ProfileScreen.EditBio -> EditBioScreen(
                                    padding = innerPadding,
                                    bio = state.editableProfile.bio,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateProfile(state.editableProfile.copy(bio = it)))
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditInterests -> EditInterestsScreen(
                                    padding = innerPadding,
                                    selectedInterests = state.editableProfile.interests,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateProfile(state.editableProfile.copy(interests = it)))
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditDatingIntention -> EditDatingIntentionScreen(
                                    padding = innerPadding,
                                    selectedIntention = state.editableProfile.datingIntention,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateProfile(state.editableProfile.copy(datingIntention = it)))
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditReligion -> EditReligionScreen(
                                    padding = innerPadding,
                                    selectedReligions = state.editableProfile.religion,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateProfile(state.editableProfile.copy(religion = it)))
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditTraits -> EditTraitsScreen(
                                    padding = innerPadding,
                                    selectedTraits = state.editableProfile.traits,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateProfile(state.editableProfile.copy(traits = it)))
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditSmoking -> EditSmokingScreen(
                                    padding = innerPadding,
                                    selectedSmoking = state.editableProfile.smoking,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateProfile(state.editableProfile.copy(smoking = it)))
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditDrinking -> EditDrinkingScreen(
                                    padding = innerPadding,
                                    selectedDrinking = state.editableProfile.drinking,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateProfile(state.editableProfile.copy(drinking = it)))
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditEducation -> EditEducationScreen(
                                    padding = innerPadding,
                                    selectedEducation = state.editableProfile.education,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateProfile(state.editableProfile.copy(education = it)))
                                            profileScreen = ProfileScreen.EditProfile
                                        }
                                    }
                                )

                                ProfileScreen.EditJob -> EditJobScreen(
                                    padding = innerPadding,
                                    job = state.editableProfile.job,
                                    onBack = { profileScreen = ProfileScreen.EditProfile },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateProfile(state.editableProfile.copy(job = it)))
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
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateDatingPreferences(it))
                                            profileScreen = ProfileScreen.Hub
                                        }
                                    }
                                )

                                ProfileScreen.AccountSettings -> AccountSettingsScreen(
                                    padding = innerPadding,
                                    settings = state.accountSettings,
                                    onBack = { profileScreen = ProfileScreen.Hub },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateAccountSettings(it))
                                            profileScreen = ProfileScreen.Hub
                                        }
                                    }
                                )

                                ProfileScreen.AppSettings -> AppSettingsScreen(
                                    padding = innerPadding,
                                    preferences = state.appPreferences,
                                    onBack = { profileScreen = ProfileScreen.Hub },
                                    onSave = {
                                        coroutineScope.launch {
                                            applyBootstrap(apiClient.updateAppSettings(it))
                                            profileScreen = ProfileScreen.Hub
                                        }
                                    }
                                )
                            }
                        }
                    }
                }

                if (drawerProfile != null) {
                    ProfileDrawer(
                        profile = drawerProfile,
                        reaction = reactions[drawerProfile.id],
                        acceptanceLocked = reactions[drawerProfile.id] != RoundReaction.Accepted && acceptedProfiles.size >= 5,
                        onDismiss = { selectedDrawerProfileId = null },
                        onAccept = {
                            coroutineScope.launch {
                                applyBootstrap(apiClient.updateReaction(drawerProfile.id, accepted = true))
                                if (roundScreen == RoundScreen.Active) {
                                    selectedDrawerProfileId = null
                                }
                            }
                        },
                        onDecline = {
                            coroutineScope.launch {
                                applyBootstrap(apiClient.updateReaction(drawerProfile.id, accepted = false))
                                if (roundScreen == RoundScreen.Active) {
                                    selectedDrawerProfileId = null
                                }
                            }
                        }
                    )
                }
            }
        }
    }
}
