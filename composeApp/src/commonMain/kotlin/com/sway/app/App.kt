package com.sway.app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.sway.app.domain.SuggestionProfile
import com.sway.app.ui.AppRoute
import com.sway.app.ui.AppScreenState
import com.sway.app.ui.design.SwayTheme
import com.sway.app.ui.navigation.SwayBottomBar
import com.sway.app.ui.screens.round.*
import com.sway.app.ui.screens.dates.DatesScreen
import com.sway.app.ui.screens.notifications.NotificationsScreen
import com.sway.app.ui.screens.profile.ProfileHubScreen
import com.sway.app.ui.screens.profile.*
import com.sway.app.ui.screens.profile.ProfileScreen

@Composable
fun SwayApp() {
    var route by remember { mutableStateOf(AppRoute.Round) }
    var roundScreen by remember { mutableStateOf(RoundScreen.Active) }
    var profileScreen by remember { mutableStateOf(ProfileScreen.Hub) }
    var selectedDrawerProfileId by remember { mutableStateOf<String?>(null) }
    val state = remember { AppScreenState.demo() }
    val reactions = remember(state.suggestions) { mutableStateMapOf<String, RoundReaction>() }

    val acceptedProfiles = state.suggestions.filter { reactions[it.id] == RoundReaction.Accepted }
    val declinedProfiles = state.suggestions.filter { reactions[it.id] == RoundReaction.Declined }
    val activeProfiles = state.suggestions.filter { reactions[it.id] == null }
    val drawerProfile = state.suggestions.firstOrNull { it.id == selectedDrawerProfileId }

    fun updateReaction(profile: SuggestionProfile, reaction: RoundReaction) {
        val alreadyAccepted = reactions[profile.id] == RoundReaction.Accepted
        val blockedByLimit = reaction == RoundReaction.Accepted && !alreadyAccepted && acceptedProfiles.size >= 5
        if (!blockedByLimit) {
            reactions[profile.id] = reaction
        }
    }

    var editableProfile by remember { mutableStateOf(state.editableProfile) }
    var datingPreferences by remember { mutableStateOf(state.datingPreferences) }
    var accountSettings by remember { mutableStateOf(state.accountSettings) }
    var appPreferences by remember { mutableStateOf(state.appPreferences) }

    SwayTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Box(modifier = Modifier.fillMaxSize()) {
                Scaffold(
                    containerColor = MaterialTheme.colorScheme.background,
                    bottomBar = {
                        SwayBottomBar(currentRoute = route, onRouteSelected = { route = it })
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
                                profile = editableProfile,
                                onBack = { profileScreen = ProfileScreen.Hub },
                                onPreview = { profileScreen = ProfileScreen.ProfilePreview },
                                onNavigateToEdit = { profileScreen = it }
                            )

                            ProfileScreen.EditBio -> EditBioScreen(
                                padding = innerPadding,
                                bio = editableProfile.bio,
                                onBack = { profileScreen = ProfileScreen.EditProfile },
                                onSave = {
                                    editableProfile = editableProfile.copy(bio = it)
                                    profileScreen = ProfileScreen.EditProfile
                                }
                            )

                            ProfileScreen.EditInterests -> EditInterestsScreen(
                                padding = innerPadding,
                                selectedInterests = editableProfile.interests,
                                onBack = { profileScreen = ProfileScreen.EditProfile },
                                onSave = {
                                    editableProfile = editableProfile.copy(interests = it)
                                    profileScreen = ProfileScreen.EditProfile
                                }
                            )

                            ProfileScreen.EditDatingIntention -> EditDatingIntentionScreen(
                                padding = innerPadding,
                                selectedIntention = editableProfile.datingIntention,
                                onBack = { profileScreen = ProfileScreen.EditProfile },
                                onSave = {
                                    editableProfile = editableProfile.copy(datingIntention = it)
                                    profileScreen = ProfileScreen.EditProfile
                                }
                            )

                            ProfileScreen.EditReligion -> EditReligionScreen(
                                padding = innerPadding,
                                selectedReligions = editableProfile.religion,
                                onBack = { profileScreen = ProfileScreen.EditProfile },
                                onSave = {
                                    editableProfile = editableProfile.copy(religion = it)
                                    profileScreen = ProfileScreen.EditProfile
                                }
                            )

                            ProfileScreen.EditTraits -> EditTraitsScreen(
                                padding = innerPadding,
                                selectedTraits = editableProfile.traits,
                                onBack = { profileScreen = ProfileScreen.EditProfile },
                                onSave = {
                                    editableProfile = editableProfile.copy(traits = it)
                                    profileScreen = ProfileScreen.EditProfile
                                }
                            )

                            ProfileScreen.EditSmoking -> EditSmokingScreen(
                                padding = innerPadding,
                                selectedSmoking = editableProfile.smoking,
                                onBack = { profileScreen = ProfileScreen.EditProfile },
                                onSave = {
                                    editableProfile = editableProfile.copy(smoking = it)
                                    profileScreen = ProfileScreen.EditProfile
                                }
                            )

                            ProfileScreen.EditDrinking -> EditDrinkingScreen(
                                padding = innerPadding,
                                selectedDrinking = editableProfile.drinking,
                                onBack = { profileScreen = ProfileScreen.EditProfile },
                                onSave = {
                                    editableProfile = editableProfile.copy(drinking = it)
                                    profileScreen = ProfileScreen.EditProfile
                                }
                            )

                            ProfileScreen.EditEducation -> EditEducationScreen(
                                padding = innerPadding,
                                selectedEducation = editableProfile.education,
                                onBack = { profileScreen = ProfileScreen.EditProfile },
                                onSave = {
                                    editableProfile = editableProfile.copy(education = it)
                                    profileScreen = ProfileScreen.EditProfile
                                }
                            )

                            ProfileScreen.EditJob -> EditJobScreen(
                                padding = innerPadding,
                                job = editableProfile.job,
                                onBack = { profileScreen = ProfileScreen.EditProfile },
                                onSave = {
                                    editableProfile = editableProfile.copy(job = it)
                                    profileScreen = ProfileScreen.EditProfile
                                }
                            )

                            ProfileScreen.ProfilePreview -> ProfilePreviewScreen(
                                padding = innerPadding,
                                profile = editableProfile,
                                onBack = { profileScreen = ProfileScreen.EditProfile },
                            )

                            ProfileScreen.DatingPreferences -> DatingPreferencesScreen(
                                padding = innerPadding,
                                preferences = datingPreferences,
                                onBack = { profileScreen = ProfileScreen.Hub },
                                onSave = { datingPreferences = it }
                            )

                            ProfileScreen.AccountSettings -> AccountSettingsScreen(
                                padding = innerPadding,
                                settings = accountSettings,
                                onBack = { profileScreen = ProfileScreen.Hub },
                                onSave = { accountSettings = it }
                            )

                            ProfileScreen.AppSettings -> AppSettingsScreen(
                                padding = innerPadding,
                                preferences = appPreferences,
                                onBack = { profileScreen = ProfileScreen.Hub },
                                onSave = { appPreferences = it }
                            )
                        }
                    }
                }

                if (drawerProfile != null) {
                    ProfileDrawer(
                        profile = drawerProfile,
                        reaction = reactions[drawerProfile.id],
                        acceptanceLocked = reactions[drawerProfile.id] != RoundReaction.Accepted && acceptedProfiles.size >= 5,
                        onDismiss = { selectedDrawerProfileId = null },
                        onAccept = { updateReaction(drawerProfile, RoundReaction.Accepted) },
                        onDecline = { updateReaction(drawerProfile, RoundReaction.Declined) }
                    )
                }
            }
        }
    }
}
