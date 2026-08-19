import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import {
  Crown,
  X,
  Check,
  Clock,
  Anchor,
  Plane,
  Sparkles,
  History,
  Radar,
  Zap,
  Flower2,
  CalendarDays,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WeatherColors } from "@/constants/colors";
import { useSubscription } from "@/hooks/useSubscription";
import type { PurchasesPackage } from "react-native-purchases";

type PlanKey = "weekly" | "monthly" | "yearly";

interface PlanConfig {
  label: string;
  packageType: string;
  fallbackPrice: string;
  period: string;
  ctaPeriod: string;
  description: string;
}

interface PlanDisplay extends PlanConfig {
  package?: PurchasesPackage;
  price: string;
}

const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  yearly: {
    label: "Annual",
    packageType: "ANNUAL",
    fallbackPrice: "$49.99",
    period: "/year",
    ctaPeriod: "/yr",
    description: "7-day free trial, then billed annually",
  },
  monthly: {
    label: "Monthly",
    packageType: "MONTHLY",
    fallbackPrice: "$9.99",
    period: "/month",
    ctaPeriod: "/mo",
    description: "Cancel anytime after your trial",
  },
  weekly: {
    label: "Weekly",
    packageType: "WEEKLY",
    fallbackPrice: "$2.99",
    period: "/week",
    ctaPeriod: "/wk",
    description: "Try it short-term",
  },
};

