import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Camera, Users, ChevronRight } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { WeatherColors } from "@/constants/colors";

interface PhotoOfTheDayProps {
  conditionId: string;
}

const WEATHER_PHOTOS: Record<string, { url: string; credit: string; desc: string }[]> = {
  clear: [
    { url: "https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=800&h=500&fit=crop", credit: "Pixabay", desc: "Golden sunlight over rolling hills" },
    { url: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&h=500&fit=crop", credit: "Robert Lukeman", desc: "Sunrise golden glow over meadow" },
    { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=500&fit=crop", credit: "Federico Respini", desc: "Warm light across the fields" },
  ],
  "partly-cloudy": [
    { url: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&h=500&fit=crop", credit: "Billy Huynh", desc: "Dramatic clouds at sunset" },
    { url: "https://images.unsplash.com/photo-1504253163759-c23fccaebb55?w=800&h=500&fit=crop", credit: "Markus Spiske", desc: "Clouds breaking over mountains" },
  ],
  cloudy: [
    { url: "https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=800&h=500&fit=crop", credit: "Aliaksandr B.", desc: "Moody overcast atmosphere" },
    { url: "https://images.unsplash.com/photo-1483977399921-6cf94f6fdc3a?w=800&h=500&fit=crop", credit: "Zbynek Burival", desc: "Layers of clouds over the valley" },
  ],
  rainy: [
    { url: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&h=500&fit=crop", credit: "Valentin Muller", desc: "Rain-kissed cityscape" },
    { url: "https://images.unsplash.com/photo-1428592953211-077101b2021b?w=800&h=500&fit=crop", credit: "Alex Dukhanov", desc: "Storm approaching the coast" },
  ],
  snow: [
    { url: "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&h=500&fit=crop", credit: "Damian Markutt", desc: "Fresh snowfall on pine trees" },
    { url: "https://images.unsplash.com/photo-1457269449834-928af64c684d?w=800&h=500&fit=crop", credit: "Aaron Burden", desc: "Winter wonderland at dawn" },
  ],
};

export default function PhotoOfTheDay({ conditionId }: PhotoOfTheDayProps) {
  const router = useRouter();
  const photo = useMemo(() => {
    const key = conditionId in WEATHER_PHOTOS ? conditionId : "clear";
    const photos = WEATHER_PHOTOS[key] ?? WEATHER_PHOTOS["clear"] ?? [];
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return photos[dayOfYear % photos.length] ?? photos[0];
  }, [conditionId]);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (!photo) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Camera size={18} color={WeatherColors.accent} strokeWidth={1.5} />
        <Text style={styles.headerTitle}>PHOTO OF THE DAY</Text>
      </View>

      <View style={styles.imageContainer}>
        <Image source={{ uri: photo.url }} style={styles.image} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.75)"]}
          style={styles.imageOverlay}
        />
        <View style={styles.imageInfo}>
          <Text style={styles.photoDesc}>{photo.desc}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.photoDate}>{today}</Text>
            <Text style={styles.photoCredit}>by {photo.credit}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.communityBtn}
        onPress={() => router.push("/community-feed" as never)}
        activeOpacity={0.75}
        testID="photo-community-btn"
      >
        <View style={styles.communityBtnLeft}>
          <Users size={20} color={WeatherColors.accent} />
          <View>
            <Text style={styles.communityBtnTitle}>Community Feed</Text>
            <Text style={styles.communityBtnSub}>Share your weather photos</Text>
          </View>
        </View>
        <ChevronRight size={20} color={WeatherColors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 1.2,
  },
  imageContainer: {
    borderRadius: 16,
    overflow: "hidden" as const,
    height: 200,
    backgroundColor: WeatherColors.cardBackground,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  imageInfo: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  photoDesc: {
    fontSize: 19,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  photoDate: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },
  photoCredit: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  communityBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  communityBtnLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  communityBtnTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  communityBtnSub: {
    fontSize: 13,
    color: WeatherColors.textTertiary,
    marginTop: 1,
  },
});
