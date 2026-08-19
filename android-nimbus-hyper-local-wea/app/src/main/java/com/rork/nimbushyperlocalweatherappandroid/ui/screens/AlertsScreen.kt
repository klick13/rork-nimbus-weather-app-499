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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NavigateNext
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.ui.WeatherViewModel
import com.rork.nimbushyperlocalweatherappandroid.ui.components.AlertCard
import com.rork.nimbushyperlocalweatherappandroid.ui.components.AtmosphericBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.BackgroundDark
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonPurple
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun AlertsScreen(
    viewModel: WeatherViewModel,
    onNavigateToPro: () -> Unit = {},
) {
    val uiState by viewModel.uiState.collectAsState()
    val weather = viewModel.selectedLocation
    val alerts = weather?.alerts ?: emptyList()

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
                text = "Alerts",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(vertical = 12.dp),
            )
            Text(
                text = if (alerts.isNotEmpty())
                    "${alerts.size} active alert${if (alerts.size != 1) "s" else ""}"
                else "No active alerts for your area",
                fontSize = 15.sp,
                color = TextSecondary,
                modifier = Modifier.padding(bottom = 16.dp),
            )

            if (alerts.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 80.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("No Active Alerts", fontSize = 20.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Conditions are calm in your area.", fontSize = 14.sp, color = TextSecondary)
                    }
                }
            } else {
                alerts.forEach { alert ->
                    AlertCard(alert)
                    Spacer(modifier = Modifier.height(10.dp))
                }
            }

            if (!uiState.isPro) {
                Spacer(modifier = Modifier.height(20.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(listOf(Color(0x0FBF40FF), Color(0x06BF40FF))),
                            RoundedCornerShape(16.dp),
                        )
                        .border(1.dp, NeonPurple.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                        .clickable { onNavigateToPro() }
                        .padding(16.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Icon(Icons.Filled.Star, "Pro", tint = NeonPurple, modifier = Modifier.size(20.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Unlock Pro Alerts", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = NeonPurple)
                            Text("Lightning, marine, aviation, hobby & flood alerts", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(top = 3.dp))
                        }
                        Icon(Icons.Filled.NavigateNext, "Open", tint = TextSecondary, modifier = Modifier.size(18.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}
