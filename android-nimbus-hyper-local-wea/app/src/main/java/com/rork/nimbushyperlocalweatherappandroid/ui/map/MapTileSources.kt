package com.rork.nimbushyperlocalweatherappandroid.ui.map

import org.osmdroid.tileprovider.MapTileProviderBasic
import org.osmdroid.tileprovider.tilesource.OnlineTileSourceBase
import org.osmdroid.tileprovider.tilesource.XYTileSource
import org.osmdroid.util.MapTileIndex

/**
 * Builder for osmdroid tile sources used by Nimbus.
 * Dark CARTO basemap + RainViewer radar tile overlay.
 */
object MapTileSources {

    /** Dark CARTO basemap — free, no API key, matches the app's dark aesthetic. */
    val darkBasemap: OnlineTileSourceBase = XYTileSource(
        "CARTO-Dark",
        0, 19, 256, ".png",
        arrayOf(
            "https://a.basemaps.cartocdn.com/dark_all/",
            "https://b.basemaps.cartocdn.com/dark_all/",
            "https://c.basemaps.cartocdn.com/dark_all/",
            "https://d.basemaps.cartocdn.com/dark_all/"
        )
    )

    /**
     * Build a RainViewer radar tile source for a specific frame path.
     * URL pattern: {host}{path}/{z}/{x}/{y}/2/1_1.png
     */
    fun rainViewerFrame(
        host: String,
        path: String,
        @Suppress("UNUSED_PARAMETER") opacity: Float = 0.7f
    ): RainViewerTileSource {
        return RainViewerTileSource(host, path)
    }
}

/**
 * Custom tile source for a single RainViewer radar frame.
 * Renders semi-transparent radar tiles with adjustable opacity
 * (opacity is applied via a color filter on the TilesOverlay, not here).
 */
class RainViewerTileSource(
    private val host: String,
    private val path: String
) : OnlineTileSourceBase(
    "RainViewer-$path",
    0, 20, 256, ".png",
    arrayOf("$host$path/")
) {
    override fun getTileURLString(pMapTileIndex: Long): String {
        val zoom = MapTileIndex.getZoom(pMapTileIndex)
        val x = MapTileIndex.getX(pMapTileIndex)
        val y = MapTileIndex.getY(pMapTileIndex)
        return baseUrl + "$zoom/$x/$y/2/1_1.png"
    }
}
