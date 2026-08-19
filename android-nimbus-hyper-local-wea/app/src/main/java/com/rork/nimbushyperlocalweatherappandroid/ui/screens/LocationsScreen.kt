package com.rork.nimbushyperlocalweatherappandroid.ui.screens

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.NavigateNext
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.data.GeocodingResult
import com.rork.nimbushyperlocalweatherappandroid.ui.WeatherViewModel
import com.rork.nimbushyperlocalweatherappandroid.ui.components.AtmosphericBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.components.iconForCondition
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.BackgroundDark
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary
import kotlinx.coroutines.delay

@Composable
fun LocationsScreen(
    viewModel: WeatherViewModel,
    onNavigateToWeather: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<GeocodingResult>>(emptyList()) }
    var showCoords by remember { mutableStateOf(false) }
    var latInput by remember { mutableStateOf("") }
    var lonInput by remember { mutableStateOf("") }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions.values.any { it }) {
            viewModel.updateCurrentLocation()
        }
    }

    LaunchedEffect(searchQuery) {
        if (searchQuery.length >= 2) {
            delay(400)
            viewModel.searchLocations(searchQuery) { results ->
                searchResults = results
            }
        } else {
            searchResults = emptyList()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark),
    ) {
        AtmosphericBackground(
            conditionId = uiState.weatherData.find { it.id == uiState.selectedLocationId }?.condition?.id ?: "clear",
            isDay = true,
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .padding(horizontal = 20.dp),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Icon(
                    Icons.Filled.ArrowBack,
                    "Back",
                    tint = TextPrimary,
                    modifier = Modifier.size(22.dp).clickable { onNavigateToWeather() },
                )
                Text("Weather", fontSize = 16.sp, color = TextPrimary, fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable { onNavigateToWeather() })
            }

            Text(
                text = "Locations",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
            )
            Text(
                text = "${uiState.savedLocations.size} saved location${if (uiState.savedLocations.size != 1) "s" else ""}",
                fontSize = 14.sp,
                color = TextSecondary,
                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.linearGradient(listOf(Color(0x1F00F0FF), Color(0x0F3DFF14))),
                        RoundedCornerShape(16.dp),
                    )
                    .border(1.dp, Accent.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                    .clickable {
                        permissionLauncher.launch(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION,
                            )
                        )
                    }
                    .padding(16.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    if (uiState.isRequestingLocation) {
                        CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp, color = NeonGreen)
                    } else {
                        Icon(Icons.Filled.MyLocation, "Locate", tint = NeonGreen, modifier = Modifier.size(22.dp))
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Use My Precise Location", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = NeonGreen)
                        Text("GPS-accurate weather for exactly where you are", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(top = 3.dp))
                    }
                    Icon(Icons.Filled.NavigateNext, "Go", tint = Accent, modifier = Modifier.size(18.dp))
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardBackground, RoundedCornerShape(14.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(14.dp))
                    .padding(horizontal = 14.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(Icons.Filled.Search, "Search", tint = Accent, modifier = Modifier.size(16.dp))
                BasicTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    singleLine = true,
                    textStyle = TextStyle(color = TextPrimary, fontSize = 16.sp),
                    cursorBrush = SolidColor(Accent),
                    modifier = Modifier.weight(1f),
                    decorationBox = { inner ->
                        if (searchQuery.isEmpty()) {
                            Text("Search city, address, or zip code...", fontSize = 15.sp, color = TextSecondary)
                        }
                        inner()
                    },
                )
                if (searchQuery.isNotEmpty()) {
                    Icon(Icons.Filled.Close, "Clear", tint = TextSecondary, modifier = Modifier.size(16.dp).clickable {
                        searchQuery = ""
                        searchResults = emptyList()
                    })
                }
            }

            if (searchResults.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                searchResults.forEach { result ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(CardBackground, RoundedCornerShape(14.dp))
                            .border(1.dp, CardBorder, RoundedCornerShape(14.dp))
                            .clickable {
                                viewModel.addLocation(result)
                                searchQuery = ""
                                searchResults = emptyList()
                            }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.LocationOn, "Location", tint = Accent, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(result.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            Text("${result.admin1 ?: ""}${if (result.admin1 != null) ", " else ""}${result.country}", fontSize = 12.sp, color = TextSecondary)
                        }
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(Accent.copy(alpha = 0.1f), RoundedCornerShape(10.dp))
                                .border(1.dp, Accent.copy(alpha = 0.2f), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Filled.Add, "Add", tint = Accent, modifier = Modifier.size(16.dp))
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Accent.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
                    .border(1.dp, Accent.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                    .clickable { showCoords = !showCoords }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(Icons.Filled.LocationOn, "Coords", tint = Accent, modifier = Modifier.size(14.dp))
                    Text(
                        if (showCoords) "Hide coordinates input" else "Add by exact coordinates",
                        fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Accent,
                    )
                }
            }

            if (showCoords) {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("LATITUDE", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Accent.copy(alpha = 0.7f))
                        BasicTextField(
                            value = latInput,
                            onValueChange = { latInput = it },
                            singleLine = true,
                            textStyle = TextStyle(color = TextPrimary, fontSize = 15.sp),
                            cursorBrush = SolidColor(Accent),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 4.dp)
                                .background(Accent.copy(alpha = 0.04f), RoundedCornerShape(10.dp))
                                .border(1.dp, Accent.copy(alpha = 0.12f), RoundedCornerShape(10.dp))
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            decorationBox = { inner ->
                                if (latInput.isEmpty()) { Text("e.g. 37.7749", fontSize = 15.sp, color = TextSecondary) }
                                inner()
                            },
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("LONGITUDE", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Accent.copy(alpha = 0.7f))
                        BasicTextField(
                            value = lonInput,
                            onValueChange = { lonInput = it },
                            singleLine = true,
                            textStyle = TextStyle(color = TextPrimary, fontSize = 15.sp),
                            cursorBrush = SolidColor(Accent),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 4.dp)
                                .background(Accent.copy(alpha = 0.04f), RoundedCornerShape(10.dp))
                                .border(1.dp, Accent.copy(alpha = 0.12f), RoundedCornerShape(10.dp))
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            decorationBox = { inner ->
                                if (lonInput.isEmpty()) { Text("e.g. -122.4194", fontSize = 15.sp, color = TextSecondary) }
                                inner()
                            },
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                val lat = latInput.trim().toDoubleOrNull()
                val lon = lonInput.trim().toDoubleOrNull()
                val valid = lat != null && lon != null && lat in -90.0..90.0 && lon in -180.0..180.0
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(if (valid) Accent else Accent.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                        .clickable {
                            if (valid) {
                                viewModel.addLocationByCoords(lat!!, lon!!)
                                latInput = ""
                                lonInput = ""
                                showCoords = false
                            }
                        }
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("Add Location", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BackgroundDark)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            uiState.savedLocations.forEach { savedLoc ->
                val weather = uiState.weatherData.find { it.id == savedLoc.id }
                val isSelected = savedLoc.id == uiState.selectedLocationId
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (isSelected) Brush.linearGradient(listOf(Color(0x1400F0FF), Color(0x0800F0FF)))
                            else Brush.linearGradient(listOf(CardBackground, CardBackground)),
                            RoundedCornerShape(16.dp),
                        )
                        .border(
                            1.dp,
                            if (isSelected) Accent.copy(alpha = 0.25f) else CardBorder,
                            RoundedCornerShape(16.dp),
                        )
                        .clickable {
                            viewModel.selectLocation(savedLoc.id)
                            onNavigateToWeather()
                        }
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            if (savedLoc.isCurrentLocation) {
                                Icon(
                                    Icons.Filled.LocationOn,
                                    "Current",
                                    tint = if (savedLoc.locationSource == "gps") NeonGreen else Color(0xFFF0FF00),
                                    modifier = Modifier.size(12.dp),
                                )
                            }
                            Text(savedLoc.name, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            if (savedLoc.isCurrentLocation) {
                                Box(
                                    modifier = Modifier
                                        .background(
                                            if (savedLoc.locationSource == "network") Color(0xFFF0FF00).copy(alpha = 0.1f)
                                            else NeonGreen.copy(alpha = 0.1f),
                                            RoundedCornerShape(6.dp),
                                        )
                                        .border(
                                            1.dp,
                                            if (savedLoc.locationSource == "network") Color(0xFFF0FF00).copy(alpha = 0.25f)
                                            else NeonGreen.copy(alpha = 0.2f),
                                            RoundedCornerShape(6.dp),
                                        )
                                        .padding(horizontal = 6.dp, vertical = 2.dp),
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Box(modifier = Modifier.size(4.dp).background(
                                            if (savedLoc.locationSource == "network") Color(0xFFF0FF00) else NeonGreen,
                                            RoundedCornerShape(2.dp),
                                        ))
                                        Text(
                                            if (savedLoc.locationSource == "network") "NETWORK" else "GPS",
                                            fontSize = 9.sp, fontWeight = FontWeight.Bold,
                                            color = if (savedLoc.locationSource == "network") Color(0xFFF0FF00) else NeonGreen,
                                        )
                                    }
                                }
                            }
                        }
                        Text(
                            "${savedLoc.region}${if (savedLoc.region.isNotEmpty()) " · " else ""}${weather?.condition?.main ?: ""}",
                            fontSize = 12.sp, color = TextSecondary,
                        )
                        Text(
                            "${String.format("%.4f", savedLoc.lat)}°, ${String.format("%.4f", savedLoc.lon)}°",
                            fontSize = 10.sp, color = Accent.copy(alpha = 0.5f),
                        )
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            iconForCondition(weather?.condition?.icon ?: "cloud"),
                            weather?.condition?.main ?: "",
                            tint = if (isSelected) Accent else TextSecondary,
                            modifier = Modifier.size(28.dp),
                        )
                        Text(
                            "${weather?.currentTemp ?: "--"}°",
                            fontSize = 28.sp, fontWeight = FontWeight.Thin,
                            color = if (isSelected) Accent else TextPrimary,
                        )
                        Text("H:${weather?.high ?: "--"}° L:${weather?.low ?: "--"}°", fontSize = 10.sp, color = TextSecondary)
                    }
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.padding(start = 12.dp),
                    ) {
                        if (!savedLoc.isCurrentLocation) {
                            Icon(
                                Icons.Filled.Delete, "Remove",
                                tint = TextSecondary,
                                modifier = Modifier.size(16.dp).clickable { viewModel.removeLocation(savedLoc.id) },
                            )
                        }
                        Icon(Icons.Filled.NavigateNext, "Open", tint = TextSecondary, modifier = Modifier.size(16.dp))
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
            }

            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}
