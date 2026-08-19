package com.rork.nimbushyperlocalweatherappandroid.ui.screens

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.NavigateNext
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
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
import com.rork.nimbushyperlocalweatherappandroid.ui.components.FishingHuntingWidget
import com.rork.nimbushyperlocalweatherappandroid.ui.components.FloodGateWidget
import com.rork.nimbushyperlocalweatherappandroid.ui.components.HourlyForecastRow
import com.rork.nimbushyperlocalweatherappandroid.ui.components.PetSafetyAlerts
import com.rork.nimbushyperlocalweatherappandroid.ui.components.PhotoOfTheDay
import com.rork.nimbushyperlocalweatherappandroid.ui.components.PollenAirQualityCard
import com.rork.nimbushyperlocalweatherappandroid.ui.components.SunsetQualityScore
import com.rork.nimbushyperlocalweatherappandroid.ui.components.UVBurnTimer
import com.rork.nimbushyperlocalweatherappandroid.ui.components.WeatherDetailGrid
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.BackgroundDark
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonPurple
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonYellow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextTertiary

@Composable
fun HomeScreen(
    viewModel: WeatherViewModel,
    onNavigateToMap: () -> Unit,
    onNavigateToLocations: () -> Unit,
    onNavigateToAlerts: () -> Unit,
    onNavigateToPro: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    val weather = viewModel.selectedLocation

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions.values.any { it }
        if (granted) {
            viewModel.updateCurrentLocation()
            viewModel.completeOnboarding()
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(BackgroundDark)) {
        AtmosphericBackground(
            conditionId = weather?.condition?.id ?: "clear",
            isDay = weather?.condition?.icon != "moon",
        )

        if (!uiState.hasCompletedOnboarding) {
            OnboardingOverlay(
                isRequestingLocation = uiState.isRequestingLocation,
                onUsePreciseLocation = {
                    permissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION,
                        )
                    )
                },
                onSkip = { viewModel.completeOnboarding() },
            )
        }

        if (weather == null && uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = Accent)
            }
        } else if (weather != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .statusBarsPadding(),
            ) {
                CurrentWeatherHero(
                    weather = weather,
                    unit = uiState.tempUnit,
                    isRefreshing = uiState.isRefreshing,
                    onRefresh = { viewModel.refreshWeather() },
                    onToggleUnit = { viewModel.toggleTempUnit() },
                )

                if (weather.alerts.isNotEmpty()) {
                    weather.alerts.take(2).forEach { alert ->
                        AlertCard(alert, modifier = Modifier.padding(horizontal = 16.dp))
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
                    }
                }

                RadarSection(onNavigateToMap = onNavigateToMap)

                Spacer(modifier = Modifier.height(16.dp))
                HourlyForecastRow(
                    weather.hourly,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )

                Spacer(modifier = Modifier.height(20.dp))
                DailyForecastList(
                    weather.daily,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )

                Spacer(modifier = Modifier.height(20.dp))
                WeatherDetailGrid(
                    weather,
                    uiState.tempUnit,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )

                Spacer(modifier = Modifier.height(16.dp))
                PollenAirQualityCard(airQuality = weather.airQuality)

                Spacer(modifier = Modifier.height(16.dp))
                FishingHuntingWidget(details = weather.details)

                Spacer(modifier = Modifier.height(16.dp))
                UVBurnTimer(uvIndex = weather.details.uvIndex)

                Spacer(modifier = Modifier.height(16.dp))
                PetSafetyAlerts(
                    temp = weather.currentTemp,
                    humidity = weather.details.humidity,
                    windSpeed = weather.details.windSpeed,
                    conditionId = weather.condition.id,
                )

                Spacer(modifier = Modifier.height(16.dp))
                SunsetQualityScore(
                    humidity = weather.details.humidity,
                    visibility = weather.details.visibility,
                    windSpeed = weather.details.windSpeed,
                    sunset = weather.details.sunset,
                    cloudCover = when {
                        weather.details.humidity > 80 -> 80
                        weather.details.humidity > 60 -> 50
                        weather.details.humidity > 40 -> 30
                        else -> 10
                    },
                )

                Spacer(modifier = Modifier.height(16.dp))
                FloodGateWidget(
                    precipChance = weather.daily.firstOrNull()?.precipChance ?: 0,
                    humidity = weather.details.humidity,
                )

                Spacer(modifier = Modifier.height(16.dp))
                PhotoOfTheDay(conditionId = weather.condition.id)

                if (!uiState.isPro) {
                    Spacer(modifier = Modifier.height(16.dp))
                    ProUpsellCard(onUpgrade = onNavigateToPro)
                }

                Spacer(modifier = Modifier.height(100.dp))
            }
        }

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
private fun CurrentWeatherHero(
    weather: LocationWeather,
    unit: TempUnit,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    onToggleUnit: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        text = weather.name,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                    )
                    if (weather.locationSource == "gps") {
                        Box(
                            modifier = Modifier
                                .background(NeonGreen.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp),
                        ) { Text("GPS", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = NeonGreen) }
                    } else if (weather.locationSource == "network") {
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFFFC800).copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp),
                        ) { Text("NET", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFFC800)) }
                    }
                }
                Text(
                    text = weather.region + if (weather.region.isNotEmpty()) ", " + weather.country else weather.country,
                    fontSize = 13.sp,
                    color = TextSecondary,
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .background(Accent.copy(alpha = 0.06f), RoundedCornerShape(10.dp))
                        .border(1.dp, Accent.copy(alpha = 0.12f), RoundedCornerShape(10.dp))
                        .clickable { onToggleUnit() }
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                ) {
                    Text(
                        text = "°${unit.name}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Accent,
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clickable { onRefresh() },
                    contentAlignment = Alignment.Center,
                ) {
                    if (isRefreshing) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Accent)
                    } else {
                        Icon(Icons.Filled.Refresh, "Refresh", tint = Accent, modifier = Modifier.size(20.dp))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
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
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("H: ${weather.high}°", fontSize = 15.sp, color = TextSecondary)
            Text("L: ${weather.low}°", fontSize = 15.sp, color = TextSecondary)
        }
    }
}

