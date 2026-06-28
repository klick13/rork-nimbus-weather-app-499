import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Crown,
  History,
  Radar,
  Anchor,
  Plane,
  Sparkles,
  ChevronRight,
  Lock,
  Zap,
  Sprout,
  Wind,
  CalendarDays,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WeatherColors } from "@/constants/colors";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { useSubscription } from "@/hooks/useSubscription";
import { useWeather } from "@/hooks/useWeatherContext";
import { ProBadge } from "@/components/ProGate";

interface ProFeatureCard {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  route: string;
  gradient: readonly [string, string];
  accentColor: string;
}

const PRO_FEATURES: ProFeatureCard[] = [
  {
    id: "hobby",
    title: "Hobby Alerts",
    subtitle: "Cigars · Drones · Photography · Surf",
    icon: Sparkles,
    route: "/pro/hobby-alerts",
    gradient: ["rgba(244, 164, 54, 0.15)", "rgba(244, 164, 54, 0.03)"],
    accentColor: WeatherColors.accent,
  },
  {
    id: "historical",
    title: "Historical Data",
    subtitle: "30-day lookback & climate trends",
    icon: History,
    route: "/pro/historical",
    gradient: ["rgba(74, 159, 232, 0.15)", "rgba(74, 159, 232, 0.03)"],
    accentColor: WeatherColors.accentCool,
  },
  {
    id: "marine",
    title: "Marine & Coastal",
    subtitle: "Tides · Swell · Sea temp · Visibility",
    icon: Anchor,
    route: "/pro/marine",
    gradient: ["rgba(92, 184, 255, 0.15)", "rgba(92, 184, 255, 0.03)"],
    accentColor: WeatherColors.precipBlue,
  },
  {
    id: "aviation",
    title: "Aviation Weather",
    subtitle: "METAR · Flight cat · Turbulence · Icing",
    icon: Plane,
    route: "/pro/aviation",
    gradient: ["rgba(232, 115, 74, 0.15)", "rgba(232, 115, 74, 0.03)"],
    accentColor: WeatherColors.accentWarm,
  },
  {
    id: "radar",
    title: "Radar Archives",
    subtitle: "Replay storms & precipitation patterns",
    icon: Radar,
    route: "/pro/radar",
    gradient: ["rgba(255, 107, 107, 0.15)", "rgba(255, 107, 107, 0.03)"],
    accentColor: WeatherColors.uvHigh,
  },

  {
    id: "lightning",
    title: "Lightning Strike Map",
    subtitle: "Real-time detection · Safety alerts · Distance",
    icon: Zap,
    route: "/pro/lightning",
    gradient: ["rgba(255, 214, 10, 0.15)", "rgba(255, 214, 10, 0.03)"],
    accentColor: "#FFD60A",
  },

  {
    id: "gardening",
    title: "Gardening & Frost",
    subtitle: "Frost alerts · Planting conditions · Watering",
    icon: Sprout,
    route: "/pro/gardening",
    gradient: ["rgba(52, 199, 89, 0.15)", "rgba(52, 199, 89, 0.03)"],
    accentColor: "#34C759",
  },
  {
    id: "pollen-air-quality",
    title: "Pollen & Air Quality",
    subtitle: "AQI · PM2.5 · Pollen counts · Health advice",
    icon: Wind,
    route: "/pro/pollen-air-quality",
    gradient: ["rgba(74, 159, 232, 0.15)", "rgba(74, 159, 232, 0.03)"],
    accentColor: WeatherColors.accentCool,
  },
  {
    id: "event-planner",
    title: "Event Weather Planner",
    subtitle: "Plan events · Comfort score · Recommendations",
    icon: CalendarDays,
    route: "/pro/event-planner",
    gradient: ["rgba(244, 164, 54, 0.15)", "rgba(244, 164, 54, 0.03)"],
    accentColor: WeatherColors.accent,
  },
];

function FeatureCard({
  feature,
  isPro,
  index,
  onPress,
}: {
  feature: ProFeatureCard;
  isPro: boolean;
  index: number;
  onPress: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const Icon = feature.icon;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 70,
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
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.featureCard}
        testID={`pro-feature-${feature.id}`}
      >
        <LinearGradient
          colors={feature.gradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.featureIconWrap, { backgroundColor: `${feature.accentColor}15` }]}>
          <Icon size={22} color={feature.accentColor} strokeWidth={1.5} />
        </View>
        <View style={styles.featureTextWrap}>
          <View style={styles.featureTitleRow}>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            {!isPro && (
              <Lock size={12} color={WeatherColors.textTertiary} strokeWidth={2} />
            )}
          </View>
          <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
        </View>
        <ChevronRight size={18} color={WeatherColors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ProHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPro } = useSubscription();
  const { selectedLocation } = useWeather();

  const handleFeaturePress = useCallback(
    (feature: ProFeatureCard) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isPro) {
        router.push(feature.route as never);
      } else {
        router.push("/paywall" as never);
      }
    },
    [isPro, router]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AtmosphericBackground
        conditionId={selectedLocation.condition.id}
        isNight={selectedLocation.condition.icon === "moon" || selectedLocation.condition.icon === "cloud-moon"}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Pro</Text>
            {isPro ? (
              <ProBadge />
            ) : (
              <TouchableOpacity
                style={styles.upgradeChip}
                onPress={() => router.push("/paywall" as never)}
                testID="pro-hub-upgrade"
              >
                <Crown size={12} color="#0B1A2E" strokeWidth={2.5} />
                <Text style={styles.upgradeChipText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.subtitle}>
            {isPro
              ? "All features unlocked"
              : "Advanced weather intelligence — from $2.99/wk"}
          </Text>
        </View>

        {!isPro && (
          <TouchableOpacity
            style={styles.promoBanner}
            onPress={() => router.push("/paywall" as never)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["rgba(244, 164, 54, 0.12)", "rgba(232, 115, 74, 0.06)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Crown size={24} color={WeatherColors.accent} strokeWidth={1.5} />
            <View style={styles.promoText}>
              <Text style={styles.promoTitle}>Try Nimbus Pro free for 7 days</Text>
              <Text style={styles.promoDesc}>
                Unlock all features below. Cancel anytime.
              </Text>
            </View>
            <ChevronRight size={18} color={WeatherColors.accent} />
          </TouchableOpacity>
        )}

        <View style={styles.featureList}>
          {PRO_FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              isPro={isPro}
              index={index}
              onPress={() => handleFeaturePress(feature)}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
    marginTop: 4,
  },
  upgradeChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: WeatherColors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  upgradeChipText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#0B1A2E",
  },
  promoBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(244, 164, 54, 0.2)",
    overflow: "hidden" as const,
    gap: 12,
  },
  promoText: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
  },
  promoDesc: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
    marginTop: 2,
  },
  featureList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  featureCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    overflow: "hidden" as const,
    gap: 14,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  featureSubtitle: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
    marginTop: 3,
  },
});
