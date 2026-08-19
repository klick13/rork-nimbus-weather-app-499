package com.rork.nimbushyperlocalweatherappandroid.ui

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rork.nimbushyperlocalweatherappandroid.App
import com.rork.nimbushyperlocalweatherappandroid.data.GeocodingResult
import com.rork.nimbushyperlocalweatherappandroid.data.LocationService
import com.rork.nimbushyperlocalweatherappandroid.data.LocationWeather
import com.rork.nimbushyperlocalweatherappandroid.data.SavedLocation
import com.rork.nimbushyperlocalweatherappandroid.data.TempUnit
import com.rork.nimbushyperlocalweatherappandroid.data.WeatherApiService
import com.rork.nimbushyperlocalweatherappandroid.data.WeatherGridPoint
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

data class WeatherUiState(
    val savedLocations: List<SavedLocation> = emptyList(),
    val weatherData: List<LocationWeather> = emptyList(),
    val selectedLocationId: String = "current",
    val tempUnit: TempUnit = TempUnit.F,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isRequestingLocation: Boolean = false,
    val error: String? = null,
    val locationPermissionDenied: Boolean = false,
    val hasCompletedOnboarding: Boolean = false,
    val isPro: Boolean = false,
)

class WeatherViewModel(
    private val apiService: WeatherApiService = WeatherApiService(),
    private val locationService: LocationService? = null,
) : ViewModel() {

    private val _uiState = MutableStateFlow(WeatherUiState())
    val uiState: StateFlow<WeatherUiState> = _uiState.asStateFlow()

    private val prefs = PrefsHolder

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            val saved = prefs.getSavedLocations()
            val selected = prefs.getSelectedLocation()
            val unit = prefs.getTempUnit()
            val onboarding = prefs.getOnboarding()

            _uiState.update {
                it.copy(
                    savedLocations = saved,
                    selectedLocationId = selected,
                    tempUnit = unit,
                    hasCompletedOnboarding = onboarding,
                )
            }

            if (saved.isNotEmpty()) {
                fetchAllWeather()
            } else {
                val defaults = listOf(
                    SavedLocation("current", "San Francisco", "California", "US", 37.7749, -122.4194, true),
                    SavedLocation("new-york", "New York", "New York", "US", 40.7128, -74.006, false),
                    SavedLocation("miami", "Miami", "Florida", "US", 25.7617, -80.1918, false),
                )
                prefs.saveLocations(defaults)
                _uiState.update { it.copy(savedLocations = defaults) }
                fetchAllWeather()
            }
        }
    }

    fun fetchAllWeather() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val locations = _uiState.value.savedLocations
                val unit = _uiState.value.tempUnit
                val results = locations.map { loc ->
                    try {
                        apiService.fetchWeatherForLocation(
                            lat = loc.lat,
                            lon = loc.lon,
                            locationId = loc.id,
                            locationName = loc.name,
                            region = loc.region,
                            country = loc.country,
                            isCurrentLocation = loc.isCurrentLocation,
                            unit = unit,
                            locationSource = loc.locationSource,
                        )
                    } catch (e: Exception) {
                        null
                    }
                }.filterNotNull()

                _uiState.update {
                    it.copy(
                        weatherData = results,
                        isLoading = false,
                        isRefreshing = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to load weather",
                    )
                }
            }
        }
    }

    fun refreshWeather() {
        _uiState.update { it.copy(isRefreshing = true) }
        fetchAllWeather()
    }

    fun selectLocation(id: String) {
        prefs.setSelectedLocation(id)
        _uiState.update { it.copy(selectedLocationId = id) }
    }

    fun toggleTempUnit() {
        val newUnit = if (_uiState.value.tempUnit == TempUnit.F) TempUnit.C else TempUnit.F
        prefs.setTempUnit(newUnit)
        _uiState.update { it.copy(tempUnit = newUnit) }
        fetchAllWeather()
    }

    fun completeOnboarding() {
        prefs.setOnboarding(true)
        _uiState.update { it.copy(hasCompletedOnboarding = true) }
    }

    fun updateCurrentLocation() {
        val service = locationService ?: return
        if (!service.hasLocationPermission()) {
            _uiState.update { it.copy(locationPermissionDenied = true) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isRequestingLocation = true, locationPermissionDenied = false) }
            try {
                val coords = service.getCurrentLocation()
                if (coords == null) {
                    _uiState.update { it.copy(isRequestingLocation = false) }
                    return@launch
                }

                val (name, region, country) = apiService.reverseGeocode(coords.lat, coords.lon)
                val currentIdx = _uiState.value.savedLocations.indexOfFirst { it.isCurrentLocation }
                val currentLocation = SavedLocation(
                    id = if (currentIdx >= 0) _uiState.value.savedLocations[currentIdx].id else "current",
                    name = name,
                    region = region,
                    country = country,
                    lat = coords.lat,
                    lon = coords.lon,
                    isCurrentLocation = true,
                    locationSource = coords.source,
                )

                val updated = if (currentIdx >= 0) {
                    _uiState.value.savedLocations.mapIndexed { i, loc -> if (i == currentIdx) currentLocation else loc }
                } else {
                    listOf(currentLocation) + _uiState.value.savedLocations
                }

                prefs.saveLocations(updated)
                _uiState.update {
                    it.copy(
                        savedLocations = updated,
                        selectedLocationId = currentLocation.id,
                        isRequestingLocation = false,
                    )
                }
                fetchAllWeather()
            } catch (e: Exception) {
                _uiState.update { it.copy(isRequestingLocation = false) }
            }
        }
    }

    fun addLocation(result: GeocodingResult) {
        val id = "${result.name.lowercase().replace(Regex("\\s+"), "-")}-${System.currentTimeMillis()}"
        val newSaved = SavedLocation(
            id = id,
            name = result.name,
            region = result.admin1 ?: "",
            country = result.country_code,
            lat = result.latitude,
            lon = result.longitude,
            isCurrentLocation = false,
        )
        val updated = _uiState.value.savedLocations + newSaved
        prefs.saveLocations(updated)
        _uiState.update { it.copy(savedLocations = updated) }
        fetchAllWeather()
    }

    fun addLocationByCoords(lat: Double, lon: Double) {
        viewModelScope.launch {
            val (name, region, country) = apiService.reverseGeocode(lat, lon)
            val result = GeocodingResult(
                id = (lat * 1000 + lon * 100).toInt(),
                name = name,
                latitude = lat,
                longitude = lon,
                country = country,
                admin1 = region,
                country_code = country,
            )
            addLocation(result)
        }
    }

    fun removeLocation(id: String) {
        val updated = _uiState.value.savedLocations.filter { it.id != id }
        prefs.saveLocations(updated)
        if (_uiState.value.selectedLocationId == id && updated.isNotEmpty()) {
            selectLocation(updated[0].id)
        }
        _uiState.update { it.copy(savedLocations = updated) }
        fetchAllWeather()
    }

    fun searchLocations(query: String, onResult: (List<GeocodingResult>) -> Unit) {
        viewModelScope.launch {
            val results = apiService.searchLocations(query)
            onResult(results)
        }
    }

    fun fetchWeatherGrid(
        centerLat: Double,
        centerLon: Double,
        zoom: Double,
        tileRadius: Double,
        gridDensity: Int,
        onResult: (List<WeatherGridPoint>) -> Unit,
    ) {
        viewModelScope.launch {
            val results = apiService.fetchWeatherGrid(
                centerLat, centerLon, zoom, tileRadius, gridDensity, _uiState.value.tempUnit
            )
            onResult(results)
        }
    }

    val selectedLocation: LocationWeather?
        get() = _uiState.value.weatherData.find { it.id == _uiState.value.selectedLocationId }
            ?: _uiState.value.weatherData.firstOrNull()
}

