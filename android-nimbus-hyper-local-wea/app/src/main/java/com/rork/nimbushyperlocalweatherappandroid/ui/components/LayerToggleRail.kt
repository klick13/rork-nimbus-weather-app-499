package com.rork.nimbushyperlocalweatherappandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Air
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.DeviceThermostat
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherLayer
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CyanAccent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.PanelTranslucent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateBase
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

/**
 * Floating vertical layer-toggle rail — sits on the right edge of the map.
 * MyRadar-style icon buttons for each weather layer.
 */
@Composable
fun LayerToggleRail(
    activeLayer: WeatherLayer,
    radarEnabled: Boolean,
    onLayerSelected: (WeatherLayer) -> Unit,
    onRadarToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(28.dp))
            .background(PanelTranslucent)
            .padding(vertical = 8.dp, horizontal = 6.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        LayerButton(
            icon = Icons.Filled.Radar,
            label = "Radar",
            isActive = radarEnabled && activeLayer == WeatherLayer.RADAR,
            onClick = {
                if (activeLayer == WeatherLayer.RADAR) {
                    onRadarToggle()
                } else {
                    onLayerSelected(WeatherLayer.RADAR)
                }
            }
        )
        LayerButton(
            icon = Icons.Filled.Air,
            label = "Wind",
            isActive = activeLayer == WeatherLayer.WIND,
            onClick = { onLayerSelected(WeatherLayer.WIND) }
        )
        LayerButton(
            icon = Icons.Filled.DeviceThermostat,
            label = "Temp",
            isActive = activeLayer == WeatherLayer.TEMPERATURE,
            onClick = { onLayerSelected(WeatherLayer.TEMPERATURE) }
        )
        LayerButton(
            icon = Icons.Filled.Cloud,
            label = "Clouds",
            isActive = activeLayer == WeatherLayer.CLOUDS,
            onClick = { onLayerSelected(WeatherLayer.CLOUDS) }
        )
        LayerButton(
            icon = Icons.Filled.Warning,
            label = "Alerts",
            isActive = activeLayer == WeatherLayer.ALERTS,
            onClick = { onLayerSelected(WeatherLayer.ALERTS) }
        )
    }
}

@Composable
private fun LayerButton(
    icon: ImageVector,
    label: String,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(
                    if (isActive) CyanAccent.copy(alpha = 0.25f) else Color.Transparent
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (isActive) CyanAccent else TextSecondary,
                modifier = Modifier.size(22.dp)
            )
        }
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            fontSize = 9.sp,
            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
            color = if (isActive) CyanAccent else TextSecondary
        )
    }
}

/**
 * Floating "my location" re-center button — bottom right of the map.
 */
@Composable
fun MyLocationButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(PanelTranslucent)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Filled.LocationOn,
            contentDescription = "My Location",
            tint = CyanAccent,
            modifier = Modifier.size(24.dp)
        )
    }
}
