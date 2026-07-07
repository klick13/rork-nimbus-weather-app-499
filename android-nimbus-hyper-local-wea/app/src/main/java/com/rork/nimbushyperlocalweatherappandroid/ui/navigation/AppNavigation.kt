package com.rork.nimbushyperlocalweatherappandroid.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.rork.nimbushyperlocalweatherappandroid.ui.screens.LocationsScreen
import com.rork.nimbushyperlocalweatherappandroid.ui.screens.MapScreen
import com.rork.nimbushyperlocalweatherappandroid.ui.screens.SettingsScreen
import com.rork.nimbushyperlocalweatherappandroid.ui.viewmodel.WeatherViewModel

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val viewModel: WeatherViewModel = viewModel()

    // Request location permission on first launch
    val locationPermissionState = rememberPermissionState(
        android.Manifest.permission.ACCESS_FINE_LOCATION
    )

    LaunchedEffect(locationPermissionState.status) {
        if (locationPermissionState.status.isGranted) {
            viewModel.onPermissionGranted()
        } else if (!locationPermissionState.status.isGranted) {
            locationPermissionState.launchPermissionRequest()
        }
    }

    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("home") {
            MapScreen(navController = navController, viewModel = viewModel)
        }
        composable("locations") {
            LocationsScreen(navController = navController, viewModel = viewModel)
        }
        composable("settings") {
            SettingsScreen(navController = navController, viewModel = viewModel)
        }
    }
}
