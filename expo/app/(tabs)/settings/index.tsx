import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Thermometer,
  Bell,
  Crown,
  ChevronRight,
  Info,
  Shield,
  MapPin,
  RefreshCw,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import { useSubscription } from "@/hooks/useSubscription";
import AtmosphericBackground from "@/components/AtmosphericBackground";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tempUnit, toggleUnit, selectedLocation, refreshWeather } = useWeather();
  const { isPro } = useSubscription();

  const handleToggleUnit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleUnit();
  }, [toggleUnit]);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshWeather();
  }, [refreshWeather]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AtmosphericBackground
        conditionId={selectedLocation.condition.id}
        isNight={selectedLocation.condition.icon === "moon" || selectedLocation.condition.icon === "cloud-moon"}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Units section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>UNITS</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Thermometer size={20} color={WeatherColors.accent} strokeWidth={1.5} />
                <View>
                  <Text style={styles.settingTitle}>Temperature</Text>
                  <Text style={styles.settingDesc}>
                    Currently showing °{tempUnit}
                  </Text>
                </View>
              </View>
              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[styles.unitButton, tempUnit === "F" && styles.unitButtonActive]}
                  onPress={() => tempUnit !== "F" && handleToggleUnit()}
                >
                  <Text style={[styles.unitText, tempUnit === "F" && styles.unitTextActive]}>°F</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, tempUnit === "C" && styles.unitButtonActive]}
                  onPress={() => tempUnit !== "C" && handleToggleUnit()}
                >
                  <Text style={[styles.unitText, tempUnit === "C" && styles.unitTextActive]}>°C</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Data section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATA</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={handleRefresh} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <RefreshCw size={20} color={WeatherColors.accent} strokeWidth={1.5} />
                <Text style={styles.settingTitle}>Refresh Weather</Text>
              </View>
              <ChevronRight size={18} color={WeatherColors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <MapPin size={20} color={WeatherColors.accent} strokeWidth={1.5} />
                <View>
                  <Text style={styles.settingTitle}>Location</Text>
                  <Text style={styles.settingDesc} numberOfLines={1}>
                    {selectedLocation.name}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Subscription section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/paywall" as never)}
            activeOpacity={0.7}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Crown size={20} color={isPro ? WeatherColors.neonPurple : WeatherColors.textTertiary} strokeWidth={1.5} />
                <View>
                  <Text style={styles.settingTitle}>Nimbus Pro</Text>
                  <Text style={styles.settingDesc}>
                    {isPro ? "Active — all features unlocked" : "Unlock radar, marine, aviation & more"}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={WeatherColors.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Info size={20} color={WeatherColors.accent} strokeWidth={1.5} />
                <View>
                  <Text style={styles.settingTitle}>Nimbus Weather</Text>
                  <Text style={styles.settingDesc}>Version 1.0.0</Text>
                </View>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Shield size={20} color={WeatherColors.accent} strokeWidth={1.5} />
                <Text style={styles.settingTitle}>Privacy Policy</Text>
              </View>
              <ChevronRight size={18} color={WeatherColors.textTertiary} />
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Weather data by Open-Meteo{"\n"}
          Radar by RainViewer{"\n"}
          Maps by OpenStreetMap
        </Text>
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
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    overflow: "hidden" as const,
  },
  settingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 16,
    gap: 12,
  },
  settingLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  settingDesc: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: WeatherColors.separator,
    marginHorizontal: 16,
  },
  unitToggle: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(0, 240, 255, 0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.12)",
    overflow: "hidden" as const,
  },
  unitButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  unitButtonActive: {
    backgroundColor: "rgba(0, 240, 255, 0.15)",
  },
  unitText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
  },
  unitTextActive: {
    color: WeatherColors.accent,
  },
  footer: {
    fontSize: 12,
    color: WeatherColors.textTertiary,
    textAlign: "center" as const,
    lineHeight: 18,
    marginTop: 8,
  },
});
