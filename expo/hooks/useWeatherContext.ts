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
  /**
   * How the coordinates for this location were obtained. `"gps"` means a real
   * device (or browser) GPS/WiFi fix; `"network"` means an IP-based estimate
   * used as a fallback when GPS wasn't available (e.g. no GPS hardware in a
   * simulator/preview, or permission denied) — IP geolocation reflects
   * wherever the network request physically egresses from, which can be far
   * from the device's real location, so this must never be labeled "GPS" in
   * the UI. Undefined for legacy/seed entries predating this field.
   */
  locationSource?: "gps" | "network";
}

const DEFAULT_SAVED: SavedLocation[] = [
  { id: "current", name: "San Francisco", region: "California", country: "US", lat: 37.7749, lon: -122.4194, isCurrentLocation: true },
  { id: "new-york", name: "New York", region: "New York", country: "US", lat: 40.7128, lon: -74.006, isCurrentLocation: false },
  { id: "miami", name: "Miami", region: "Florida", country: "US", lat: 25.7617, lon: -80.1918, isCurrentLocation: false },
];

/**
 * Resolves as soon as ANY promise settles with a non-null value, without
 * waiting for the slower ones — but still falls back correctly if the fast
 * one(s) resolve null. This is a REAL race (unlike Promise.all, which always
 * waits for every promise to finish even if the first one already answered).
 */
function firstNonNull<T>(promises: Promise<T | null>[]): Promise<T | null> {
  return new Promise((resolve) => {
    let remaining = promises.length;
    let settled = false;
    if (remaining === 0) {
      resolve(null);
      return;
    }
    promises.forEach((p) => {
      p.then((result) => {
        if (settled) return;
        if (result !== null) {
          settled = true;
          resolve(result);
        } else {
          remaining -= 1;
          if (remaining === 0 && !settled) {
            settled = true;
            resolve(null);
          }
        }
      }).catch(() => {
        if (settled) return;
        remaining -= 1;
        if (remaining === 0 && !settled) {
          settled = true;
          resolve(null);
        }
      });
    });
  });
}

/** Forces any promise to resolve within `ms`, falling back to `fallback` —
 *  guarantees callers can never hang no matter what the underlying promise does. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(fallback);
      }
    }, ms);
    promise.then(
      (v) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(v);
        }
      },
      () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      }
    );
  });
}

async function fetchIPLocation(): Promise<{ lat: number; lon: number } | null> {
  // Run both IP geolocation services in parallel and use whichever answers
  // first — ip-api.com blocks plain HTTPS requests (403), so geojs.io is the
  // real fallback if ipapi.co is unreachable.
  const services = [
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const resp = await fetch("https://ipapi.co/json/", { signal: controller.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (data.latitude && data.longitude) return { lat: data.latitude, lon: data.longitude };
        return null;
      } finally {
        clearTimeout(timeout);
      }
    },
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const resp = await fetch("https://get.geojs.io/v1/ip/geo.json", { signal: controller.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const lat = parseFloat(data.latitude);
        const lon = parseFloat(data.longitude);
        if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
        return null;
      } finally {
        clearTimeout(timeout);
      }
    },
  ];
  const result = await firstNonNull(services.map((svc) => svc().catch(() => null)));
  if (result) {
    console.log("[Geo] IP location:", result.lat, result.lon);
  } else {
    console.log("[Geo] Both IP geolocation services failed");
  }
  return result;
}

async function fetchBrowserLocation(highAccuracy: boolean): Promise<{ lat: number; lon: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    console.log("[Geo] Geolocation not supported on web");
    return null;
  }
  return new Promise((resolve) => {
    let settled = false;
    const safetyTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.log("[Geo] Browser geolocation timed out after 6s");
        resolve(null);
      }
    }, 6000);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          settled = true;
          clearTimeout(safetyTimer);
          console.log("[Geo] Browser location:", pos.coords.latitude, pos.coords.longitude);
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(safetyTimer);
          console.log("[Geo] Browser geolocation error:", err.message);
          resolve(null);
        },
        { timeout: 5000, maximumAge: 300000, enableHighAccuracy: highAccuracy }
      );
    } catch (syncErr) {
      if (!settled) {
        settled = true;
        clearTimeout(safetyTimer);
        console.log("[Geo] Browser geolocation threw synchronously:", syncErr);
        resolve(null);
      }
    }
  });
}

/**
 * Runs the native (iOS/Android) permission request + GPS fix. This always
 * SETTLES on its own eventually, but `expo-location`'s `getCurrentPositionAsync`
 * has NO built-in timeout option — a `timeout` field does not exist on
 * `LocationOptions` and was previously being silently ignored — so a stuck
 * GPS fix (e.g. no simulated location set, indoors, or a slow permission
 * dialog) can take a very long time. The caller wraps this in a hard outer
 * timeout so it never blocks the UI forever.
 */
