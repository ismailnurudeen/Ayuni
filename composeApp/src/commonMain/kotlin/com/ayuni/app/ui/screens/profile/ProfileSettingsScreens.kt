package com.ayuni.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.ayuni.app.data.api.ProfileMedia
import com.ayuni.app.domain.*
import com.ayuni.app.ui.components.ActionButton
import com.ayuni.app.ui.components.DetailPane
import com.ayuni.app.ui.components.SecondaryHeader
import com.ayuni.app.ui.design.BrandColors
import com.ayuni.app.platform.rememberImagePicker

@Composable
fun EditProfileScreen(
    padding: PaddingValues,
    profile: EditableProfile,
    media: List<ProfileMedia>,
    isLoading: Boolean,
    errorMessage: String?,
    onBack: () -> Unit,
    onPreview: () -> Unit,
    onNavigateToEdit: (ProfileScreen) -> Unit,
    onUploadMedia: (String) -> Unit = {},
    onDeleteMedia: (String) -> Unit = {},
    onReorderMedia: (List<String>) -> Unit = {},
    onClearError: () -> Unit = {},
) {
    var selectedTab by remember { mutableStateOf(0) }
    var showDeleteConfirmation by remember { mutableStateOf<String?>(null) }

    val filledSlots = media.size
    val canUpload = filledSlots < 6
    
    val imagePicker = rememberImagePicker { dataUrl ->
        onUploadMedia(dataUrl)
    }

    val snackbarHostState = remember { SnackbarHostState() }

    // Show error as snackbar
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            snackbarHostState.showSnackbar(
                message = errorMessage,
                duration = SnackbarDuration.Short
            )
            onClearError()
        }
    }

    // Delete confirmation dialog
    if (showDeleteConfirmation != null) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmation = null },
            title = { Text("Delete photo?") },
            text = { Text("This photo will be permanently removed from your profile.") },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteConfirmation?.let { onDeleteMedia(it) }
                    showDeleteConfirmation = null
                }) {
                    Text("Delete", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmation = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(BrandColors.Shell)
                .padding(padding)
        ) {
            SecondaryHeader(
                title = "Edit profile",
                onBack = onBack,
            )

            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = BrandColors.Shell,
                contentColor = BrandColors.Ink,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = BrandColors.Ink
                    )
                },
                divider = {}
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Edit", style = MaterialTheme.typography.titleSmall) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { onPreview() },
                    text = { Text("View", style = MaterialTheme.typography.titleSmall) }
                )
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                item {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Photos & Videos", style = MaterialTheme.typography.titleMedium, color = BrandColors.Ink)
                            Text("$filledSlots/6", style = MaterialTheme.typography.bodySmall, color = BrandColors.Muted)
                        }
                        Spacer(Modifier.height(12.dp))

                        // Media grid with reorder buttons
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            for (rowIndex in 0 until 2) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    for (colIndex in 0 until 3) {
                                        val index = rowIndex * 3 + colIndex
                                        val mediaItem = media.getOrNull(index)

                                        Box(modifier = Modifier.weight(1f)) {
                                            if (mediaItem != null) {
                                                PhotoSlot(
                                                    imageUrl = mediaItem.storageUrl,
                                                    isLoading = false,
                                                    onDelete = { showDeleteConfirmation = mediaItem.id },
                                                    onMoveLeft = if (index > 0) {
                                                        {
                                                            val ids = media.map { it.id }.toMutableList()
                                                            val temp = ids[index]
                                                            ids[index] = ids[index - 1]
                                                            ids[index - 1] = temp
                                                            onReorderMedia(ids)
                                                        }
                                                    } else null,
                                                    onMoveRight = if (index < media.size - 1) {
                                                        {
                                                            val ids = media.map { it.id }.toMutableList()
                                                            val temp = ids[index]
                                                            ids[index] = ids[index + 1]
                                                            ids[index + 1] = temp
                                                            onReorderMedia(ids)
                                                        }
                                                    } else null,
                                                )
                                            } else if (index == filledSlots && canUpload) {
                                                // Upload slot — only show one, right after last filled
                                                PhotoSlotEmpty(
                                                    onUpload = if (!isLoading) imagePicker else null,
                                                    isLoading = isLoading,
                                                )
                                            } else {
                                                // Empty placeholder
                                                PhotoSlotPlaceholder()
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Column {
                        Text("My personality", style = MaterialTheme.typography.titleMedium, color = BrandColors.Ink)
                        Spacer(Modifier.height(12.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(24.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column {
                                NavigationRow("Hobbies & Interests", profile.interests.joinToString(), Icons.Default.Edit) { onNavigateToEdit(ProfileScreen.EditInterests) }
                                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = BrandColors.PhotoGlow.copy(alpha = 0.5f))
                                NavigationRow("Traits", profile.traits.joinToString(), Icons.Default.Edit) { onNavigateToEdit(ProfileScreen.EditTraits) }
                                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = BrandColors.PhotoGlow.copy(alpha = 0.5f))
                                NavigationRow("Bio", profile.bio, Icons.Default.Edit) { onNavigateToEdit(ProfileScreen.EditBio) }
                            }
                        }
                    }
                }

                item {
                    Column {
                        Text("My habits", style = MaterialTheme.typography.titleMedium, color = BrandColors.Ink)
                        Spacer(Modifier.height(12.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(24.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column {
                                NavigationRow("Smoking", profile.smoking, Icons.Default.Edit) { onNavigateToEdit(ProfileScreen.EditSmoking) }
                                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = BrandColors.PhotoGlow.copy(alpha = 0.5f))
                                NavigationRow("Drinking", profile.drinking, Icons.Default.Edit) { onNavigateToEdit(ProfileScreen.EditDrinking) }
                            }
                        }
                    }
                }
            }
        }

        // Snackbar host for error messages
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp)
        )
    }
}

