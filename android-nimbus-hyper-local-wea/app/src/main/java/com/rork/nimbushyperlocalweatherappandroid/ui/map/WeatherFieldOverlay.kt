package com.rork.nimbushyperlocalweatherappandroid.ui.map

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.Projection
import org.osmdroid.views.overlay.Overlay
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

/**
 * Canvas overlay that draws the temperature color field and/or wind streamlines
 * on top of the map. Data points are reprojected from lat/lon to screen pixels
 * via the osmdroid Projection, and color is computed using the WeatherColors
 * color math ported from the Expo app.
 */
class WeatherFieldOverlay(
    private var grid: List<com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherGridPoint>,
    private var mode: OverlayMode,
    private var tempUnit: com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit,
    private var opacity: Float = 0.55f
) : Overlay() {

    enum class OverlayMode { TEMPERATURE, WIND }

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        isDither = true
    }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2.5f
        isDither = true
        strokeCap = Paint.Cap.ROUND
    }
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 26f
        textAlign = Paint.Align.CENTER
        setShadowLayer(3f, 1f, 1f, Color.argb(200, 0, 0, 0))
    }

    fun updateData(
        newGrid: List<com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherGridPoint>,
        newMode: OverlayMode,
        newUnit: com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit,
        newOpacity: Float = opacity
    ) {
        this.grid = newGrid
        this.mode = newMode
        this.tempUnit = newUnit
        this.opacity = newOpacity
    }

    override fun draw(canvas: Canvas, projection: Projection) {
        val validGrid = grid.filter { it.valid }
        if (validGrid.isEmpty()) return

        when (mode) {
            OverlayMode.TEMPERATURE -> drawTemperatureField(canvas, projection, validGrid)
            OverlayMode.WIND -> drawWindStreamlines(canvas, projection, validGrid)
        }
    }

    /** Get the center GeoPoint of the current projection from its bounding box. */
    private fun projectionCenter(projection: Projection): GeoPoint {
        val bbox = projection.boundingBox
        return GeoPoint(
            bbox.centerLatitude,
            bbox.centerLongitude
        )
    }

    /**
     * Draw the temperature color field as filled circles around each grid point.
     * The circles overlap to create a continuous color wash, then value labels
     * are drawn on top.
     */
    private fun drawTemperatureField(
        canvas: Canvas,
        projection: Projection,
        grid: List<com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherGridPoint>
    ) {
        val center = projectionCenter(projection)
        val centerLat = center.latitude
        val refGeo = GeoPoint(centerLat + 1.0, center.longitude)
        val centerPx = projection.toPixels(center, null)
        val refPx = projection.toPixels(refGeo, null)
        val pxPerDegLat = kotlin.math.abs(refPx.y - centerPx.y.toDouble())
        val gridSpacingDeg = 1.5
        val radius = (pxPerDegLat * gridSpacingDeg * 0.7).toFloat().coerceAtLeast(40f)

        for (point in grid) {
            val geo = GeoPoint(point.lat, point.lon)
            val px = projection.toPixels(geo, null)
            val rgb = com.rork.nimbushyperlocalweatherappandroid.data.api.WeatherColors.tempColorSmooth(
                point.temp.toDouble(), tempUnit
            )
            fillPaint.color = com.rork.nimbushyperlocalweatherappandroid.data.api.WeatherColors.toArgb(
                rgb, (opacity * 255).toInt()
            )
            canvas.drawCircle(px.x.toFloat(), px.y.toFloat(), radius, fillPaint)
        }

        for (point in grid) {
            val geo = GeoPoint(point.lat, point.lon)
            val px = projection.toPixels(geo, null)
            val unitStr = if (tempUnit == com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit.F) "F" else "C"
            val label = "${point.temp}°$unitStr"
            canvas.drawText(label, px.x.toFloat(), px.y.toFloat() - radius * 0.3f, labelPaint)
        }
    }

    /**
     * Draw wind streamlines — short colored arrows from each grid point,
     * colored by wind speed.
     */
    private fun drawWindStreamlines(
        canvas: Canvas,
        projection: Projection,
        grid: List<com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherGridPoint>
    ) {
        val center = projectionCenter(projection)
        val centerLat = center.latitude
        val refGeo = GeoPoint(centerLat + 1.0, center.longitude)
        val centerPx = projection.toPixels(center, null)
        val refPx = projection.toPixels(refGeo, null)
        val pxPerDegLat = kotlin.math.abs(refPx.y - centerPx.y.toDouble())
        val arrowLength = (pxPerDegLat * 0.8).toFloat().coerceIn(30f, 120f)

        for (point in grid) {
            val geo = GeoPoint(point.lat, point.lon)
            val px = projection.toPixels(geo, null)
            val x = px.x.toFloat()
            val y = px.y.toFloat()

            val rgb = com.rork.nimbushyperlocalweatherappandroid.data.api.WeatherColors.windColor(
                point.windSpeed.toDouble(), tempUnit
            )
            val brightRgb = com.rork.nimbushyperlocalweatherappandroid.data.api.WeatherColors.brighten(rgb, 0.3)
            strokePaint.color = com.rork.nimbushyperlocalweatherappandroid.data.api.WeatherColors.toArgb(
                brightRgb, (opacity * 255 * 0.9f).toInt()
            )

            val rad = Math.toRadians(point.windDirection.toDouble())
            val dx = (sin(rad) * arrowLength).toFloat()
            val dy = (-cos(rad) * arrowLength).toFloat()

            val path = Path()
            path.moveTo(x, y)
            path.lineTo(x + dx, y + dy)
            val angle = atan2(dy.toDouble(), dx.toDouble())
            val headLen = arrowLength * 0.3f
            val headAngle = 0.4f
            path.lineTo(
                (x + dx - headLen * cos(angle + headAngle)).toFloat(),
                (y + dy - headLen * sin(angle + headAngle)).toFloat()
            )
            path.moveTo(x + dx, y + dy)
            path.lineTo(
                (x + dx - headLen * cos(angle - headAngle)).toFloat(),
                (y + dy - headLen * sin(angle - headAngle)).toFloat()
            )
            canvas.drawPath(path, strokePaint)

            fillPaint.color = com.rork.nimbushyperlocalweatherappandroid.data.api.WeatherColors.toArgb(
                brightRgb, (opacity * 200).toInt()
            )
            canvas.drawCircle(x, y, 3f, fillPaint)
        }
    }
}
