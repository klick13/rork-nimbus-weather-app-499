package com.rork.nimbushyperlocalweatherappandroid.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material.icons.filled.Nightlight
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.data.model.DailyForecast
import com.rork.nimbushyperlocalweatherappandroid.data.model.HourlyForecast
import com.rork.nimbushyperlocalweatherappandroid.data.model.LocationWeather
import com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit
import com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherAlert
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.AlertOrange
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.AlertRed
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.AlertYellow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CyanAccent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.PanelTranslucent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateBase
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateSurface
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateSurfaceVariant
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

/**
 * The draggable bottom sheet content showing current conditions + forecast.
 * Expands to reveal hourly, daily, details, and sunrise/sunset.
 */
@Composable
fun WeatherBottomSheet(
    weather: LocationWeather,
    tempUnit: TempUnit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xF00B1020),
                        Color(0xF5121828),
                        SlateBase
                    )
                )
            )
            .padding(horizontal = 16.dp)
            .padding(top = 8.dp, bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Drag handle
        Box(
            modifier = Modifier
                .width(40.dp)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(TextSecondary.copy(alpha = 0.5f))
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Alerts banner (if any)
        if (weather.alerts.isNotEmpty()) {
            weather.alerts.forEach { alert ->
                AlertBanner(alert)
                Spacer(modifier = Modifier.height(8.dp))
            }
        }

        // Current conditions summary
        CurrentConditionsHeader(weather, tempUnit)

        Spacer(modifier = Modifier.height(16.dp))

        // Hourly forecast
        SectionLabel("Hourly Forecast")
        Spacer(modifier = Modifier.height(8.dp))
        HourlyForecastRow(weather.hourly)

        Spacer(modifier = Modifier.height(20.dp))

        // 7-day forecast
        SectionLabel("7-Day Forecast")
        Spacer(modifier = Modifier.height(8.dp))
        weather.daily.forEach { day ->
            DailyForecastRow(day, tempUnit)
            HorizontalDivider(
                color = SlateBorder.copy(alpha = 0.5f),
                modifier = Modifier.padding(vertical = 2.dp)
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Detail tiles
        SectionLabel("Details")
        Spacer(modifier = Modifier.height(8.dp))
        DetailTiles(weather, tempUnit)

        Spacer(modifier = Modifier.height(20.dp))

        // Sunrise / Sunset
        SectionLabel("Sun")
        Spacer(modifier = Modifier.height(8.dp))
        SunriseSunsetCard(weather.details.sunrise, weather.details.sunset)
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = TextSecondary,
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun AlertBanner(alert: WeatherAlert) {
    val color = when (alert.severity) {
        "extreme" -> AlertRed
        "severe" -> AlertOrange
        "moderate" -> AlertYellow
        else -> AlertYellow.copy(alpha = 0.7f)
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.15f))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = androidx.compose.material.icons.Icons.Filled.Warning,
            contentDescription = "Alert",
            tint = color,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column {
            Text(
                text = alert.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = alert.description,
                fontSize = 12.sp,
                color = TextSecondary,
                maxLines = 2
            )
        }
    }
}

@Composable
private fun CurrentConditionsHeader(weather: LocationWeather, tempUnit: TempUnit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = weather.name + if (weather.region.isNotEmpty()) ", ${weather.region}" else "",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = weather.condition.main,
                fontSize = 14.sp,
                color = TextSecondary
            )
            Text(
                text = "H:${weather.high}° L:${weather.low}°",
                fontSize = 13.sp,
                color = TextSecondary
            )
        }
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            WeatherIcon(weather.condition.icon, size = 40)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "${weather.currentTemp}°",
                fontSize = 48.sp,
                fontWeight = FontWeight.Light,
                color = TextPrimary
            )
        }
    }
}

@Composable
private fun HourlyForecastRow(hourly: List<HourlyForecast>) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 4.dp)
    ) {
        items(hourly) { hour ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.width(56.dp)
            ) {
                Text(
                    text = hour.time,
                    fontSize = 11.sp,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(4.dp))
                WeatherIcon(hour.condition.icon, size = 24)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${hour.temp}°",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary
                )
                Text(
                    text = "${hour.precipChance}%",
                    fontSize = 10.sp,
                    color = CyanAccent
                )
            }
        }
    }
}

@Composable
private fun DailyForecastRow(day: DailyForecast, tempUnit: TempUnit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = day.day,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = TextPrimary,
            modifier = Modifier.weight(1f)
        )
        WeatherIcon(day.condition.icon, size = 24)
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = if (day.precipChance > 0) "${day.precipChance}%" else "",
            fontSize = 11.sp,
            color = CyanAccent,
            modifier = Modifier.width(40.dp)
        )
        Text(
            text = "${day.low}°",
            fontSize = 14.sp,
            color = TextSecondary,
            modifier = Modifier.width(40.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.End
        )
        Text(
            text = "${day.high}°",
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = TextPrimary,
            modifier = Modifier.width(40.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.End
        )
    }
}

@Composable
private fun DetailTiles(weather: LocationWeather, tempUnit: TempUnit) {
    val unitStr = if (tempUnit == TempUnit.F) "F" else "C"
    val windStr = if (tempUnit == TempUnit.F) "mph" else "km/h"
    val details = weather.details
    val tiles = listOf(
        "Feels Like" to "${details.feelsLike}°$unitStr",
        "Humidity" to "${details.humidity}%",
        "Wind" to "${details.windSpeed} $windStr",
        "Direction" to details.windDirection,
        "UV Index" to details.uvIndex.toString(),
        "Pressure" to "${details.pressure} hPa",
        "Visibility" to "${details.visibility} mi",
        "Dew Point" to "${details.dewPoint}°$unitStr"
    )

    // 2 columns x 4 rows
    Column {
        for (i in tiles.indices step 2) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                DetailTile(tiles[i].first, tiles[i].second, Modifier.weight(1f))
                if (i + 1 < tiles.size) {
                    DetailTile(tiles[i + 1].first, tiles[i + 1].second, Modifier.weight(1f))
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@Composable
private fun DetailTile(label: String, value: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = SlateSurfaceVariant),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = label,
                fontSize = 11.sp,
                color = TextSecondary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                color = TextPrimary
            )
        }
    }
}

@Composable
private fun SunriseSunsetCard(sunrise: String, sunset: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SlateSurfaceVariant),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = androidx.compose.material.icons.Icons.Filled.WbSunny,
                    contentDescription = "Sunrise",
                    tint = AlertYellow,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text("Sunrise", fontSize = 11.sp, color = TextSecondary)
                Text(sunrise, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
            }
            // Arc placeholder
            Box(
                modifier = Modifier
                    .width(80.dp)
                    .height(40.dp),
                contentAlignment = Alignment.Center
            ) {
                ArcShape()
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = androidx.compose.material.icons.Icons.Filled.Nightlight,
                    contentDescription = "Sunset",
                    tint = AlertOrange,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text("Sunset", fontSize = 11.sp, color = TextSecondary)
                Text(sunset, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
            }
        }
    }
}

@Composable
private fun ArcShape() {
    // Simple arc drawn as a semi-transparent curve
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(40.dp)
            .clip(RoundedCornerShape(topStart = 40.dp, topEnd = 40.dp))
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        AlertYellow.copy(alpha = 0.0f),
                        AlertYellow.copy(alpha = 0.3f)
                    )
                )
            )
    )
}
