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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
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
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.BackgroundDark
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun SettingsScreen(
    viewModel: WeatherViewModel,
    onBack: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 20.dp),
        ) {
            Text(
                text = "Settings",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(vertical = 16.dp),
            )

            // Temperature unit toggle
            Text(
                text = "Units",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                UnitToggleOption(
                    label = "Fahrenheit °F",
                    isSelected = uiState.tempUnit == TempUnit.F,
                    onClick = { if (uiState.tempUnit != TempUnit.F) viewModel.toggleTempUnit() },
                    modifier = Modifier.weight(1f),
                )
                UnitToggleOption(
                    label = "Celsius °C",
                    isSelected = uiState.tempUnit == TempUnit.C,
                    onClick = { if (uiState.tempUnit != TempUnit.C) viewModel.toggleTempUnit() },
                    modifier = Modifier.weight(1f),
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // About section
            Text(
                text = "About",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardBackground, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp),
            ) {
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Info,
                            contentDescription = "About",
                            tint = Accent,
                            modifier = Modifier.size(20.dp),
                        )
                        Text(
                            text = "Nimbus",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Hyper-local weather with animated wind, temperature, UV maps and radar. Powered by Open-Meteo, RainViewer, and OpenStreetMap — free, keyless APIs.",
                        fontSize = 13.sp,
                        color = TextSecondary,
                        lineHeight = 18.sp,
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Version 1.0.0",
                        fontSize = 12.sp,
                        color = TextSecondary,
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Data sources
            Text(
                text = "Data Sources",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardBackground, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    DataSourceItem("Weather Forecast", "Open-Meteo")
                    DataSourceItem("Radar", "RainViewer")
                    DataSourceItem("Map Tiles", "CartoDB / OpenStreetMap")
                    DataSourceItem("Geocoding", "Open-Meteo & Zippopotam")
                }
            }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun UnitToggleOption(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .background(
                if (isSelected) Accent.copy(alpha = 0.15f) else CardBackground,
                RoundedCornerShape(16.dp),
            )
            .border(
                1.dp,
                if (isSelected) Accent.copy(alpha = 0.3f) else CardBorder,
                RoundedCornerShape(16.dp),
            )
            .clickable { onClick() }
            .padding(vertical = 16.dp, horizontal = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            fontSize = 14.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
            color = if (isSelected) Accent else TextSecondary,
        )
    }
}

@Composable
private fun DataSourceItem(name: String, source: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = name,
            fontSize = 14.sp,
            color = TextPrimary,
        )
        Text(
            text = source,
            fontSize = 14.sp,
            color = TextSecondary,
        )
    }
}
