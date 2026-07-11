package com.rork.nimbushyperlocalweatherappandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AcUnit
import androidx.compose.material.icons.filled.Bathroom
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Grain
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material.icons.filled.WbCloudy
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
import com.rork.nimbushyperlocalweatherappandroid.data.HourlyForecast
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.PrecipBlue
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun HourlyForecastRow(
    hourly: List<HourlyForecast>,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Hourly Forecast",
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextSecondary,
            modifier = Modifier.padding(bottom = 12.dp),
        )
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(hourly.take(24)) { hour ->
                HourlyCard(hour)
            }
        }
    }
}

@Composable
private fun HourlyCard(hour: HourlyForecast) {
    Column(
        modifier = Modifier
            .width(72.dp)
            .background(CardBackground, RoundedCornerShape(16.dp))
            .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
            .padding(vertical = 14.dp, horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = hour.time,
            fontSize = 12.sp,
            color = TextSecondary,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Icon(
            imageVector = iconForCondition(hour.condition.icon),
            contentDescription = hour.condition.main,
            tint = Accent,
            modifier = Modifier.size(24.dp),
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "${hour.temp}°",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary,
        )
        if (hour.precipChance > 0) {
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Grain,
                    contentDescription = "Precipitation",
                    tint = PrecipBlue,
                    modifier = Modifier.size(10.dp),
                )
                Text(
                    text = "${hour.precipChance}%",
                    fontSize = 10.sp,
                    color = PrecipBlue,
                )
            }
        }
    }
}

fun iconForCondition(iconName: String): ImageVector = when (iconName) {
    "sun" -> Icons.Filled.WbSunny
    "moon" -> Icons.Filled.NightsStay
    "cloud-sun" -> Icons.Filled.WbCloudy
    "cloud-moon" -> Icons.Filled.WbCloudy
    "cloud" -> Icons.Filled.Cloud
    "cloud-fog" -> Icons.Filled.Cloud
    "cloud-rain" -> Icons.Filled.Grain
    "cloud-drizzle" -> Icons.Filled.Grain
    "cloud-lightning" -> Icons.Filled.WbCloudy
    "snowflake" -> Icons.Filled.AcUnit
    else -> Icons.Filled.Cloud
}
