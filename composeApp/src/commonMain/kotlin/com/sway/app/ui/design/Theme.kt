package com.sway.app.ui.design

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = BrandColors.Coral,
    onPrimary = BrandColors.Ink,
    secondary = BrandColors.RichCard,
    tertiary = BrandColors.Gold,
    background = BrandColors.Shell,
    surface = Color.White,
    onSurface = BrandColors.Ink,
    surfaceVariant = BrandColors.PaperChip,
)

@Composable
fun SwayTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = naijaTypography(),
        content = content,
    )
}
