import { useState, useEffect, useMemo, useCallback } from "react";
import { Platform } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { LocationWeather, TempUnit } from "@/types/weather";
import { fetchWeatherForLocation } from "@/utils/weatherApi";
import { mockLocations } from "@/mocks/weather";

const STORAGE_KEY = "nimbus_locations_meta";
const SELECTED_KEY = "nimbus_selected";
const UNIT_KEY = "nimbus_temp_unit";
const ONBOARDING_KEY = "nimbus_onboarding_complete";

export type { TempUnit };

export interface SavedLocation {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  isCurrentLocation: boolean;
}

const DEFAULT_SAVED: SavedLocation[] = [
  { id: "current", name: "San Francisco", region: "California", country: "US", lat: 37.7749, lon: -122.4194, isCurrentLocation: true },
  { id: "new-york", name: "New York", region: "New York", country: "US", lat: 40.7128, lon: -74.006, isCurrentLocation: false },
  { id: "miami", name: "Miami", region: "Florida", country: "US", lat: 25.7617, lon: -80.1918, isCurrentLocation: false },
];

async function requestDeviceLocation(highAccuracy: boolean = true): Promise<{ lat: number; lon: number } | null> {
  try {
    if (Platform.OS === "web") {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          console.log("[Geo] Geolocation not supported on web");
          resolve(null);
          return;
        }
        let settled = false;
        // Safety timeout: browsers in iframes may silently block geolocation
        // without ever calling success or error, so we force-resolve after 15s.
        const safetyTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            console.log("[Geo] Web geolocation timed out after 15s");
            resolve(null);
          }
        }, 15000);
        const done = (result: { lat: number; lon: number } | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(safetyTimer);
          resolve(result);
        };
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log("[Geo] Web location:", pos.coords.latitude, pos.coords.longitude);
            done({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          },
          (err) => {
            console.log("[Geo] Web geolocation error:", err.message);
            done(null);
          },
          { timeout: 12000, maximumAge: 60000, enableHighAccuracy: highAccuracy }
        );
      });
    } else {
      const Location = require("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("[Geo] Location permission denied");
        return null;
      }
      try {
        const accuracy = highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced;
        const loc = await Location.getCurrentPositionAsync({ accuracy, timeout: 12000 });
        console.log("[Geo] Native location:", loc.coords.latitude, loc.coords.longitude);
        return { lat: loc.coords.latitude, lon: loc.coords.longitude };
      } catch (posErr) {
        console.log("[Geo] getCurrentPositionAsync failed, trying last known:", posErr);
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last) {
            console.log("[Geo] Using last known location:", last.coords.latitude, last.coords.longitude);
            return { lat: last.coords.latitude, lon: last.coords.longitude };
          }
        } catch (lastErr) {
          console.log("[Geo] getLastKnownPositionAsync also failed:", lastErr);
        }
        return null;
      }
    }
  } catch (err) {
    console.error("[Geo] Error getting location:", err);
    return null;
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<{ name: string; region: string; country: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "NimbusWeatherApp/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "My Location";
      const state = data.address?.state || "";
      const country = data.address?.country_code?.toUpperCase() || "US";
      console.log("[Geo] Reverse geocode result:", city, state, country);
      return { name: city, region: state, country };
    }
  } catch (err) {
    console.error("[Geo] Reverse geocode error:", err);
  }
  return { name: "My Location", region: "", country: "US" };
}