/**
 * Photo slot displaying an uploaded image with delete and reorder controls.
 */
@Composable
private fun PhotoSlot(
    imageUrl: String,
    isLoading: Boolean,
    onDelete: (() -> Unit)? = null,
    onMoveLeft: (() -> Unit)? = null,
    onMoveRight: (() -> Unit)? = null,
) {
    Box(
        modifier = Modifier
            .aspectRatio(0.8f)
            .clip(RoundedCornerShape(12.dp))
            .background(BrandColors.PhotoGlow),
        contentAlignment = Alignment.Center
    ) {
        // Image indicator — show colored box with image icon to represent uploaded photo
        Box(
            modifier = Modifier.fillMaxSize().background(Color(0xFFE8D5C4)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.Person,
                contentDescription = "Photo",
                tint = BrandColors.Ink.copy(alpha = 0.5f),
                modifier = Modifier.size(32.dp)
            )
        }

        // Reorder buttons at bottom
        if (onMoveLeft != null || onMoveRight != null) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                if (onMoveLeft != null) {
                    Box(
                        modifier = Modifier
                            .size(22.dp)
                            .clip(RoundedCornerShape(11.dp))
                            .background(Color.Black.copy(alpha = 0.5f))
                            .clickable { onMoveLeft() },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = "Move left",
                            tint = Color.White,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
                if (onMoveRight != null) {
                    Box(
                        modifier = Modifier
                            .size(22.dp)
                            .clip(RoundedCornerShape(11.dp))
                            .background(Color.Black.copy(alpha = 0.5f))
                            .clickable { onMoveRight() },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.ArrowForward,
                            contentDescription = "Move right",
                            tint = Color.White,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }
        }

        // Delete button
        if (onDelete != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(6.dp)
                    .size(24.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.Black.copy(alpha = 0.6f))
                    .clickable { onDelete() },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "Delete photo",
                    tint = Color.White,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}

/**
 * Empty slot that allows uploading a new photo.
 */
@Composable
private fun PhotoSlotEmpty(
    onUpload: (() -> Unit)?,
    isLoading: Boolean,
) {
    Box(
        modifier = Modifier
            .aspectRatio(0.8f)
            .clip(RoundedCornerShape(12.dp))
            .background(BrandColors.PhotoGlow)
            .border(2.dp, BrandColors.Ink.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
            .then(
                if (onUpload != null && !isLoading) {
                    Modifier.clickable { onUpload() }
                } else Modifier
            ),
        contentAlignment = Alignment.Center
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(28.dp),
                color = BrandColors.Ink,
                strokeWidth = 2.dp
            )
        } else {
            Icon(
                Icons.Default.Add,
                contentDescription = "Add photo",
                tint = BrandColors.Ink,
                modifier = Modifier.size(32.dp)
            )
        }
    }
}

/**
 * Placeholder for unused slots beyond the upload slot.
 */
@Composable
private fun PhotoSlotPlaceholder() {
    Box(
        modifier = Modifier
            .aspectRatio(0.8f)
            .clip(RoundedCornerShape(12.dp))
            .background(BrandColors.PhotoGlow.copy(alpha = 0.4f)),
    )
}

@Composable
private fun NavigationRow(title: String, subtitle: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(BrandColors.PhotoGlow),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = BrandColors.Ink, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall, color = BrandColors.Ink)
            Text(
                subtitle.ifEmpty { "Not specified" },
                style = MaterialTheme.typography.bodySmall,
                color = BrandColors.Muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Icon(Icons.Default.ArrowForward, contentDescription = null, tint = BrandColors.Muted, modifier = Modifier.size(16.dp))
    }
}

@Composable
fun EditBioScreen(
    padding: PaddingValues,
    bio: String,
    onBack: () -> Unit,
    onSave: (String) -> Unit
) {
    var editedBio by remember { mutableStateOf(bio) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding)
            .padding(horizontal = 20.dp)
    ) {
        SecondaryHeader(title = "Bio", onBack = onBack)
        Text(
            "Tell your future matches a bit about yourself",
            style = MaterialTheme.typography.bodyMedium,
            color = BrandColors.Muted
        )
        Spacer(Modifier.height(24.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(Color.White)
                .padding(16.dp)
        ) {
            TextField(
                value = editedBio,
                onValueChange = { if (it.length <= 350) editedBio = it },
                modifier = Modifier.fillMaxSize(),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                placeholder = { Text("Write something...", color = BrandColors.Muted) }
            )
            Text(
                "${editedBio.length}/350",
                modifier = Modifier.align(Alignment.BottomEnd),
                style = MaterialTheme.typography.bodySmall,
                color = BrandColors.Muted
            )
        }

        Spacer(Modifier.weight(1f))

        ActionButton(
            label = "Save",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = true,
            onClick = { onSave(editedBio); onBack() }
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun EditInterestsScreen(
    padding: PaddingValues,
    selectedInterests: List<String>,
    onBack: () -> Unit,
    onSave: (List<String>) -> Unit
) {
    var editedInterests by remember { mutableStateOf(selectedInterests) }
    val allInterests = listOf("Festivals", "Party", "Thrifting", "Theatre", "Philosophy", "AI", "Animals", "Backpacking", "Baking", "Beach", "Camping", "City trips", "Concerts", "Cooking", "Cosplay", "Dining out")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding)
            .padding(horizontal = 20.dp)
    ) {
        SecondaryHeader(title = "Hobbies & Interests", onBack = onBack)
        Text(
            "Select 5-10 tags that best fit you",
            style = MaterialTheme.typography.bodyMedium,
            color = BrandColors.Muted
        )
        Spacer(Modifier.height(24.dp))

        TextField(
            value = "",
            onValueChange = {},
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)),
            placeholder = { Text("Search") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            colors = TextFieldDefaults.colors(
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent
            )
        )

        Spacer(Modifier.height(24.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("My selection", style = MaterialTheme.typography.titleSmall)
            Text("${editedInterests.size}/10", style = MaterialTheme.typography.bodySmall, color = BrandColors.Muted)
        }
        Spacer(Modifier.height(12.dp))

        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(editedInterests) { interest ->
                InterestChip(interest, isSelected = true) {
                    editedInterests = editedInterests - interest
                }
            }
        }

        Spacer(Modifier.height(24.dp))
        Text("Activities", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(12.dp))

        Box(modifier = Modifier.weight(1f)) {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                allInterests.forEach { interest ->
                    val isSelected = editedInterests.contains(interest)
                    InterestChip(interest, isSelected = isSelected) {
                        if (isSelected) editedInterests = editedInterests - interest
                        else if (editedInterests.size < 10) editedInterests = editedInterests + interest
                    }
                }
            }
        }

        ActionButton(
            label = "Save",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = editedInterests.size >= 5,
            onClick = { onSave(editedInterests); onBack() }
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun EditDatingIntentionScreen(
    padding: PaddingValues,
    selectedIntention: String,
    onBack: () -> Unit,
    onSave: (String) -> Unit
) {
    var editedIntention by remember { mutableStateOf(selectedIntention) }
    val intentions = listOf("Serious dating", "Casual dating", "Still figuring it out")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding)
            .padding(horizontal = 20.dp)
    ) {
        SecondaryHeader(title = "Dating intention", onBack = onBack)
        Text(
            "Knowing your intentions helps our app match you better.",
            style = MaterialTheme.typography.bodyMedium,
            color = BrandColors.Muted
        )
        Spacer(Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column {
                intentions.forEachIndexed { index, intention ->
                    SelectionRow(
                        label = intention,
                        selected = editedIntention == intention,
                        onClick = { editedIntention = intention }
                    )
                    if (index < intentions.size - 1) {
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = BrandColors.PhotoGlow.copy(alpha = 0.5f))
                    }
                }
            }
        }

        Spacer(Modifier.weight(1f))

        ActionButton(
            label = "Save",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = true,
            onClick = { onSave(editedIntention); onBack() }
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun EditReligionScreen(
    padding: PaddingValues,
    selectedReligions: List<String>,
    onBack: () -> Unit,
    onSave: (List<String>) -> Unit
) {
    var editedReligions by remember { mutableStateOf(selectedReligions) }
    var agreedToSensitive by remember { mutableStateOf(false) }
    val religions = listOf("Agnostic", "Atheist", "Bahai", "Buddhist", "Catholic", "Christian", "Hindu", "Jain", "Jewish", "Muslim")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding)
            .padding(horizontal = 20.dp)
    ) {
        SecondaryHeader(title = "Religion", onBack = onBack)
        Text(
            "If you want, you can share your religion with other daters.",
            style = MaterialTheme.typography.bodyMedium,
            color = BrandColors.Muted
        )
        Spacer(Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth().weight(1f),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            LazyColumn {
                items(religions) { religion ->
                    val isSelected = editedReligions.contains(religion)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                if (isSelected) editedReligions = editedReligions - religion
                                else editedReligions = editedReligions + religion
                            }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (isSelected) BrandColors.RichCard else Color.Transparent)
                                .border(2.dp, if (isSelected) BrandColors.RichCard else BrandColors.Ink, RoundedCornerShape(6.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isSelected) Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        }
                        Spacer(Modifier.width(16.dp))
                        Text(religion, style = MaterialTheme.typography.titleSmall, color = BrandColors.Ink)
                    }
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = BrandColors.PhotoGlow.copy(alpha = 0.5f))
                }
            }
        }

        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(
                checked = agreedToSensitive,
                onCheckedChange = { agreedToSensitive = it },
                colors = CheckboxDefaults.colors(checkedColor = BrandColors.RichCard)
            )
            Text(
                "I agree that my profile will be published on the app.",
                style = MaterialTheme.typography.bodySmall,
                color = BrandColors.Ink
            )
        }
        Spacer(Modifier.height(16.dp))

        ActionButton(
            label = "Save",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = agreedToSensitive,
            onClick = { onSave(editedReligions); onBack() }
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun EditTraitsScreen(
    padding: PaddingValues,
    selectedTraits: List<String>,
    onBack: () -> Unit,
    onSave: (List<String>) -> Unit
) {
    var editedTraits by remember { mutableStateOf(selectedTraits) }
    val allTraits = listOf("Intentional", "Warm", "Playful", "Curious", "Direct", "Empathetic", "Driven", "Spontaneous", "Funny", "Calm", "Bookish", "Kind")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding)
            .padding(horizontal = 20.dp)
    ) {
        SecondaryHeader(title = "Traits", onBack = onBack)
        Text(
            "Select tags that best describe your personality",
            style = MaterialTheme.typography.bodyMedium,
            color = BrandColors.Muted
        )
        Spacer(Modifier.height(24.dp))

        Box(modifier = Modifier.weight(1f)) {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                allTraits.forEach { trait ->
                    val isSelected = editedTraits.contains(trait)
                    InterestChip(trait, isSelected = isSelected) {
                        if (isSelected) editedTraits = editedTraits - trait
                        else editedTraits = editedTraits + trait
                    }
                }
            }
        }

        ActionButton(
            label = "Save",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = true,
            onClick = { onSave(editedTraits); onBack() }
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun EditSmokingScreen(
    padding: PaddingValues,
    selectedSmoking: String,
    onBack: () -> Unit,
    onSave: (String) -> Unit
) {
    var editedSmoking by remember { mutableStateOf(selectedSmoking) }
    val options = listOf("Never", "Socially", "Regularly", "Trying to quit")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding)
            .padding(horizontal = 20.dp)
    ) {
        SecondaryHeader(title = "Smoking", onBack = onBack)
        Spacer(Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column {
                options.forEachIndexed { index, option ->
                    SelectionRow(
                        label = option,
                        selected = editedSmoking == option,
                        onClick = { editedSmoking = option }
                    )
                    if (index < options.size - 1) {
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = BrandColors.PhotoGlow.copy(alpha = 0.5f))
                    }
                }
            }
        }

        Spacer(Modifier.weight(1f))

        ActionButton(
            label = "Save",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = true,
            onClick = { onSave(editedSmoking); onBack() }
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun EditDrinkingScreen(
    padding: PaddingValues,
    selectedDrinking: String,
    onBack: () -> Unit,
    onSave: (String) -> Unit
) {
    var editedDrinking by remember { mutableStateOf(selectedDrinking) }
    val options = listOf("Never", "Socially", "Regularly", "Sober")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding)
            .padding(horizontal = 20.dp)
    ) {
        SecondaryHeader(title = "Drinking", onBack = onBack)
        Spacer(Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column {
                options.forEachIndexed { index, option ->
                    SelectionRow(
                        label = option,
                        selected = editedDrinking == option,
                        onClick = { editedDrinking = option }
                    )
                    if (index < options.size - 1) {
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = BrandColors.PhotoGlow.copy(alpha = 0.5f))
                    }
                }
            }
        }

        Spacer(Modifier.weight(1f))

        ActionButton(
            label = "Save",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = true,
            onClick = { onSave(editedDrinking); onBack() }
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun EditEducationScreen(
    padding: PaddingValues,
    selectedEducation: String,
    onBack: () -> Unit,
    onSave: (String) -> Unit
) {
    var editedEducation by remember { mutableStateOf(selectedEducation) }
    val options = listOf("High school", "Vocational school", "In college", "Undergraduate degree", "In grad school", "Graduate degree")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding)
            .padding(horizontal = 20.dp)
    ) {
        SecondaryHeader(title = "Education", onBack = onBack)
        Spacer(Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            LazyColumn {
                itemsIndexed(options) { index, option ->
                    SelectionRow(
                        label = option,
                        selected = editedEducation == option,
                        onClick = { editedEducation = option }
                    )
                    if (index < options.size - 1) {
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = BrandColors.PhotoGlow.copy(alpha = 0.5f))
                    }
                }
            }
        }

        Spacer(Modifier.weight(1f))

        ActionButton(
            label = "Save",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = true,
            onClick = { onSave(editedEducation); onBack() }
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun EditJobScreen(
    padding: PaddingValues,
    job: String,
    onBack: () -> Unit,
    onSave: (String) -> Unit
) {
    var editedJob by remember { mutableStateOf(job) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding)
            .padding(horizontal = 20.dp)
    ) {
        SecondaryHeader(title = "Job title", onBack = onBack)
        Text(
            "What do you do for a living?",
            style = MaterialTheme.typography.bodyMedium,
            color = BrandColors.Muted
        )
        Spacer(Modifier.height(24.dp))

        TextField(
            value = editedJob,
            onValueChange = { editedJob = it },
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)),
            placeholder = { Text("Job title", color = BrandColors.Muted) },
            colors = TextFieldDefaults.colors(
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent
            )
        )

        Spacer(Modifier.weight(1f))

        ActionButton(
            label = "Save",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = true,
            onClick = { onSave(editedJob); onBack() }
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun ProfilePreviewScreen(
    padding: PaddingValues,
    profile: EditableProfile,
    onBack: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            SecondaryHeader(
                title = "Preview profile",
                subtitle = "This is the current public-facing version of your profile.",
                onBack = onBack,
            )
        }
        item {
            DetailPane("Profile preview", fillWidth = true) {
                Text(profile.bio, style = MaterialTheme.typography.bodyMedium, color = BrandColors.Muted)
            }
        }
    }
}

