package com.rork.nimbushyperlocalweatherappandroid.data.api

import android.content.Context
import android.content.SharedPreferences
import com.rork.nimbushyperlocalweatherappandroid.data.model.SavedLocation
import com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit
import com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherLayer
import kotlinx.serialization.json.Json

/**
 * SharedPreferences-backed persistence for app settings, saved locations,
 * and the active location. Keeps the app stateless across process restarts
 * without a full database.
 */
class SettingsStore(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("nimbus_settings", Context.MODE_PRIVATE)

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    // ── Units ──────────────────────────────────────────────────────────────

    var tempUnit: TempUnit
        get() = if (prefs.getString(KEY_TEMP_UNIT, "F") == "C") TempUnit.C else TempUnit.F
        set(value) = prefs.edit().putString(KEY_TEMP_UNIT, value.name).apply()

    var radarOpacity: Float
        get() = prefs.getFloat(KEY_RADAR_OPACITY, 0.7f)
        set(value) = prefs.edit().putFloat(KEY_RADAR_OPACITY, value.coerceIn(0.2f, 1.0f)).apply()

    var activeLayer: WeatherLayer
        get() {
            val name = prefs.getString(KEY_ACTIVE_LAYER, WeatherLayer.RADAR.name)
            return WeatherLayer.entries.firstOrNull { it.name == name } ?: WeatherLayer.RADAR
        }
        set(value) = prefs.edit().putString(KEY_ACTIVE_LAYER, value.name).apply()

    var radarEnabled: Boolean
        get() = prefs.getBoolean(KEY_RADAR_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_RADAR_ENABLED, value).apply()

    // ── Active location ─────────────────────────────────────────────────────

    var activeLocation: SavedLocation?
        get() {
            val str = prefs.getString(KEY_ACTIVE_LOCATION, null) ?: return null
            return try { json.decodeFromString<SavedLocation>(str) } catch (e: Exception) { null }
        }
        set(value) {
            val str = if (value != null) json.encodeToString(SavedLocation.serializer(), value) else null
            prefs.edit().putString(KEY_ACTIVE_LOCATION, str).apply()
        }

    // ── Saved locations list ────────────────────────────────────────────────

    var savedLocations: List<SavedLocation>
        get() {
            val str = prefs.getString(KEY_SAVED_LOCATIONS, null) ?: return emptyList()
            return try {
                json.decodeFromString<List<SavedLocation>>(str)
            } catch (e: Exception) {
                emptyList()
            }
        }
        set(value) {
            val str = json.encodeToString(
                kotlinx.serialization.builtins.ListSerializer(SavedLocation.serializer()),
                value
            )
            prefs.edit().putString(KEY_SAVED_LOCATIONS, str).apply()
        }

    fun addSavedLocation(location: SavedLocation) {
        val current = savedLocations.toMutableList()
        if (current.none { it.id == location.id }) {
            current.add(location)
            savedLocations = current
        }
    }

    fun removeSavedLocation(id: String) {
        savedLocations = savedLocations.filterNot { it.id == id }
    }

    companion object {
        private const val KEY_TEMP_UNIT = "temp_unit"
        private const val KEY_RADAR_OPACITY = "radar_opacity"
        private const val KEY_ACTIVE_LAYER = "active_layer"
        private const val KEY_RADAR_ENABLED = "radar_enabled"
        private const val KEY_ACTIVE_LOCATION = "active_location"
        private const val KEY_SAVED_LOCATIONS = "saved_locations"
    }
}
