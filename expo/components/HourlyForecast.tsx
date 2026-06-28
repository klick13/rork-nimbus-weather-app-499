import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Droplets } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { HourlyForecast as HourlyType } from "@/types/weather";
import { getWeatherIcon, getWeatherIconColor, ThunderstormIcon } from "@/utils/weatherIcons";

interface Props {
  hourly: HourlyType[];
  unit?: string;
}

const GRAPH_HEIGHT = 50;
const ITEM_WIDTH = 70;

function HourItem({ item, index, graphY }: { item: HourlyType; index: number; graphY: number }) {
  const Icon = getWeatherIcon(item.condition.icon);
  const isThunderstorm = item.condition.icon === "cloud-lightning";
  const iconColor = getWeatherIconColor(item.condition.icon);
  const isNow = index === 0;

  return (
    <View style={[styles.hourItem, isNow && styles.hourItemActive]}>
      <Text style={[styles.hourTime, isNow && styles.hourTimeActive]}>
        {isNow ? "Now" : item.time}
      </Text>
      {item.precipChance > 15 && (
        <View style={styles.precipRow}>
          <Droplets size={12} color={WeatherColors.precipBlue} />
          <Text style={styles.precipText}>{item.precipChance}%</Text>
        </View>
      )}
      {isThunderstorm ? (
        <ThunderstormIcon size={28} strokeWidth={1.5} />
      ) : (
        <Icon
          size={28}
          color={isNow ? WeatherColors.accent : iconColor}
          strokeWidth={1.5}
        />
      )}
      <View style={[styles.graphDotContainer, { height: GRAPH_HEIGHT }]}>
        <View style={[styles.graphDot, { top: graphY, backgroundColor: isNow ? WeatherColors.accent : "rgba(0, 240, 255, 0.5)" }]} />
        <View style={[styles.graphDotGlow, { top: graphY - 2, backgroundColor: isNow ? WeatherColors.glowCyan : "transparent" }]} />
      </View>
      <Text style={[styles.hourTemp, isNow && styles.hourTempActive]}>
        {item.temp}°
      </Text>
    </View>
  );
}

export default function HourlyForecast({ hourly, unit }: Props) {
  const graphPositions = useMemo(() => {
    if (hourly.length === 0) return [];
    const temps = hourly.map((h) => h.temp);
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    const range = maxT - minT || 1;
    return temps.map((t) => {
      const normalized = (t - minT) / range;
      return GRAPH_HEIGHT - normalized * (GRAPH_HEIGHT - 8) - 4;
    });
  }, [hourly]);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>HOURLY FORECAST</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {hourly.map((item, index) => (
          <HourItem
            key={`${item.time}-${index}`}
            item={item}
            index={index}
            graphY={graphPositions[index] ?? GRAPH_HEIGHT / 2}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    paddingVertical: 14,
    overflow: "hidden" as const,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    marginBottom: 12,
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 2,
  },
  hourItem: {
    alignItems: "center" as const,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    minWidth: ITEM_WIDTH,
  },
  hourItemActive: {
    backgroundColor: "rgba(0, 240, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.15)",
  },
  hourTime: {
    fontSize: 15,
    color: WeatherColors.textSecondary,
    fontWeight: "500" as const,
  },
  hourTimeActive: {
    color: WeatherColors.accent,
  },
  precipRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 2,
  },
  precipText: {
    fontSize: 12,
    color: WeatherColors.precipBlue,
    fontWeight: "600" as const,
  },
  graphDotContainer: {
    width: "100%" as const,
    position: "relative" as const,
  },
  graphDot: {
    position: "absolute" as const,
    left: "50%" as const,
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  graphDotGlow: {
    position: "absolute" as const,
    left: "50%" as const,
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.4,
  },
  hourTemp: {
    fontSize: 19,
    color: WeatherColors.textPrimary,
    fontWeight: "500" as const,
  },
  hourTempActive: {
    color: WeatherColors.accent,
  },
});
