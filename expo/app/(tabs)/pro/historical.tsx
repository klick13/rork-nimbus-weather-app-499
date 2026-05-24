import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { History, TrendingUp, TrendingDown, Droplets } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import { fetchHistoricalData } from "@/utils/weatherApi";
import { HistoricalDataPoint } from "@/types/subscription";
import { mockHistoricalMonthly } from "@/mocks/proFeatures";
import ProGate from "@/components/ProGate";

function BarChart({ data }: { data: HistoricalDataPoint[] }) {
  const maxTemp = Math.max(...data.map((d) => d.high));
  const minTemp = Math.min(...data.map((d) => d.low));
  const range = maxTemp - minTemp || 1;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Last 8 Days — High / Low</Text>
      <View style={styles.barChartRow}>
        {data.map((point) => {
          const highPct = ((point.high - minTemp) / range) * 100;
          const lowPct = ((point.low - minTemp) / range) * 100;
          return (
            <View key={point.date} style={styles.barColumn}>
              <Text style={styles.barTempHigh}>{point.high}°</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFillHigh,
                    { height: `${Math.max(highPct, 15)}%` },
                  ]}
                />
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFillLow,
                    { height: `${Math.max(lowPct, 15)}%` },
                  ]}
                />
              </View>
              <Text style={styles.barTempLow}>{point.low}°</Text>
              <Text style={styles.barDate}>{point.date.split(" ")[1]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MonthlyRow({
  month,
  index,
}: {
  month: typeof mockHistoricalMonthly[0];
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 40,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  return (
    <Animated.View style={[styles.monthlyRow, { opacity: fadeAnim }]}>
      <Text style={styles.monthName}>{month.month}</Text>
      <View style={styles.monthTemps}>
        <TrendingUp size={12} color={WeatherColors.tempHigh} strokeWidth={2} />
        <Text style={styles.monthHigh}>{month.avgHigh}°</Text>
        <TrendingDown size={12} color={WeatherColors.tempLow} strokeWidth={2} />
        <Text style={styles.monthLow}>{month.avgLow}°</Text>
      </View>
      <View style={styles.monthPrecip}>
        <Droplets size={11} color={WeatherColors.precipBlue} strokeWidth={2} />
        <Text style={styles.monthPrecipText}>{month.totalPrecip}&quot;</Text>
      </View>
    </Animated.View>
  );
}

export default function HistoricalScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();

  const historicalQuery = useQuery({
    queryKey: ["historical", selectedLocation.lat, selectedLocation.lon],
    queryFn: () => fetchHistoricalData(selectedLocation.lat, selectedLocation.lon),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Historical Data" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={WeatherColors.gradientClear}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />
      <ProGate featureName="Historical Data">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <History size={20} color={WeatherColors.accentCool} strokeWidth={1.5} />
            <Text style={styles.title}>Historical Data</Text>
          </View>
          <Text style={styles.subtitle}>
            {selectedLocation.name} — Past weather & climate trends
          </Text>

          {historicalQuery.isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WeatherColors.accent} />
              <Text style={styles.loadingText}>Fetching historical data...</Text>
            </View>
          )}

          {historicalQuery.data && (
            <BarChart data={historicalQuery.data} />
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Averages</Text>
            <View style={styles.monthlyCard}>
              <View style={styles.monthlyHeader}>
                <Text style={styles.monthlyHeaderLabel}>Month</Text>
                <Text style={styles.monthlyHeaderLabel}>Temps</Text>
                <Text style={styles.monthlyHeaderLabel}>Precip</Text>
              </View>
              {mockHistoricalMonthly.map((month, i) => (
                <MonthlyRow key={month.month} month={month} index={i} />
              ))}
            </View>
          </View>
        </ScrollView>
      </ProGate>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
  },
  chartContainer: {
    marginHorizontal: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 16,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: WeatherColors.textSecondary,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  barChartRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-end" as const,
    height: 140,
  },
  barColumn: {
    alignItems: "center" as const,
    flex: 1,
    gap: 3,
  },
  barTrack: {
    width: 8,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 4,
    justifyContent: "flex-end" as const,
    overflow: "hidden" as const,
  },
  barFillHigh: {
    backgroundColor: WeatherColors.tempHigh,
    borderRadius: 4,
    width: "100%",
  },
  barFillLow: {
    backgroundColor: WeatherColors.tempLow,
    borderRadius: 4,
    width: "100%",
  },
  barTempHigh: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: WeatherColors.tempHigh,
  },
  barTempLow: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: WeatherColors.tempLow,
  },
  barDate: {
    fontSize: 9,
    color: WeatherColors.textTertiary,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  monthlyCard: {
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    overflow: "hidden" as const,
  },
  monthlyHeader: {
    flexDirection: "row" as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: WeatherColors.separator,
  },
  monthlyHeaderLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  monthlyRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: WeatherColors.separator,
  },
  monthName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500" as const,
    color: WeatherColors.textPrimary,
  },
  monthTemps: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  monthHigh: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: WeatherColors.tempHigh,
    marginRight: 6,
  },
  monthLow: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: WeatherColors.tempLow,
  },
  monthPrecip: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    gap: 4,
  },
  monthPrecipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: WeatherColors.precipBlue,
  },
});
