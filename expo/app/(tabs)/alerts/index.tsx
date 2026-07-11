import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import WeatherAlerts from "@/components/WeatherAlerts";
import { useSubscription } from "@/hooks/useSubscription";
import { useRouter } from "expo-router";
import { Crown, ChevronRight } from "lucide-react-native";
import { TouchableOpacity } from "react-native";

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation, refreshWeather } = useWeather();
  const { isPro } = useSubscription();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshWeather();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshWeather]);

  const alerts = selectedLocation.alerts ?? [];

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={WeatherColors.accent}
            colors={[WeatherColors.accent]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.subtitle}>
            {alerts.length > 0
              ? `${alerts.length} active alert${alerts.length !== 1 ? "s" : ""}`
              : "No active alerts for your area"}
          </Text>
        </View>

        <View style={styles.section}>
          <WeatherAlerts alerts={alerts} />
        </View>

        {!isPro && (
          <TouchableOpacity
            style={styles.proUpsell}
            onPress={() => router.push("/paywall" as never)}
            activeOpacity={0.85}
          >
            <Crown size={20} color={WeatherColors.neonPurple} strokeWidth={1.5} />
            <View style={styles.proUpsellText}>
              <Text style={styles.proUpsellTitle}>Unlock Pro Alerts</Text>
              <Text style={styles.proUpsellDesc}>
                Lightning, marine, aviation, hobby & flood alerts
              </Text>
            </View>
            <ChevronRight size={18} color={WeatherColors.textTertiary} />
          </TouchableOpacity>
        )}
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: WeatherColors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  proUpsell: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(191, 64, 255, 0.2)",
    padding: 16,
    gap: 14,
    backgroundColor: "rgba(191, 64, 255, 0.06)",
  },
  proUpsellText: {
    flex: 1,
  },
  proUpsellTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: WeatherColors.neonPurple,
  },
  proUpsellDesc: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
    marginTop: 3,
  },
});
