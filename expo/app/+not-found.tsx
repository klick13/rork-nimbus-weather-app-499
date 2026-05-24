import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { WeatherColors } from "@/constants/colors";
import { CloudOff } from "lucide-react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <CloudOff size={48} color={WeatherColors.textTertiary} strokeWidth={1.5} />
        <Text style={styles.title}>Page not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Nimbus</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: WeatherColors.backgroundDark,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  link: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
  },
  linkText: {
    fontSize: 14,
    color: WeatherColors.accent,
    fontWeight: "500" as const,
  },
});
