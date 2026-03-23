package com.ayuni.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.ayuni.app.platform.rememberCameraCapture
import kotlinx.coroutines.launch

/**
 * Selfie verification screen.
 * Allows users to capture and submit a selfie for verification.
 */
@Composable
fun SelfieVerificationScreen(
    isVerified: Boolean,
    onSubmitSelfie: suspend (String) -> Result<String>,
    onBack: () -> Unit,
) {
    var selectedImageUrl by remember { mutableStateOf<String?>(null) }
    var isSubmitting by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }
    var submitSuccess by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val cameraLauncher = rememberCameraCapture { dataUrl ->
        selectedImageUrl = dataUrl
        submitError = null
        submitSuccess = false
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFBF8F3))
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(onClick = onBack) {
                Text("← Back", color = Color(0xFFC17F5F))
            }
            Spacer(Modifier.weight(1f))
            Text(
                "Selfie Verification",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.weight(1f))
            Spacer(Modifier.width(60.dp)) // Balance the back button
        }

        Spacer(Modifier.height(24.dp))

        // Status card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isVerified) Color(0xFFE8F5E9) else Color(0xFFFFF3CD)
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = if (isVerified) "✓ Verified" else "⏱ Pending Verification",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isVerified) Color(0xFF2E7D32) else Color(0xFFF57C00)
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = if (isVerified)
                        "Your selfie has been verified."
                    else
                        "Submit a clear selfie to verify your identity.",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = Color(0xFF666666)
                )
            }
        }

        if (!isVerified) {
            Spacer(Modifier.height(24.dp))

            // Instructions
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "How to take a good selfie:",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(Modifier.height(12.dp))
                    InstructionItem("• Face the camera directly")
                    InstructionItem("• Ensure good lighting")
                    InstructionItem("• Remove sunglasses or hats")
                    InstructionItem("• Make sure your face is clearly visible")
                }
            }

            Spacer(Modifier.height(24.dp))

            // Camera capture button
            Button(
                onClick = { cameraLauncher() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFC17F5F)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    "📸 Take Selfie",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Show selected image indicator
            if (selectedImageUrl != null && !submitSuccess) {
                Spacer(Modifier.height(16.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "✓ Photo captured",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF1976D2)
                        )
                        Spacer(Modifier.height(16.dp))
                        
                        // Submit button
                        Button(
                            onClick = {
                                scope.launch {
                                    isSubmitting = true
                                    submitError = null
                                    val result = onSubmitSelfie(selectedImageUrl!!)
                                    isSubmitting = false
                                    
                                    result.onSuccess {
                                        submitSuccess = true
                                        submitError = null
                                    }.onFailure { error ->
                                        submitError = error.message ?: "Failed to submit selfie"
                                        submitSuccess = false
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            enabled = !isSubmitting,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF4CAF50)
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            if (isSubmitting) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text(
                                    "Submit for Review",
                                    color = Color.White,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }

            // Error message
            if (submitError != null) {
                Spacer(Modifier.height(16.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE))
                ) {
                    Text(
                        submitError ?: "",
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFFC62828)
                    )
                }
            }

            // Success message
            if (submitSuccess) {
                Spacer(Modifier.height(16.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "✓ Submitted Successfully",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF2E7D32)
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Your selfie has been submitted for review. We'll notify you once it's verified (usually within a few minutes).",
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = TextAlign.Center,
                            color = Color(0xFF666666)
                        )
                        Spacer(Modifier.height(16.dp))
                        TextButton(onClick = onBack) {
                            Text("Return to Profile", color = Color(0xFFC17F5F))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InstructionItem(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.bodyMedium,
        color = Color(0xFF666666),
        modifier = Modifier.padding(vertical = 4.dp)
    )
}
