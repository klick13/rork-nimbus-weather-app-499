import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Crown, ChevronRight, Radar, X, LocateFixed, MapPinned, Zap } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import { useSubscription } from "@/hooks/useSubscription";
import CurrentWeather from "@/components/CurrentWeather";
import HourlyForecast from "@/components/HourlyForecast";
import DailyForecast from "@/components/DailyForecast";
import WeatherDetails from "@/components/WeatherDetails";
import WeatherAnimation from "@/components/WeatherAnimation";
import WeatherAlerts from "@/components/WeatherAlerts";
import RadarMapWidget from "@/components/RadarMapWidget";
import UVBurnTimer from "@/components/UVBurnTimer";
import PetSafetyAlerts from "@/components/PetSafetyAlerts";
import SunsetQualityScore from "@/components/SunsetQualityScore";
import PhotoOfTheDay from "@/components/PhotoOfTheDay";
import FloodGateWidget from "@/components/FloodGateWidget";
import FishingHuntingWidget from "@/components/FishingHuntingWidget";

export default function WeatherScreen() {
  const insets = useSafeAreaInsets();
  const {
    selectedLocation,
    refreshWeather,
    tempUnit,
    toggleUnit,
    updateCurrentLocation,
    isRequestingLocation,
    hasCompletedOnboarding,
    completeOnboarding,
  } = useWeather();
  const { isPro } = useSubscription();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [radarExpanded, setRadarExpanded] = React.useState(false);
  const [scrollEnabled, setScrollEnabled] = React.useState(true);
  const onboardingScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(onboardingScale, { toValue: 1.025, duration: 1500, useNativeDriver: true }),
        Animated.timing(onboardingScale, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [onboardingScale]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshWeather();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshWeather]);

  const handleUsePreciseLocation = useCallback(async () => {
    const result = await updateCurrentLocation(true);
    if (result) {
      await completeOnboarding();
    } else {
      Alert.alert(
        "Location Needed",
        "Nimbus could not access your precise location. You can allow location permission in your device settings or add coordinates manually."
      );
    }
  }, [updateCurrentLocation, completeOnboarding]);

  const handleSkipOnboarding = useCallback(async () => {
    await completeOnboarding();
  }, [completeOnboarding]);

  const gradientColors = getGradientForCondition(
    selectedLocation.condition.id
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />
      <WeatherAnimation
        conditionId={selectedLocation.condition.id}
        icon={selectedLocation.condition.icon}
      />
      {!hasCompletedOnboarding && (
        <View style={[styles.onboardingOverlay, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}> 
          <LinearGradient
            colors={["rgba(2, 8, 18, 0.96)", "rgba(0, 18, 30, 0.96)", "rgba(4, 5, 8, 0.98)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.onboardingGlowA} />
          <View style={styles.onboardingGlowB} />
          <View style={styles.onboardingContent}>
            <View style={styles.onboardingBadge}>
              <Zap size={15} color={WeatherColors.neonGreen} strokeWidth={2} />
              <Text style={styles.onboardingBadgeText}>HYPER-LOCAL MODE</Text>
            </View>
            <Text style={styles.onboardingTitle}>Nimbus Hyper-Local Weather App</Text>
            <Text style={styles.onboardingSubtitle}>
              Fast, no-fluff weather for the exact spot where you are standing — not just the nearest city.
            </Text>
            <View style={styles.onboardingFeatureRow}>
              <MapPinned size={22} color={WeatherColors.accent} strokeWidth={1.8} />
              <Text style={styles.onboardingFeatureText}>Locks onto your GPS position for hourly forecasts, alerts, radar, and map layers.</Text>
            </View>
            <Animated.View style={{ transform: [{ scale: onboardingScale }] }}>
              <TouchableOpacity
                style={styles.preciseLocationButton}
                onPress={handleUsePreciseLocation}
                disabled={isRequestingLocation}
                activeOpacity={0.86}
                testID="onboarding-use-precise-location"
              >
                <LinearGradient
                  colors={["rgba(57, 255, 20, 0.28)", "rgba(0, 240, 255, 0.16)"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                {isRequestingLocation ? (
                  <ActivityIndicator size="small" color={WeatherColors.neonGreen} />
                ) : (
                  <LocateFixed size={28} color={WeatherColors.neonGreen} strokeWidth={2.3} />
                )}
                <View style={styles.preciseLocationTextCol}>
                  <Text style={styles.preciseLocationTitle}>Use My Precise Location</Text>
                  <Text style={styles.preciseLocationDesc}>Recommended for the most accurate Nimbus forecast</Text>
                </View>
                <ChevronRight size={22} color={WeatherColors.accent} />
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkipOnboarding} testID="onboarding-skip">
              <Text style={styles.skipButtonText}>Skip for now — I’ll add a location manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={WeatherColors.accent}
          />
        }
      >
        <CurrentWeather
          location={selectedLocation}
          tempUnit={tempUnit}
          onToggleUnit={toggleUnit}
        />
        <View style={styles.gap} />
        <WeatherAlerts alerts={selectedLocation.alerts ?? []} />
        <View style={styles.gap} />
        <View style={styles.radarSection}>
          <View style={styles.radarSectionHeader}>
            <Radar size={18} color={WeatherColors.accent} strokeWidth={1.5} />
            <Text style={styles.radarSectionTitle}>LIVE RADAR</Text>
            <View style={styles.radarLiveDot} />
          </View>
          <RadarMapWidget
            lat={selectedLocation.lat}
            lon={selectedLocation.lon}
            compact={true}
            onExpand={() => setRadarExpanded(true)}
            onPanStart={() => setScrollEnabled(false)}
            onPanEnd={() => setScrollEnabled(true)}
          />
        </View>
        <View style={styles.gap} />
        <HourlyForecast hourly={selectedLocation.hourly} unit={tempUnit} />
        <View style={styles.gap} />
        <DailyForecast daily={selectedLocation.daily} />
        <View style={styles.gap} />
        <WeatherDetails details={selectedLocation.details} />
        <View style={styles.gap} />
        <FishingHuntingWidget />
        <View style={styles.gap} />
        <UVBurnTimer uvIndex={selectedLocation.details.uvIndex} />
        <View style={styles.gap} />
        <PetSafetyAlerts
          temp={selectedLocation.currentTemp}
          humidity={selectedLocation.details.humidity}
          windSpeed={selectedLocation.details.windSpeed}
          conditionId={selectedLocation.condition.id}
        />
        <View style={styles.gap} />
        <SunsetQualityScore
          humidity={selectedLocation.details.humidity}
          visibility={selectedLocation.details.visibility}
          windSpeed={selectedLocation.details.windSpeed}
          sunset={selectedLocation.details.sunset}
          cloudCover={selectedLocation.details.humidity > 80 ? 80 : selectedLocation.details.humidity > 60 ? 50 : selectedLocation.details.humidity > 40 ? 30 : 10}
        />
        <View style={styles.gap} />
        <FloodGateWidget />
        <View style={styles.gap} />
        <PhotoOfTheDay conditionId={selectedLocation.condition.id} />
        {!isPro && (
          <>
            <View style={styles.gap} />
            <TouchableOpacity
              style={styles.proUpsell}
              onPress={() => router.push("/paywall" as never)}
              activeOpacity={0.85}
              testID="weather-pro-upsell"
            >
              <LinearGradient
                colors={["rgba(0, 240, 255, 0.06)", "rgba(191, 64, 255, 0.04)"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Crown size={23} color={WeatherColors.neonPurple} strokeWidth={1.5} />
              <View style={styles.proUpsellText}>
                <Text style={styles.proUpsellTitle}>Unlock Nimbus Pro</Text>
                <Text style={styles.proUpsellDesc}>Radar, marine, aviation, hobby alerts & more</Text>
              </View>
              <ChevronRight size={20} color={WeatherColors.neonPurple} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {radarExpanded && (
        <View style={[styles.radarExpandedOverlay, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.radarExpandedClose}
            onPress={() => setRadarExpanded(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="radar-modal-close"
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.radarExpandedBody}>
            <RadarMapWidget
              lat={selectedLocation.lat}
              lon={selectedLocation.lon}
              compact={false}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function getGradientForCondition(conditionId: string): readonly [string, string, ...string[]] {
  switch (conditionId) {
    case "clear":
      return WeatherColors.gradientSunny;
    case "partly-cloudy":
      return WeatherColors.gradientClear;
    case "cloudy":
      return WeatherColors.gradientCloudy;
    case "rainy":
      return WeatherColors.gradientRainy;
    case "snow":
      return WeatherColors.gradientNight;
    default:
      return WeatherColors.gradientClear;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WeatherColors.backgroundDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  gap: {
    height: 16,
  },
  onboardingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: "center" as const,
    paddingHorizontal: 20,
  },
  onboardingGlowA: {
    position: "absolute" as const,
    top: 76,
    right: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(0, 240, 255, 0.18)",
  },
  onboardingGlowB: {
    position: "absolute" as const,
    bottom: 90,
    left: -80,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(57, 255, 20, 0.10)",
  },
  onboardingContent: {
    gap: 18,
  },
  onboardingBadge: {
    alignSelf: "flex-start" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57, 255, 20, 0.30)",
    backgroundColor: "rgba(57, 255, 20, 0.08)",
  },
  onboardingBadgeText: {
    color: WeatherColors.neonGreen,
    fontSize: 13,
    fontWeight: "800" as const,
    letterSpacing: 1.1,
  },
  onboardingTitle: {
    color: WeatherColors.textPrimary,
    fontSize: 39,
    lineHeight: 43,
    fontWeight: "900" as const,
    letterSpacing: -1.4,
  },
  onboardingSubtitle: {
    color: WeatherColors.textSecondary,
    fontSize: 19,
    lineHeight: 28,
    fontWeight: "500" as const,
  },
  onboardingFeatureRow: {
    flexDirection: "row" as const,
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.20)",
    backgroundColor: "rgba(0, 240, 255, 0.06)",
  },
  onboardingFeatureText: {
    flex: 1,
    color: WeatherColors.textPrimary,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  preciseLocationButton: {
    minHeight: 86,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    padding: 16,
    borderRadius: 24,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(57, 255, 20, 0.48)",
  },
  preciseLocationTextCol: {
    flex: 1,
  },
  preciseLocationTitle: {
    color: WeatherColors.textPrimary,
    fontSize: 21,
    fontWeight: "900" as const,
  },
  preciseLocationDesc: {
    color: WeatherColors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 3,
  },
  skipButton: {
    alignSelf: "center" as const,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  skipButtonText: {
    color: WeatherColors.textSecondary,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  proUpsell: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(191, 64, 255, 0.2)",
    overflow: "hidden" as const,
    gap: 12,
  },
  proUpsellText: {
    flex: 1,
  },
  proUpsellTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: WeatherColors.neonPurple,
  },
  proUpsellDesc: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
    marginTop: 2,
  },
  radarSection: {
    marginHorizontal: 16,
  },
  radarSectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  radarSectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
    letterSpacing: 1.2,
    opacity: 0.7,
  },
  radarLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: WeatherColors.neonGreen,
  },
  radarExpandedOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    backgroundColor: "rgba(5, 5, 8, 0.96)",
    justifyContent: "center" as const,
  },
  radarExpandedClose: {
    position: "absolute" as const,
    top: 12,
    right: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  radarExpandedBody: {
    paddingHorizontal: 12,
  },
});
