package com.ayuni.app.platform

import androidx.compose.runtime.Composable

/**
 * Platform-specific image picker composable.
 * Call this function to get an image picker launcher.
 * @param onImageSelected Callback with base64 data URL when image is selected
 * @return A function to launch the image picker
 */
@Composable
expect fun rememberImagePicker(
    onImageSelected: (String) -> Unit
): () -> Unit
