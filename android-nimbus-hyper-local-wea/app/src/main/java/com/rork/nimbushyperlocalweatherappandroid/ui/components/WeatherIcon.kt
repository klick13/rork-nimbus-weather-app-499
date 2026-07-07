package com.rork.nimbushyperlocalweatherappandroid.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material.icons.filled.AcUnit
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material.icons.filled.Nightlight
import androidx.compose.material.icons.filled.CloudQueue
import androidx.compose.material.icons.filled.Grain
import androidx.compose.material.icons.filled.Storm
import androidx.compose.material.icons.filled.Air
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CyanAccent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.AlertYellow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.AlertOrange
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary

/**
 * Maps a weather condition icon name to a Material icon vector + color.
 * Ported from the Expo app's weatherIcons.tsx mapping.
 */
fun weatherIconVector(iconName: String): ImageVector {
    return when (iconName) {
        "sun" -> Icons.Filled.WbSunny
        "moon" -> Icons.Filled.Nightlight
        "cloud" -> Icons.Filled.Cloud
        "cloud-sun" -> Icons.Filled.CloudQueue
        "cloud-moon" -> Icons.Filled.CloudQueue
        "cloud-rain" -> Icons.Filled.WaterDrop
        "cloud-drizzle" -> Icons.Filled.Grain
        "cloud-snow" -> Icons.Filled.AcUnit
        "cloud-lightning" -> Icons.Filled.Storm
        "snowflake" -> Icons.Filled.AcUnit
        "wind" -> Icons.Filled.Air
        "cloud-fog" -> Icons.Filled.Cloud
        else -> Icons.Filled.Cloud
    }
}

fun weatherIconColor(iconName: String): Color {
    return when (iconName) {
        "sun" -> AlertYellow
        "moon" -> TextPrimary
        "cloud" -> TextPrimary
        "cloud-sun" -> AlertYellow
        "cloud-moon" -> TextPrimary
        "cloud-lightning" -> AlertOrange
        "cloud-rain" -> CyanAccent
        "cloud-drizzle" -> CyanAccent
        "cloud-snow" -> TextPrimary
        "snowflake" -> TextPrimary
        "wind" -> CyanAccent
        "cloud-fog" -> TextPrimary
        else -> TextPrimary
    }
}

@Composable
fun WeatherIcon(
    iconName: String,
    modifier: Modifier = Modifier,
    size: Int = 24
) {
    Icon(
        imageVector = weatherIconVector(iconName),
        contentDescription = iconName,
        tint = weatherIconColor(iconName),
        modifier = modifier.size(size.dp)
    )
}
