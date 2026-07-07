package com.rork.nimbushyperlocalweatherappandroid.data.api

import com.rork.nimbushyperlocalweatherappandroid.data.model.DailyForecast
import com.rork.nimbushyperlocalweatherappandroid.data.model.GeocodingResult
import com.rork.nimbushyperlocalweatherappandroid.data.model.HourlyForecast
import com.rork.nimbushyperlocalweatherappandroid.data.model.LocationWeather
import com.rork.nimbushyperlocalweatherappandroid.data.model.OpenMeteoResponse
import com.rork.nimbushyperlocalweatherappandroid.data.model.SavedLocation
import com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit
import com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherAlert
import com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherCondition
import com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherDetails
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Maps Open-Meteo raw responses to the app's domain models.
 * Ported from the Expo app's weatherApi.ts logic.
 */
object WeatherMapper {

    private val dirs = listOf(
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
    )

    fun mapWmoToCondition(code: Int, isDay: Boolean): WeatherCondition {
        val dayStr = if (isDay) "sun" else "moon"
        return when {
            code == 0 -> WeatherCondition("clear", if (isDay) "Sunny" else "Clear", "Clear sky", dayStr)
            code == 1 -> WeatherCondition("clear", "Mostly Clear", "Mostly clear", dayStr)
            code == 2 -> WeatherCondition("partly-cloudy", "Partly Cloudy", "Partly cloudy", if (isDay) "cloud-sun" else "cloud-moon")
            code == 3 -> WeatherCondition("cloudy", "Overcast", "Overcast", "cloud")
            code in 45..48 -> WeatherCondition("cloudy", "Foggy", "Fog", "cloud-fog")
            code in 51..55 -> WeatherCondition("rainy", "Drizzle", "Drizzle", "cloud-drizzle")
            code in 56..57 -> WeatherCondition("rainy", "Freezing Drizzle", "Freezing drizzle", "cloud-drizzle")
            code in 61..65 -> {
                val main = if (code <= 61) "Light Rain" else if (code <= 63) "Rain" else "Heavy Rain"
                WeatherCondition("rainy", main, "Rain", "cloud-rain")
            }
            code in 66..67 -> WeatherCondition("rainy", "Freezing Rain", "Freezing rain", "cloud-rain")
            code in 71..77 -> WeatherCondition("snow", "Snow", "Snow", "snowflake")
            code in 80..82 -> WeatherCondition("rainy", "Showers", "Rain showers", "cloud-rain")
            code in 85..86 -> WeatherCondition("snow", "Snow Showers", "Snow showers", "snowflake")
            code in 95..99 -> WeatherCondition("rainy", "Thunderstorm", "Thunderstorm", "cloud-lightning")
            else -> WeatherCondition("cloudy", "Cloudy", "Unknown", "cloud")
        }
    }

    private fun windDegreesToDirection(deg: Int): String {
        return dirs[((deg / 22.5).roundToInt() + 16) % 16]
    }

