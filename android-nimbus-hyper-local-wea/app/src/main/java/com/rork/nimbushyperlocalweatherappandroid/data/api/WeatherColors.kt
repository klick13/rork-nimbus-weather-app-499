package com.rork.nimbushyperlocalweatherappandroid.data.api

import com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.atan2
import kotlin.math.roundToInt

/**
 * Weather visualization color math — ported from the Expo app's
 * weatherMapVisuals.ts. Provides banded + smooth color scales for
 * temperature, UV, and wind speed used by the map overlay layers.
 */
object WeatherColors {

    // ── Temperature (thresholds in Celsius) ──────────────────────────────
    // 14 banded stops, high-saturation "neon" palette.
    private data class Band(val max: Double, val r: Int, val g: Int, val b: Int)

    private val TEMP_BANDS_C = listOf(
        Band(-25.0, 146, 87, 255),   // violet
        Band(-15.0, 94, 110, 255),   // indigo
        Band(-8.0, 46, 140, 255),    // blue
        Band(-2.0, 0, 179, 255),     // sky blue
        Band(4.0, 0, 217, 230),      // cyan
        Band(9.0, 0, 232, 176),      // teal-green
        Band(14.0, 56, 232, 100),    // green
        Band(18.0, 160, 232, 40),    // yellow-green
        Band(23.0, 255, 224, 30),    // yellow
        Band(27.0, 255, 173, 20),    // amber
        Band(31.0, 255, 122, 20),    // orange
        Band(35.0, 255, 66, 40),     // red-orange
        Band(40.0, 255, 16, 90),     // crimson
        Band(Double.MAX_VALUE, 255, 0, 176) // magenta — extreme heat
    )

    private val UV_BANDS = listOf(
        Band(1.0, 58, 214, 96),
        Band(2.0, 112, 227, 58),
        Band(3.0, 178, 236, 36),
        Band(5.0, 240, 224, 28),
        Band(6.0, 255, 179, 20),
        Band(7.0, 255, 128, 20),
        Band(8.0, 255, 68, 30),
        Band(10.0, 255, 20, 82),
        Band(11.0, 214, 20, 210),
        Band(Double.MAX_VALUE, 176, 32, 255)
    )

    // ── Wind speed (continuous) ───────────────────────────────────────────
    private data class WindStop(val mph: Double, val r: Int, val g: Int, val b: Int)

    private val WIND_STOPS = listOf(
        WindStop(0.0, 22, 30, 120),
        WindStop(4.0, 34, 72, 200),
        WindStop(8.0, 0, 140, 220),
        WindStop(13.0, 0, 185, 195),
        WindStop(18.0, 10, 209, 145),
        WindStop(24.0, 70, 224, 90),
        WindStop(31.0, 170, 232, 40),
        WindStop(39.0, 255, 214, 30),
        WindStop(48.0, 255, 140, 25),
        WindStop(60.0, 255, 60, 55)
    )

    private fun bandColor(value: Double, bands: List<Band>): IntArray {
        for (band in bands) {
            if (value <= band.max) return intArrayOf(band.r, band.g, band.b)
        }
        return intArrayOf(bands.last().r, bands.last().g, bands.last().b)
    }

    private fun lerp(a: Int, b: Int, t: Double): Int = (a + (b - a) * t).roundToInt()

    private fun smoothColor(value: Double, stops: List<Band>): IntArray {
        // Convert bands to value stops
        if (value <= stops.first().max) {
            return intArrayOf(stops.first().r, stops.first().g, stops.first().b)
        }
        for (i in 0 until stops.size - 1) {
            if (value <= stops[i + 1].max) {
                val range = stops[i + 1].max - stops[i].max
                val t = if (range > 0) (value - stops[i].max) / range else 0.0
                return intArrayOf(
                    lerp(stops[i].r, stops[i + 1].r, t),
                    lerp(stops[i].g, stops[i + 1].g, t),
                    lerp(stops[i].b, stops[i + 1].b, t)
                )
            }
        }
        return intArrayOf(stops.last().r, stops.last().g, stops.last().b)
    }

