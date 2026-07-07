package com.rork.nimbushyperlocalweatherappandroid.data.api

import com.rork.nimbushyperlocalweatherappandroid.data.model.RainViewerCoverage
import com.rork.nimbushyperlocalweatherappandroid.data.model.RainViewerFrame
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long

class RainViewerApiService {

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    private val client = HttpClient {
        install(ContentNegotiation) {
            this.json(this@RainViewerApiService.json)
        }
    }

    companion object {
        private const val COVERAGE_URL = "https://api.rainviewer.com/public/weather-maps.json"
    }

    /**
     * Fetch the RainViewer coverage manifest which contains past radar frames
     * and nowcast (forecast) frames with their tile paths and timestamps.
     */
    suspend fun fetchCoverage(): RainViewerCoverage? {
        return try {
            val text = client.get(COVERAGE_URL).bodyAsText()
            val obj = json.parseToJsonElement(text).jsonObject
            val host = (obj["host"] as? JsonPrimitive)?.content ?: "https://tilecache.rainviewer.com"

            val radarPast = obj["radar"]?.jsonObject?.get("past")?.jsonArray ?: emptyList()
            val radarNowcast = obj["radar"]?.jsonObject?.get("nowcast")?.jsonArray ?: emptyList()

            val frames = mutableListOf<RainViewerFrame>()
            for (item in radarPast) {
                val o = item.jsonObject
                val time = o["time"]?.jsonPrimitive?.long ?: 0L
                val path = (o["path"] as? JsonPrimitive)?.content ?: ""
                if (time > 0 && path.isNotEmpty()) {
                    frames.add(RainViewerFrame(time, path))
                }
            }
            for (item in radarNowcast) {
                val o = item.jsonObject
                val time = o["time"]?.jsonPrimitive?.long ?: 0L
                val path = (o["path"] as? JsonPrimitive)?.content ?: ""
                if (time > 0 && path.isNotEmpty()) {
                    frames.add(RainViewerFrame(time, path))
                }
            }

            RainViewerCoverage(host = host, radar = frames)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Build the full tile URL for a given RainViewer host + path.
     * RainViewer tile URL pattern: {host}{path}/{z}/{x}/{y}/2/1_1.png
     * size=2 (256px), color=1 (original), smooth=1
     */
    fun tileUrl(host: String, path: String, zoom: Int, x: Int, y: Int): String {
        return "$host$path/$zoom/$x/$y/2/1_1.png"
    }
}
