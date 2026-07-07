package com.rork.nimbushyperlocalweatherappandroid.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.rork.nimbushyperlocalweatherappandroid.data.api.LocationService
import com.rork.nimbushyperlocalweatherappandroid.data.api.RainViewerApiService
import com.rork.nimbushyperlocalweatherappandroid.data.api.SettingsStore
import com.rork.nimbushyperlocalweatherappandroid.data.api.WeatherApiService
import com.rork.nimbushyperlocalweatherappandroid.data.api.WeatherMapper
import com.rork.nimbushyperlocalweatherappandroid.data.api.toSavedLocation
import com.rork.nimbushyperlocalweatherappandroid.data.model.GeocodingResult
import com.rork.nimbushyperlocalweatherappandroid.data.model.LocationWeather
import com.rork.nimbushyperlocalweatherappandroid.data.model.RainViewerCoverage
import com.rork.nimbushyperlocalweatherappandroid.data.model.SavedLocation
import com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit
import com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherGridPoint
import com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherLayer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class WeatherUiState(
    val isLoading: Boolean = false,
    val isMapLoading: Boolean = false,
    val activeLocation: SavedLocation? = null,
    val weather: LocationWeather? = null,
    val weatherGrid: List<WeatherGridPoint> = emptyList(),
    val rainViewerCoverage: RainViewerCoverage? = null,
    val savedLocations: List<SavedLocation> = emptyList(),
    val tempUnit: TempUnit = TempUnit.F,
    val activeLayer: WeatherLayer = WeatherLayer.RADAR,
    val radarEnabled: Boolean = true,
    val radarOpacity: Float = 0.7f,
    val error: String? = null,
    val hasLocationPermission: Boolean = false
)

class WeatherViewModel(application: Application) : AndroidViewModel(application) {

    private val weatherApi = WeatherApiService()
    private val rainViewerApi = RainViewerApiService()
    private val locationService = LocationService(application)
    private val settings = SettingsStore(application)

    private val _uiState = MutableStateFlow(WeatherUiState())
    val uiState: StateFlow<WeatherUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
        _uiState.value = _uiState.value.copy(
            savedLocations = settings.savedLocations,
            hasLocationPermission = locationService.hasLocationPermission()
        )
    }

    private fun loadSettings() {
        _uiState.value = _uiState.value.copy(
            tempUnit = settings.tempUnit,
            activeLayer = settings.activeLayer,
            radarEnabled = settings.radarEnabled,
            radarOpacity = settings.radarOpacity
        )
    }

    fun setActiveLayer(layer: WeatherLayer) {
        settings.activeLayer = layer
        _uiState.value = _uiState.value.copy(activeLayer = layer)
        if (layer == WeatherLayer.WIND || layer == WeatherLayer.TEMPERATURE) {
            fetchWeatherGrid()
        }
    }

    fun toggleRadar() {
        val newVal = !_uiState.value.radarEnabled
        settings.radarEnabled = newVal
        _uiState.value = _uiState.value.copy(radarEnabled = newVal)
    }

    fun setRadarOpacity(opacity: Float) {
        settings.radarOpacity = opacity
        _uiState.value = _uiState.value.copy(radarOpacity = opacity)
    }

    fun setTempUnit(unit: TempUnit) {
        settings.tempUnit = unit
        _uiState.value = _uiState.value.copy(tempUnit = unit)
        // Refetch weather for active location with new unit
        _uiState.value.activeLocation?.let { fetchWeather(it) }
    }

    fun onPermissionGranted() {
        _uiState.value = _uiState.value.copy(hasLocationPermission = true)
        initializeLocation()
    }

    fun initializeLocation() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                // Try active location from settings first
                val saved = settings.activeLocation
                if (saved != null) {
                    fetchWeather(saved)
                    fetchRainViewer()
                    return@launch
                }
                // Try GPS current location
                if (locationService.hasLocationPermission()) {
                    val gpsLoc = locationService.getCurrentLocation()
                    if (gpsLoc != null) {
                        settings.activeLocation = gpsLoc
                        fetchWeather(gpsLoc)
                        fetchRainViewer()
                        return@launch
                    }
                }
                // Default fallback — Kansas City (central US)
                val fallback = SavedLocation(
                    id = "default_kc",
                    name = "Kansas City",
                    region = "MO",
                    country = "US",
                    lat = 39.0997,
                    lon = -94.5786
                )
                settings.activeLocation = fallback
                fetchWeather(fallback)
                fetchRainViewer()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Could not load weather: ${e.message}"
                )
            }
        }
    }

    fun selectLocation(location: SavedLocation) {
        settings.activeLocation = location
        _uiState.value = _uiState.value.copy(activeLocation = location)
        fetchWeather(location)
        fetchRainViewer()
    }

    fun fetchWeather(location: SavedLocation) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, activeLocation = location)
            try {
                val raw = withContext(Dispatchers.IO) {
                    weatherApi.fetchWeatherRaw(location.lat, location.lon, _uiState.value.tempUnit)
                }
                if (raw != null) {
                    val mapped = WeatherMapper.toLocationWeather(raw, location, _uiState.value.tempUnit)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        weather = mapped
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Failed to fetch weather data"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message
                )
            }
        }
    }

    fun fetchRainViewer() {
        viewModelScope.launch {
            try {
                val coverage = withContext(Dispatchers.IO) { rainViewerApi.fetchCoverage() }
                if (coverage != null) {
                    _uiState.value = _uiState.value.copy(rainViewerCoverage = coverage)
                }
            } catch (e: Exception) {
                // Non-fatal — radar just won't show
            }
        }
    }

    fun fetchWeatherGrid() {
        val loc = _uiState.value.activeLocation ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isMapLoading = true)
            try {
                val grid = withContext(Dispatchers.IO) {
                    weatherApi.fetchWeatherGrid(loc.lat, loc.lon, 5, _uiState.value.tempUnit)
                }
                _uiState.value = _uiState.value.copy(
                    weatherGrid = grid,
                    isMapLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isMapLoading = false)
            }
        }
    }

    // ── Saved locations ──────────────────────────────────────────────────

    fun addLocation(result: GeocodingResult) {
        val location = result.toSavedLocation()
        settings.addSavedLocation(location)
        _uiState.value = _uiState.value.copy(savedLocations = settings.savedLocations)
        selectLocation(location)
    }

    fun removeLocation(id: String) {
        settings.removeSavedLocation(id)
        _uiState.value = _uiState.value.copy(savedLocations = settings.savedLocations)
    }

    fun searchLocations(query: String, onResult: (List<GeocodingResult>) -> Unit) {
        viewModelScope.launch {
            val results = withContext(Dispatchers.IO) { weatherApi.searchLocations(query) }
            onResult(results)
        }
    }
}
