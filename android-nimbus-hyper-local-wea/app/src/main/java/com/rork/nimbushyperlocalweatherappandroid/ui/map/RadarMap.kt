package com.rork.nimbushyperlocalweatherappandroid.ui.map

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.osmdroid.config.Configuration
import org.osmdroid.util.GeoPoint
import org.osmdroid.tileprovider.MapTileProviderBasic
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.TilesOverlay
import org.osmdroid.views.overlay.mylocation.SimpleLocationOverlay

/**
 * The full-screen osmdroid map composable with:
 * - CARTO dark basemap
 * - RainViewer animated radar tile overlay (frame loop)
 * - Optional weather field overlay (temperature/wind)
 * - GPS location dot
 */
@Composable
fun RadarMap(
    centerLat: Double,
    centerLon: Double,
    zoom: Double = 7.0,
    radarFrames: List<com.rork.nimbushyperlocalweatherappandroid.data.model.RainViewerFrame>,
    radarHost: String,
    radarEnabled: Boolean,
    radarOpacity: Float,
    weatherGrid: List<com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherGridPoint>,
    activeLayer: com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherLayer,
    tempUnit: com.rork.nimbushyperlocalweatherappandroid.data.model.TempUnit,
    showLocationDot: Boolean,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    // Configure osmdroid with app context for tile cache
    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            Configuration.getInstance().apply {
                userAgentValue = "NimbusWeather/1.0"
                osmdroidTileCache = context.cacheDir
            }
        }
    }

    val mapView = remember {
        MapView(context).apply {
            setTileSource(MapTileSources.darkBasemap)
            setMultiTouchControls(true)
            setBuiltInZoomControls(false)
            isVerticalMapRepetitionEnabled = false
            minZoomLevel = 3.0
            maxZoomLevel = 16.0
            controller.setZoom(zoom)
            controller.setCenter(GeoPoint(centerLat, centerLon))
        }
    }

    var currentRadarOverlay by remember { mutableStateOf<TilesOverlay?>(null) }
    var weatherFieldOverlay by remember { mutableStateOf<WeatherFieldOverlay?>(null) }
    var locationOverlay by remember { mutableStateOf<SimpleLocationOverlay?>(null) }

    // Update center when location changes
    LaunchedEffect(centerLat, centerLon) {
        mapView.controller.animateTo(GeoPoint(centerLat, centerLon))
    }

    // Manage weather field overlay
    LaunchedEffect(activeLayer, weatherGrid, tempUnit) {
        val existing = weatherFieldOverlay
        if (activeLayer == com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherLayer.TEMPERATURE) {
            if (existing == null) {
                val overlay = WeatherFieldOverlay(
                    weatherGrid,
                    WeatherFieldOverlay.OverlayMode.TEMPERATURE,
                    tempUnit
                )
                mapView.overlays.add(overlay)
                weatherFieldOverlay = overlay
            } else {
                existing.updateData(weatherGrid, WeatherFieldOverlay.OverlayMode.TEMPERATURE, tempUnit)
                mapView.invalidate()
            }
        } else if (activeLayer == com.rork.nimbushyperlocalweatherappandroid.data.model.WeatherLayer.WIND) {
            if (existing == null) {
                val overlay = WeatherFieldOverlay(
                    weatherGrid,
                    WeatherFieldOverlay.OverlayMode.WIND,
                    tempUnit
                )
                mapView.overlays.add(overlay)
                weatherFieldOverlay = overlay
            } else {
                existing.updateData(weatherGrid, WeatherFieldOverlay.OverlayMode.WIND, tempUnit)
                mapView.invalidate()
            }
        } else {
            existing?.let {
                mapView.overlays.remove(it)
                weatherFieldOverlay = null
                mapView.invalidate()
            }
        }
    }

    // Manage location dot overlay
    LaunchedEffect(showLocationDot, centerLat, centerLon) {
        if (showLocationDot) {
            locationOverlay?.let { mapView.overlays.remove(it) }
            val loc = SimpleLocationOverlay(context).apply {
                setLocation(GeoPoint(centerLat, centerLon))
            }
            mapView.overlays.add(loc)
            locationOverlay = loc
            mapView.invalidate()
        } else {
            locationOverlay?.let {
                mapView.overlays.remove(it)
                locationOverlay = null
                mapView.invalidate()
            }
        }
    }

    // Animate radar frames — loop through past + nowcast frames
    LaunchedEffect(radarFrames, radarHost, radarEnabled) {
        if (!radarEnabled || radarFrames.isEmpty()) {
            currentRadarOverlay?.let {
                mapView.overlays.remove(it)
                currentRadarOverlay = null
                mapView.invalidate()
            }
            return@LaunchedEffect
        }

        var frameIndex = 0
        while (radarEnabled && radarFrames.isNotEmpty()) {
            val frame = radarFrames[frameIndex]
            val tileSource = MapTileSources.rainViewerFrame(radarHost, frame.path, radarOpacity)

            currentRadarOverlay?.let { mapView.overlays.remove(it) }

            val tileProvider = MapTileProviderBasic(context, tileSource)
            val overlay = TilesOverlay(tileProvider, context).apply {
                setLoadingBackgroundColor(android.graphics.Color.TRANSPARENT)
                setColorFilter(
                    android.graphics.PorterDuffColorFilter(
                        android.graphics.Color.argb((radarOpacity * 255).toInt(), 255, 255, 255),
                        android.graphics.PorterDuff.Mode.SRC_ATOP
                    )
                )
            }
            val insertIndex = 1.coerceAtMost(mapView.overlays.size)
            mapView.overlays.add(insertIndex, overlay)
            currentRadarOverlay = overlay
            mapView.invalidate()

            frameIndex = (frameIndex + 1) % radarFrames.size
            delay(400)
        }
    }

    AndroidView(
        factory = { mapView },
        modifier = modifier
    )

    DisposableEffect(Unit) {
        onDispose {
            mapView.onDetach()
        }
    }
}
