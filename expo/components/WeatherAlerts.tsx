import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform } from "react-native";
import { AlertTriangle, ChevronDown, Shield, AlertCircle, Info } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { WeatherAlert } from "@/types/weather";

interface Props {
  alerts: WeatherAlert[];
}

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; icon: string; textColor: string }> = {
  extreme: { bg: "rgba(255, 59, 48, 0.1)", border: "rgba(255, 59, 48, 0.3)", icon: "#FF3B30", textColor: "#FF6B6B" },
  severe: { bg: "rgba(255, 149, 0, 0.1)", border: "rgba(255, 149, 0, 0.25)", icon: "#FF9500", textColor: "#FFB340" },
  moderate: { bg: "rgba(240, 255, 0, 0.06)", border: "rgba(240, 255, 0, 0.2)", icon: WeatherColors.neonYellow, textColor: WeatherColors.neonYellow },
  minor: { bg: "rgba(0, 240, 255, 0.06)", border: "rgba(0, 240, 255, 0.15)", icon: WeatherColors.accent, textColor: WeatherColors.accent },
};

function AlertIcon({ severity, size }: { severity: string; size: number }) {
  const color = SEVERITY_CONFIG[severity]?.icon ?? WeatherColors.neonYellow;
  if (severity === "extreme" || severity === "severe") {
    return <AlertTriangle size={size} color={color} strokeWidth={2} />;
  }
  if (severity === "moderate") {
    return <AlertCircle size={size} color={color} strokeWidth={1.5} />;
  }
  return <Info size={size} color={color} strokeWidth={1.5} />;
}

function AlertCard({ alert }: { alert: WeatherAlert }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.moderate;

  useEffect(() => {
    if (alert.severity === "extreme" || alert.severity === "severe") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.7, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [alert.severity, pulseAnim]);

  const toggleExpand = useCallback(() => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded((prev) => !prev);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const typeLabel = alert.type.charAt(0).toUpperCase() + alert.type.slice(1);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={toggleExpand}
      style={[styles.alertCard, { backgroundColor: config.bg, borderColor: config.border }]}
      testID={`alert-${alert.id}`}
    >
      <View style={styles.alertHeader}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <AlertIcon severity={alert.severity} size={23} />
        </Animated.View>
        <View style={styles.alertTitleCol}>
          <Text style={[styles.alertTitle, { color: config.textColor }]} numberOfLines={expanded ? 3 : 1}>
            {alert.title}
          </Text>
          <Text style={styles.alertMeta}>
            {typeLabel} · {alert.startTime} – {alert.endTime}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={20} color={WeatherColors.textTertiary} />
        </Animated.View>
      </View>
      {expanded && (
        <View style={styles.alertBody}>
          <View style={[styles.alertDivider, { backgroundColor: config.border }]} />
          <Text style={styles.alertDescription}>{alert.description}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function WeatherAlerts({ alerts }: Props) {
  if (!alerts || alerts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noAlertsCard}>
          <Shield size={23} color={WeatherColors.neonGreen} strokeWidth={1.5} />
          <View style={styles.noAlertsTextCol}>
            <Text style={styles.noAlertsTitle}>No Active Alerts</Text>
            <Text style={styles.noAlertsDesc}>No weather warnings for your area</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>WEATHER ALERTS</Text>
      <View style={styles.alertsList}>
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.neonPink,
    letterSpacing: 1.2,
    marginBottom: 10,
    opacity: 0.8,
  },
  alertsList: {
    gap: 8,
  },
  alertCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden" as const,
  },
  alertHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  alertTitleCol: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  alertMeta: {
    fontSize: 14,
    color: WeatherColors.textTertiary,
    marginTop: 2,
  },
  alertBody: {
    marginTop: 10,
  },
  alertDivider: {
    height: 1,
    marginBottom: 10,
    opacity: 0.5,
  },
  alertDescription: {
    fontSize: 16,
    color: WeatherColors.textSecondary,
    lineHeight: 23,
  },
  noAlertsCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(57, 255, 20, 0.05)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(57, 255, 20, 0.15)",
    padding: 14,
    gap: 12,
  },
  noAlertsTextCol: {
    flex: 1,
  },
  noAlertsTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: WeatherColors.neonGreen,
  },
  noAlertsDesc: {
    fontSize: 15,
    color: WeatherColors.textSecondary,
    marginTop: 2,
  },
});