    fun tempColor(temp: Double, unit: TempUnit): IntArray {
        val c = if (unit == TempUnit.F) (temp - 32) * 5 / 9 else temp
        return bandColor(c, TEMP_BANDS_C)
    }

    fun tempColorSmooth(temp: Double, unit: TempUnit): IntArray {
        val c = if (unit == TempUnit.F) (temp - 32) * 5 / 9 else temp
        return smoothColor(c, TEMP_BANDS_C)
    }

    fun uvColor(uv: Double): IntArray = bandColor(uv, UV_BANDS)

    fun uvColorSmooth(uv: Double): IntArray = smoothColor(uv, UV_BANDS)

    fun windColor(speed: Double, unit: TempUnit): IntArray {
        val mph = if (unit == TempUnit.C) speed * 0.621 else speed
        val clamped = mph.coerceAtLeast(0.0)
        if (clamped <= WIND_STOPS.first().mph) {
            return intArrayOf(WIND_STOPS.first().r, WIND_STOPS.first().g, WIND_STOPS.first().b)
        }
        for (i in 0 until WIND_STOPS.size - 1) {
            if (clamped <= WIND_STOPS[i + 1].mph) {
                val range = WIND_STOPS[i + 1].mph - WIND_STOPS[i].mph
                val t = if (range > 0) (clamped - WIND_STOPS[i].mph) / range else 0.0
                return intArrayOf(
                    lerp(WIND_STOPS[i].r, WIND_STOPS[i + 1].r, t),
                    lerp(WIND_STOPS[i].g, WIND_STOPS[i + 1].g, t),
                    lerp(WIND_STOPS[i].b, WIND_STOPS[i + 1].b, t)
                )
            }
        }
        return intArrayOf(WIND_STOPS.last().r, WIND_STOPS.last().g, WIND_STOPS.last().b)
    }

    /** Brighten an RGB triple toward white by `amount` (0..1). */
    fun brighten(rgb: IntArray, amount: Double): IntArray {
        return intArrayOf(
            (rgb[0] + (255 - rgb[0]) * amount).roundToInt().coerceAtMost(255),
            (rgb[1] + (255 - rgb[1]) * amount).roundToInt().coerceAtMost(255),
            (rgb[2] + (255 - rgb[2]) * amount).roundToInt().coerceAtMost(255)
        )
    }

    /** Convert RGB triple + alpha to ARGB int for Canvas paint. */
    fun toArgb(rgb: IntArray, alpha: Int = 255): Int {
        val a = alpha.coerceIn(0, 255)
        return (a shl 24) or (rgb[0] shl 16) or (rgb[1] shl 8) or rgb[2]
    }

    /** IDW interpolation of wind (speed + bearing) at an arbitrary lat/lon. */
    fun interpolateWind(
        lat: Double,
        lon: Double,
        grid: List<com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherGridPoint>
    ): Pair<Double, Double> {
        if (grid.isEmpty()) return 0.0 to 0.0
        var sumW = 0.0
        var sumU = 0.0
        var sumV = 0.0
        var sumSpeed = 0.0
        for (g in grid) {
            val dLat = g.lat - lat
            val dLon = g.lon - lon
            val distSq = dLat * dLat + dLon * dLon
            val w = 1.0 / distSq.coerceAtLeast(0.00001)
            val rad = Math.toRadians(g.windDirection.toDouble())
            sumU += cos(rad) * w
            sumV += kotlin.math.sin(rad) * w
            sumSpeed += g.windSpeed * w
            sumW += w
        }
        if (sumW == 0.0) return 0.0 to 0.0
        val u = sumU / sumW
        val v = sumV / sumW
        val direction = (Math.toDegrees(atan2(v, u)) + 360) % 360
        return (sumSpeed / sumW) to direction
    }
}
