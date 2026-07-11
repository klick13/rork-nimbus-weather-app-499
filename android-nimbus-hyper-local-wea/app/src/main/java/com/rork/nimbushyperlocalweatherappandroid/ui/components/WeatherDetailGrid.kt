package com.rork.nimbushyperlocalweatherappandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AcUnit
import androidx.compose.material.icons.filled.Air
import androidx.compose.material.icons.filled.Bathroom
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Compress
import androidx.compose.material.icons.filled.Grain
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material.icons.filled.Opacity
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.data.LocationWeather
import com.rork.nimbushyperlocalweatherappandroid.data.TempUnit
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonYellow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TempHigh
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TempLow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun WeatherDetailGrid(
    weather: LocationWeather,
    unit: TempUnit,
    modifier: Modifier = Modifier,
) {
    val details = weather.details
    val unitSuffix = if (unit == TempUnit.F) "F" else "C"
    val windSuffix = if (unit == TempUnit.F) "mph" else "km/h"

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Conditions",
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextSecondary,
            modifier = Modifier.padding(bottom = 12.dp),
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            DetailCard(
                icon = Icons.Filled.Thermostat,
                label = "Feels Like",
                value = "${details.feelsLike}°",
                tint = Accent,
                modifier = Modifier.weight(1f),
            )
            DetailCard(
                icon = Icons.Filled.Opacity,
                label = "Humidity",
                value = "${details.humidity}%",
                tint = NeonGreen,
                modifier = Modifier.weight(1f),
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            DetailCard(
                icon = Icons.Filled.Air,
                label = "Wind",
                value = "${details.windSpeed} $windSuffix",
                subValue = details.windDirection,
                tint = Accent,
                modifier = Modifier.weight(1f),
            )
            DetailCard(
                icon = Icons.Filled.WbSunny,
                label = "UV Index",
                value = "${details.uvIndex}",
                subValue = uvLabel(details.uvIndex),
                tint = if (details.uvIndex >= 8) TempHigh else NeonYellow,
                modifier = Modifier.weight(1f),
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            DetailCard(
                icon = Icons.Filled.Compress,
                label = "Pressure",
                value = "${details.pressure}",
                subValue = "hPa",
                tint = Accent,
                modifier = Modifier.weight(1f),
            )
            DetailCard(
                icon = Icons.Filled.Bathroom,
                label = "Dew Point",
                value = "${details.dewPoint}°$unitSuffix",
                tint = NeonGreen,
                modifier = Modifier.weight(1f),
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            DetailCard(
                icon = Icons.Filled.NightsStay,
                label = "Sunrise",
                value = details.sunrise,
                tint = NeonYellow,
                modifier = Modifier.weight(1f),
            )
            DetailCard(
                icon = Icons.Filled.WbSunny,
                label = "Sunset",
                value = details.sunset,
                tint = TempHigh,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun DetailCard(
    icon: ImageVector,
    label: String,
    value: String,
    subValue: String? = null,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .background(CardBackground, RoundedCornerShape(16.dp))
            .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
            .padding(14.dp),
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = tint,
                    modifier = Modifier.size(16.dp),
                )
                Text(
                    text = label,
                    fontSize = 11.sp,
                    color = TextSecondary,
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = value,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
            )
            if (subValue != null) {
                Text(
                    text = subValue,
                    fontSize = 12.sp,
                    color = TextSecondary,
                )
            }
        }
    }
}

private fun uvLabel(uv: Int): String = when (uv) {
    in 0..2 -> "Low"
    in 3..5 -> "Moderate"
    in 6..7 -> "High"
    in 8..10 -> "Very High"
    else -> "Extreme"
}