const FEATURES = [
  {
    icon: History,
    title: "Historical Weather Data",
    desc: "30-day lookback, monthly trends & climate records",
  },
  {
    icon: Radar,
    title: "Radar Archives",
    desc: "Replay past storms, precipitation patterns & radar loops",
  },
  {
    icon: Anchor,
    title: "Marine Conditions",
    desc: "Tides, swell, sea temp & coastal forecasts",
  },
  {
    icon: Plane,
    title: "Aviation Weather",
    desc: "METAR, TAF, flight categories & turbulence",
  },
  {
    icon: Sparkles,
    title: "Hobby-Specific Alerts",
    desc: "Custom conditions for cigars, drones, photography & more",
  },

  {
    icon: Zap,
    title: "Lightning Strike Map",
    desc: "Live lightning detection with strike distance & frequency",
  },

  {
    icon: Flower2,
    title: "Gardening & Frost Alerts",
    desc: "Frost warnings, growing zones & planting conditions",
  },
  {
    icon: CalendarDays,
    title: "Event Weather Planner",
    desc: "Plan outdoor events with detailed weather predictions",
  },
  {
    icon: Clock,
    title: "Extended 14-Day Forecast",
    desc: "Plan ahead with two full weeks of predictions",
  },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPro, subscribe, isSubscribing, restore, isRestoring, packages, isRevenueCatConfigured, subscribeError, restoreError } = useSubscription();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("yearly");

  const planDisplays = useMemo<Record<PlanKey, PlanDisplay>>(() => {
    const buildPlan = (plan: PlanKey): PlanDisplay => {
      const config = PLAN_CONFIG[plan];
      const matchedPackage = packages.find((pkg: PurchasesPackage) => pkg.packageType === config.packageType);
      return {
        ...config,
        package: matchedPackage,
        price: matchedPackage?.product.priceString ?? config.fallbackPrice,
      };
    };

    return {
      yearly: buildPlan("yearly"),
      monthly: buildPlan("monthly"),
      weekly: buildPlan("weekly"),
    };
  }, [packages]);

  const selectedPlanDisplay = planDisplays[selectedPlan];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSubscribe = useCallback(() => {
    if (!isRevenueCatConfigured) {
      Alert.alert(
        "Billing Setup Needed",
        "Real billing is wired in, but RevenueCat API keys still need to be added before purchases can run."
      );
      return;
    }
    const selectedPackage = selectedPlanDisplay.package ?? packages[0];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    subscribe(selectedPackage);
  }, [isRevenueCatConfigured, packages, selectedPlanDisplay.package, subscribe]);

  const handleRestore = useCallback(() => {
    if (!isRevenueCatConfigured) {
      Alert.alert(
        "Billing Setup Needed",
        "Restore purchases will work as soon as the RevenueCat API keys are added."
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    restore();
  }, [isRevenueCatConfigured, restore]);

  useEffect(() => {
    if (isPro) {
      Alert.alert(
        "Welcome to Nimbus Pro!",
        "All premium features are now unlocked.",
        [{ text: "Let's go", onPress: () => router.back() }]
      );
    }
  }, [isPro, router]);

  useEffect(() => {
    const error = subscribeError ?? restoreError;
    if (error) {
      Alert.alert("Purchase Issue", error.message);
    }
  }, [restoreError, subscribeError]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <LinearGradient
        colors={["#0B1A2E", "#112240", "#1A3358"]}
        style={StyleSheet.absoluteFill}
      />

      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        testID="paywall-close"
      >
        <X size={22} color={WeatherColors.textSecondary} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.heroSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.crownContainer}>
            <LinearGradient
              colors={["rgba(244, 164, 54, 0.2)", "rgba(244, 164, 54, 0.05)"]}
              style={styles.crownGlow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <Crown size={40} color={WeatherColors.accent} strokeWidth={1.5} />
          </View>

          <Text style={styles.heroTitle}>Nimbus Pro</Text>
          <Text style={styles.heroSubtitle}>
            Weather intelligence for enthusiasts
          </Text>

          {isPro && (
            <View style={styles.activeBadge}>
              <Check size={14} color="#0B1A2E" strokeWidth={3} />
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.featuresSection}>
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <FeatureRow
                key={feature.title}
                icon={<Icon size={20} color={WeatherColors.accent} strokeWidth={1.5} />}
                title={feature.title}
                desc={feature.desc}
                index={i}
              />
            );
          })}
        </View>

        <View style={styles.pricingSection}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('yearly');
            }}
            activeOpacity={0.85}
          >
            {selectedPlan === 'yearly' && (
              <LinearGradient
                colors={["rgba(244, 164, 54, 0.1)", "rgba(244, 164, 54, 0.02)"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
            <View style={styles.planLeft}>
              <View style={styles.planTitleRow}>
                <Text style={styles.planTitle}>{planDisplays.yearly.label}</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>BEST VALUE</Text>
                </View>
              </View>
              <Text style={styles.planDesc}>{planDisplays.yearly.description}</Text>
            </View>
            <View style={styles.planRight}>
              <Text style={[styles.planPrice, selectedPlan === 'yearly' && styles.planPriceActive]}>{planDisplays.yearly.price}</Text>
              <Text style={styles.planPeriod}>{planDisplays.yearly.period}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('monthly');
            }}
            activeOpacity={0.85}
          >
            {selectedPlan === 'monthly' && (
              <LinearGradient
                colors={["rgba(244, 164, 54, 0.1)", "rgba(244, 164, 54, 0.02)"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
            <View style={styles.planLeft}>
              <Text style={styles.planTitle}>{planDisplays.monthly.label}</Text>
              <Text style={styles.planDesc}>{planDisplays.monthly.description}</Text>
            </View>
            <View style={styles.planRight}>
              <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceActive]}>{planDisplays.monthly.price}</Text>
              <Text style={styles.planPeriod}>{planDisplays.monthly.period}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'weekly' && styles.planCardActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('weekly');
            }}
            activeOpacity={0.85}
          >
            {selectedPlan === 'weekly' && (
              <LinearGradient
                colors={["rgba(244, 164, 54, 0.1)", "rgba(244, 164, 54, 0.02)"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
            <View style={styles.planLeft}>
              <Text style={styles.planTitle}>{planDisplays.weekly.label}</Text>
              <Text style={styles.planDesc}>{planDisplays.weekly.description}</Text>
            </View>
            <View style={styles.planRight}>
              <Text style={[styles.planPrice, selectedPlan === 'weekly' && styles.planPriceActive]}>{planDisplays.weekly.price}</Text>
              <Text style={styles.planPeriod}>{planDisplays.weekly.period}</Text>
            </View>
          </TouchableOpacity>

          {!isRevenueCatConfigured && (
            <View style={styles.billingNotice}>
              <Text style={styles.billingNoticeText}>RevenueCat keys needed before live purchases can process.</Text>
            </View>
          )}

          <View style={styles.trialBadge}>
            <Sparkles size={14} color={WeatherColors.accent} strokeWidth={2} />
            <Text style={styles.trialBadgeText}>7-day FREE trial — cancel anytime</Text>
          </View>

          {!isPro ? (
            <>
              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  isSubscribing && styles.subscribeButtonDisabled,
                ]}
                onPress={handleSubscribe}
                disabled={isSubscribing}
                activeOpacity={0.85}
                testID="paywall-subscribe"
              >
                <LinearGradient
                  colors={["#F4A436", "#E8934A"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Crown size={18} color="#0B1A2E" strokeWidth={2} />
                <Text style={styles.subscribeText}>
                  {isSubscribing
                    ? "Processing..."
                    : `Start 7-Day Free Trial \u2014 ${selectedPlanDisplay.price}${selectedPlanDisplay.ctaPeriod}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={isRestoring}
                testID="paywall-restore"
              >
                <Text style={styles.restoreText}>{isRestoring ? "Restoring..." : "Restore Purchase"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.subscribedContainer}>
              <View style={styles.subscribedBadge}>
                <Check size={18} color={WeatherColors.accent} strokeWidth={2} />
                <Text style={styles.subscribedText}>
                  You&apos;re a Nimbus Pro member
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.legalText}>
          Payment will be charged to your account at confirmation. Subscription
          auto-renews unless cancelled at least 24 hours before the end of the
          current period.
        </Text>
      </ScrollView>
    </View>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 200 + index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: 200 + index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        styles.featureRow,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.featureIcon}>{icon}</View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: "absolute" as const,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  heroSection: {
    alignItems: "center" as const,
    marginBottom: 32,
  },
  crownContainer: {
    width: 80,
    height: 80,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  crownGlow: {
    position: "absolute" as const,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: WeatherColors.textSecondary,
    marginTop: 4,
  },
  activeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: WeatherColors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 12,
  },
  activeBadgeText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#0B1A2E",
  },
  featuresSection: {
    gap: 2,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 12,
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(244, 164, 54, 0.08)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(244, 164, 54, 0.12)",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  featureDesc: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  pricingSection: {
    alignItems: "center" as const,
    gap: 14,
    marginBottom: 24,
  },
  planCard: {
    width: "100%" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: WeatherColors.cardBorder,
    padding: 16,
    overflow: "hidden" as const,
  },
  planCardActive: {
    borderColor: WeatherColors.accent,
  },
  planLeft: {
    flex: 1,
  },
  planTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  saveBadge: {
    backgroundColor: WeatherColors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  saveBadgeText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: "#0B1A2E",
    letterSpacing: 0.5,
  },
  planDesc: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
    marginTop: 3,
  },
  planRight: {
    alignItems: "flex-end" as const,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: WeatherColors.textPrimary,
  },
  planPriceActive: {
    color: WeatherColors.accent,
  },
  planPeriod: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: WeatherColors.textSecondary,
  },
  billingNotice: {
    width: "100%" as const,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.24)",
    backgroundColor: "rgba(0, 240, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  billingNoticeText: {
    color: WeatherColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center" as const,
  },
  trialNote: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
    textAlign: "center" as const,
  },
  trialBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(244, 164, 54, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(244, 164, 54, 0.3)",
  },
  trialBadgeText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: WeatherColors.accent,
    letterSpacing: 0.2,
  },
  subscribeButton: {
    width: "100%",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    height: 54,
    borderRadius: 16,
    overflow: "hidden" as const,
  },
  subscribeButtonDisabled: {
    opacity: 0.7,
  },
  subscribeText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#0B1A2E",
  },
  restoreButton: {
    paddingVertical: 10,
  },
  restoreText: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
  },
  subscribedContainer: {
    paddingVertical: 8,
  },
  subscribedBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "rgba(244, 164, 54, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(244, 164, 54, 0.15)",
  },
  subscribedText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
  },
  legalText: {
    fontSize: 11,
    color: WeatherColors.textTertiary,
    textAlign: "center" as const,
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