@Composable
fun DatingPreferencesScreen(
    padding: PaddingValues,
    preferences: DatingPreferences,
    onBack: () -> Unit,
    onSave: (DatingPreferences) -> Unit,
) {
    var editedPreferences by remember { mutableStateOf(preferences) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            SecondaryHeader(
                title = "Dating preferences",
                onBack = { onSave(editedPreferences); onBack() },
            )
        }
        item {
            DetailPane("Discovery Settings", fillWidth = true) {
                var globalSearch by remember { mutableStateOf(false) }
                ToggleRow("Global discovery", "Show people outside your cities if you run out.", globalSearch) { globalSearch = it }
            }
        }
    }
}

@Composable
fun AccountSettingsScreen(
    padding: PaddingValues,
    settings: AccountSettings,
    onBack: () -> Unit,
    onSave: (AccountSettings) -> Unit,
    onOpenAccountDeletion: () -> Unit = {},
) {
    var editedSettings by remember { mutableStateOf(settings) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            SecondaryHeader(
                title = "Account settings",
                onBack = { onSave(editedSettings); onBack() },
            )
        }
        item {
            DetailPane("Privacy", fillWidth = true) {
                var incognito by remember { mutableStateOf(false) }
                ToggleRow("Incognito Mode", "Only people you like can see you.", incognito) { incognito = it }
            }
        }
        item {
            DetailPane("Account actions", fillWidth = true) {
                Text("Sign out", style = MaterialTheme.typography.titleMedium, color = BrandColors.Ink, modifier = Modifier.clickable { })
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = BrandColors.PhotoGlow)
                Text("Delete account", style = MaterialTheme.typography.titleMedium, color = BrandColors.RichCard, modifier = Modifier.clickable { onOpenAccountDeletion() })
            }
        }
    }
}

