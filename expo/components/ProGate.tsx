import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Lock, Crown } from "lucide-react-native";
import { useRouter } from "expo-router";
import { WeatherColors } from "@/constants/colors";
import { useSubscription } from "@/hooks/useSubscription";

interface ProGateProps {
  children: React.ReactNode;
  featureName?: string;
}

export default function ProGate({ children, featureName }: ProGateProps) {
  const { isPro } = useSubscription();

  if (isPro) {
    return <>{children}</>;
  }

  return <ProGateOverlay featureName={featureName} />;
}

function ProGateOverlay({ featureName }: { featureName?: string }) {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, fadeAnim]);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={styles.lockContainer}>
        <View style={styles.lockCircle}>
          <Lock size={28} color={WeatherColors.accent} strokeWidth={1.5} />
        </View>
      </View>
      <Text style={styles.title}>Nimbus Pro Feature</Text>
      {featureName && (
        <Text style={styles.featureName}>{featureName}</Text>
      )}
      <Text style={styles.description}>
        Unlock advanced weather intelligence with Nimbus Pro
      </Text>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => router.push("/paywall" as never)}
          activeOpacity={0.8}
          testID="pro-gate-upgrade"
        >
          <Crown size={16} color="#0B1A2E" strokeWidth={2} />
          <Text style={styles.upgradeText}>Upgrade — $2.99/mo</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export function ProBadge() {
  return (
    <View style={styles.badge}>
      <Crown size={9} color="#0B1A2E" strokeWidth={2.5} />
      <Text style={styles.badgeText}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  lockContainer: {
    marginBottom: 20,
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(244, 164, 54, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(244, 164, 54, 0.2)",
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
    marginBottom: 4,
  },
  featureName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: WeatherColors.accent,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 260,
  },
  upgradeButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: WeatherColors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  upgradeText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#0B1A2E",
  },
  badge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: WeatherColors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: "#0B1A2E",
    letterSpacing: 0.8,
  },
});
