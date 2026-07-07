package com.rork.nimbushyperlocalweatherappandroid.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.rork.nimbushyperlocalweatherappandroid.data.model.RainViewerCoverage
import com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherLayer
import com.rork.nimbushyperlocalweatherappandroid.ui.components.LayerToggleRail
import com.rork.nimbushyperlocalweatherappandroid.ui.components.MapTopBar
import com.rork.nimbushyperlocalweatherappandroid.ui.components.MyLocationButton
import com.rork.nimbushyperlocalweatherappandroid.ui.components.WeatherBottomSheet
import com.rork.nimbushyperlocalweatherappandroid.ui.map.RadarMap
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateBase
import com.rork.nimbushyperlocalweatherappandroid.ui.viewmodel.WeatherViewModel

/**
 * Map-first home screen — full-screen animated radar map with floating UI:
 * - Translucent top bar (location name, temp, condition, settings gear)
 * - Layer toggle rail (right side)
 * - My-location recenter button (bottom right)
 * - Draggable bottom sheet with current conditions + forecast
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    navController: NavController,
    viewModel: WeatherViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val sheetState = rememberModalBottomSheetState(
        skipPartiallyExpanded = false,
        confirmValueChange = { true }
    )
    var sheetExpanded by remember { mutableStateOf(true) }

    val weather = uiState.weather
    val activeLocation = uiState.activeLocation
    val coverage = uiState.rainViewerCoverage

    // Initialize on first launch
    LaunchedEffect(uiState.hasLocationPermission) {
        if (uiState.activeLocation == null) {
            viewModel.initializeLocation()
        }
    }

    // Fetch grid when wind/temp layer selected
    LaunchedEffect(uiState.activeLayer) {
        if (uiState.activeLayer == WeatherLayer.WIND || uiState.activeLayer == WeatherLayer.TEMPERATURE) {
            if (uiState.weatherGrid.isEmpty()) {
                viewModel.fetchWeatherGrid()
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBase)
    ) {
        // ── Full-screen radar map ──────────────────────────────────────
        if (activeLocation != null) {
            RadarMap(
                centerLat = activeLocation.lat,
                centerLon = activeLocation.lon,
                zoom = 7.0,
                radarFrames = coverage?.radar ?: emptyList(),
                radarHost = coverage?.host ?: "https://tilecache.rainviewer.com",
                radarEnabled = uiState.radarEnabled,
                radarOpacity = uiState.radarOpacity,
                weatherGrid = uiState.weatherGrid,
                activeLayer = uiState.activeLayer,
                tempUnit = uiState.tempUnit,
                showLocationDot = activeLocation.isCurrentLocation,
                modifier = Modifier.fillMaxSize()
            )
        }

        // ── Top bar ─────────────────────────────────────────────────────
        MapTopBar(
            weather = weather,
            locationName = activeLocation?.name ?: "Locating…",
            onLocationClick = { navController.navigate("locations") },
            onSettingsClick = { navController.navigate("settings") },
            modifier = Modifier
                .statusBarsPadding()
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .align(Alignment.TopCenter)
        )

        // ── Layer toggle rail ───────────────────────────────────────────
        LayerToggleRail(
            activeLayer = uiState.activeLayer,
            radarEnabled = uiState.radarEnabled,
            onLayerSelected = { layer ->
                viewModel.setActiveLayer(layer)
            },
            onRadarToggle = { viewModel.toggleRadar() },
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 12.dp)
                .padding(top = 80.dp)
        )

        // ── My location button ──────────────────────────────────────────
        MyLocationButton(
            onClick = {
                if (uiState.hasLocationPermission) {
                    viewModel.initializeLocation()
                }
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 16.dp, bottom = 280.dp)
        )

        // ── Bottom sheet with forecast ──────────────────────────────────
        if (weather != null && sheetExpanded) {
            ModalBottomSheet(
                onDismissRequest = { sheetExpanded = false },
                sheetState = sheetState,
                containerColor = SlateBase,
                dragHandle = null,
                tonalElevation = 0.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                ) {
                    WeatherBottomSheet(
                        weather = weather,
                        tempUnit = uiState.tempUnit
                    )
                }
            }
        }
    }
}
