package com.ayuni.app.platform

import androidx.compose.runtime.Composable

@Composable
actual fun rememberImagePicker(
    onImageSelected: (String) -> Unit
): () -> Unit {
    // TODO: Implement iOS image picker using PHPickerViewController
    // For now, return a no-op function
    return {
        println("iOS image picker not yet implemented")
    }
}