export const [WeatherProvider, useWeather] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(DEFAULT_SAVED);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("current");
  const [weatherData, setWeatherData] = useState<LocationWeather[]>(mockLocations);
  const [tempUnit, setTempUnit] = useState<TempUnit>("F");
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(true);
  const [isRequestingLocation, setIsRequestingLocation] = useState<boolean>(false);

  const unitQuery = useQuery({
    queryKey: ["temp-unit"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(UNIT_KEY);
      return (stored as TempUnit) || "F";
    },
  });

  useEffect(() => {
    if (unitQuery.data) {
      setTempUnit(unitQuery.data);
    }
  }, [unitQuery.data]);

  const toggleUnit = useCallback(async () => {
    const newUnit: TempUnit = tempUnit === "F" ? "C" : "F";
    setTempUnit(newUnit);
    await AsyncStorage.setItem(UNIT_KEY, newUnit);
    queryClient.invalidateQueries({ queryKey: ["weather-data"] });
    console.log("[Weather] Temperature unit changed to:", newUnit);
  }, [tempUnit, queryClient]);

  const metaQuery = useQuery({
    queryKey: ["location-meta"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const selectedId = await AsyncStorage.getItem(SELECTED_KEY);
      const onboardingComplete = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasCompletedOnboarding(onboardingComplete === "true");
      if (selectedId) setSelectedLocationId(selectedId);
      return stored ? (JSON.parse(stored) as SavedLocation[]) : DEFAULT_SAVED;
    },
  });

  useEffect(() => {
    if (metaQuery.data) {
      setSavedLocations(metaQuery.data);
    }
  }, [metaQuery.data]);

  const saveMeta = useCallback(async (updated: SavedLocation[]) => {
    setSavedLocations(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const selectLocation = useCallback(async (id: string) => {
    setSelectedLocationId(id);
    await AsyncStorage.setItem(SELECTED_KEY, id);
  }, []);

  const updateCurrentLocation = useCallback(
    async (highAccuracy: boolean = true) => {
      setIsRequestingLocation(true);
      try {
        const coords = await requestDeviceLocation(highAccuracy);
        if (!coords) return null;
        setDeviceCoords(coords);
        const geo = await reverseGeocode(coords.lat, coords.lon);
        const currentIdx = savedLocations.findIndex((l) => l.isCurrentLocation);
        const currentLocation: SavedLocation = {
          ...(currentIdx >= 0 ? savedLocations[currentIdx] : DEFAULT_SAVED[0]),
          id: currentIdx >= 0 ? savedLocations[currentIdx].id : "current",
          lat: coords.lat,
          lon: coords.lon,
          name: geo.name,
          region: geo.region,
          country: geo.country,
          isCurrentLocation: true,
        };
        const updated = currentIdx >= 0
          ? savedLocations.map((loc, index) => (index === currentIdx ? currentLocation : loc))
          : [currentLocation, ...savedLocations];
        await saveMeta(updated);
        await selectLocation(currentLocation.id);
        queryClient.invalidateQueries({ queryKey: ["weather-data"] });
        console.log("[Weather] Updated current location to:", geo.name, coords.lat, coords.lon);
        return { name: geo.name, coords };
      } finally {
        setIsRequestingLocation(false);
      }
    },
    [savedLocations, saveMeta, selectLocation, queryClient]
  );

  const completeOnboarding = useCallback(async () => {
    setHasCompletedOnboarding(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  }, []);

  const weatherQuery = useQuery({
    queryKey: ["weather-data", savedLocations.map((l) => `${l.id}-${l.lat}-${l.lon}`).join(","), tempUnit],
    queryFn: async () => {
      console.log("[Weather] Fetching weather for", savedLocations.length, "locations, unit:", tempUnit);
      const results = await Promise.allSettled(
        savedLocations.map((loc) =>
          fetchWeatherForLocation(loc.lat, loc.lon, loc.id, loc.name, loc.region, loc.country, loc.isCurrentLocation, tempUnit)
        )
      );
      const successful: LocationWeather[] = [];
      results.forEach((r, i) => {
        const savedLocation = savedLocations[i];
        if (!savedLocation) return;
        if (r.status === "fulfilled") {
          successful.push(r.value);
        } else {
          const reason = r.reason instanceof Error ? r.reason.message : "Unknown weather service error";
          console.warn("[Weather] Failed to fetch for", savedLocation.name, reason);
          const existingFallback = mockLocations.find((m) => m.id === savedLocation.id);
          const fallbackTemplate = existingFallback ?? mockLocations[0];
          if (fallbackTemplate) {
            successful.push({
              ...fallbackTemplate,
              id: savedLocation.id,
              name: savedLocation.name,
              region: savedLocation.region,
              country: savedLocation.country,
              lat: savedLocation.lat,
              lon: savedLocation.lon,
              isCurrentLocation: savedLocation.isCurrentLocation,
              lastUpdated: "Offline estimate",
            });
          }
        }
      });
      return successful.length > 0 ? successful : mockLocations;
    },
    enabled: savedLocations.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (weatherQuery.data) {
      setWeatherData(weatherQuery.data);
    }
  }, [weatherQuery.data]);

  const selectedLocation = useMemo(
    () => weatherData.find((l) => l.id === selectedLocationId) ?? weatherData[0] ?? mockLocations[0],
    [weatherData, selectedLocationId]
  );

  const addLocation = useCallback(
    async (loc: { name: string; region: string; country: string; lat: number; lon: number }) => {
      const id = `${loc.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
      const newSaved: SavedLocation = {
        id,
        name: loc.name,
        region: loc.region,
        country: loc.country,
        lat: loc.lat,
        lon: loc.lon,
        isCurrentLocation: false,
      };
      const updated = [...savedLocations, newSaved];
      await saveMeta(updated);
      queryClient.invalidateQueries({ queryKey: ["weather-data"] });
      console.log("[Weather] Added location:", loc.name);
      return id;
    },
    [savedLocations, saveMeta, queryClient]
  );

  const removeLocation = useCallback(
    async (id: string) => {
      const updated = savedLocations.filter((l) => l.id !== id);
      await saveMeta(updated);
      if (selectedLocationId === id) {
        const fallback = updated[0]?.id ?? "current";
        selectLocation(fallback);
      }
      queryClient.invalidateQueries({ queryKey: ["weather-data"] });
    },
    [savedLocations, selectedLocationId, saveMeta, selectLocation, queryClient]
  );

  const refreshWeather = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["weather-data"] });
  }, [queryClient]);

  return {
    locations: weatherData,
    savedLocations,
    selectedLocation,
    selectedLocationId,
    selectLocation,
    addLocation,
    removeLocation,
    refreshWeather,
    isLoading: weatherQuery.isLoading || metaQuery.isLoading,
    isRefreshing: weatherQuery.isFetching,
    tempUnit,
    toggleUnit,
    deviceCoords,
    updateCurrentLocation,
    isRequestingLocation,
    hasCompletedOnboarding,
    completeOnboarding,
  };
});
