package com.rork.nimbushyperlocalweatherappandroid.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.rork.nimbushyperlocalweatherappandroid.data.model.GeocodingResult
import com.rork.nimbushyperlocalweatherappandroid.data.model.SavedLocation
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CyanAccent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateBase
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateSurface
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.SlateSurfaceVariant
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary
import com.rork.nimbushyperlocalweatherappandroid.ui.viewmodel.WeatherViewModel
import kotlinx.coroutines.delay

/**
 * Saved Locations screen — list of saved places + search by city/ZIP.
 * Tapping a location switches the map + forecast to it.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationsScreen(
    navController: NavController,
    viewModel: WeatherViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var isSearching by remember { mutableStateOf(false) }
    val searchResults = remember { mutableStateListOf<GeocodingResult>() }

    // Debounced search
    LaunchedEffect(searchQuery) {
        if (searchQuery.length >= 2) {
            isSearching = true
            delay(400)
            viewModel.searchLocations(searchQuery) { results ->
                searchResults.clear()
                searchResults.addAll(results)
                isSearching = false
            }
        } else {
            searchResults.clear()
            isSearching = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Locations", color = TextPrimary) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = TextPrimary
                        )
                    }
                },
                colors = androidx.compose.material3.TopAppBarDefaults.topAppBarColors(
                    containerColor = SlateBase
                )
            )
        },
        containerColor = SlateBase
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            // Search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search city or ZIP", color = TextSecondary) },
                leadingIcon = {
                    Icon(Icons.Filled.Search, contentDescription = "Search", tint = TextSecondary)
                },
                trailingIcon = {
                    if (isSearching) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = CyanAccent
                        )
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = SlateSurface,
                    unfocusedContainerColor = SlateSurface,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedBorderColor = CyanAccent,
                    unfocusedBorderColor = SlateBorder
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (searchResults.isNotEmpty()) {
                Text(
                    "Search Results",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(searchResults) { result ->
                        LocationSearchRow(result) {
                            viewModel.addLocation(result)
                            searchQuery = ""
                            searchResults.clear()
                            navController.popBackStack()
                        }
                    }
                }
            } else {
                Text(
                    "Saved Locations",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Current GPS location pinned at top
                    val active = uiState.activeLocation
                    if (active != null && active.isCurrentLocation) {
                        item {
                            SavedLocationRow(
                                location = active,
                                isActive = true,
                                onClick = {
                                    viewModel.selectLocation(active)
                                    navController.popBackStack()
                                }
                            )
                        }
                    }
                    items(uiState.savedLocations) { loc ->
                        SavedLocationRow(
                            location = loc,
                            isActive = active?.id == loc.id,
                            onClick = {
                                viewModel.selectLocation(loc)
                                navController.popBackStack()
                            },
                            onRemove = { viewModel.removeLocation(loc.id) }
                        )
                    }
                    if (uiState.savedLocations.isEmpty() && !(active?.isCurrentLocation == true)) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Filled.Add,
                                        contentDescription = "Add",
                                        tint = TextSecondary,
                                        modifier = Modifier.size(32.dp)
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        "Search above to add locations",
                                        fontSize = 13.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LocationSearchRow(
    result: GeocodingResult,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SlateSurface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Filled.LocationOn,
                contentDescription = "Location",
                tint = CyanAccent,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    text = result.name,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary
                )
                val regionStr = listOfNotNull(
                    result.admin1.takeIf { it.isNotEmpty() },
                    result.country.takeIf { it.isNotEmpty() }
                ).joinToString(", ")
                if (regionStr.isNotEmpty()) {
                    Text(regionStr, fontSize = 12.sp, color = TextSecondary)
                }
            }
        }
    }
}

@Composable
private fun SavedLocationRow(
    location: SavedLocation,
    isActive: Boolean,
    onClick: () -> Unit,
    onRemove: (() -> Unit)? = null
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) SlateSurfaceVariant else SlateSurface
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Filled.LocationOn,
                contentDescription = "Location",
                tint = if (isActive) CyanAccent else TextSecondary,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = location.name,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary
                )
                val regionStr = listOfNotNull(
                    location.region.takeIf { it.isNotEmpty() },
                    location.country.takeIf { it.isNotEmpty() }
                ).joinToString(", ")
                if (regionStr.isNotEmpty()) {
                    Text(regionStr, fontSize = 12.sp, color = TextSecondary)
                }
            }
            if (isActive) {
                Text(
                    "Active",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = CyanAccent
                )
            }
        }
    }
}
