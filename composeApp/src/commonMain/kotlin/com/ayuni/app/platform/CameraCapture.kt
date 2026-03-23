package com.ayuni.app.platform

import androidx.compose.runtime.Composable

/**
 * Platform-specific camera capture for selfie verification.
 * Call this function to get a camera launcher that captures a selfie photo.
 * @param onPhotoTaken Callback with base64 data URL when photo is taken
 * @return A function to launch the camera
 */
@Composable
expect fun rememberCameraCapture(
    onPhotoTaken: (String) -> Unit
): () -> Unit
