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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NavigateNext
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.data.TempUnit
import com.rork.nimbushyperlocalweatherappandroid.ui.WeatherViewModel
import com.rork.nimbushyperlocalweatherappandroid.ui.components.AtmosphericBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.BackgroundDark
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonPurple
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextTertiary

@Composable
fun SettingsScreen(
    viewModel: WeatherViewModel,
    onNavigateToPro: () -> Unit = {},
) {
    val uiState by viewModel.uiState.collectAsState()
    val weather = viewModel.selectedLocation

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark),
    ) {
        AtmosphericBackground(
            conditionId = weather?.condition?.id ?: "clear",
            isDay = weather?.condition?.icon != "moon",
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .padding(horizontal = 20.dp),
        ) {
            Text(
                text = "Settings",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(vertical = 12.dp),
            )

            // UNITS section
            SectionLabel("UNITS")
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardBackground, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Filled.Thermostat, "Temp", tint = Accent, modifier = Modifier.size(20.dp))
                        Column {
                            Text("Temperature", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            Text("Currently showing °${uiState.tempUnit}", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                    Row(
                        modifier = Modifier
                            .background(Accent.copy(alpha = 0.06f), RoundedCornerShape(10.dp))
                            .border(1.dp, Accent.copy(alpha = 0.12f), RoundedCornerShape(10.dp)),
                    ) {
                        Box(
                            modifier = Modifier
                                .background(if (uiState.tempUnit == TempUnit.F) Accent.copy(alpha = 0.15f) else Color.Transparent, RoundedCornerShape(10.dp))
                                .clickable { if (uiState.tempUnit != TempUnit.F) viewModel.toggleTempUnit() }
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                        ) { Text("°F", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = if (uiState.tempUnit == TempUnit.F) Accent else TextTertiary) }
                        Box(
                            modifier = Modifier
                                .background(if (uiState.tempUnit == TempUnit.C) Accent.copy(alpha = 0.15f) else Color.Transparent, RoundedCornerShape(10.dp))
                                .clickable { if (uiState.tempUnit != TempUnit.C) viewModel.toggleTempUnit() }
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                        ) { Text("°C", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = if (uiState.tempUnit == TempUnit.C) Accent else TextTertiary) }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // DATA section
            SectionLabel("DATA")
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardBackground, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp)),
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.refreshWeather() }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(Icons.Filled.Refresh, "Refresh", tint = Accent, modifier = Modifier.size(20.dp))
                            Text("Refresh Weather", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        }
                        Icon(Icons.Filled.NavigateNext, "Open", tint = TextTertiary, modifier = Modifier.size(18.dp))
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .height(1.dp)
                            .background(Accent.copy(alpha = 0.07f)),
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Icon(Icons.Filled.LocationOn, "Location", tint = Accent, modifier = Modifier.size(20.dp))
                        Column {
                            Text("Location", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            Text(weather?.name ?: "", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // SUBSCRIPTION section
            SectionLabel("SUBSCRIPTION")
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardBackground, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                    .clickable { onNavigateToPro() }
                    .padding(16.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Filled.Star, "Pro", tint = if (uiState.isPro) NeonPurple else TextTertiary, modifier = Modifier.size(20.dp))
                        Column {
                            Text("Nimbus Pro", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            Text(
                                if (uiState.isPro) "Active — all features unlocked" else "Unlock radar, marine, aviation & more",
                                fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(top = 2.dp),
                            )
                        }
                    }
                    Icon(Icons.Filled.NavigateNext, "Open", tint = TextTertiary, modifier = Modifier.size(18.dp))
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ABOUT section
            SectionLabel("ABOUT")
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardBackground, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp)),
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Icon(Icons.Filled.Info, "About", tint = Accent, modifier = Modifier.size(20.dp))
                        Column {
                            Text("Nimbus Weather", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            Text("Version 1.0.0", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).height(1.dp)
                            .background(Accent.copy(alpha = 0.07f)),
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Icon(Icons.Filled.Shield, "Privacy", tint = Accent, modifier = Modifier.size(20.dp))
                        Text("Privacy Policy", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                "Weather data by Open-Meteo\nRadar by RainViewer\nMaps by OpenStreetMap",
                fontSize = 12.sp,
                color = TextTertiary,
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        color = TextTertiary,
        modifier = Modifier.padding(bottom = 8.dp, start = 4.dp),
    )
}
