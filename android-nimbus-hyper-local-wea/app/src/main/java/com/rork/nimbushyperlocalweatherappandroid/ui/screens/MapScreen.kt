package com.rork.nimbushyperlocalweatherappandroid.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.ui.WeatherViewModel
import com.rork.nimbushyperlocalweatherappandroid.ui.components.GridPointJson
import com.rork.nimbushyperlocalweatherappandroid.ui.components.WeatherMapView
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.BackgroundDark
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun MapScreen(
    viewModel: WeatherViewModel,
    onBack: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    val weather = viewModel.selectedLocation
    var selectedLayer by remember { mutableStateOf("radar") }
    var gridData by remember { mutableStateOf<List<GridPointJson>>(emptyList()) }

    val layers = listOf("radar", "wind", "temp", "uv")

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark),
    ) {
        if (weather != null) {
            WeatherMapView(
                centerLat = weather.lat,
                centerLon = weather.lon,
                layer = selectedLayer,
                gridData = gridData,
                onGridRequest = { lat, lon, zoom ->
                    viewModel.fetchWeatherGrid(
                        centerLat = lat,
                        centerLon = lon,
                        zoom = zoom,
                        tileRadius = 3.0,
                        gridDensity = 7,
                    ) { points ->
                        gridData = points.map { p ->
                            GridPointJson(
                                lat = p.lat,
                                lon = p.lon,
                                temp = p.temp,
                                windSpeed = p.windSpeed,
                                windDirection = p.windDirection,
                                uvIndex = p.uvIndex,
                                valid = p.valid,
                            )
                        }
                    }
                },
            )
        }

        // Top bar overlay
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Back button
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(CardBackground, RoundedCornerShape(12.dp))
                        .border(1.dp, CardBorder, RoundedCornerShape(12.dp))
                        .clickable { onBack() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = TextPrimary,
                        modifier = Modifier.size(20.dp),
                    )
                }

                // Title
                Text(
                    text = "Weather Map",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                )

                // Spacer for centering
                Spacer(modifier = Modifier.size(40.dp))
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Layer pills
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                layers.forEach { layer ->
                    val isSelected = selectedLayer == layer
                    val label = when (layer) {
                        "radar" -> "Radar"
                        "wind" -> "Wind"
                        "temp" -> "Temp"
                        "uv" -> "UV"
                        else -> layer
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(
                                if (isSelected) Accent.copy(alpha = 0.2f) else CardBackground,
                                RoundedCornerShape(12.dp),
                            )
                            .border(
                                1.dp,
                                if (isSelected) Accent.copy(alpha = 0.4f) else CardBorder,
                                RoundedCornerShape(12.dp),
                            )
                            .clickable { selectedLayer = layer }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = label,
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) Accent else TextSecondary,
                        )
                    }
                }
            }
        }
    }
}
