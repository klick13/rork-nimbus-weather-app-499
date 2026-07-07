package com.rork.nimbushyperlocalweatherappandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.data.model.LocationWeather
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CyanAccent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.PanelTranslucent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

/**
 * Translucent floating top bar — location name, current temp, condition icon.
 * Tapping the location name opens saved locations; gear opens settings.
 */
@Composable
fun MapTopBar(
    weather: LocationWeather?,
    locationName: String,
    onLocationClick: () -> Unit,
    onSettingsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(PanelTranslucent)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Location button
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .clickable(onClick = onLocationClick)
                .padding(end = 8.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.LocationOn,
                contentDescription = "Location",
                tint = CyanAccent,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Column {
                Text(
                    text = locationName,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                if (weather != null) {
                    Text(
                        text = weather.condition.main,
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }
        }

        // Current temp + condition icon
        if (weather != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                WeatherIcon(weather.condition.icon, size = 28)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "${weather.currentTemp}°",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Light,
                    color = TextPrimary
                )
            }
        }

        // Settings gear
        Icon(
            imageVector = Icons.Filled.Settings,
            contentDescription = "Settings",
            tint = TextSecondary,
            modifier = Modifier
                .size(22.dp)
                .clip(RoundedCornerShape(8.dp))
                .clickable(onClick = onSettingsClick)
                .padding(2.dp)
        )
    }
}
