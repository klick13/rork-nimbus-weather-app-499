package com.rork.nimbushyperlocalweatherappandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.GradientClear
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.GradientCloudy
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.GradientNight
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.GradientRainy
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.GradientSunny

fun gradientForCondition(conditionId: String, isDay: Boolean = true): List<Color> {
    if (!isDay) return GradientNight
    return when (conditionId) {
        "clear" -> GradientSunny
        "partly-cloudy" -> GradientClear
        "cloudy" -> GradientCloudy
        "rainy" -> GradientRainy
        "snow" -> GradientRainy
        "fog" -> GradientCloudy
        else -> GradientClear
    }
}

@Composable
fun AtmosphericBackground(
    conditionId: String = "clear",
    isDay: Boolean = true,
    modifier: Modifier = Modifier,
) {
    val colors = gradientForCondition(conditionId, isDay)
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(colors))
    )
}
