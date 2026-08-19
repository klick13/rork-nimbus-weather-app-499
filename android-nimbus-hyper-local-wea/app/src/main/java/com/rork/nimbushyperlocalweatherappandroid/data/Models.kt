package com.rork.nimbushyperlocalweatherappandroid.data

import kotlinx.serialization.Serializable

@Serializable
enum class TempUnit { F, C }

@Serializable
data class WeatherCondition(
    val id: String,
    val main: String,
    val description: String,
    val icon: String,
)

@Serializable
data class HourlyForecast(
    val time: String,
    val temp: Int,
    val condition: WeatherCondition,
    val precipChance: Int,
)

@Serializable
data class DailyForecast(
    val day: String,
    val date: String,
    val high: Int,
    val low: Int,
    val condition: WeatherCondition,
    val precipChance: Int,
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
    val sunset: String,
)

@Serializable
data class WeatherAlert(
    val id: String,
    val type: String,
    val title: String,
    val description: String,
    val severity: String,
    val startTime: String,
    val endTime: String,
)

@Serializable
data class AirQualityData(
    val aqi: Int = 0,
    val pm10: Double = 0.0,
    val pm25: Double = 0.0,
    val ozone: Double = 0.0,
    val nitrogenDioxide: Double = 0.0,
    val sulphurDioxide: Double = 0.0,
    val carbonMonoxide: Double = 0.0,
    val grassPollen: Int = 0,
    val treePollen: Int = 0,
    val weedPollen: Int = 0,
    val mouldPollen: Int = 0,
    val valid: Boolean = false,
) {
    val statusLabel: String
        get() = when (aqi) {
            in 0..50 -> "Good"
            in 51..100 -> "Moderate"
            in 101..150 -> "Unhealthy for Sensitive"
            in 151..200 -> "Unhealthy"
            in 201..300 -> "Very Unhealthy"
            else -> "Hazardous"
        }

    val statusColor: String
        get() = when (aqi) {
            in 0..50 -> "#3DFF9A"
            in 51..100 -> "#F0FF00"
            in 101..150 -> "#FF9600"
            in 151..200 -> "#FF3D71"
            in 201..300 -> "#BF40FF"
            else -> "#8B0000"
        }

    val topPollenType: String
        get() {
            val pollens = listOf(
                "Grass" to grassPollen,
                "Tree" to treePollen,
                "Weed" to weedPollen,
                "Mould" to mouldPollen,
            )
            return pollens.maxByOrNull { it.second }?.first ?: "None"
        }

    val topPollenLevel: Int
        get() = maxOf(grassPollen, treePollen, weedPollen, mouldPollen)

    val healthAdvice: String
        get() = when (aqi) {
            in 0..50 -> "Air quality is good. Perfect for outdoor activities."
            in 51..100 -> "Air quality is acceptable. Unusually sensitive people should consider reducing prolonged outdoor exertion."
            in 101..150 -> "Members of sensitive groups may experience health effects. Reduce prolonged outdoor exertion."
            in 151..200 -> "Everyone may experience health effects. Limit outdoor activity."
            in 201..300 -> "Health alert: serious health effects possible. Avoid outdoor activity."
            else -> "Hazardous conditions. Everyone should stay indoors."
        }
}

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
    val airQuality: AirQualityData = AirQualityData(),
    val lastUpdated: String,
    val isCurrentLocation: Boolean,
    val locationSource: String? = null,
)

@Serializable
data class SavedLocation(
    val id: String,
    val name: String,
    val region: String,
    val country: String,
    val lat: Double,
    val lon: Double,
    val isCurrentLocation: Boolean,
    val locationSource: String? = null,
)

@Serializable
data class GeocodingResult(
    val id: Int,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val country: String,
    val admin1: String? = null,
    val country_code: String,
)

@Serializable
data class WeatherGridPoint(
    val lat: Double,
    val lon: Double,
    val temp: Int,
    val windSpeed: Int,
    val windDirection: Int,
    val uvIndex: Int,
    val valid: Boolean,
)

data class GeoResult(
    val lat: Double,
    val lon: Double,
    val source: String,
)
