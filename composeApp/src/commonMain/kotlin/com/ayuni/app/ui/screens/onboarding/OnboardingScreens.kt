package com.ayuni.app.ui.screens.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ayuni.app.domain.City
import com.ayuni.app.ui.components.ActionButton
import com.ayuni.app.ui.design.BrandColors

enum class OnboardingFlowStep {
    Welcome,
    Phone,
    Otp,
    Basics,
}

@Composable
fun WelcomeScreen(onContinue: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(24.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Spacer(Modifier.height(20.dp))
            Text("Ayuni", style = MaterialTheme.typography.displaySmall, color = BrandColors.Ink)
            Text(
                "Real dates, less talking stage.",
                style = MaterialTheme.typography.headlineMedium,
                color = BrandColors.Ink
            )
            Text(
                "Start with your phone number. We only ask for the basics now, and you can finish the rest of your profile later.",
                style = MaterialTheme.typography.bodyLarge,
                color = BrandColors.Muted
            )
            InfoCard("Why phone first", "Phone OTP is the fastest way to reduce fake accounts and works better than email for most users here.")
            InfoCard("Verification", "Phone is verified now. Selfie comes later, and government ID is only required before your first booked date.")
        }

        ActionButton(
            label = "Continue with phone",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = true,
            onClick = onContinue
        )
    }
}

@Composable
fun PhoneEntryScreen(
    phoneNumber: String,
    isSubmitting: Boolean,
    errorMessage: String?,
    onBack: () -> Unit,
    onSubmit: (String) -> Unit,
) {
    var localPhone by remember(phoneNumber) { mutableStateOf(phoneNumber) }
    FormShell(
        title = "Enter your phone",
        subtitle = "We’ll send a 6-digit code by SMS.",
        onBack = onBack
    ) {
        OutlinedTextField(
            value = localPhone,
            onValueChange = { localPhone = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Phone number") },
            placeholder = { Text("+234 801 234 5678") },
            singleLine = true,
        )
        errorMessage?.let { Text(it, color = BrandColors.Coral, style = MaterialTheme.typography.bodyMedium) }
        ActionButton(
            label = if (isSubmitting) "Sending…" else "Send code",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = !isSubmitting && localPhone.isNotBlank(),
            onClick = { onSubmit(localPhone.trim()) }
        )
    }
}

@Composable
fun OtpVerificationScreen(
    phoneNumber: String,
    isSubmitting: Boolean,
    errorMessage: String?,
    onBack: () -> Unit,
    onSubmit: (String) -> Unit,
) {
    var code by remember { mutableStateOf("") }
    FormShell(
        title = "Verify your number",
        subtitle = "Enter the 6-digit code sent to $phoneNumber. For now, the MVP test code is 123456.",
        onBack = onBack
    ) {
        OutlinedTextField(
            value = code,
            onValueChange = { code = it.take(6) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Verification code") },
            singleLine = true,
        )
        errorMessage?.let { Text(it, color = BrandColors.Coral, style = MaterialTheme.typography.bodyMedium) }
        ActionButton(
            label = if (isSubmitting) "Checking…" else "Verify phone",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = !isSubmitting && code.length == 6,
            onClick = { onSubmit(code) }
        )
    }
}

@Composable
fun BasicProfileOnboardingScreen(
    padding: PaddingValues = PaddingValues(),
    isSubmitting: Boolean,
    errorMessage: String?,
    onSubmit: (firstName: String, birthDate: String, genderIdentity: String, interestedIn: String, city: City, acceptedTerms: Boolean) -> Unit,
) {
    var firstName by remember { mutableStateOf("") }
    var birthDate by remember { mutableStateOf("") }
    var genderIdentity by remember { mutableStateOf("Woman") }
    var interestedIn by remember { mutableStateOf("Men") }
    var city by remember { mutableStateOf(City.Lagos) }
    var acceptedTerms by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(padding)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        Text("Just the basics", style = MaterialTheme.typography.headlineMedium, color = BrandColors.Ink)
        Text(
            "To unlock your first round, we only need your first name, age check, preferences, and city. Everything else can wait.",
            style = MaterialTheme.typography.bodyLarge,
            color = BrandColors.Muted
        )

        OutlinedTextField(
            value = firstName,
            onValueChange = { firstName = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("First name") },
            singleLine = true
        )
        OutlinedTextField(
            value = birthDate,
            onValueChange = { birthDate = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Birth date") },
            placeholder = { Text("1998-07-14") },
            singleLine = true
        )

        OptionGroup("I am", listOf("Woman", "Man", "Non-binary"), genderIdentity) { genderIdentity = it }
        OptionGroup("I want to date", listOf("Men", "Women", "Everyone"), interestedIn) { interestedIn = it }
        OptionGroup("City", City.entries.map { it.name }, city.name) {
            city = City.valueOf(it)
        }

        Row(verticalAlignment = Alignment.Top) {
            Checkbox(checked = acceptedTerms, onCheckedChange = { acceptedTerms = it })
            Text(
                "I agree to the terms, privacy policy, and respectful conduct rules.",
                style = MaterialTheme.typography.bodyMedium,
                color = BrandColors.Muted,
                modifier = Modifier.padding(top = 12.dp)
            )
        }

        InfoCard("What happens next", "You’ll enter the app immediately. Add photos, interests, and do selfie verification later.")
        errorMessage?.let { Text(it, color = BrandColors.Coral, style = MaterialTheme.typography.bodyMedium) }

        ActionButton(
            label = if (isSubmitting) "Creating account…" else "Finish signup",
            background = BrandColors.Ink,
            textColor = Color.White,
            enabled = !isSubmitting && firstName.isNotBlank() && birthDate.isNotBlank() && acceptedTerms,
            onClick = { onSubmit(firstName.trim(), birthDate.trim(), genderIdentity, interestedIn, city, acceptedTerms) }
        )
    }
}

@Composable
private fun FormShell(
    title: String,
    subtitle: String,
    onBack: () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandColors.Shell)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            "Back",
            color = BrandColors.Muted,
            modifier = Modifier.clickable { onBack() }
        )
        Text(title, style = MaterialTheme.typography.headlineMedium, color = BrandColors.Ink)
        Text(subtitle, style = MaterialTheme.typography.bodyLarge, color = BrandColors.Muted)
        content()
    }
}

@Composable
private fun OptionGroup(
    title: String,
    options: List<String>,
    selected: String,
    onSelected: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = BrandColors.Ink)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { option ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(if (selected == option) BrandColors.Ink else Color.White)
                        .clickable { onSelected(option) }
                        .padding(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    Text(
                        option,
                        color = if (selected == option) Color.White else BrandColors.Ink,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun InfoCard(title: String, body: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(title, style = MaterialTheme.typography.titleSmall, color = BrandColors.Ink)
        Text(body, style = MaterialTheme.typography.bodyMedium, color = BrandColors.Muted)
    }
}
