package com.ayuni.app.platform

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import platform.Foundation.NSData
import platform.Foundation.create
import platform.PhotosUI.PHPickerConfiguration
import platform.PhotosUI.PHPickerFilter
import platform.PhotosUI.PHPickerResult
import platform.PhotosUI.PHPickerViewController
import platform.PhotosUI.PHPickerViewControllerDelegateProtocol
import platform.UIKit.UIApplication
import platform.UIKit.UIImage
import platform.UIKit.UIImageJPEGRepresentation
import platform.darwin.NSObject
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import platform.UniformTypeIdentifiers.UTTypeImage

@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun rememberImagePicker(
    onImageSelected: (String) -> Unit
): () -> Unit {
    val callback = remember { { dataUrl: String -> onImageSelected(dataUrl) } }

    return remember {
        {
            val config = PHPickerConfiguration().apply {
                selectionLimit = 1
                filter = PHPickerFilter.imagesFilter
            }
            val picker = PHPickerViewController(configuration = config)

            val delegate = object : NSObject(), PHPickerViewControllerDelegateProtocol {
                override fun picker(picker: PHPickerViewController, didFinishPicking: List<*>) {
                    picker.dismissViewControllerAnimated(true, null)
                    val result = didFinishPicking.firstOrNull() as? PHPickerResult ?: return
                    val provider = result.itemProvider ?: return
                    if (provider.hasItemConformingToTypeIdentifier(UTTypeImage.identifier)) {
                        provider.loadDataRepresentationForTypeIdentifier(UTTypeImage.identifier) { data, _ ->
                            if (data != null) {
                                val uiImage = UIImage(data = data)
                                val jpegData = UIImageJPEGRepresentation(uiImage, 0.8)
                                if (jpegData != null) {
                                    val bytes = ByteArray(jpegData.length.toInt())
                                    bytes.usePinned { pinned ->
                                        jpegData.getBytes(pinned.addressOf(0), jpegData.length)
                                    }
                                    val base64 = encodeBase64(bytes)
                                    val dataUrl = "data:image/jpeg;base64,$base64"
                                    callback(dataUrl)
                                }
                            }
                        }
                    }
                }
            }

            picker.delegate = delegate

            val rootVc = UIApplication.sharedApplication.keyWindow?.rootViewController
            rootVc?.presentViewController(picker, animated = true, completion = null)
        }
    }
}

/**
 * Base64 encode a ByteArray on iOS using platform APIs.
 */
@OptIn(ExperimentalForeignApi::class)
private fun encodeBase64(bytes: ByteArray): String {
    val nsData = bytes.usePinned { pinned ->
        NSData.create(bytes = pinned.addressOf(0), length = bytes.size.toULong())
    }
    return nsData.base64EncodedStringWithOptions(0u)
}
