package com.ayuni.app.ui.screens.dates

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
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/**
 * Screen for submitting safety reports related to a booking.
 * Allows users to report: late arrival, no-show, or unsafe behavior.
 */
@Composable
fun SafetyReportScreen(
    bookingId: String,
    venueName: String,
    counterpartName: String,
    onSubmitReport: suspend (category: String, details: String) -> Result<Unit>,
    onBack: () -> Unit,
) {
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var details by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }
    var submitSuccess by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

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
                "Report Safety Issue",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.weight(1f))
            Spacer(Modifier.width(60.dp)) // Balance the back button
        }

        Spacer(Modifier.height(24.dp))

        // Booking context
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    "Date with $counterpartName",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    venueName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF666666)
                )
            }
        }

        Spacer(Modifier.height(24.dp))

        // Category selection
        Text(
            "What happened?",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(12.dp))

        CategoryButton(
            label = "Late Arrival",
            description = "My date was significantly late",
            isSelected = selectedCategory == "LateArrival",
            onClick = {
                selectedCategory = "LateArrival"
                submitError = null
                submitSuccess = false
            }
        )
        Spacer(Modifier.height(8.dp))

        CategoryButton(
            label = "No-Show",
            description = "My date didn't show up",
            isSelected = selectedCategory == "NoShow",
            onClick = {
                selectedCategory = "NoShow"
                submitError = null
                submitSuccess = false
            }
        )
        Spacer(Modifier.height(8.dp))

        CategoryButton(
            label = "Unsafe Behavior",
            description = "I felt unsafe or uncomfortable",
            isSelected = selectedCategory == "UnsafeBehavior",
            onClick = {
                selectedCategory = "UnsafeBehavior"
                submitError = null
                submitSuccess = false
            }
        )

        if (selectedCategory != null) {
            Spacer(Modifier.height(24.dp))

            // Details field
            Text(
                "Please provide details",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = details,
                onValueChange = {
                    details = it
                    submitError = null
                    submitSuccess = false
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp),
                placeholder = { Text("Describe what happened...") },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFFC17F5F),
                    unfocusedBorderColor = Color(0xFFDDDDDD)
                ),
                maxLines = 6
            )

            Spacer(Modifier.height(24.dp))

            // Submit button
            Button(
                onClick = {
                    if (details.trim().isEmpty()) {
                        submitError = "Please provide details about what happened"
                        return@Button
                    }
                    scope.launch {
                        isSubmitting = true
                        submitError = null
                        val result = onSubmitReport(selectedCategory!!, details.trim())
                        isSubmitting = false
                        
                        result.onSuccess {
                            submitSuccess = true
                            submitError = null
                            details = ""
                        }.onFailure { error ->
                            submitError = error.message ?: "Failed to submit report"
                            submitSuccess = false
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = !isSubmitting && selectedCategory != null && details.trim().isNotEmpty(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (selectedCategory == "UnsafeBehavior") Color(0xFFDC3545) else Color(0xFFC17F5F),
                    disabledContainerColor = Color(0xFFDDDDDD)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        "Submit Report",
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold
                    )
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
                        "✓ Report Submitted",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF2E7D32)
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Our ops team has received your report and will review it within the active support window. We take all safety concerns seriously.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666)
                    )
                    Spacer(Modifier.height(16.dp))
                    TextButton(onClick = onBack) {
                        Text("Return to Dates", color = Color(0xFFC17F5F))
                    }
                }
            }
        }

        // Safety note
        if (selectedCategory == "UnsafeBehavior") {
            Spacer(Modifier.height(16.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3CD))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "⚠️ Your Safety Matters",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFF57C00)
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Unsafe behavior reports are prioritized by our ops team. If you are in immediate danger, please contact local authorities.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666)
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoryButton(
    label: String,
    description: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) Color(0xFFE3F2FD) else Color.White
        ),
        border = if (isSelected) {
            androidx.compose.foundation.BorderStroke(2.dp, Color(0xFF1976D2))
        } else null
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (isSelected) {
                    Text(
                        "✓ ",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color(0xFF1976D2)
                    )
                }
                Text(
                    label,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isSelected) Color(0xFF1976D2) else Color(0xFF333333)
                )
            }
            Spacer(Modifier.height(4.dp))
            Text(
                description,
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666)
            )
        }
    }
}
