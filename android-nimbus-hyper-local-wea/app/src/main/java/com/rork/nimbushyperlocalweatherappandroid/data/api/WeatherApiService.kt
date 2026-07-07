package com.rork.nimbushyperlocalweatherappandroid.data.api

import com.rork.nimbushyperlocalweatherappandroid.data.model.GeocodingResponse
import com.rork.nimbushyperlocalweatherappandroid.data.model.GeocodingResult
import com.rork.nimbushyperlocalweatherappandroid.data.model.OpenMeteoResponse
import com.rork.nimbushyperlocalweatherappandroid.data.model.OpenMeteoGridCurrent
import com.rork.nimbushyperlocalweatherappandroid.data.model.OpenMeteoGridDaily
import com.rork.nimbushyperlocalweatherappandroid.data.model.OpenMeteoGridResponse
import com.rork.nimbushyperlocalweatherappandroid.data.model.OpenMeteoHourly
import com.rork.nimbushyperlocalweatherappandroid.data.model.OpenMeteoCurrent
import com.rork.nimbushyperlocalweatherappandroid.data.model.OpenMeteoDaily
import com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherGridPoint
import com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.statement.bodyAsText
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.contentOrNull

class WeatherApiService {

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    private val client = HttpClient {
        install(ContentNegotiation) {
            this.json(this@WeatherApiService.json)
        }
    }

    companion object {
        private const val GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
        private const val WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
        private const val ZIP_GEOCODE_URL = "https://api.zippopotam.us/us"
    }

    suspend fun searchLocations(query: String): List<GeocodingResult> {
        if (query.length < 2) return emptyList()
        return try {
            val trimmed = query.trim()
            // Try as zip code first
            if (trimmed.matches(Regex("^\\d{5}(-\\d{4})?$"))) {
                val zipResults = searchByZip(trimmed.substring(0, 5))
                if (zipResults.isNotEmpty()) return zipResults
            }
            val response: GeocodingResponse =
                client.get(GEOCODING_URL) {
                    parameter("name", trimmed)
                    parameter("count", 8)
                    parameter("language", "en")
                    parameter("format", "json")
                }.body()
            response.results
        } catch (e: Exception) {
            emptyList()
        }
    }

    private suspend fun searchByZip(zip: String): List<GeocodingResult> {
        return try {
            val response = client.get("$ZIP_GEOCODE_URL/$zip")
            if (!response.status.value.let { it in 200..299 }) return emptyList()
            val text = response.bodyAsText()
            val obj = json.parseToJsonElement(text).jsonObject
            val places = obj["places"]?.jsonArray ?: return emptyList()
            if (places.isEmpty()) return emptyList()
            val place = places[0].jsonObject
            val country = obj["country abbreviation"]?.jsonPrimitive?.contentOrNull ?: "US"
            listOf(
                GeocodingResult(
                    id = zip.toIntOrNull() ?: 0,
                    name = place["place name"]?.jsonPrimitive?.contentOrNull ?: zip,
                    latitude = place["latitude"]?.jsonPrimitive?.double ?: 0.0,
                    longitude = place["longitude"]?.jsonPrimitive?.double ?: 0.0,
                    country = country,
                    admin1 = place["state"]?.jsonPrimitive?.contentOrNull ?: "",
                    countryCode = country
                )
            )
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun fetchWeatherRaw(
        lat: Double,
        lon: Double,
        unit: TempUnit
    ): OpenMeteoResponse? {
        return try {
            val tempUnitParam = if (unit == TempUnit.C) "celsius" else "fahrenheit"
            val windUnit = if (unit == TempUnit.C) "kmh" else "mph"
            val precipUnit = if (unit == TempUnit.C) "mm" else "inch"
            client.get(WEATHER_URL) {
                parameter("latitude", lat)
                parameter("longitude", lon)
                parameter(
                    "current",
                    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day,wind_gusts_10m"
                )
                parameter(
                    "hourly",
                    "temperature_2m,weather_code,precipitation_probability,is_day,wind_speed_10m,wind_gusts_10m,cape"
                )
                parameter(
                    "daily",
                    "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,sunrise,sunset,uv_index_max"
                )
                parameter("temperature_unit", tempUnitParam)
                parameter("wind_speed_unit", windUnit)
                parameter("precipitation_unit", precipUnit)
                parameter("forecast_days", 7)
                parameter("forecast_hours", 24)
                parameter("timezone", "auto")
            }.body()
        } catch (e: Exception) {
            null
        }
    }

    suspend fun fetchWeatherGrid(
        centerLat: Double,
        centerLon: Double,
        density: Int,
        unit: TempUnit
    ): List<WeatherGridPoint> {
        return try {
            // Build grid points
            val halfRange = 3.0 // degrees
            val minLat = (centerLat - halfRange).coerceIn(-85.0, 85.0)
            val maxLat = (centerLat + halfRange).coerceIn(-85.0, 85.0)
            val minLon = centerLon - halfRange
            val maxLon = centerLon + halfRange

            val points = mutableListOf<Pair<Double, Double>>()
            val stepLat = if (density > 1) (maxLat - minLat) / (density - 1) else 0.0
            val stepLon = if (density > 1) (maxLon - minLon) / (density - 1) else 0.0
            for (row in 0 until density) {
                for (col in 0 until density) {
                    val lat = minLat + row * stepLat
                    val lon = normalizeLongitude(minLon + col * stepLon)
                    points.add(lat to lon)
                }
            }

            val tempUnitParam = if (unit == TempUnit.C) "celsius" else "fahrenheit"
            val windUnit = if (unit == TempUnit.C) "kmh" else "mph"

            val latParam = points.joinToString(",") { it.first.toString() }
            val lonParam = points.joinToString(",") { it.second.toString() }

            val response = client.get(WEATHER_URL) {
                parameter("latitude", latParam)
                parameter("longitude", lonParam)
                parameter("current", "temperature_2m,wind_speed_10m,wind_direction_10m")
                parameter("daily", "uv_index_max")
                parameter("temperature_unit", tempUnitParam)
                parameter("wind_speed_unit", windUnit)
                parameter("forecast_days", 1)
                parameter("timezone", "auto")
            }
            val text = response.bodyAsText()
            val element = json.parseToJsonElement(text)
            val list: List<JsonObject> = if (element is JsonArray) {
                element.mapNotNull { it as? JsonObject }
            } else {
                listOf(element as JsonObject)
            }

            points.mapIndexed { i, pt ->
                val entry = list.getOrNull(i)
                val current = entry?.get("current") as? JsonObject
                if (current == null) {
                    WeatherGridPoint(pt.first, pt.second, 0, 0, 0, 0, false)
                } else {
                    val daily = entry["daily"] as? JsonObject
                    val uvMax = daily?.get("uv_index_max")?.jsonArray?.firstOrNull()?.jsonPrimitive?.double ?: 0.0
                    WeatherGridPoint(
                        lat = pt.first,
                        lon = pt.second,
                        temp = (current["temperature_2m"]?.jsonPrimitive?.double ?: 0.0).toInt(),
                        windSpeed = (current["wind_speed_10m"]?.jsonPrimitive?.double ?: 0.0).toInt(),
                        windDirection = current["wind_direction_10m"]?.jsonPrimitive?.int ?: 0,
                        uvIndex = uvMax.toInt(),
                        valid = true
                    )
                }
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun normalizeLongitude(lon: Double): Double {
        var l = lon
        while (l > 180) l -= 360
        while (l < -180) l += 360
        return l
    }
}
