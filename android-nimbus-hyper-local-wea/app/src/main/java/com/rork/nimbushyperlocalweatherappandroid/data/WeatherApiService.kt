package com.rork.nimbushyperlocalweatherappandroid.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.android.Android
import io.ktor.client.network.sockets.SocketTimeoutException
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.statement.bodyAsText
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.net.URLEncoder

class WeatherApiService {

    private val client = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                coerceInputValues = true
            })
        }
        install(HttpTimeout) {
            requestTimeoutMillis = 15000
            connectTimeoutMillis = 10000
            socketTimeoutMillis = 12000
        }
    }

    private val geocodingUrl = "https://geocoding-api.open-meteo.com/v1/search"
    private val weatherUrl = "https://api.open-meteo.com/v1/forecast"
    private val zipGeocodeUrl = "https://api.zippopotam.us"

    suspend fun searchLocations(query: String): List<GeocodingResult> = withContext(Dispatchers.IO) {
        if (query.length < 2) return@withContext emptyList()

        // Try zip code first for US 5-digit codes
        if (query.matches(Regex("^\\d{5}(-\\d{4})?$"))) {
            val zipResults = searchByZip(query.trim().substring(0, 5))
            if (zipResults.isNotEmpty()) return@withContext zipResults
        }

        try {
            val response = client.get(geocodingUrl) {
                parameter("name", query)
                parameter("count", 8)
                parameter("language", "en")
                parameter("format", "json")
            }
            if (!response.status.isSuccess()) return@withContext emptyList()
            val text = response.bodyAsText()
            val json = Json.parseToJsonElement(text).jsonObject
            val results = json["results"]?.jsonArray ?: return@withContext emptyList()
            results.mapNotNull { element ->
                val obj = element.jsonObject
                GeocodingResult(
                    id = obj["id"]?.jsonPrimitive?.intOrNull ?: 0,
                    name = obj["name"]?.jsonPrimitive?.contentOrNull ?: "",
                    latitude = obj["latitude"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
                    longitude = obj["longitude"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
                    country = obj["country"]?.jsonPrimitive?.contentOrNull ?: "",
                    admin1 = obj["admin1"]?.jsonPrimitive?.contentOrNull,
                    country_code = obj["country_code"]?.jsonPrimitive?.contentOrNull ?: "",
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private suspend fun searchByZip(zip: String): List<GeocodingResult> = withContext(Dispatchers.IO) {
        try {
            val response = client.get("$zipGeocodeUrl/us/$zip")
            if (!response.status.isSuccess()) return@withContext emptyList()
            val text = response.bodyAsText()
            val json = Json.parseToJsonElement(text).jsonObject
            val places = json["places"]?.jsonArray ?: return@withContext emptyList()
            if (places.isEmpty()) return@withContext emptyList()
            val place = places[0].jsonObject
            listOf(
                GeocodingResult(
                    id = zip.toIntOrNull() ?: 0,
                    name = place["place name"]?.jsonPrimitive?.contentOrNull ?: zip,
                    latitude = place["latitude"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
                    longitude = place["longitude"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
                    country = "US",
                    admin1 = place["state"]?.jsonPrimitive?.contentOrNull ?: "",
                    country_code = "US",
                )
            )
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun reverseGeocode(lat: Double, lon: Double): Triple<String, String, String> = withContext(Dispatchers.IO) {
        try {
            val response = client.get("https://nominatim.openstreetmap.org/reverse") {
                parameter("lat", lat)
                parameter("lon", lon)
                parameter("format", "json")
                parameter("zoom", 10)
                headers.append("User-Agent", "NimbusWeatherApp/1.0")
            }
            if (response.status.isSuccess()) {
                val text = response.bodyAsText()
                val json = Json.parseToJsonElement(text).jsonObject
                val address = json["address"]?.jsonObject
                val city = address?.get("city")?.jsonPrimitive?.contentOrNull
                    ?: address?.get("town")?.jsonPrimitive?.contentOrNull
                    ?: address?.get("village")?.jsonPrimitive?.contentOrNull
                    ?: address?.get("county")?.jsonPrimitive?.contentOrNull
                    ?: "My Location"
                val state = address?.get("state")?.jsonPrimitive?.contentOrNull ?: ""
                val country = address?.get("country_code")?.jsonPrimitive?.contentOrNull?.uppercase() ?: "US"
                Triple(city, state, country)
            } else {
                Triple("My Location", "", "US")
            }
        } catch (e: Exception) {
            Triple("My Location", "", "US")
        }
    }

    suspend fun fetchWeatherForLocation(
        lat: Double,
        lon: Double,
        locationId: String,
        locationName: String,
        region: String,
        country: String,
        isCurrentLocation: Boolean,
        unit: TempUnit = TempUnit.F,
        locationSource: String? = null,
    ): LocationWeather = withContext(Dispatchers.IO) {
        val tempUnitParam = if (unit == TempUnit.C) "celsius" else "fahrenheit"
        val windUnit = if (unit == TempUnit.C) "kmh" else "mph"
        val precipUnit = if (unit == TempUnit.C) "mm" else "inch"

        val response = client.get(weatherUrl) {
            parameter("latitude", lat)
            parameter("longitude", lon)
            parameter("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day,wind_gusts_10m")
            parameter("hourly", "temperature_2m,weather_code,precipitation_probability,is_day,wind_speed_10m,wind_gusts_10m,cape")
            parameter("daily", "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,sunrise,sunset,uv_index_max")
            parameter("temperature_unit", tempUnitParam)
            parameter("wind_speed_unit", windUnit)
            parameter("precipitation_unit", precipUnit)
            parameter("forecast_days", 7)
            parameter("forecast_hours", 24)
            parameter("timezone", "auto")
        }

        if (!response.status.isSuccess()) {
            throw Exception("HTTP ${response.status.value}")
        }

        val text = response.bodyAsText()
        val json = Json.parseToJsonElement(text).jsonObject
        val current = json["current"]?.jsonObject ?: throw Exception("Invalid weather data")
        val hourly = json["hourly"]?.jsonObject ?: throw Exception("Invalid weather data")
        val daily = json["daily"]?.jsonObject ?: throw Exception("Invalid weather data")

        val isDay = current["is_day"]?.jsonPrimitive?.intOrNull == 1
        val condition = mapWmoToCondition(current["weather_code"]?.jsonPrimitive?.intOrNull ?: 0, isDay)

        // Hourly forecasts
        val hourlyTimes = hourly["time"]?.jsonArray ?: emptyList()
        val hourlyTemps = hourly["temperature_2m"]?.jsonArray ?: emptyList()
        val hourlyCodes = hourly["weather_code"]?.jsonArray ?: emptyList()
        val hourlyPrecip = hourly["precipitation_probability"]?.jsonArray ?: emptyList()
        val hourlyIsDay = hourly["is_day"]?.jsonArray ?: emptyList()
        val hourlyWind = hourly["wind_speed_10m"]?.jsonArray ?: emptyList()
        val hourlyCape = hourly["cape"]?.jsonArray ?: emptyList()

        val hourlyForecasts = (0 until minOf(24, hourlyTimes.size)).map { i ->
            val hourIsDay = hourlyIsDay.getOrNull(i)?.jsonPrimitive?.intOrNull == 1
            HourlyForecast(
                time = formatHourStr(hourlyTimes[i].jsonPrimitive.content),
                temp = hourlyTemps.getOrNull(i)?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0,
                condition = mapWmoToCondition(hourlyCodes.getOrNull(i)?.jsonPrimitive?.intOrNull ?: 0, hourIsDay),
                precipChance = hourlyPrecip.getOrNull(i)?.jsonPrimitive?.intOrNull ?: 0,
            )
        }

        // Daily forecasts
        val dailyTimes = daily["time"]?.jsonArray ?: emptyList()
        val dailyMax = daily["temperature_2m_max"]?.jsonArray ?: emptyList()
        val dailyMin = daily["temperature_2m_min"]?.jsonArray ?: emptyList()
        val dailyCodes = daily["weather_code"]?.jsonArray ?: emptyList()
        val dailyPrecip = daily["precipitation_probability_max"]?.jsonArray ?: emptyList()
        val dailySunrise = daily["sunrise"]?.jsonArray ?: emptyList()
        val dailySunset = daily["sunset"]?.jsonArray ?: emptyList()
        val dailyUv = daily["uv_index_max"]?.jsonArray ?: emptyList()

        val dailyForecasts = (0 until dailyTimes.size).map { i ->
            DailyForecast(
                day = getDayName(dailyTimes[i].jsonPrimitive.content, i),
                date = formatDateShort(dailyTimes[i].jsonPrimitive.content),
                high = dailyMax.getOrNull(i)?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0,
                low = dailyMin.getOrNull(i)?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0,
                condition = mapWmoToCondition(dailyCodes.getOrNull(i)?.jsonPrimitive?.intOrNull ?: 0, true),
                precipChance = dailyPrecip.getOrNull(i)?.jsonPrimitive?.intOrNull ?: 0,
            )
        }

        val details = WeatherDetails(
            feelsLike = current["apparent_temperature"]?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0,
            humidity = current["relative_humidity_2m"]?.jsonPrimitive?.intOrNull ?: 0,
            windSpeed = current["wind_speed_10m"]?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0,
            windDirection = windDegreesToDirection(current["wind_direction_10m"]?.jsonPrimitive?.intOrNull ?: 0),
            uvIndex = dailyUv.getOrNull(0)?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0,
            visibility = 10,
            pressure = current["surface_pressure"]?.jsonPrimitive?.doubleOrNull?.toInt() ?: 1013,
            dewPoint = (current["apparent_temperature"]?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0) - 2,
            sunrise = dailySunrise.getOrNull(0)?.jsonPrimitive?.contentOrNull?.let { formatTime(it) } ?: "6:00 AM",
            sunset = dailySunset.getOrNull(0)?.jsonPrimitive?.contentOrNull?.let { formatTime(it) } ?: "6:00 PM",
        )

        // Build hourly alert data
        val hourlyAlertData = (0 until minOf(24, hourlyTimes.size)).map { i ->
            HourlyAlertData(
                time = hourlyTimes[i].jsonPrimitive.content,
                weatherCode = hourlyCodes.getOrNull(i)?.jsonPrimitive?.intOrNull ?: 0,
                windSpeed = hourlyWind.getOrNull(i)?.jsonPrimitive?.doubleOrNull ?: 0.0,
                temp = hourlyTemps.getOrNull(i)?.jsonPrimitive?.doubleOrNull ?: 0.0,
                cape = hourlyCape.getOrNull(i)?.jsonPrimitive?.doubleOrNull ?: 0.0,
                precipProb = hourlyPrecip.getOrNull(i)?.jsonPrimitive?.intOrNull ?: 0,
            )
        }

        val alerts = generateWeatherAlerts(
            weatherCode = current["weather_code"]?.jsonPrimitive?.intOrNull ?: 0,
            windSpeed = current["wind_speed_10m"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            uvIndex = dailyUv.getOrNull(0)?.jsonPrimitive?.doubleOrNull ?: 0.0,
            temp = current["temperature_2m"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            humidity = current["relative_humidity_2m"]?.jsonPrimitive?.intOrNull ?: 0,
            isDay = isDay,
            sunrise = details.sunrise,
            sunset = details.sunset,
            unit = unit,
            hourlyData = hourlyAlertData,
            dailyHigh = dailyForecasts.getOrNull(0)?.high,
        )

        LocationWeather(
            id = locationId,
            name = locationName,
            region = region,
            country = country,
            lat = lat,
            lon = lon,
            currentTemp = current["temperature_2m"]?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0,
            condition = condition,
            high = dailyForecasts.getOrNull(0)?.high ?: (current["temperature_2m"]?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0),
            low = dailyForecasts.getOrNull(0)?.low ?: ((current["temperature_2m"]?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0) - 10),
            hourly = hourlyForecasts,
            daily = dailyForecasts,
            details = details,
            alerts = alerts,
            lastUpdated = System.currentTimeMillis().toString(),
            isCurrentLocation = isCurrentLocation,
            locationSource = locationSource,
        )
    }

    suspend fun fetchWeatherGrid(
        centerLat: Double,
        centerLon: Double,
        zoom: Double,
        tileRadius: Double,
        gridDensity: Int,
        unit: TempUnit,
    ): List<WeatherGridPoint> = withContext(Dispatchers.IO) {
        try {
            val minGridZoom = 6.0
            val effectiveZoom = maxOf(zoom, minGridZoom)
            val tileCount = Math.pow(2.0, effectiveZoom)
            val degPerTile = 360.0 / tileCount
            val halfWidthDeg = (tileRadius + 0.5) * degPerTile
            val spacing = if (gridDensity > 1) (2 * halfWidthDeg) / (gridDensity - 1) else halfWidthDeg
            val latRange = halfWidthDeg
            val lonRange = halfWidthDeg

            val minLat = maxOf(-85.0, centerLat - latRange)
            val maxLat = minOf(85.0, centerLat + latRange)
            val minLon = centerLon - lonRange
            val maxLon = centerLon + lonRange

            val points = mutableListOf<Pair<Double, Double>>()
            val stepLat = if (gridDensity > 1) (maxLat - minLat) / (gridDensity - 1) else 0.0
            val stepLon = if (gridDensity > 1) (maxLon - minLon) / (gridDensity - 1) else 0.0

            for (row in 0 until gridDensity) {
                for (col in 0 until gridDensity) {
                    var lon = minLon + col * stepLon
                    while (lon > 180) lon -= 360
                    while (lon < -180) lon += 360
                    points.add(minLat + row * stepLat to lon)
                }
            }

            val tempUnitParam = if (unit == TempUnit.C) "celsius" else "fahrenheit"
            val windUnit = if (unit == TempUnit.C) "kmh" else "mph"

            val latParam = points.joinToString(",") { it.first.toString() }
            val lonParam = points.joinToString(",") { it.second.toString() }

            val response = client.get(weatherUrl) {
                parameter("latitude", latParam)
                parameter("longitude", lonParam)
                parameter("current", "temperature_2m,wind_speed_10m,wind_direction_10m")
                parameter("daily", "uv_index_max")
                parameter("temperature_unit", tempUnitParam)
                parameter("wind_speed_unit", windUnit)
                parameter("forecast_days", 1)
                parameter("timezone", "auto")
            }

            if (!response.status.isSuccess()) return@withContext emptyList()

            val text = response.bodyAsText()
            val parsed = Json.parseToJsonElement(text)
            val list: List<JsonObject> = if (parsed is JsonArray) {
                parsed.mapNotNull { it as? JsonObject }
            } else {
                listOf(parsed as JsonObject)
            }

            points.mapIndexed { i, pt ->
                val entry = list.getOrNull(i)
                val current = entry?.get("current")?.jsonObject
                if (current == null) {
                    WeatherGridPoint(pt.first, pt.second, 0, 0, 0, 0, false)
                } else {
                    WeatherGridPoint(
                        lat = pt.first,
                        lon = pt.second,
                        temp = current["temperature_2m"]?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0,
                        windSpeed = current["wind_speed_10m"]?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0,
                        windDirection = current["wind_direction_10m"]?.jsonPrimitive?.intOrNull ?: 0,
                        uvIndex = entry["daily"]?.jsonObject?.get("uv_index_max")?.jsonArray?.getOrNull(0)?.jsonPrimitive?.doubleOrNull?.toInt() ?: 0,
                        valid = true,
                    )
                }
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    // --- Helper functions ---

    private data class HourlyAlertData(
        val time: String,
        val weatherCode: Int,
        val windSpeed: Double,
        val temp: Double,
        val cape: Double,
        val precipProb: Int,
    )

    private fun mapWmoToCondition(code: Int, isDay: Boolean): WeatherCondition {
        if (code == 0) return WeatherCondition("clear", if (isDay) "Sunny" else "Clear", "Clear sky", if (isDay) "sun" else "moon")
        if (code == 1) return WeatherCondition("clear", "Mostly Clear", "Mostly clear", if (isDay) "sun" else "moon")
        if (code == 2) return WeatherCondition("partly-cloudy", "Partly Cloudy", "Partly cloudy", if (isDay) "cloud-sun" else "cloud-moon")
        if (code == 3) return WeatherCondition("cloudy", "Overcast", "Overcast", "cloud")
        if (code in 45..48) return WeatherCondition("cloudy", "Foggy", "Fog", "cloud-fog")
        if (code in 51..55) return WeatherCondition("rainy", "Drizzle", "Drizzle", "cloud-drizzle")
        if (code in 56..57) return WeatherCondition("rainy", "Freezing Drizzle", "Freezing drizzle", "cloud-drizzle")
        if (code in 61..65) {
            val main = if (code <= 61) "Light Rain" else if (code <= 63) "Rain" else "Heavy Rain"
            return WeatherCondition("rainy", main, "Rain", "cloud-rain")
        }
        if (code in 66..67) return WeatherCondition("rainy", "Freezing Rain", "Freezing rain", "cloud-rain")
        if (code in 71..77) return WeatherCondition("snow", "Snow", "Snow", "snowflake")
        if (code in 80..82) return WeatherCondition("rainy", "Showers", "Rain showers", "cloud-rain")
        if (code in 85..86) return WeatherCondition("snow", "Snow Showers", "Snow showers", "snowflake")
        if (code in 95..99) return WeatherCondition("rainy", "Thunderstorm", "Thunderstorm", "cloud-lightning")
        return WeatherCondition("cloudy", "Cloudy", "Unknown", "cloud")
    }

    private fun formatHourStr(isoStr: String): String {
        val parts = isoStr.split("T")
        val hourPart = parts.getOrNull(1) ?: return ""
        val h = hourPart.substring(0, 2).toIntOrNull() ?: return ""
        return when (h) {
            0 -> "12 AM"
            12 -> "12 PM"
            else -> if (h > 12) "${h - 12} PM" else "$h AM"
        }
    }

    private fun getDayName(dateStr: String, index: Int): String {
        if (index == 0) return "Today"
        return try {
            val parts = dateStr.split("-")
            val cal = java.util.GregorianCalendar(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
            val fmt = java.text.SimpleDateFormat("EEE", java.util.Locale.US)
            fmt.format(cal.time)
        } catch (e: Exception) { "—" }
    }

    private fun formatDateShort(dateStr: String): String {
        return try {
            val parts = dateStr.split("-")
            val cal = java.util.GregorianCalendar(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
            val fmt = java.text.SimpleDateFormat("MMM d", java.util.Locale.US)
            fmt.format(cal.time)
        } catch (e: Exception) { dateStr }
    }

    private fun formatTime(isoStr: String): String {
        return try {
            val parts = isoStr.split("T")
            val timePart = parts.getOrNull(1) ?: return "6:00 AM"
            val h = timePart.substring(0, 2).toIntOrNull() ?: return "6:00 AM"
            val m = timePart.substring(3, 5)
            val ampm = if (h >= 12) "PM" else "AM"
            val h12 = when (h) { 0 -> 12; in 13..23 -> h - 12; else -> h }
            "$h12:$m $ampm"
        } catch (e: Exception) { "6:00 AM" }
    }

    private fun windDegreesToDirection(deg: Int): String {
        val dirs = arrayOf("N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW")
        val idx = Math.round(deg / 22.5).toInt() % 16
        return dirs[idx]
    }

    private data class AlertWindow(val start: String, val end: String)

    private fun findAlertWindow(hourly: List<HourlyAlertData>, matches: (HourlyAlertData) -> Boolean): AlertWindow? {
        val indices = hourly.mapIndexedNotNull { i, h -> if (matches(h)) i else null }
        if (indices.isEmpty()) return null
        val first = indices.first()
        val last = indices.last()
        val endIdx = if (last < hourly.size - 1) minOf(last + 1, hourly.size - 1) else last

        val fmt = { iso: String ->
            val timePart = iso.split("T").getOrNull(1) ?: ""
            val h = timePart.substring(0, 2).toIntOrNull() ?: 0
            val m = timePart.substring(3, 5).ifEmpty { "00" }
            val ampm = if (h >= 12) "PM" else "AM"
            val h12 = when (h) { 0 -> 12; in 13..23 -> h - 12; else -> h }
            "$h12:$m $ampm"
        }

        val startDate = hourly[first].time.split("T").getOrNull(0) ?: ""
        val endDateStr = hourly[endIdx].time.split("T").getOrNull(0) ?: ""
        val endFormatted = if (startDate != endDateStr) {
            val endFmt = getDayName(endDateStr, 1)
            "${fmt(hourly[endIdx].time)} $endFmt"
        } else {
            fmt(hourly[endIdx].time)
        }

        return AlertWindow(fmt(hourly[first].time), endFormatted)
    }

    @Suppress("UNUSED_PARAMETER")
    private fun generateWeatherAlerts(
        weatherCode: Int,
        windSpeed: Double,
        uvIndex: Double,
        temp: Double,
        humidity: Int,
        isDay: Boolean,
        sunrise: String,
        sunset: String,
        unit: TempUnit,
        hourlyData: List<HourlyAlertData>,
        dailyHigh: Int?,
    ): List<WeatherAlert> {
        val alerts = mutableListOf<WeatherAlert>()

        // Thunderstorm
        val tstormByCode = findAlertWindow(hourlyData) { it.weatherCode >= 95 }
        val tstormByCape = findAlertWindow(hourlyData) { it.cape > 1000 && it.precipProb > 50 }
        val tstormWindow = tstormByCode ?: tstormByCape
        val currentIsTstorm = weatherCode >= 95
        val hasActiveCape = hourlyData.any { it.cape > 1000 && it.precipProb > 50 }

        if (tstormWindow != null || currentIsTstorm || hasActiveCape) {
            val isCapeOnly = (tstormByCape != null && tstormByCode == null) || (!currentIsTstorm && hasActiveCape && tstormByCode == null)
            alerts.add(WeatherAlert(
                id = "thunderstorm",
                type = "warning",
                title = if (isCapeOnly) "Thunderstorm Watch" else "Thunderstorm Alert",
                description = tstormWindow?.let {
                    "Thunderstorms expected ${it.start} – ${it.end}. Lightning, heavy rain, and possible hail."
                } ?: if (isCapeOnly) {
                    "High thunderstorm potential detected. Atmospheric instability may produce lightning and heavy downpours."
                } else {
                    "Thunderstorms detected nearby. Lightning, heavy rain, and possible hail."
                },
                severity = if (isCapeOnly) "moderate" else "severe",
                startTime = tstormWindow?.start ?: "Now",
                endTime = tstormWindow?.end ?: "Later",
            ))
        }

        // Freezing rain
        val freezingWindow = findAlertWindow(hourlyData) { it.weatherCode in 66..67 }
        if (freezingWindow != null || weatherCode in 66..67) {
            alerts.add(WeatherAlert(
                id = "freezing-rain",
                type = "warning",
                title = "Freezing Rain Advisory",
                description = freezingWindow?.let {
                    "Freezing rain expected ${it.start} – ${it.end}. Roads may become icy and hazardous."
                } ?: "Freezing rain expected. Roads may become icy and hazardous. Drive with caution.",
                severity = "moderate",
                startTime = freezingWindow?.start ?: "Now",
                endTime = freezingWindow?.end ?: "Later",
            ))
        }

        // Wind
        val windWindow = findAlertWindow(hourlyData) { it.windSpeed > 25 }
        val peakWind = hourlyData.maxOfOrNull { it.windSpeed }?.toInt() ?: windSpeed.toInt()
        if (windWindow != null || windSpeed > 25) {
            alerts.add(WeatherAlert(
                id = "high-wind",
                type = if (peakWind > 40) "warning" else "advisory",
                title = if (peakWind > 40) "High Wind Warning" else "Wind Advisory",
                description = windWindow?.let {
                    "Winds up to $peakWind mph expected ${it.start} – ${it.end}. Secure loose objects and use caution while driving."
                } ?: "Sustained winds of ${windSpeed.toInt()} mph expected. Secure loose objects and use caution while driving.",
                severity = if (peakWind > 40) "severe" else "moderate",
                startTime = windWindow?.start ?: "Now",
                endTime = windWindow?.end ?: "Later",
            ))
        }

        // UV
        if (uvIndex >= 8 && isDay) {
            alerts.add(WeatherAlert(
                id = "uv",
                type = "advisory",
                title = if (uvIndex >= 11) "Extreme UV Index" else "High UV Index Advisory",
                description = "UV Index of ${uvIndex.toInt()}. Limit outdoor exposure between $sunrise and $sunset. Wear sunscreen SPF 30+ and protective clothing.",
                severity = if (uvIndex >= 11) "extreme" else "moderate",
                startTime = sunrise,
                endTime = sunset,
            ))
        }

        val freezeThreshold = if (unit == TempUnit.F) 32 else 0
        val heatThreshold = if (unit == TempUnit.F) 100 else 38

        // Freeze
        val freezeWindow = findAlertWindow(hourlyData) { it.temp <= freezeThreshold }
        if (freezeWindow != null || temp <= freezeThreshold) {
            alerts.add(WeatherAlert(
                id = "freeze",
                type = "advisory",
                title = "Freeze Advisory",
                description = freezeWindow?.let {
                    "Sub-freezing temperatures expected ${it.start} – ${it.end} (${temp.toInt()}°${if (unit == TempUnit.F) "F" else "C"}). Protect sensitive plants and exposed pipes."
                } ?: "Temperatures at or below freezing (${temp.toInt()}°${if (unit == TempUnit.F) "F" else "C"}). Protect sensitive plants and exposed pipes.",
                severity = "minor",
                startTime = freezeWindow?.start ?: "Now",
                endTime = freezeWindow?.end ?: "Later",
            ))
        }

        // Heat
        val effectiveHigh = dailyHigh ?: temp.toInt()
        if (effectiveHigh >= heatThreshold) {
            val heatWindow = findAlertWindow(hourlyData) { it.temp >= heatThreshold }
            alerts.add(WeatherAlert(
                id = "heat",
                type = "warning",
                title = "Excessive Heat Warning",
                description = heatWindow?.let {
                    "Dangerously hot from ${it.start} – ${it.end} with highs near $effectiveHigh°${if (unit == TempUnit.F) "F" else "C"}. Stay hydrated and limit outdoor activity."
                } ?: "Dangerously hot conditions with highs near $effectiveHigh°${if (unit == TempUnit.F) "F" else "C"}. Stay hydrated and limit outdoor activity.",
                severity = "extreme",
                startTime = heatWindow?.start ?: "Now",
                endTime = heatWindow?.end ?: "Later",
            ))
        }

        // Winter storm
        val blizzardWindow = findAlertWindow(hourlyData) { it.weatherCode in 71..77 && it.windSpeed > 15 }
        if (blizzardWindow != null || (weatherCode in 71..77 && windSpeed > 15)) {
            alerts.add(WeatherAlert(
                id = "blizzard",
                type = "watch",
                title = "Winter Storm Watch",
                description = blizzardWindow?.let {
                    "Blizzard conditions expected ${it.start} – ${it.end}. Prepare for limited visibility and travel disruptions."
                } ?: "Heavy snow and strong winds may create blizzard conditions. Prepare for limited visibility and travel disruptions.",
                severity = "severe",
                startTime = blizzardWindow?.start ?: "Now",
                endTime = blizzardWindow?.end ?: "Later",
            ))
        }

        return alerts
    }
}