object PrefsHolder {
    private val prefs = App.appContext.getSharedPreferences("nimbus_prefs", Context.MODE_PRIVATE)

    fun getSavedLocations(): List<SavedLocation> {
        val json = prefs.getString("saved_locations", null) ?: return emptyList()
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { i ->
                val obj = arr.getJSONObject(i)
                SavedLocation(
                    id = obj.getString("id"),
                    name = obj.getString("name"),
                    region = obj.optString("region", ""),
                    country = obj.optString("country", "US"),
                    lat = obj.getDouble("lat"),
                    lon = obj.getDouble("lon"),
                    isCurrentLocation = obj.optBoolean("isCurrentLocation", false),
                    locationSource = obj.optString("locationSource", ""),
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveLocations(locations: List<SavedLocation>) {
        val arr = JSONArray()
        locations.forEach { loc ->
            val obj = JSONObject()
            obj.put("id", loc.id)
            obj.put("name", loc.name)
            obj.put("region", loc.region)
            obj.put("country", loc.country)
            obj.put("lat", loc.lat)
            obj.put("lon", loc.lon)
            obj.put("isCurrentLocation", loc.isCurrentLocation)
            loc.locationSource?.let { obj.put("locationSource", it) }
            arr.put(obj)
        }
        prefs.edit().putString("saved_locations", arr.toString()).apply()
    }

    fun getSelectedLocation(): String = prefs.getString("selected_location", "current") ?: "current"

    fun setSelectedLocation(id: String) {
        prefs.edit().putString("selected_location", id).apply()
    }

    fun getTempUnit(): TempUnit {
        val str = prefs.getString("temp_unit", "F") ?: "F"
        return if (str == "C") TempUnit.C else TempUnit.F
    }

    fun setTempUnit(unit: TempUnit) {
        prefs.edit().putString("temp_unit", unit.name).apply()
    }

    fun getOnboarding(): Boolean = prefs.getBoolean("onboarding_complete", false)

    fun setOnboarding(complete: Boolean) {
        prefs.edit().putBoolean("onboarding_complete", complete).apply()
    }
}
