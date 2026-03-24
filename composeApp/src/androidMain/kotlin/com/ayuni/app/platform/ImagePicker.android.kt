package com.ayuni.app.platform

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import java.io.ByteArrayOutputStream

private const val MAX_IMAGE_DIMENSION = 1920
private const val TARGET_QUALITY = 80
private const val MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

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
                val inputStream = context.contentResolver.openInputStream(uri)
                val originalBytes = inputStream?.readBytes()
                inputStream?.close()
                
                if (originalBytes != null) {
                    val compressed = compressImage(originalBytes)
                    val base64 = Base64.encodeToString(compressed, Base64.NO_WRAP)
                    val dataUrl = "data:image/jpeg;base64,$base64"
                    onImageSelected(dataUrl)
                }
            } catch (e: Exception) {
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

/**
 * Compress an image to target ~2MB max:
 * 1) Scale down if larger than MAX_IMAGE_DIMENSION
 * 2) JPEG compress at TARGET_QUALITY
 * 3) If still over budget, reduce quality further
 */
private fun compressImage(imageBytes: ByteArray): ByteArray {
    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options)

    val (origW, origH) = options.outWidth to options.outHeight
    val scale = maxOf(origW, origH).toFloat() / MAX_IMAGE_DIMENSION
    val sampleSize = if (scale > 1) {
        var s = 1
        while (s * 2 <= scale.toInt()) s *= 2
        s
    } else 1

    val decodeOptions = BitmapFactory.Options().apply { inSampleSize = sampleSize }
    val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, decodeOptions)
        ?: return imageBytes

    // Scale to exact max dimension if still too large
    val scaledBitmap = if (bitmap.width > MAX_IMAGE_DIMENSION || bitmap.height > MAX_IMAGE_DIMENSION) {
        val ratio = minOf(
            MAX_IMAGE_DIMENSION.toFloat() / bitmap.width,
            MAX_IMAGE_DIMENSION.toFloat() / bitmap.height
        )
        Bitmap.createScaledBitmap(
            bitmap,
            (bitmap.width * ratio).toInt(),
            (bitmap.height * ratio).toInt(),
            true
        )
    } else bitmap

    var quality = TARGET_QUALITY
    var output: ByteArray
    do {
        val bos = ByteArrayOutputStream()
        scaledBitmap.compress(Bitmap.CompressFormat.JPEG, quality, bos)
        output = bos.toByteArray()
        quality -= 10
    } while (output.size > MAX_FILE_SIZE_BYTES && quality > 10)

    if (scaledBitmap !== bitmap) scaledBitmap.recycle()
    bitmap.recycle()

    return output
}