@Composable
private fun RadarSection(onNavigateToMap: () -> Unit) {
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.padding(bottom = 10.dp),
        ) {
            Icon(Icons.Filled.LocationOn, "Radar", tint = Accent, modifier = Modifier.size(18.dp))
            Text(
                "LIVE RADAR",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = Accent.copy(alpha = 0.7f),
            )
            Box(
                modifier = Modifier
                    .size(5.dp)
                    .background(NeonGreen, RoundedCornerShape(2.5.dp)),
            )
        }
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
                    Text("Weather Map", fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    Text("Radar, wind, temp & UV layers", fontSize = 12.sp, color = TextSecondary)
                }
                Icon(Icons.Filled.LocationOn, "Open map", tint = Accent, modifier = Modifier.size(28.dp))
            }
        }
    }
}

@Composable
private fun ProUpsellCard(onUpgrade: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .background(
                Brush.linearGradient(listOf(Color(0x0F00F0FF), Color(0x08BF40FF))),
                RoundedCornerShape(14.dp),
            )
            .border(1.dp, NeonPurple.copy(alpha = 0.2f), RoundedCornerShape(14.dp))
            .clickable { onUpgrade() }
            .padding(14.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(Icons.Filled.Star, "Pro", tint = NeonPurple, modifier = Modifier.size(23.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Unlock Nimbus Pro", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = NeonPurple)
                Text("Radar, marine, aviation, hobby alerts & more", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(top = 2.dp))
            }
            Icon(Icons.Filled.NavigateNext, "Open", tint = NeonPurple, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun OnboardingOverlay(
    isRequestingLocation: Boolean,
    onUsePreciseLocation: () -> Unit,
    onSkip: () -> Unit,
) {
    val transition = rememberInfiniteTransition()
    val scale by transition.animateFloat(
        initialValue = 1f,
        targetValue = 1.025f,
        animationSpec = infiniteRepeatable(tween(1500), RepeatMode.Reverse),
        label = "pulse",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xF5020812),
                        Color(0xF5001218),
                        Color(0xFA040508),
                    ),
                ),
            ),
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 76.dp, end = 0.dp)
                .offset(x = (-70).dp)
                .size(190.dp)
                .background(Color(0x2E00F0FF), RoundedCornerShape(95.dp)),
        )
        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(bottom = 90.dp, start = 0.dp)
                .offset(x = (-80).dp)
                .size(230.dp)
                .background(Color(0x1A3DFF9A), RoundedCornerShape(115.dp)),
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 18.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Row(
                modifier = Modifier
                    .background(
                        Brush.linearGradient(listOf(Color(0x143DFF9A), Color(0x083DFF9A))),
                        RoundedCornerShape(999.dp),
                    )
                    .border(1.dp, NeonGreen.copy(alpha = 0.3f), RoundedCornerShape(999.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Icon(Icons.Filled.Bolt, "Hyper-local", tint = NeonGreen, modifier = Modifier.size(15.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("HYPER-LOCAL MODE", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = NeonGreen)
            }

            Spacer(modifier = Modifier.height(18.dp))
            Text(
                "Nimbus Hyper-Local Weather App",
                fontSize = 39.sp,
                fontWeight = FontWeight.Black,
                color = TextPrimary,
                lineHeight = 43.sp,
            )
            Spacer(modifier = Modifier.height(18.dp))
            Text(
                "Fast, no-fluff weather for the exact spot where you are standing — not just the nearest city.",
                fontSize = 19.sp,
                fontWeight = FontWeight.Medium,
                color = TextSecondary,
                lineHeight = 28.sp,
            )
            Spacer(modifier = Modifier.height(18.dp))
            Row(
                modifier = Modifier
                    .background(
                        Color(0x0F00F0FF),
                        RoundedCornerShape(18.dp),
                    )
                    .border(1.dp, Accent.copy(alpha = 0.2f), RoundedCornerShape(18.dp))
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.LocationOn, "GPS", tint = Accent, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    "Locks onto your GPS position for hourly forecasts, alerts, radar, and map layers.",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    lineHeight = 24.sp,
                )
            }
            Spacer(modifier = Modifier.height(18.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .scale(scale, scale)
                    .background(
                        Brush.linearGradient(listOf(Color(0x473DFF14), Color(0x2900F0FF))),
                        RoundedCornerShape(24.dp),
                    )
                    .border(1.dp, NeonGreen.copy(alpha = 0.48f), RoundedCornerShape(24.dp))
                    .clickable { onUsePreciseLocation() }
                    .padding(16.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    if (isRequestingLocation) {
                        CircularProgressIndicator(modifier = Modifier.size(28.dp), strokeWidth = 2.dp, color = NeonGreen)
                    } else {
                        Icon(Icons.Filled.MyLocation, "Locate", tint = NeonGreen, modifier = Modifier.size(28.dp))
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Use My Precise Location", fontSize = 21.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                        Text("Recommended for the most accurate Nimbus forecast", fontSize = 15.sp, color = TextSecondary, modifier = Modifier.padding(top = 3.dp))
                    }
                    Icon(Icons.Filled.NavigateNext, "Go", tint = Accent, modifier = Modifier.size(22.dp))
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Box(
                modifier = Modifier.fillMaxWidth().clickable { onSkip() }.padding(vertical = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "Skip for now — I'll add a location manually",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary,
                )
            }
        }
    }
}

