import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MapPin,
  Navigation,
  Trash2,
  ChevronRight,
  Search,
  Plus,
  X,
  ChevronLeft,
  Crosshair,
  LocateFixed,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { WeatherColors } from "@/constants/colors";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { useWeather } from "@/hooks/useWeatherContext";
import { getWeatherIcon } from "@/utils/weatherIcons";
import { searchLocations, GeocodingResult } from "@/utils/weatherApi";
import { showAlert } from "@/utils/alert";
import { LocationWeather } from "@/types/weather";

function LocationCard({
  location,
  isSelected,
  onSelect,
  onDelete,
  index,
}: {
  location: LocationWeather;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const WeatherIcon = getWeatherIcon(location.condition.icon);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.card, isSelected && styles.cardSelected]}
        testID={`location-card-${location.id}`}
      >
        <LinearGradient
          colors={
            isSelected
              ? ["rgba(0, 240, 255, 0.08)", "rgba(0, 240, 255, 0.02)"]
              : [WeatherColors.cardBackground, WeatherColors.cardBackground]
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.cardLeft}>
          <View style={styles.cardTitleRow}>
            {location.isCurrentLocation ? (
              <Navigation
                size={12}
                color={location.locationSource === "network" ? WeatherColors.neonYellow : WeatherColors.neonGreen}
                fill={location.locationSource === "network" ? WeatherColors.neonYellow : WeatherColors.neonGreen}
              />
            ) : (
              <MapPin size={12} color={WeatherColors.accent} />
            )}
            <Text style={styles.cardName} numberOfLines={1}>
              {location.name}
            </Text>
            {location.isCurrentLocation && (
              <View style={[styles.currentBadge, location.locationSource === "network" && styles.currentBadgeNetwork]}>
                <View style={[styles.currentBadgeDot, location.locationSource === "network" && styles.currentBadgeDotNetwork]} />
                <Text style={[styles.currentBadgeText, location.locationSource === "network" && styles.currentBadgeTextNetwork]}>
                  {location.locationSource === "network" ? "NETWORK" : "GPS"}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.cardRegion}>
            {location.region} · {location.condition.main}
          </Text>
          <Text style={styles.cardCoords}>
            {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
          </Text>
        </View>
        <View style={styles.cardRight}>
          <WeatherIcon
            size={28}
            color={isSelected ? WeatherColors.accent : WeatherColors.textSecondary}
            strokeWidth={1.5}
          />
          <Text style={[styles.cardTemp, isSelected && styles.cardTempSelected]}>
            {location.currentTemp}°
          </Text>
          <Text style={styles.cardHiLo}>
            H:{location.high}° L:{location.low}°
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID={`delete-location-${location.id}`}
          >
            <Trash2 size={16} color={WeatherColors.textTertiary} />
          </TouchableOpacity>
          <ChevronRight size={16} color={WeatherColors.textTertiary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SearchResultItem({
  result,
  onAdd,
  isAdding,
}: {
  result: GeocodingResult;
  onAdd: () => void;
  isAdding: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.searchResult}
        onPress={onAdd}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={isAdding}
        testID={`search-result-${result.id}`}
      >
        <MapPin size={16} color={WeatherColors.accent} strokeWidth={1.5} />
        <View style={styles.searchResultText}>
          <Text style={styles.searchResultName}>{result.name}</Text>
          <Text style={styles.searchResultRegion}>
            {result.admin1 ? `${result.admin1}, ` : ""}{result.country}
          </Text>
          <Text style={styles.searchResultCoords}>
            {result.latitude.toFixed(4)}°, {result.longitude.toFixed(4)}°
          </Text>
        </View>
        {isAdding ? (
          <ActivityIndicator size="small" color={WeatherColors.accent} />
        ) : (
          <View style={styles.addButton}>
            <Plus size={16} color={WeatherColors.accent} strokeWidth={2} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LocationsScreen() {
  const insets = useSafeAreaInsets();
  const { locations, selectedLocationId, selectLocation, removeLocation, addLocation, updateCurrentLocation } =
    useWeather();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [showCoords, setShowCoords] = useState<boolean>(false);
  const [latInput, setLatInput] = useState<string>("");
  const [lonInput, setLonInput] = useState<string>("");
  const [coordsAdding, setCoordsAdding] = useState<boolean>(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.92, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchLocations(text);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);
  }, []);

  const addMutation = useMutation({
    mutationFn: async (result: GeocodingResult) => {
      setAddingId(result.id);
      const id = await addLocation({
        name: result.name,
        region: result.admin1 ?? result.country,
        country: result.country_code,
        lat: result.latitude,
        lon: result.longitude,
      });
      return id;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSearchQuery("");
      setSearchResults([]);
      setShowSearch(false);
      setAddingId(null);
      Keyboard.dismiss();
    },
    onError: () => {
      setAddingId(null);
      Alert.alert("Error", "Could not add location. Please try again.");
    },
  });

  const useMyLocationMutation = useMutation({
    mutationFn: async () => {
      console.log("[Locations] Use My Location pressed");
      const result = await updateCurrentLocation(true);
      if (!result) {
        throw new Error("Could not get your location. Please check your location permissions.");
      }
      console.log("[Locations] Got coords:", result.coords.lat, result.coords.lon);
      return result;
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log("[Locations] Location set to:", data.name, "source:", data.source);
      if (data.source === "network") {
        showAlert(
          "Approximate Location Set",
          `${data.name} is based on your network, not exact GPS — GPS wasn't available right now (expected when testing in a simulator/preview with no GPS hardware). Search your city above or add exact coordinates to pinpoint it, or open this app on your own phone for automatic GPS accuracy.`
        );
      }
      router.navigate("/" as never);
    },
    onError: (err: Error) => {
      showAlert("Location Error", err.message || "Could not get your location.");
    },
  });

  const handleSelect = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      selectLocation(id);
      router.navigate("/" as never);
    },
    [selectLocation, router]
  );

  const handleDelete = useCallback(
    (location: LocationWeather) => {
      Alert.alert(
        "Remove Location",
        `Remove ${location.name} from your locations?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              removeLocation(location.id);
            },
          },
        ]
      );
    },
    [removeLocation]
  );

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) {
        setSearchQuery("");
        setSearchResults([]);
        setShowCoords(false);
        setLatInput("");
        setLonInput("");
        Keyboard.dismiss();
      }
      return !prev;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleAddByCoords = useCallback(async () => {
    const lat = parseFloat(latInput.trim());
    const lon = parseFloat(lonInput.trim());
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Alert.alert("Invalid Coordinates", "Latitude must be -90 to 90 and longitude must be -180 to 180.");
      return;
    }
    setCoordsAdding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
        { headers: { "User-Agent": "NimbusWeatherApp/1.0" } }
      );
      let name = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      let region = "";
      let country = "US";
      if (res.ok) {
        const data = await res.json();
        name = data.address?.city || data.address?.town || data.address?.village || data.address?.county || name;
        region = data.address?.state || "";
        country = data.address?.country_code?.toUpperCase() || "US";
      }
      await addLocation({ name, region, country, lat, lon });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLatInput("");
      setLonInput("");
      setShowCoords(false);
      setShowSearch(false);
      Keyboard.dismiss();
    } catch (err) {
      console.error("[Locations] Coords add error:", err);
      Alert.alert("Error", "Could not add location. Please try again.");
    } finally {
      setCoordsAdding(false);
    }
  }, [latInput, lonInput, addLocation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AtmosphericBackground
        conditionId={locations.find(l => l.id === selectedLocationId)?.condition.id ?? "clear"}
        isNight={["moon", "cloud-moon"].includes(locations.find(l => l.id === selectedLocationId)?.condition.icon ?? "sun")}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.navigate("/" as never)}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="locations-back"
          >
            <ChevronLeft size={22} color={WeatherColors.textPrimary} strokeWidth={2} />
            <Text style={styles.backText}>Weather</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Locations</Text>
            <TouchableOpacity
              onPress={toggleSearch}
              style={styles.searchToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="toggle-search"
            >
              {showSearch ? (
                <X size={20} color={WeatherColors.textSecondary} />
              ) : (
                <Plus size={20} color={WeatherColors.accent} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            {locations.length} saved location{locations.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <Animated.View style={[styles.useMyLocationSection, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={styles.useMyLocationButton}
            onPress={() => useMyLocationMutation.mutate()}
            disabled={useMyLocationMutation.isPending}
            activeOpacity={0.8}
            testID="use-my-location"
          >
            <LinearGradient
              colors={["rgba(0, 240, 255, 0.12)", "rgba(57, 255, 20, 0.06)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {useMyLocationMutation.isPending ? (
              <ActivityIndicator size="small" color={WeatherColors.accent} />
            ) : (
              <LocateFixed size={22} color={WeatherColors.neonGreen} strokeWidth={2} />
            )}
            <View style={styles.useMyLocationTextCol}>
              <Text style={styles.useMyLocationTitle}>Use My Precise Location</Text>
              <Text style={styles.useMyLocationDesc}>GPS-accurate weather for exactly where you are</Text>
            </View>
            <ChevronRight size={18} color={WeatherColors.accent} />
          </TouchableOpacity>
        </Animated.View>

        {showSearch && (
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Search size={16} color={WeatherColors.accent} strokeWidth={1.5} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search city, address, or zip code..."
                placeholderTextColor={WeatherColors.textTertiary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
                testID="location-search-input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={16} color={WeatherColors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {isSearching && (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color={WeatherColors.accent} />
                <Text style={styles.searchLoadingText}>Searching...</Text>
              </View>
            )}

            {searchResults.length > 0 && (
              <View style={styles.searchResultsList}>
                {searchResults.map((result) => (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    onAdd={() => addMutation.mutate(result)}
                    isAdding={addingId === result.id}
                  />
                ))}
              </View>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No locations found</Text>
                <Text style={styles.noResultsHint}>Try a different search term</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.coordsToggle}
              onPress={() => {
                setShowCoords((prev) => !prev);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              testID="toggle-coords"
            >
              <Crosshair size={14} color={WeatherColors.accent} strokeWidth={1.5} />
              <Text style={styles.coordsToggleText}>
                {showCoords ? "Hide coordinates input" : "Add by exact coordinates"}
              </Text>
            </TouchableOpacity>

            {showCoords && (
              <View style={styles.coordsSection}>
                <View style={styles.coordsInputRow}>
                  <View style={styles.coordsInputWrap}>
                    <Text style={styles.coordsLabel}>Latitude</Text>
                    <TextInput
                      style={styles.coordsInput}
                      placeholder="e.g. 37.7749"
                      placeholderTextColor={WeatherColors.textTertiary}
                      value={latInput}
                      onChangeText={setLatInput}
                      keyboardType="numeric"
                      returnKeyType="next"
                      testID="lat-input"
                    />
                  </View>
                  <View style={styles.coordsInputWrap}>
                    <Text style={styles.coordsLabel}>Longitude</Text>
                    <TextInput
                      style={styles.coordsInput}
                      placeholder="e.g. -122.4194"
                      placeholderTextColor={WeatherColors.textTertiary}
                      value={lonInput}
                      onChangeText={setLonInput}
                      keyboardType="numeric"
                      returnKeyType="done"
                      testID="lon-input"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.coordsAddButton,
                    (!latInput.trim() || !lonInput.trim()) && styles.coordsAddButtonDisabled,
                  ]}
                  onPress={handleAddByCoords}
                  disabled={!latInput.trim() || !lonInput.trim() || coordsAdding}
                  testID="add-coords-button"
                >
                  {coordsAdding ? (
                    <ActivityIndicator size="small" color={WeatherColors.backgroundDark} />
                  ) : (
                    <>
                      <Crosshair size={14} color={WeatherColors.backgroundDark} strokeWidth={2} />
                      <Text style={styles.coordsAddButtonText}>Add Location</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardList}>
          {locations.map((location, index) => (
            <LocationCard
              key={location.id}
              location={location}
              isSelected={selectedLocationId === location.id}
              onSelect={() => handleSelect(location.id)}
              onDelete={() => handleDelete(location)}
              index={index}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 2,
    marginBottom: 12,
    marginLeft: -4,
  },
  backText: {
    fontSize: 16,
    color: WeatherColors.textPrimary,
    fontWeight: "500" as const,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: -0.5,
  },
  searchToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 240, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  subtitle: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
    marginTop: 4,
  },
  useMyLocationSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  useMyLocationButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.2)",
    padding: 16,
    gap: 14,
    overflow: "hidden" as const,
  },
  useMyLocationTextCol: {
    flex: 1,
  },
  useMyLocationTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: WeatherColors.neonGreen,
    letterSpacing: 0.2,
  },
  useMyLocationDesc: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
    marginTop: 3,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(0, 240, 255, 0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.12)",
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: WeatherColors.textPrimary,
    height: "100%" as const,
  },
  searchLoading: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 16,
  },
  searchLoadingText: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
  },
  searchResultsList: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: "rgba(0, 240, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.1)",
    overflow: "hidden" as const,
  },
  searchResult: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 240, 255, 0.06)",
  },
  searchResultText: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  searchResultRegion: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
    marginTop: 1,
  },
  searchResultCoords: {
    fontSize: 10,
    color: WeatherColors.accent,
    marginTop: 2,
    opacity: 0.6,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  noResults: {
    alignItems: "center" as const,
    paddingVertical: 20,
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: WeatherColors.textSecondary,
  },
  noResultsHint: {
    fontSize: 12,
    color: WeatherColors.textTertiary,
    marginTop: 4,
  },
  coordsToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0, 240, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.12)",
  },
  coordsToggleText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
  },
  coordsSection: {
    marginTop: 12,
    backgroundColor: "rgba(0, 240, 255, 0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.1)",
    padding: 14,
    gap: 12,
  },
  coordsInputRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  coordsInputWrap: {
    flex: 1,
    gap: 4,
  },
  coordsLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    opacity: 0.7,
  },
  coordsInput: {
    backgroundColor: "rgba(0, 240, 255, 0.04)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: WeatherColors.textPrimary,
  },
  coordsAddButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: WeatherColors.accent,
    borderRadius: 12,
    paddingVertical: 12,
  },
  coordsAddButtonDisabled: {
    opacity: 0.4,
  },
  coordsAddButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: WeatherColors.backgroundDark,
  },
  cardList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 16,
    overflow: "hidden" as const,
  },
  cardSelected: {
    borderColor: "rgba(0, 240, 255, 0.25)",
  },
  cardLeft: {
    flex: 1,
    gap: 3,
  },
  cardTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  cardName: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  currentBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(57, 255, 20, 0.1)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(57, 255, 20, 0.2)",
  },
  currentBadgeNetwork: {
    backgroundColor: "rgba(240, 255, 0, 0.1)",
    borderColor: "rgba(240, 255, 0, 0.25)",
  },
  currentBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: WeatherColors.neonGreen,
  },
  currentBadgeDotNetwork: {
    backgroundColor: WeatherColors.neonYellow,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: WeatherColors.neonGreen,
    letterSpacing: 0.5,
  },
  currentBadgeTextNetwork: {
    color: WeatherColors.neonYellow,
  },
  cardRegion: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
  },
  cardCoords: {
    fontSize: 10,
    color: WeatherColors.accent,
    opacity: 0.5,
  },
  cardHiLo: {
    fontSize: 10,
    color: WeatherColors.textTertiary,
    fontWeight: "500" as const,
  },
  cardRight: {
    alignItems: "center" as const,
    marginRight: 12,
    gap: 2,
  },
  cardTemp: {
    fontSize: 28,
    fontWeight: "300" as const,
    color: WeatherColors.textPrimary,
  },
  cardTempSelected: {
    color: WeatherColors.accent,
  },
  cardActions: {
    alignItems: "center" as const,
    gap: 12,
  },
});
