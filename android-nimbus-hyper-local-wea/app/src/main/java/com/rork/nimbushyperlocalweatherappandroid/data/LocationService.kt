package com.rork.nimbushyperlocalweatherappandroid.data

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.Task
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlin.coroutines.resume

class LocationService(private val context: Context) {

    private val fusedClient: FusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context)

    fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
               ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): GeoResult? {
        if (!hasLocationPermission()) return null

        // Try GPS first with a timeout, fall back to IP geolocation
        val gpsResult = withTimeoutOrNull(8000L) {
            try {
                val loc = fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null).awaitLocation()
                if (loc != null) {
                    GeoResult(loc.latitude, loc.longitude, "gps")
                } else {
                    // Try last known location
                    val lastKnown = fusedClient.lastLocation.awaitLocation()
                    if (lastKnown != null) {
                        GeoResult(lastKnown.latitude, lastKnown.longitude, "gps")
                    } else null
                }
            } catch (e: Exception) {
                null
            }
        }

        if (gpsResult != null) return gpsResult

        // Fall back to IP geolocation
        return fetchIPLocation()
    }

    private suspend fun fetchIPLocation(): GeoResult? = withContext(Dispatchers.IO) {
        val services = listOf(
            "https://ipapi.co/json/",
            "https://get.geojs.io/v1/ip/geo.json",
        )
        for (url in services) {
            try {
                val result = withTimeoutOrNull(4000L) {
                    val conn = java.net.URL(url).openConnection()
                    conn.connectTimeout = 3000
                    conn.readTimeout = 3000
                    val text = conn.getInputStream().bufferedReader().use { it.readText() }
                    val json = Json.parseToJsonElement(text).jsonObject
                    val lat = json["latitude"]?.jsonPrimitive?.doubleOrNull
                    val lon = json["longitude"]?.jsonPrimitive?.doubleOrNull
                    if (lat != null && lon != null) GeoResult(lat, lon, "network") else null
                }
                if (result != null) return@withContext result
            } catch (e: Exception) {
                // Try next service
            }
        }
        null
    }
}

@SuppressLint("MissingPermission")
suspend fun Task<Location>.awaitLocation(): Location? =
    suspendCancellableCoroutine { cont ->
        addOnSuccessListener { loc -> if (cont.isActive) cont.resume(loc) }
        addOnFailureListener { if (cont.isActive) cont.resume(null) }
    }
