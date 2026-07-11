package com.rork.nimbushyperlocalweatherappandroid.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rork.nimbushyperlocalweatherappandroid.App
import com.rork.nimbushyperlocalweatherappandroid.data.LocationService
import com.rork.nimbushyperlocalweatherappandroid.ui.WeatherViewModel
import com.rork.nimbushyperlocalweatherappandroid.ui.screens.AlertsScreen
import com.rork.nimbushyperlocalweatherappandroid.ui.screens.HomeScreen
import com.rork.nimbushyperlocalweatherappandroid.ui.screens.LocationsScreen
import com.rork.nimbushyperlocalweatherappandroid.ui.screens.MapScreen
import com.rork.nimbushyperlocalweatherappandroid.ui.screens.SettingsScreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.BackgroundDark
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

enum class Screen(val route: String, val label: String, val icon: ImageVector) {
    Home("home", "Weather", Icons.Filled.Cloud),
    Map("map", "Map", Icons.Filled.Map),
    Alerts("alerts", "Alerts", Icons.Filled.Warning),
    Locations("locations", "Locations", Icons.Filled.LocationOn),
    Settings("settings", "Settings", Icons.Filled.Settings),
}

@Composable
fun AppNavigation() {
    val viewModel: WeatherViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return WeatherViewModel(
                    locationService = LocationService(App.appContext),
                ) as T
            }
        }
    )
    var currentScreen by remember { mutableStateOf(Screen.Home) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark),
    ) {
        // Screen content
        when (currentScreen) {
            Screen.Home -> HomeScreen(
                viewModel = viewModel,
                onNavigateToMap = { currentScreen = Screen.Map },
                onNavigateToLocations = { currentScreen = Screen.Locations },
                onNavigateToAlerts = { currentScreen = Screen.Alerts },
            )
            Screen.Map -> MapScreen(
                viewModel = viewModel,
                onBack = { currentScreen = Screen.Home },
            )
            Screen.Alerts -> AlertsScreen(
                viewModel = viewModel,
                onBack = { currentScreen = Screen.Home },
            )
            Screen.Locations -> LocationsScreen(
                viewModel = viewModel,
                onBack = { currentScreen = Screen.Home },
            )
            Screen.Settings -> SettingsScreen(
                viewModel = viewModel,
                onBack = { currentScreen = Screen.Home },
            )
        }

        // Bottom navigation bar
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(CardBackground)
                .border(1.dp, CardBorder)
                .navigationBarsPadding()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            Screen.entries.forEach { screen ->
                val isSelected = currentScreen == screen
                NavItem(
                    screen = screen,
                    isSelected = isSelected,
                    onClick = { currentScreen = screen },
                )
            }
        }
    }
}

@Composable
private fun NavItem(
    screen: Screen,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .clickable { onClick() }
            .padding(vertical = 8.dp, horizontal = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        androidx.compose.foundation.layout.Column(
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = screen.icon,
                contentDescription = screen.label,
                tint = if (isSelected) Accent else TextSecondary,
                modifier = Modifier.size(24.dp),
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = screen.label,
                fontSize = 10.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) Accent else TextSecondary,
            )
        }
    }
}
