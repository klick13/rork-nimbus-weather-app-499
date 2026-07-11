package com.rork.nimbushyperlocalweatherappandroid.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.unit.dp

object WeatherIcons {
    // Returns a Material icon name string for mapping to Material Icons
    fun iconFor(conditionId: String): String = when (conditionId) {
        "clear" -> "wb_sunny"
        "partly-cloudy" -> "wb_cloudy"
        "cloudy" -> "cloud"
        "rainy" -> "grain"
        "snow" -> "ac_unit"
        "fog" -> "foggy"
        else -> "cloud"
    }
}
