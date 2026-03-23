package com.ayuni.app.platform

import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import java.io.File

/**
 * Android implementation of camera capture for selfie verification.
 * Uses the device's camera to capture a photo and returns it as a base64 data URL.
 */
@Composable
actual fun rememberCameraCapture(
    onPhotoTaken: (String) -> Unit
): () -> Unit {
    val context = LocalContext.current
    val photoUri = remember {
        val photoFile = File(context.cacheDir, "selfie_${System.currentTimeMillis()}.jpg")
        FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            photoFile
        )
    }
    
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success: Boolean ->
        if (success) {
            try {
                // Read the captured image
                val inputStream = context.contentResolver.openInputStream(photoUri)
                val bytes = inputStream?.readBytes()
                inputStream?.close()
                
                if (bytes != null) {
                    // Convert to base64 data URL
                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    val dataUrl = "data:image/jpeg;base64,$base64"
                    onPhotoTaken(dataUrl)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    return {
        launcher.launch(photoUri)
    }
}
