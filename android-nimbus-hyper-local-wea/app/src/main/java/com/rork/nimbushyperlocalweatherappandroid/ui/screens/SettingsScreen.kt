package com.rork.nimbushyperlocalweatherappandroid.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CyanAccent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateBase
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary
import com.rork.nimbushyperlocalweatherappandroid.ui.viewmodel.WeatherViewModel

/**
 * Settings screen — temperature unit, radar opacity, radar toggle.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    navController: NavController,
    viewModel: WeatherViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", color = TextPrimary) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = TextPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SlateBase)
            )
        },
        containerColor = SlateBase
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Temperature unit
            SectionHeader("Temperature")
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = uiState.tempUnit == TempUnit.F,
                    onClick = { viewModel.setTempUnit(TempUnit.F) },
                    label = { Text("Fahrenheit (°F)") }
                )
                FilterChip(
                    selected = uiState.tempUnit == TempUnit.C,
                    onClick = { viewModel.setTempUnit(TempUnit.C) },
                    label = { Text("Celsius (°C)") }
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
            HorizontalDivider(color = SlateBorder)
            Spacer(modifier = Modifier.height(24.dp))

            // Radar toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "Animated Radar",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextPrimary
                    )
                    Text(
                        "Show animated precipitation overlay",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
                Switch(
                    checked = uiState.radarEnabled,
                    onCheckedChange = { viewModel.toggleRadar() }
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
            HorizontalDivider(color = SlateBorder)
            Spacer(modifier = Modifier.height(24.dp))

            // Radar opacity
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        "Radar Opacity",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextPrimary
                    )
                    Text(
                        "${(uiState.radarOpacity * 100).toInt()}%",
                        fontSize = 14.sp,
                        color = CyanAccent,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Slider(
                    value = uiState.radarOpacity,
                    onValueChange = { viewModel.setRadarOpacity(it) },
                    valueRange = 0.2f..1.0f
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
            HorizontalDivider(color = SlateBorder)
            Spacer(modifier = Modifier.height(24.dp))

            // About
            SectionHeader("About")
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Nimbus — Hyper-Local Weather",
                fontSize = 14.sp,
                color = TextPrimary
            )
            Text(
                "Radar: RainViewer • Forecast: Open-Meteo",
                fontSize = 12.sp,
                color = TextSecondary
            )
            Text(
                "Version 1.0",
                fontSize = 12.sp,
                color = TextSecondary
            )
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text = text,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = TextSecondary
    )
}
