package com.rork.nimbushyperlocalweatherappandroid.ui.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.data.LocationWeather
import com.rork.nimbushyperlocalweatherappandroid.data.TempUnit
import com.rork.nimbushyperlocalweatherappandroid.ui.WeatherViewModel
import com.rork.nimbushyperlocalweatherappandroid.ui.components.AlertCard
import com.rork.nimbushyperlocalweatherappandroid.ui.components.AtmosphericBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.components.DailyForecastList
import com.rork.nimbushyperlocalweatherappandroid.ui.components.HourlyForecastRow
import com.rork.nimbushyperlocalweatherappandroid.ui.components.WeatherDetailGrid
import com.rork.nimbushyperlocalweatherappandroid.ui.components.iconForCondition
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.GradientClear
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun HomeScreen(
    viewModel: WeatherViewModel,
    onNavigateToMap: () -> Unit,
    onNavigateToLocations: () -> Unit,
    onNavigateToAlerts: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    val weather = viewModel.selectedLocation
    val hasPermission = remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions.values.any { it }
        if (granted) {
            viewModel.updateCurrentLocation()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Atmospheric background
        AtmosphericBackground(
            conditionId = weather?.condition?.id ?: "clear",
            isDay = weather?.condition?.icon != "moon",
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding(),
        ) {
            // Top bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Location name
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = weather?.name ?: "Loading...",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                        )
                        if (weather?.locationSource == "gps") {
                            Box(
                                modifier = Modifier
                                    .background(NeonGreen.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp),
                            ) {
                                Text(
                                    text = "GPS",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = NeonGreen,
                                )
                            }
                        } else if (weather?.locationSource == "network") {
                            Box(
                                modifier = Modifier
                                    .background(Color(0xFFFFC800).copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp),
                            ) {
                                Text(
                                    text = "NET",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFFFC800),
                                )
                            }
                        }
                    }
                    Text(
                        text = weather?.let { "${it.region}${if (it.region.isNotEmpty()) ", " else ""}${it.country}" } ?: "",
                        fontSize = 13.sp,
                        color = TextSecondary,
                    )
                }

                // Refresh button
                IconButton(onClick = { viewModel.refreshWeather() }) {
                    if (uiState.isRefreshing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = Accent,
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Filled.Refresh,
                            contentDescription = "Refresh",
                            tint = Accent,
                        )
                    }
                }
            }

            if (weather == null && uiState.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = Accent)
                }
            } else if (weather != null) {
                WeatherContent(
                    weather = weather,
                    unit = uiState.tempUnit,
                    onNavigateToMap = onNavigateToMap,
                    onNavigateToAlerts = onNavigateToAlerts,
                )
            }

            Spacer(modifier = Modifier.height(100.dp)) // Bottom nav spacing
        }

        // Floating location button
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp)
                .size(56.dp)
                .background(Accent.copy(alpha = 0.15f), RoundedCornerShape(16.dp))
                .border(1.dp, Accent.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                .clickable {
                    permissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION,
                        )
                    )
                },
            contentAlignment = Alignment.Center,
        ) {
            if (uiState.isRequestingLocation) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp,
                    color = Accent,
                )
            } else {
                Icon(
                    imageVector = Icons.Filled.MyLocation,
                    contentDescription = "Get my location",
                    tint = Accent,
                )
            }
        }
    }
}

@Composable
private fun WeatherContent(
    weather: LocationWeather,
    unit: TempUnit,
    onNavigateToMap: () -> Unit,
    onNavigateToAlerts: () -> Unit,
) {
    val unitSuffix = if (unit == TempUnit.F) "F" else "C"

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
    ) {
        // Hero temperature
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "${weather.currentTemp}°",
                fontSize = 84.sp,
                fontWeight = FontWeight.Thin,
                color = TextPrimary,
            )
            Text(
                text = weather.condition.main,
                fontSize = 18.sp,
                color = TextSecondary,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = "H: ${weather.high}°",
                    fontSize = 15.sp,
                    color = TextSecondary,
                )
                Text(
                    text = "L: ${weather.low}°",
                    fontSize = 15.sp,
                    color = TextSecondary,
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Alerts (show first 2)
        if (weather.alerts.isNotEmpty()) {
            weather.alerts.take(2).forEach { alert ->
                AlertCard(alert)
                Spacer(modifier = Modifier.height(10.dp))
            }
            if (weather.alerts.size > 2) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onNavigateToAlerts() }
                        .padding(vertical = 4.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "View all ${weather.alerts.size} alerts →",
                        fontSize = 13.sp,
                        color = Accent,
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
            }
        }

        // Quick map access
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(CardBackground, RoundedCornerShape(20.dp))
                .border(1.dp, CardBorder, RoundedCornerShape(20.dp))
                .clickable { onNavigateToMap() }
                .padding(20.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        text = "Weather Map",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                    )
                    Text(
                        text = "Radar, wind, temp & UV layers",
                        fontSize = 12.sp,
                        color = TextSecondary,
                    )
                }
                Icon(
                    imageVector = Icons.Filled.LocationOn,
                    contentDescription = "Open map",
                    tint = Accent,
                    modifier = Modifier.size(28.dp),
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Hourly forecast
        HourlyForecastRow(weather.hourly)

        Spacer(modifier = Modifier.height(20.dp))

        // Details grid
        WeatherDetailGrid(weather, unit)

        Spacer(modifier = Modifier.height(20.dp))

        // 7-day forecast
        DailyForecastList(weather.daily)
    }
}
