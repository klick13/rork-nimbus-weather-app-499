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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.data.GeocodingResult
import com.rork.nimbushyperlocalweatherappandroid.ui.WeatherViewModel
import com.rork.nimbushyperlocalweatherappandroid.ui.components.iconForCondition
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.BackgroundDark
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.BackgroundMid
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary
import kotlinx.coroutines.delay

@Composable
fun LocationsScreen(
    viewModel: WeatherViewModel,
    onBack: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<GeocodingResult>>(emptyList()) }

    // Debounced search
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 20.dp),
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Locations",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                )
            }

            // Search bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardBackground, RoundedCornerShape(12.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(12.dp))
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = "Search",
                    tint = TextSecondary,
                    modifier = Modifier.size(20.dp),
                )
                BasicTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    singleLine = true,
                    textStyle = TextStyle(
                        color = TextPrimary,
                        fontSize = 15.sp,
                    ),
                    cursorBrush = SolidColor(Accent),
                    modifier = Modifier.weight(1f),
                    decorationBox = { inner ->
                        if (searchQuery.isEmpty()) {
                            Text(
                                text = "Search city or zip code...",
                                fontSize = 15.sp,
                                color = TextSecondary,
                            )
                        }
                        inner()
                    },
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Search results
            if (searchResults.isNotEmpty()) {
                Text(
                    text = "Search Results",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(searchResults) { result ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(CardBackground, RoundedCornerShape(12.dp))
                                .border(1.dp, CardBorder, RoundedCornerShape(12.dp))
                                .clickable {
                                    viewModel.addLocation(result)
                                    searchQuery = ""
                                    searchResults = emptyList()
                                }
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column {
                                Text(
                                    text = result.name,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TextPrimary,
                                )
                                Text(
                                    text = "${result.admin1 ?: ""}${if (result.admin1 != null) ", " else ""}${result.country}",
                                    fontSize = 12.sp,
                                    color = TextSecondary,
                                )
                            }
                            Icon(
                                imageVector = Icons.Filled.Add,
                                contentDescription = "Add",
                                tint = Accent,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                }
            } else {
                // Saved locations
                Text(
                    text = "Saved Locations",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(uiState.savedLocations) { savedLoc ->
                        val weather = uiState.weatherData.find { it.id == savedLoc.id }
                        val isSelected = savedLoc.id == uiState.selectedLocationId
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    if (isSelected) Accent.copy(alpha = 0.12f) else CardBackground,
                                    RoundedCornerShape(16.dp),
                                )
                                .border(
                                    1.dp,
                                    if (isSelected) Accent.copy(alpha = 0.3f) else CardBorder,
                                    RoundedCornerShape(16.dp),
                                )
                                .clickable {
                                    viewModel.selectLocation(savedLoc.id)
                                    onBack()
                                }
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            // Location info
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                modifier = Modifier.weight(1f),
                            ) {
                                if (savedLoc.isCurrentLocation) {
                                    Icon(
                                        imageVector = Icons.Filled.LocationOn,
                                        contentDescription = "Current",
                                        tint = if (savedLoc.locationSource == "gps") NeonGreen else Accent,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }
                                Column {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    ) {
                                        Text(
                                            text = savedLoc.name,
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = TextPrimary,
                                        )
                                        if (savedLoc.locationSource == "gps") {
                                            Box(
                                                modifier = Modifier
                                                    .background(NeonGreen.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                                    .padding(horizontal = 5.dp, vertical = 1.dp),
                                            ) {
                                                Text("GPS", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = NeonGreen)
                                            }
                                        } else if (savedLoc.locationSource == "network") {
                                            Box(
                                                modifier = Modifier
                                                    .background(Color(0xFFFFC800).copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                                    .padding(horizontal = 5.dp, vertical = 1.dp),
                                            ) {
                                                Text("NET", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFFC800))
                                            }
                                        }
                                    }
                                    Text(
                                        text = "${savedLoc.region}${if (savedLoc.region.isNotEmpty()) ", " else ""}${savedLoc.country}",
                                        fontSize = 12.sp,
                                        color = TextSecondary,
                                    )
                                    if (weather != null) {
                                        Text(
                                            text = "${weather.currentTemp}° • ${weather.condition.main}",
                                            fontSize = 13.sp,
                                            color = TextSecondary,
                                            modifier = Modifier.padding(top = 2.dp),
                                        )
                                    }
                                }
                            }

                            // Delete button (not for current location)
                            if (!savedLoc.isCurrentLocation) {
                                Icon(
                                    imageVector = Icons.Filled.Delete,
                                    contentDescription = "Remove",
                                    tint = TextSecondary,
                                    modifier = Modifier
                                        .size(18.dp)
                                        .clickable { viewModel.removeLocation(savedLoc.id) },
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}
