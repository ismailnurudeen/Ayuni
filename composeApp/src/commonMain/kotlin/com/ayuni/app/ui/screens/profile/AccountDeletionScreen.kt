package com.ayuni.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.ayuni.app.ui.components.ActionButton
import com.ayuni.app.ui.components.SecondaryHeader
import com.ayuni.app.ui.design.BrandColors

@Composable
fun AccountDeletionScreen(
    padding: PaddingValues,
    deletionStatus: String?,
    deletionScheduledAt: String?,
    isLoading: Boolean,
    errorMessage: String?,
    onRequestDeletion: () -> Unit,
    onCancelDeletion: () -> Unit,
    onRequestExport: () -> Unit,
    onClearError: () -> Unit,
    onBack: () -> Unit,
) {
    var showConfirmDialog by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            SecondaryHeader(title = "Account & Privacy", onBack = onBack)
        }

        // Data Export section
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Data Export",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = BrandColors.Ink,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Download a copy of your personal data including your profile, preferences, booking history, and notification history.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = BrandColors.Muted,
                    )
                    Spacer(Modifier.height(12.dp))
                    ActionButton(
                        label = if (isLoading) "Exporting..." else "Export My Data",
                        onClick = onRequestExport,
                        enabled = !isLoading,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Limited to 1 export per 24 hours.",
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandColors.Muted,
                    )
                }
            }
        }

        // Legal links
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Legal",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = BrandColors.Ink,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text("Terms of Service — v1.0", style = MaterialTheme.typography.bodyMedium, color = BrandColors.Ink)
                    Spacer(Modifier.height(4.dp))
                    Text("Privacy Policy — v1.0", style = MaterialTheme.typography.bodyMedium, color = BrandColors.Ink)
                }
            }
        }

        // Account deletion section
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Delete Account",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = BrandColors.RichCard,
                    )
                    Spacer(Modifier.height(8.dp))

                    if (deletionStatus == "pending") {
                        Text(
                            "Your account is scheduled for deletion.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = BrandColors.RichCard,
                        )
                        if (deletionScheduledAt != null) {
                            Text(
                                "Scheduled: $deletionScheduledAt",
                                style = MaterialTheme.typography.bodySmall,
                                color = BrandColors.Muted,
                            )
                        }
                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = onCancelDeletion,
                            enabled = !isLoading,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandColors.Forest),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                        ) {
                            Text(if (isLoading) "Restoring..." else "Cancel Deletion & Restore Account")
                        }
                    } else {
                        Text(
                            "Requesting deletion will:\n• Cancel all active bookings\n• Revoke all active sessions\n• Schedule permanent data removal after 30 days\n\nYou can cancel within the 30-day grace period.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = BrandColors.Muted,
                        )
                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = { showConfirmDialog = true },
                            enabled = !isLoading,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandColors.RichCard),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                        ) {
                            Text(if (isLoading) "Processing..." else "Delete My Account")
                        }
                    }
                }
            }
        }

        // Error message
        if (errorMessage != null) {
            item {
                Snackbar(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    action = {
                        TextButton(onClick = onClearError) { Text("Dismiss") }
                    }
                ) {
                    Text(errorMessage)
                }
            }
        }
    }

    // Confirmation dialog
    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text("Delete your account?", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "This will immediately log you out and cancel active bookings. " +
                    "Your data will be permanently deleted after 30 days. " +
                    "You can cancel within the grace period by logging back in.",
                    textAlign = TextAlign.Start,
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showConfirmDialog = false
                        onRequestDeletion()
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = BrandColors.RichCard),
                ) {
                    Text("Delete Account", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDialog = false }) {
                    Text("Cancel")
                }
            },
        )
    }
}