async function fetchNativeLocation(highAccuracy: boolean): Promise<{ lat: number; lon: number } | null> {
  const Location = require("expo-location");
  console.log("[Geo] Requesting foreground location permission...");
  const { status } = await Location.requestForegroundPermissionsAsync();
  console.log("[Geo] Permission status:", status);
  if (status !== "granted") {
    console.log("[Geo] Location permission denied");
    return null;
  }
  try {
    const accuracy = highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced;
    console.log("[Geo] Requesting current GPS position...");
    // expo-location's getCurrentPositionAsync has no real timeout option, so
    // wrap it in an 8s hard cap. On a cloud emulator with no GPS hardware this
    // never resolves on its own; the outer race (in requestDeviceLocation)
    // would catch it eventually, but capping here lets the IP branch win faster
    // and keeps a real device's slow indoor fix from holding things open too long.
    const loc = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy }),
      8000,
      null as { coords: { latitude: number; longitude: number } } | null
    );
    if (!loc) {
      console.log("[Geo] getCurrentPositionAsync timed out after 8s, trying last known");
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        console.log("[Geo] Using last known location:", last.coords.latitude, last.coords.longitude);
        return { lat: last.coords.latitude, lon: last.coords.longitude };
      }
      console.log("[Geo] No last known location available");
      return null;
    }
    console.log("[Geo] Native GPS location:", loc.coords.latitude, loc.coords.longitude);
    return { lat: loc.coords.latitude, lon: loc.coords.longitude };
  } catch (posErr) {
    console.log("[Geo] getCurrentPositionAsync threw:", posErr);
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        console.log("[Geo] Using last known location:", last.coords.latitude, last.coords.longitude);
        return { lat: last.coords.latitude, lon: last.coords.longitude };
      }
      console.log("[Geo] No last known location available");
    } catch (lastErr) {
      console.log("[Geo] getLastKnownPositionAsync also failed:", lastErr);
    }
    return null;
  }
}

export type GeoSource = "gps" | "network";

export interface GeoResult {
  lat: number;
  lon: number;
  source: GeoSource;
}

async function requestDeviceLocation(highAccuracy: boolean = true): Promise<GeoResult | null> {
  console.log("[Geo] requestDeviceLocation start, platform:", Platform.OS);
  try {
    if (Platform.OS === "web") {
      // Real race: browser GPS vs IP-based geolocation, whichever answers
      // first wins — IP resolves in ~100-300ms and works even when browsers
      // block GPS in iframes, so it usually wins without waiting on GPS at all.
      // A hard 9s outer timeout guarantees this can never hang the UI forever,
      // no matter what the network does underneath. Each branch is tagged with
      // its real source so the UI never claims "GPS" precision for what is
      // actually just an IP-based estimate.
      const coords = await withTimeout(
        firstNonNull<GeoResult>([
          fetchBrowserLocation(highAccuracy).then((r) => (r ? { ...r, source: "gps" as const } : null)),
          fetchIPLocation().then((r) => (r ? { ...r, source: "network" as const } : null)),
        ]),
        9000,
        null
      );
      if (coords) {
        console.log("[Geo] Using location:", coords.lat, coords.lon, "source:", coords.source);
        return coords;
      }
      console.log("[Geo] Web location resolved to null (GPS blocked + IP lookup failed)");
      return null;
    }

    // Native (iOS/Android): run GPS and IP-based geolocation IN PARALLEL from
    // the start (same race pattern the web path uses). On a real device with
    // GPS hardware, the GPS fix usually wins in 1-3s and we use that (true
    // "gps" source). On a cloud simulator/emulator with no GPS hardware, GPS
    // will hang until its 8s timeout — but IP geolocation resolves in ~500ms
    // and wins the race immediately, so the button settles in about a second
    // instead of spinning for 12s. The IP result is tagged "network" (never
    // "gps") because it reflects where the sandbox's network egresses from,
    // NOT the tester's real location.
    const coords = await withTimeout(
      firstNonNull<GeoResult>([
        fetchNativeLocation(highAccuracy)
          .then((r) => (r ? { ...r, source: "gps" as const } : null))
          .catch((err) => {
            console.error("[Geo] Native location flow threw:", err);
            return null;
          }),
        fetchIPLocation().then((r) => (r ? { ...r, source: "network" as const } : null)),
      ]),
      9000,
      null
    );
    if (coords) {
      console.log("[Geo] Using location:", coords.lat, coords.lon, "source:", coords.source);
      return coords;
    }
    console.log("[Geo] All native location sources failed — giving up");
    return null;
  } catch (err) {
    console.error("[Geo] Error getting location:", err);
    return null;
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<{ name: string; region: string; country: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
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
      console.log("[Weather] updateCurrentLocation called, highAccuracy:", highAccuracy);
      setIsRequestingLocation(true);
      try {
        const coords = await requestDeviceLocation(highAccuracy);
        if (!coords) {
          console.log("[Weather] updateCurrentLocation: no coords resolved");
          return null;
        }
        setDeviceCoords({ lat: coords.lat, lon: coords.lon });
        const geo = await reverseGeocode(coords.lat, coords.lon);
        const currentIdx = savedLocations.findIndex((l) => l.isCurrentLocation);
        const currentLocation: SavedLocation = {
          ...(currentIdx >= 0 ? savedLocations[currentIdx] : DEFAULT_SAVED[0]),
          id: currentIdx >= 0 ? savedLocations[currentIdx].id : "current",
          lat: coords.lat,
          lon: coords.lon,
          locationSource: coords.source,
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
        console.log("[Weather] Updated current location to:", geo.name, coords.lat, coords.lon, "source:", coords.source);
        return { name: geo.name, coords: { lat: coords.lat, lon: coords.lon }, source: coords.source };
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
          fetchWeatherForLocation(loc.lat, loc.lon, loc.id, loc.name, loc.region, loc.country, loc.isCurrentLocation, tempUnit, loc.locationSource)
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
              locationSource: savedLocation.locationSource,
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
