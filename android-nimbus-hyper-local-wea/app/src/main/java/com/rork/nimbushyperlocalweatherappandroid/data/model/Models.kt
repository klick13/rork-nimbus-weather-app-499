package com.rork.nimbushyperlocalweatherappandroid.data.model

import kotlinx.serialization.Serializable

@Serializable
data class SavedLocation(
    val id: String,
    val name: String,
    val region: String = "",
    val country: String = "",
    val lat: Double,
    val lon: Double,
    val isCurrentLocation: Boolean = false,
    val isGps: Boolean = false
)

@Serializable
data class WeatherCondition(
    val id: String,
    val main: String,
    val description: String,
    val icon: String
)

@Serializable
data class HourlyForecast(
    val time: String,
    val temp: Int,
    val condition: WeatherCondition,
    val precipChance: Int
)

@Serializable
data class DailyForecast(
    val day: String,
    val date: String,
    val high: Int,
    val low: Int,
    val condition: WeatherCondition,
    val precipChance: Int
)

@Serializable
data class WeatherDetails(
    val feelsLike: Int,
    val humidity: Int,
    val windSpeed: Int,
    val windDirection: String,
    val uvIndex: Int,
    val visibility: Int,
    val pressure: Int,
    val dewPoint: Int,
    val sunrise: String,
    val sunset: String
)

@Serializable
data class WeatherAlert(
    val id: String,
    val type: String, // warning, watch, advisory
    val title: String,
    val description: String,
    val severity: String, // extreme, severe, moderate, minor
    val startTime: String,
    val endTime: String
)

@Serializable
data class LocationWeather(
    val id: String,
    val name: String,
    val region: String,
    val country: String,
    val lat: Double,
    val lon: Double,
    val currentTemp: Int,
    val condition: WeatherCondition,
    val high: Int,
    val low: Int,
    val hourly: List<HourlyForecast>,
    val daily: List<DailyForecast>,
    val details: WeatherDetails,
    val alerts: List<WeatherAlert> = emptyList(),
    val lastUpdated: String,
    val isCurrentLocation: Boolean
)

@Serializable
data class GeocodingResult(
    val id: Int = 0,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val country: String = "",
    val admin1: String = "",
    val countryCode: String = ""
)

@Serializable
data class WeatherGridPoint(
    val lat: Double,
    val lon: Double,
    val temp: Int,
    val windSpeed: Int,
    val windDirection: Int,
    val uvIndex: Int,
    val valid: Boolean
)

enum class TempUnit { F, C }
enum class WindUnit { MPH, KMH }
enum class WeatherLayer { RADAR, WIND, TEMPERATURE, CLOUDS, ALERTS }
