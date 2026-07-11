package com.rork.nimbushyperlocalweatherappandroid.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val NimbusColorScheme = darkColorScheme(
    primary = Accent,
    secondary = NeonGreen,
    tertiary = NeonPurple,
    background = BackgroundDark,
    surface = BackgroundMid,
    surfaceVariant = BackgroundLight,
    onPrimary = TextPrimary,
    onSecondary = TextPrimary,
    onTertiary = TextPrimary,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    onSurfaceVariant = TextSecondary,
    error = AccentWarm,
)

@Composable
fun AppTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    // Always dark theme for Nimbus — the atmospheric look is core to the brand
    MaterialTheme(
        colorScheme = NimbusColorScheme,
        content = content
    )
}
