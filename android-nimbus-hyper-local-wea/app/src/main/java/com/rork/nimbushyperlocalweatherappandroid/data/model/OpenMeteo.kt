package com.rork.nimbushyperlocalweatherappandroid.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class OpenMeteoResponse(
    val current: OpenMeteoCurrent? = null,
    val hourly: OpenMeteoHourly? = null,
    val daily: OpenMeteoDaily? = null
)

@Serializable
data class OpenMeteoCurrent(
    @SerialName("temperature_2m") val temperature2m: Double = 0.0,
    @SerialName("relative_humidity_2m") val relativeHumidity2m: Double = 0.0,
    @SerialName("apparent_temperature") val apparentTemperature: Double = 0.0,
    @SerialName("weather_code") val weatherCode: Int = 0,
    @SerialName("wind_speed_10m") val windSpeed10m: Double = 0.0,
    @SerialName("wind_direction_10m") val windDirection10m: Int = 0,
    @SerialName("surface_pressure") val surfacePressure: Double = 1013.0,
    @SerialName("is_day") val isDay: Int = 1,
    @SerialName("wind_gusts_10m") val windGusts10m: Double = 0.0
)

@Serializable
data class OpenMeteoHourly(
    val time: List<String> = emptyList(),
    @SerialName("temperature_2m") val temperature2m: List<Double> = emptyList(),
    @SerialName("weather_code") val weatherCode: List<Int> = emptyList(),
    @SerialName("precipitation_probability") val precipitationProbability: List<Int> = emptyList(),
    @SerialName("is_day") val isDay: List<Int> = emptyList(),
    @SerialName("wind_speed_10m") val windSpeed10m: List<Double> = emptyList(),
    @SerialName("wind_gusts_10m") val windGusts10m: List<Double> = emptyList(),
    val cape: List<Double> = emptyList(),
    val visibility: List<Double> = emptyList()
)

@Serializable
data class OpenMeteoDaily(
    val time: List<String> = emptyList(),
    @SerialName("temperature_2m_max") val temperature2mMax: List<Double> = emptyList(),
    @SerialName("temperature_2m_min") val temperature2mMin: List<Double> = emptyList(),
    @SerialName("weather_code") val weatherCode: List<Int> = emptyList(),
    @SerialName("precipitation_probability_max") val precipitationProbabilityMax: List<Int> = emptyList(),
    val sunrise: List<String> = emptyList(),
    val sunset: List<String> = emptyList(),
    @SerialName("uv_index_max") val uvIndexMax: List<Double> = emptyList()
)

@Serializable
data class OpenMeteoGridResponse(
    val current: OpenMeteoGridCurrent? = null,
    val daily: OpenMeteoGridDaily? = null
)

@Serializable
data class OpenMeteoGridCurrent(
    @SerialName("temperature_2m") val temperature2m: Double = 0.0,
    @SerialName("wind_speed_10m") val windSpeed10m: Double = 0.0,
    @SerialName("wind_direction_10m") val windDirection10m: Int = 0
)

@Serializable
data class OpenMeteoGridDaily(
    @SerialName("uv_index_max") val uvIndexMax: List<Double> = emptyList()
)

@Serializable
data class GeocodingResponse(
    val results: List<GeocodingResult> = emptyList()
)
