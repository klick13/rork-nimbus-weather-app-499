package com.rork.nimbushyperlocalweatherappandroid.data.api

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.rork.nimbushyperlocalweatherappandroid.data.model.SavedLocation
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

class LocationService(private val context: Context) {

    private val fusedClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): SavedLocation? {
        if (!hasLocationPermission()) return null
        return suspendCancellableCoroutine { cont ->
            fusedClient.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, null)
                .addOnSuccessListener { location ->
                    if (location != null) {
                        cont.resume(
                            SavedLocation(
                                id = "gps_current",
                                name = "Current Location",
                                lat = location.latitude,
                                lon = location.longitude,
                                isCurrentLocation = true,
                                isGps = true
                            )
                        )
                    } else {
                        // Fall back to last known location
                        fusedClient.lastLocation
                            .addOnSuccessListener { last ->
                                if (last != null) {
                                    cont.resume(
                                        SavedLocation(
                                            id = "gps_current",
                                            name = "Current Location",
                                            lat = last.latitude,
                                            lon = last.longitude,
                                            isCurrentLocation = true,
                                            isGps = true
                                        )
                                    )
                                } else {
                                    cont.resume(null)
                                }
                            }
                            .addOnFailureListener { cont.resume(null) }
                    }
                }
                .addOnFailureListener { cont.resume(null) }
        }
    }
}
