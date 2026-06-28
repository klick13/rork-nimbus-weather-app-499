import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Droplets } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { DailyForecast as DailyType } from "@/types/weather";
import { getWeatherIcon, getWeatherIconColor, ThunderstormIcon } from "@/utils/weatherIcons";

interface Props {
  daily: DailyType[];
}

function TempBar({ high, low, minTemp, maxTemp }: { high: number; low: number; minTemp: number; maxTemp: number }) {
  const range = maxTemp - minTemp || 1;
  const leftPct = ((low - minTemp) / range) * 100;
  const widthPct = ((high - low) / range) * 100;

  return (
    <View style={styles.tempBarContainer}>
      <View style={styles.tempBarTrack}>
        <View
          style={[
            styles.tempBarFill,
            {
              left: `${leftPct}%`,
              width: `${Math.max(widthPct, 8)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function DailyForecast({ daily }: Props) {
  const allHighs = daily.map((d) => d.high);
  const allLows = daily.map((d) => d.low);
  const minTemp = Math.min(...allLows);
  const maxTemp = Math.max(...allHighs);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>7-DAY FORECAST</Text>
      {daily.map((item, index) => {
        const Icon = getWeatherIcon(item.condition.icon);
        const isThunderstorm = item.condition.icon === "cloud-lightning";
        const iconColor = getWeatherIconColor(item.condition.icon);
        return (
          <View key={item.day + item.date}>
            {index > 0 && <View style={styles.separator} />}
            <View style={styles.dayRow}>
              <Text style={styles.dayText}>{item.day}</Text>
              <View style={styles.iconPrecipCol}>
                {isThunderstorm ? (
                  <ThunderstormIcon size={26} strokeWidth={1.5} />
                ) : (
                  <Icon size={26} color={iconColor} strokeWidth={1.5} />
                )}
                {item.precipChance > 15 ? (
                  <View style={styles.precipRow}>
                    <Droplets size={12} color={WeatherColors.precipBlue} />
                    <Text style={styles.precipText}>{item.precipChance}%</Text>
                  </View>
                ) : (
                  <View style={styles.precipPlaceholder} />
                )}
              </View>
              <Text style={styles.lowTemp}>{item.low}°</Text>
              <TempBar high={item.high} low={item.low} minTemp={minTemp} maxTemp={maxTemp} />
              <Text style={styles.highTemp}>{item.high}°</Text>
            </View>
          </View>
        );
      })}
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
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
    letterSpacing: 1.2,
    marginBottom: 12,
    opacity: 0.7,
  },
  separator: {
    height: 1,
    backgroundColor: WeatherColors.separator,
    marginVertical: 2,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  dayText: {
    fontSize: 19,
    color: WeatherColors.textPrimary,
    fontWeight: "500" as const,
    width: 52,
  },
  iconPrecipCol: {
    alignItems: "center",
    width: 46,
    gap: 2,
  },
  precipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  precipText: {
    fontSize: 12,
    color: WeatherColors.precipBlue,
    fontWeight: "600" as const,
  },
  precipPlaceholder: {
    height: 14,
  },
  lowTemp: {
    fontSize: 18,
    color: WeatherColors.accent,
    width: 36,
    textAlign: "right",
  },
  tempBarContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  tempBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0, 240, 255, 0.06)",
    position: "relative",
    overflow: "hidden",
  },
  tempBarFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: WeatherColors.accent,
  },
  highTemp: {
    fontSize: 18,
    color: WeatherColors.neonPink,
    fontWeight: "500" as const,
    width: 36,
    textAlign: "right",
  },
});