    private fun formatHourStr(isoStr: String): String {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
            val date = sdf.parse(isoStr) ?: return isoStr
            val outFormat = SimpleDateFormat("h a", Locale.US)
            outFormat.format(date).replace("AM", "AM").replace("PM", "PM")
        } catch (e: Exception) {
            isoStr
        }
    }

    private fun getDayName(dateStr: String, index: Int): String {
        if (index == 0) return "Today"
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val date = sdf.parse(dateStr + "T12:00:00") ?: return dateStr
            SimpleDateFormat("EEE", Locale.US).format(date)
        } catch (e: Exception) {
            dateStr
        }
    }

    private fun formatDateShort(dateStr: String): String {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val date = sdf.parse(dateStr + "T12:00:00") ?: return dateStr
            SimpleDateFormat("MMM d", Locale.US).format(date)
        } catch (e: Exception) {
            dateStr
        }
    }

    private fun formatTime(isoStr: String): String {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
            val date = sdf.parse(isoStr) ?: return isoStr
            SimpleDateFormat("h:mm a", Locale.US).format(date)
        } catch (e: Exception) {
            isoStr
        }
    }

    fun toLocationWeather(
        response: OpenMeteoResponse,
        location: SavedLocation,
        unit: TempUnit
    ): LocationWeather? {
        val current = response.current ?: return null
        val hourly = response.hourly ?: return null
        val daily = response.daily ?: return null

        val condition = mapWmoToCondition(current.weatherCode, current.isDay == 1)

        val hourlyForecasts = mutableListOf<HourlyForecast>()
        val count = minOf(24, hourly.time.size)
        for (i in 0 until count) {
            val isDay = hourly.isDay.getOrElse(i) { 1 } == 1
            hourlyForecasts.add(
                HourlyForecast(
                    time = formatHourStr(hourly.time[i]),
                    temp = hourly.temperature2m.getOrElse(i) { 0.0 }.toInt(),
                    condition = mapWmoToCondition(hourly.weatherCode.getOrElse(i) { 0 }, isDay),
                    precipChance = hourly.precipitationProbability.getOrElse(i) { 0 }
                )
            )
        }

        val dailyForecasts = mutableListOf<DailyForecast>()
        for (i in daily.time.indices) {
            dailyForecasts.add(
                DailyForecast(
                    day = getDayName(daily.time[i], i),
                    date = formatDateShort(daily.time[i]),
                    high = daily.temperature2mMax.getOrElse(i) { 0.0 }.toInt(),
                    low = daily.temperature2mMin.getOrElse(i) { 0.0 }.toInt(),
                    condition = mapWmoToCondition(daily.weatherCode.getOrElse(i) { 0 }, true),
                    precipChance = daily.precipitationProbabilityMax.getOrElse(i) { 0 }
                )
            )
        }

        val details = WeatherDetails(
            feelsLike = current.apparentTemperature.toInt(),
            humidity = current.relativeHumidity2m.toInt(),
            windSpeed = current.windSpeed10m.toInt(),
            windDirection = windDegreesToDirection(current.windDirection10m),
            uvIndex = (daily.uvIndexMax.getOrElse(0) { 0.0 }).toInt(),
            visibility = 10,
            pressure = current.surfacePressure.toInt(),
            dewPoint = (current.apparentTemperature - 2).toInt(),
            sunrise = if (daily.sunrise.isNotEmpty()) formatTime(daily.sunrise[0]) else "6:00 AM",
            sunset = if (daily.sunset.isNotEmpty()) formatTime(daily.sunset[0]) else "6:00 PM"
        )

        val alerts = generateAlerts(
            current.weatherCode,
            current.windSpeed10m,
            daily.uvIndexMax.getOrElse(0) { 0.0 },
            current.temperature2m,
            current.isDay == 1,
            details.sunrise,
            details.sunset,
            unit,
            hourly,
            dailyForecasts.firstOrNull()?.high
        )

        return LocationWeather(
            id = location.id,
            name = location.name,
            region = location.region,
            country = location.country,
            lat = location.lat,
            lon = location.lon,
            currentTemp = current.temperature2m.toInt(),
            condition = condition,
            high = dailyForecasts.firstOrNull()?.high ?: current.temperature2m.toInt(),
            low = dailyForecasts.firstOrNull()?.low ?: (current.temperature2m - 10).toInt(),
            hourly = hourlyForecasts,
            daily = dailyForecasts,
            details = details,
            alerts = alerts,
            lastUpdated = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(Date()),
            isCurrentLocation = location.isCurrentLocation
        )
    }

    private fun generateAlerts(
        weatherCode: Int,
        windSpeed: Double,
        uvIndex: Double,
        temp: Double,
        isDay: Boolean,
        sunrise: String,
        sunset: String,
        unit: TempUnit,
        hourly: com.rork.nimbushyperlocalweatherappandroid.data.model.OpenMeteoHourly,
        dailyHigh: Int?
    ): List<WeatherAlert> {
        val alerts = mutableListOf<WeatherAlert>()
        val now = SimpleDateFormat("h:mm a", Locale.US).format(Date())
        val later = SimpleDateFormat("h:mm a", Locale.US).apply {
            calendar = Calendar.getInstance().apply {
                add(Calendar.HOUR, 6)
            }
        }.format(Date())

        // Thunderstorm
        val hasTstorm = (0 until minOf(24, hourly.time.size)).any {
            hourly.weatherCode.getOrElse(it) { 0 } >= 95
        }
        if (hasTstorm || weatherCode >= 95) {
            alerts.add(
                WeatherAlert(
                    "thunderstorm", "warning",
                    "Thunderstorm Alert",
                    "Thunderstorms detected nearby. Lightning, heavy rain, and possible hail.",
                    "severe", now, later
                )
            )
        }

        // Wind
        val peakWind = (0 until minOf(24, hourly.time.size)).maxOfOrNull {
            hourly.windSpeed10m.getOrElse(it) { 0.0 }
        } ?: windSpeed
        if (windSpeed > 25 || peakWind > 25) {
            alerts.add(
                WeatherAlert(
                    "high-wind",
                    if (peakWind > 40) "warning" else "advisory",
                    if (peakWind > 40) "High Wind Warning" else "Wind Advisory",
                    "Winds up to ${peakWind.toInt()} ${if (unit == TempUnit.C) "km/h" else "mph"} expected. Secure loose objects and use caution while driving.",
                    if (peakWind > 40) "severe" else "moderate", now, later
                )
            )
        }

        // UV
        if (uvIndex >= 8 && isDay) {
            alerts.add(
                WeatherAlert(
                    "uv", "advisory",
                    if (uvIndex >= 11) "Extreme UV Index" else "High UV Index Advisory",
                    "UV Index of ${uvIndex.toInt()}. Limit outdoor exposure between $sunrise and $sunset. Wear sunscreen SPF 30+ and protective clothing.",
                    if (uvIndex >= 11) "extreme" else "moderate", sunrise, sunset
                )
            )
        }

        // Freeze
        val freezeThreshold = if (unit == TempUnit.F) 32.0 else 0.0
        if (temp <= freezeThreshold) {
            alerts.add(
                WeatherAlert(
                    "freeze", "advisory",
                    "Freeze Advisory",
                    "Temperatures at or below freezing (${temp.toInt()}°${unit.name}). Protect sensitive plants and exposed pipes.",
                    "minor", now, later
                )
            )
        }

        // Heat
        val heatThreshold = if (unit == TempUnit.F) 100.0 else 38.0
        val effectiveHigh = dailyHigh?.toDouble() ?: temp
        if (effectiveHigh >= heatThreshold) {
            alerts.add(
                WeatherAlert(
                    "heat", "warning",
                    "Excessive Heat Warning",
                    "Dangerously hot conditions with highs near ${effectiveHigh.toInt()}°${unit.name}. Stay hydrated and limit outdoor activity.",
                    "extreme", now, later
                )
            )
        }

        return alerts
    }

    private fun Int.roundToInt(): Int = Math.round(this.toFloat())
    private fun Double.roundToInt(): Int = Math.round(this.toFloat())
}

fun GeocodingResult.toSavedLocation(): SavedLocation {
    return SavedLocation(
        id = "geo_$id",
        name = name,
        region = admin1,
        country = country,
        lat = latitude,
        lon = longitude,
        isCurrentLocation = false,
        isGps = false
    )
}
