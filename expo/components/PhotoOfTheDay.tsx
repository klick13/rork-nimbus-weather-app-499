import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Anchor, Fish, ChevronRight, Users } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { WeatherColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/src/integrations/supabase/types";

interface PhotoOfTheDayProps {
  conditionId: string;
}

const BOATING_FISHING_PHOTOS = [
  {
    url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&h=500&fit=crop",
    credit: "Silas Baisch",
    desc: "Sunrise over glass-calm waters — perfect fishing conditions",
  },
  {
    url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop",
    credit: "Jeremy Bishop",
    desc: "Diver exploring crystal-clear reef at dawn",
  },
  {
    url: "https://images.unsplash.com/photo-1516687405617-9db6c8e295e8?w=800&h=500&fit=crop",
    credit: "Cristian Palmer",
    desc: "Fisherman casting at first light on the bayou",
  },
  {
    url: "https://images.unsplash.com/photo-1530936100585-0b7cc2d3f05c?w=800&h=500&fit=crop",
    credit: "Mike Kotsch",
    desc: "Sailboat cutting through morning mist on the lake",
  },
  {
    url: "https://images.unsplash.com/photo-1543862173-26581d634ab0?w=800&h=500&fit=crop",
    credit: "Thomas Millot",
    desc: "Trawler heading out before the storm breaks",
  },
  {
    url: "https://images.unsplash.com/photo-1414609245224-afa02bfb3fda?w=800&h=500&fit=crop",
    credit: "Dustin Scarpitti",
    desc: "Quiet marina at golden hour — boats ready for the day",
  },
  {
    url: "https://images.unsplash.com/photo-1534445867742-43195f401b6c?w=800&h=500&fit=crop",
    credit: "Alex Rose",
    desc: "Angler silhouetted against a fiery sunset sky",
  },
  {
    url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=500&fit=crop",
    credit: "Justin Van Dyke",
    desc: "Massive swell rolling in — offshore weather report",
  },
];

export default function PhotoOfTheDay({ conditionId }: PhotoOfTheDayProps) {
  const router = useRouter();

  const communityPhotoQuery = useQuery({
    queryKey: ["photo-of-the-day"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: photos, error } = await supabase
        .from("community_photos")
        .select("*, profiles!community_photos_user_id_fkey(name, avatar_url)")
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !photos || photos.length === 0) return null;

      const { data: likes } = await supabase
        .from("photo_likes")
        .select("photo_id")
        .in("photo_id", photos.map((p) => p.id));

      const likeCounts = new Map<string, number>();
      (likes ?? []).forEach((l) => {
        likeCounts.set(l.photo_id, (likeCounts.get(l.photo_id) ?? 0) + 1);
      });

      let bestPhoto = photos[0];
      let bestLikes = 0;
      for (const photo of photos) {
        const count = likeCounts.get(photo.id) ?? 0;
        if (count > bestLikes) {
          bestLikes = count;
          bestPhoto = photo;
        }
      }

      if (bestLikes === 0 && photos.length > 0) {
        bestPhoto = photos[Math.floor(Math.random() * photos.length)];
      }

      const profile = bestPhoto.profiles as Tables<"profiles"> | null;
      return {
        url: bestPhoto.image_url,
        credit: profile?.name ?? "Community Member",
        desc: bestPhoto.caption ?? "Shared by the Nimbus community",
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const photo = useMemo(() => {
    if (communityPhotoQuery.data) {
      return communityPhotoQuery.data;
    }
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return BOATING_FISHING_PHOTOS[dayOfYear % BOATING_FISHING_PHOTOS.length];
  }, [communityPhotoQuery.data]);

  const isCommunityPhoto = !!communityPhotoQuery.data;

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isCommunityPhoto ? (
          <Users size={16} color={WeatherColors.accent} strokeWidth={1.5} />
        ) : (
          <Anchor size={16} color={WeatherColors.accent} strokeWidth={1.5} />
        )}
        <Text style={styles.headerTitle}>
          {isCommunityPhoto ? "COMMUNITY PHOTO OF THE DAY" : "PHOTO OF THE DAY"}
        </Text>
      </View>

      <View style={styles.imageContainer}>
        <Image source={{ uri: photo.url }} style={styles.image} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.75)"]}
          style={styles.imageOverlay}
        />
        <View style={styles.imageInfo}>
          <Text style={styles.photoDesc} numberOfLines={2}>
            {photo.desc}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.photoDate}>{today}</Text>
            <View style={styles.creditRow}>
              {isCommunityPhoto ? (
                <Users size={11} color="rgba(255,255,255,0.6)" style={{ marginRight: 4 }} />
              ) : (
                <Fish size={11} color="rgba(255,255,255,0.6)" style={{ marginRight: 4 }} />
              )}
              <Text style={styles.photoCredit}>by {photo.credit}</Text>
            </View>
          </View>
        </View>

        {isCommunityPhoto && (
          <View style={styles.communityBadge}>
            <Users size={10} color="#FFFFFF" />
            <Text style={styles.communityBadgeText}>Community Pick</Text>
          </View>
        )}
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
            <Text style={styles.communityBtnSub}>
              {isCommunityPhoto
                ? "See more photos from fellow weather watchers"
                : "Share your fishing, boating & weather photos"}
            </Text>
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
    fontSize: 13,
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
  creditRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  photoCredit: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  communityBadge: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(0, 240, 255, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  communityBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#FFFFFF",
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