@Composable
fun AppSettingsScreen(
    padding: PaddingValues,
    preferences: AppPreferences,
    onBack: () -> Unit,
    onSave: (AppPreferences) -> Unit,
) {
    var editedPreferences by remember { mutableStateOf(preferences) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            SecondaryHeader(
                title = "App settings",
                onBack = { onSave(editedPreferences); onBack() },
            )
        }
        item {
            DetailPane("Notifications", fillWidth = true) {
                var pushEnabled by remember { mutableStateOf(true) }
                ToggleRow("Push Notifications", "Get alerts for new matches and messages.", pushEnabled) { pushEnabled = it }
            }
        }
    }
}

@Composable
private fun InterestChip(label: String, isSelected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(if (isSelected) BrandColors.Ink else Color.White)
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
        Text(label, color = if (isSelected) Color.White else BrandColors.Ink, style = MaterialTheme.typography.titleSmall)
    }
}

@Composable
private fun SelectionRow(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(
            selected = selected,
            onClick = onClick,
            colors = RadioButtonDefaults.colors(selectedColor = BrandColors.RichCard)
        )
        Spacer(Modifier.width(12.dp))
        Text(label, style = MaterialTheme.typography.titleSmall, color = BrandColors.Ink)
    }
}

@Composable
private fun ToggleRow(title: String, subtitle: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall, color = BrandColors.Ink)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = BrandColors.Muted)
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = BrandColors.Ink
            )
        )
    }
}
