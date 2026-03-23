package com.ayuni.app.platform

import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import java.io.ByteArrayOutputStream

@Composable
actual fun rememberImagePicker(
    onImageSelected: (String) -> Unit
): () -> Unit {
    val context = LocalContext.current
    
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        uri?.let {
            try {
                // Read image bytes
                val inputStream = context.contentResolver.openInputStream(uri)
                val bytes = inputStream?.readBytes()
                inputStream?.close()
                
                if (bytes != null) {
                    // Convert to base64 data URL
                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    val dataUrl = "data:image/jpeg;base64,$base64"
                    onImageSelected(dataUrl)
                }
            } catch (e: Exception) {
                // Handle error silently or log
                e.printStackTrace()
            }
        }
    }
    
    return {
        launcher.launch(
            PickVisualMediaRequest(
                mediaType = ActivityResultContracts.PickVisualMedia.ImageOnly
            )
        )
    }
}
