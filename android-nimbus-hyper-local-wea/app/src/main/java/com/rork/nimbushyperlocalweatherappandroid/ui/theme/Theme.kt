package com.rork.nimbushyperlocalweatherappandroid.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val NimbusColorScheme = darkColorScheme(
    primary = CyanAccent,
    onPrimary = SlateBase,
    primaryContainer = CyanAccentDim,
    onPrimaryContainer = TextPrimary,
    secondary = CyanAccent,
    onSecondary = SlateBase,
    tertiary = AlertOrange,
    background = SlateBase,
    onBackground = TextPrimary,
    surface = SlateSurface,
    onSurface = TextPrimary,
    surfaceVariant = SlateSurfaceVariant,
    onSurfaceVariant = TextSecondary,
    outline = SlateBorder,
    outlineVariant = TextTertiary,
    error = AlertRed,
    onError = TextPrimary
)

@Composable
fun AppTheme(
    darkTheme: Boolean = true,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    // Nimbus is always dark — map-first weather app.
    val colorScheme = NimbusColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
