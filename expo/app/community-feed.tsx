import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  ActivityIndicator,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  Camera,
  ImagePlus,
  MapPin,
  Cloud,
  X,
  Plus,
  LogIn,
} from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeatherColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth, type User } from "@/hooks/useAuth";
import type { Tables } from "@/src/integrations/supabase/types";

const COMMUNITY_QUERY_KEY = "community-photos";
const LIKES_QUERY_KEY = "community-likes";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

type DbPhoto = Tables<"community_photos">;
type DbProfile = Tables<"profiles">;
type DbLike = Tables<"photo_likes">;
type DbComment = Tables<"photo_comments">;

interface CommunityPhoto {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  imageUrl: string;
  caption: string;
  location: string;
  weatherTag: string;
  likes: number;
  comments: number;
  timestamp: string;
  isLiked: boolean;
}

interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function syncProfile(user: User) {
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    name: user.name ?? user.email?.split("@")[0] ?? "User",
    avatar_url: user.picture ?? null,
  }, { onConflict: "id" });
  if (error) console.error("[Community] Profile sync error:", error.message);
}

export default function CommunityFeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, signIn, isSigningIn } = useAuth();
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [locationTag, setLocationTag] = useState("");
  const [weatherTag, setWeatherTag] = useState("");
  const [posting, setPosting] = useState(false);
  const scrollRef = useRef<FlatList>(null);
  const fabScale = useRef(new Animated.Value(1)).current;
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const commentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (user) syncProfile(user);
  }, [user]);

  const photosQuery = useQuery({
    queryKey: [COMMUNITY_QUERY_KEY],
    queryFn: async () => {
      const { data: photos, error } = await supabase
        .from("community_photos")
        .select("*, profiles!community_photos_user_id_fkey(name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[Community] Photos fetch error:", error.message);
        return [];
      }
      return photos;
    },
    staleTime: 30_000,
  });

  const likesQuery = useQuery({
    queryKey: [LIKES_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data, error } = await supabase
        .from("photo_likes")
        .select("photo_id")
        .eq("user_id", user.id);
      if (error) {
        console.error("[Community] Likes fetch error:", error.message);
        return new Set<string>();
      }
      return new Set((data ?? []).map((l) => l.photo_id));
    },
    enabled: !!user,
    staleTime: 10_000,
  });

  const photos: CommunityPhoto[] = React.useMemo(() => {
    const likedSet = likesQuery.data ?? new Set<string>();
    return (photosQuery.data ?? []).map((p: Tables<"community_photos"> & { profiles: Pick<DbProfile, "name" | "avatar_url"> | null }) => ({
      id: p.id,
      userId: p.user_id,
      username: p.profiles?.name ?? "Anonymous",
      avatar: p.profiles?.avatar_url ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
      imageUrl: p.image_url,
      caption: p.caption ?? "",
      location: p.location ?? "",
      weatherTag: p.weather_tag ?? "Weather",
      likes: 0,
      comments: 0,
      timestamp: timeAgo(p.created_at ?? new Date().toISOString()),
      isLiked: likedSet.has(p.id),
    }));
  }, [photosQuery.data, likesQuery.data]);

  const likeMutation = useMutation({
    mutationFn: async ({ photoId, isLiked }: { photoId: string; isLiked: boolean }) => {
      if (!user) throw new Error("Not signed in");
      if (isLiked) {
        await supabase.from("photo_likes").delete().eq("photo_id", photoId).eq("user_id", user.id);
      } else {
        await supabase.from("photo_likes").insert({ photo_id: photoId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIKES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMMUNITY_QUERY_KEY] });
    },
    onError: (err) => {
      console.error("[Community] Like error:", err);
    },
  });

  const toggleLike = useCallback((photoId: string) => {
    if (!user) {
      Alert.alert("Sign In", "Sign in to like photos and join the community.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In with Google", onPress: () => signIn("google") },
      ]);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const photo = photos.find((p) => p.id === photoId);
    likeMutation.mutate({ photoId, isLiked: photo?.isLiked ?? false });
  }, [user, photos, likeMutation, signIn]);

  const pickFromLibrary = useCallback(async () => {
    if (!user) {
      Alert.alert("Sign In", "Sign in to share your weather photos.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In with Google", onPress: () => signIn("google") },
      ]);
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Photo library access is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setSelectedImage(uri);
        setShowPostModal(true);
      }
    } catch (e) {
      console.log("[Community] Error picking image:", e);
      Alert.alert("Error", "Could not access your photo library.");
    }
  }, [user, signIn]);

  const takePhoto = useCallback(async () => {
    if (!user) {
      Alert.alert("Sign In", "Sign in to share your weather photos.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In with Google", onPress: () => signIn("google") },
      ]);
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera access is required.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setSelectedImage(uri);
        setShowPostModal(true);
      }
    } catch (e) {
      console.log("[Community] Error taking photo:", e);
      Alert.alert("Error", "Could not access the camera.");
    }
  }, [user, signIn]);

  const showPhotoOptions = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === "web") {
      pickFromLibrary();
      return;
    }
    Alert.alert("Share a Photo", "How would you like to add your weather photo?", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [takePhoto, pickFromLibrary]);

  async function uploadToStorage(base64Uri: string): Promise<string> {
    const base64 = base64Uri.replace(/^data:image\/\w+;base64,/, "");
    const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const fileName = `${user!.id}_${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from("community-photos")
      .upload(fileName, byteArray, { contentType: "image/jpeg", upsert: false });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("community-photos")
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  const handlePost = useCallback(async () => {
    if (!selectedImage || !user) return;
    setPosting(true);
    try {
      let imageUrl: string;
      if (selectedImage.startsWith("data:")) {
        imageUrl = await uploadToStorage(selectedImage);
      } else {
        imageUrl = selectedImage;
      }

      const { error } = await supabase.from("community_photos").insert({
        user_id: user.id,
        image_url: imageUrl,
        caption: caption || null,
        location: locationTag || null,
        weather_tag: weatherTag || null,
      });

      if (error) {
        console.error("[Community] Post error:", error.message);
        Alert.alert("Error", "Could not post your photo. Please try again.");
        return;
      }

      setShowPostModal(false);
      setSelectedImage(null);
      setCaption("");
      setLocationTag("");
      setWeatherTag("");
      queryClient.invalidateQueries({ queryKey: [COMMUNITY_QUERY_KEY] });

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => scrollRef.current?.scrollToOffset({ offset: 0, animated: true }), 300);
    } catch (e) {
      console.error("[Community] Upload error:", e);
      Alert.alert("Error", "Could not upload your photo. Please try again.");
    } finally {
      setPosting(false);
    }
  }, [selectedImage, user, caption, locationTag, weatherTag, queryClient]);

  const handleFabPressIn = useCallback(() => {
    Animated.spring(fabScale, { toValue: 0.88, useNativeDriver: true }).start();
  }, [fabScale]);

  const handleFabPressOut = useCallback(() => {
    Animated.spring(fabScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [fabScale]);

  const commentsQuery = useQuery({
    queryKey: ["comments", selectedPhotoId],
    queryFn: async () => {
      if (!selectedPhotoId) return [];
      const { data, error } = await supabase
        .from("photo_comments")
        .select("*, profiles!photo_comments_user_id_fkey(name, avatar_url)")
        .eq("photo_id", selectedPhotoId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("[Community] Comments fetch error:", error.message);
        return [];
      }
      return data;
    },
    enabled: !!selectedPhotoId,
    staleTime: 5_000,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ photoId, text }: { photoId: string; text: string }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("photo_comments").insert({
        photo_id: photoId,
        user_id: user.id,
        text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", selectedPhotoId] });
      queryClient.invalidateQueries({ queryKey: [COMMUNITY_QUERY_KEY] });
    },
    onError: (err) => {
      console.error("[Community] Comment error:", err);
      Alert.alert("Error", "Could not add your comment.");
    },
  });

  const openComments = useCallback((photoId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPhotoId(photoId);
    setShowCommentsModal(true);
    setTimeout(() => commentInputRef.current?.focus(), 400);
  }, []);

  const handleAddComment = useCallback(() => {
    if (!newComment.trim() || !selectedPhotoId) return;
    if (!user) {
      Alert.alert("Sign In", "Sign in to join the conversation.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In with Google", onPress: () => signIn("google") },
      ]);
      return;
    }
    addCommentMutation.mutate({ photoId: selectedPhotoId, text: newComment.trim() });
    setNewComment("");
  }, [newComment, selectedPhotoId, user, addCommentMutation, signIn]);

  const handleShare = useCallback(async (item: CommunityPhoto) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this weather moment from ${item.username}: "${item.caption}" - shared via Nimbus Weather`,
      });
    } catch (e) {
      console.log("[Community] Share error:", e);
    }
  }, []);

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId);
  const commentsRaw = commentsQuery.data ?? [];
  const selectedComments: Comment[] = commentsRaw.map((c: Tables<"photo_comments"> & { profiles: Pick<DbProfile, "name" | "avatar_url"> | null }) => ({
    id: c.id,
    username: c.profiles?.name ?? "Anonymous",
    avatar: c.profiles?.avatar_url ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
    text: c.text,
    timestamp: timeAgo(c.created_at ?? new Date().toISOString()),
  }));

  const renderPhoto = useCallback(
    ({ item }: { item: CommunityPhoto }) => (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View style={styles.cardHeaderText}>
            <Text style={styles.username}>{item.username}</Text>
            <View style={styles.cardMeta}>
              <MapPin size={10} color={WeatherColors.textTertiary} />
              <Text style={styles.metaText}>{item.location}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{item.timestamp}</Text>
            </View>
          </View>
          <View style={styles.weatherBadge}>
            <Cloud size={10} color={WeatherColors.accent} />
            <Text style={styles.weatherBadgeText}>{item.weatherTag}</Text>
          </View>
        </View>

        <ExpoImage
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          contentFit="cover"
          placeholder={{ uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }}
        />

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => toggleLike(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={`like-btn-${item.id}`}
          >
            <Heart
              size={20}
              color={item.isLiked ? "#FF4B6E" : WeatherColors.textSecondary}
              fill={item.isLiked ? "#FF4B6E" : "none"}
            />
            <Text style={[styles.actionCount, item.isLiked && styles.actionCountLiked]}>
              {item.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openComments(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={`comment-btn-${item.id}`}
          >
            <MessageCircle size={19} color={WeatherColors.textSecondary} />
            <Text style={styles.actionCount}>{item.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleShare(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={`share-btn-${item.id}`}
          >
            <Send size={17} color={WeatherColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {item.caption ? (
          <View style={styles.captionRow}>
            <Text style={styles.captionUsername}>{item.username}</Text>
            <Text style={styles.captionText}>{item.caption}</Text>
          </View>
        ) : null}
      </View>
    ),
    [toggleLike, openComments, handleShare]
  );

  const keyExtractor = useCallback((item: CommunityPhoto) => item.id, []);

  if (authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={WeatherColors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[WeatherColors.backgroundDark, "#0D1F38", WeatherColors.backgroundMid]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {router.canGoBack() ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="community-back"
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <View style={styles.headerCenter}>
          <Camera size={16} color={WeatherColors.accent} strokeWidth={1.5} />
          <Text style={styles.headerTitle}>Community Feed</Text>
        </View>
        {user ? (
          <Image
            source={{ uri: user.picture ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face" }}
            style={styles.headerAvatar}
          />
        ) : (
          <TouchableOpacity
            onPress={() => signIn("google")}
            style={styles.signInBtn}
            disabled={isSigningIn}
            testID="community-signin"
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color={WeatherColors.accent} />
            ) : (
              <>
                <LogIn size={14} color={WeatherColors.accent} />
                <Text style={styles.signInText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={scrollRef}
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshing={photosQuery.isFetching}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: [COMMUNITY_QUERY_KEY] })}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Weather Moments</Text>
            <Text style={styles.listHeaderSub}>
              {user
                ? "Share your weather photos with the Nimbus community"
                : "Sign in to share your weather photos and join the community"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Camera size={48} color={WeatherColors.textTertiary} />
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptySubText}>
              Be the first to share a weather moment!
            </Text>
          </View>
        }
      />

      <Animated.View
        style={[
          styles.fab,
          { bottom: insets.bottom + 24, transform: [{ scale: fabScale }] },
        ]}
      >
        <TouchableOpacity
          onPress={showPhotoOptions}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          activeOpacity={1}
          testID="community-post-fab"
        >
          <LinearGradient
            colors={[WeatherColors.accent, WeatherColors.accentWarm]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showPostModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowPostModal(false);
          setSelectedImage(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <LinearGradient
            colors={[WeatherColors.backgroundDark, WeatherColors.backgroundMid]}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => {
                setShowPostModal(false);
                setSelectedImage(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="post-modal-close"
            >
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Post</Text>
            <TouchableOpacity
              onPress={handlePost}
              disabled={!selectedImage || posting}
              style={[styles.postBtn, (!selectedImage || posting) && styles.postBtnDisabled]}
              testID="post-submit"
            >
              {posting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.postBtnText}>Share</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {selectedImage && (
              <View style={styles.previewContainer}>
                <ExpoImage
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                <TouchableOpacity style={styles.changePhotoBtn} onPress={pickFromLibrary}>
                  <ImagePlus size={14} color="#FFFFFF" />
                  <Text style={styles.changePhotoText}>Change</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputGroup}>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption about this weather moment..."
                placeholderTextColor={WeatherColors.textTertiary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={280}
                testID="post-caption-input"
              />
              <View style={styles.tagRow}>
                <View style={styles.tagInput}>
                  <MapPin size={14} color={WeatherColors.accent} />
                  <TextInput
                    style={styles.tagTextInput}
                    placeholder="Location"
                    placeholderTextColor={WeatherColors.textTertiary}
                    value={locationTag}
                    onChangeText={setLocationTag}
                    testID="post-location-input"
                  />
                </View>
                <View style={styles.tagInput}>
                  <Cloud size={14} color={WeatherColors.accent} />
                  <TextInput
                    style={styles.tagTextInput}
                    placeholder="Weather"
                    placeholderTextColor={WeatherColors.textTertiary}
                    value={weatherTag}
                    onChangeText={setWeatherTag}
                    testID="post-weather-input"
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.footerHint}>
              Your photo will be shared with the Nimbus community
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showCommentsModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowCommentsModal(false);
          setSelectedPhotoId(null);
          setNewComment("");
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <LinearGradient
            colors={[WeatherColors.backgroundDark, WeatherColors.backgroundMid]}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.commentsHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => {
                setShowCommentsModal(false);
                setSelectedPhotoId(null);
                setNewComment("");
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="comments-modal-close"
            >
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Comments</Text>
            <View style={{ width: 22 }} />
          </View>

          {selectedPhoto && (
            <View style={styles.commentPhotoHeader}>
              <Image source={{ uri: selectedPhoto.avatar }} style={styles.commentAvatar} />
              <View style={styles.commentPhotoInfo}>
                <Text style={styles.commentPhotoUsername}>{selectedPhoto.username}</Text>
                <Text style={styles.commentPhotoCaption} numberOfLines={2}>
                  {selectedPhoto.caption}
                </Text>
              </View>
            </View>
          )}

          <FlatList
            data={selectedComments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.commentsListContent}
            showsVerticalScrollIndicator={false}
            refreshing={commentsQuery.isFetching}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["comments", selectedPhotoId] })}
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <Image source={{ uri: item.avatar }} style={styles.commentItemAvatar} />
                <View style={styles.commentItemContent}>
                  <View style={styles.commentItemHeader}>
                    <Text style={styles.commentItemUsername}>{item.username}</Text>
                    <Text style={styles.commentItemTime}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.commentItemText}>{item.text}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.commentsEmpty}>
                <MessageCircle size={36} color={WeatherColors.textTertiary} />
                <Text style={styles.commentsEmptyText}>No comments yet</Text>
                <Text style={styles.commentsEmptySubText}>
                  Be the first to comment on this moment
                </Text>
              </View>
            }
          />

          <View style={[styles.commentInputBar, { paddingBottom: insets.bottom + 12 }]}>
            <Image
              source={{
                uri: user?.picture ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
              }}
              style={styles.commentInputAvatar}
            />
            <TextInput
              ref={commentInputRef}
              style={styles.commentTextInput}
              placeholder="Add a comment..."
              placeholderTextColor={WeatherColors.textTertiary}
              value={newComment}
              onChangeText={setNewComment}
              maxLength={280}
              testID="comment-text-input"
            />
            <TouchableOpacity
              onPress={handleAddComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              style={[
                styles.commentSendBtn,
                !newComment.trim() && styles.commentSendBtnDisabled,
              ]}
              testID="comment-send-btn"
            >
              {addCommentMutation.isPending ? (
                <ActivityIndicator size="small" color={WeatherColors.accent} />
              ) : (
                <Send
                  size={18}
                  color={newComment.trim() ? WeatherColors.accent : WeatherColors.textTertiary}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WeatherColors.backgroundDark },
  center: { justifyContent: "center" as const, alignItems: "center" as const },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: WeatherColors.separator,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 7,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" as const, color: "#FFFFFF" },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground,
  },
  signInBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WeatherColors.accent,
  },
  signInText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
  },
  listContent: { paddingHorizontal: 0 },
  listHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  listHeaderTitle: { fontSize: 22, fontWeight: "800" as const, color: "#FFFFFF", letterSpacing: -0.3 },
  listHeaderSub: { fontSize: 13, color: WeatherColors.textSecondary, marginTop: 4 },
  card: {
    marginBottom: 2,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderBottomWidth: 0.5,
    borderBottomColor: WeatherColors.separator,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: WeatherColors.cardBackground },
  cardHeaderText: { flex: 1 },
  username: { fontSize: 14, fontWeight: "700" as const, color: "#FFFFFF" },
  cardMeta: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: WeatherColors.textTertiary },
  metaDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: WeatherColors.textTertiary },
  weatherBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(244, 164, 54, 0.12)",
  },
  weatherBadgeText: { fontSize: 10, fontWeight: "600" as const, color: WeatherColors.accent },
  cardImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75, backgroundColor: WeatherColors.cardBackground },
  cardActions: { flexDirection: "row" as const, alignItems: "center" as const, paddingHorizontal: 16, paddingVertical: 10, gap: 20 },
  actionBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
  actionCount: { fontSize: 13, fontWeight: "600" as const, color: WeatherColors.textSecondary },
  actionCountLiked: { color: "#FF4B6E" },
  captionRow: { flexDirection: "row" as const, paddingHorizontal: 16, paddingBottom: 14, flexWrap: "wrap" as const },
  captionUsername: { fontSize: 13, fontWeight: "700" as const, color: "#FFFFFF", marginRight: 6 },
  captionText: { fontSize: 13, color: WeatherColors.textSecondary, flex: 1, lineHeight: 18 },
  empty: { alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 17, fontWeight: "700" as const, color: WeatherColors.textSecondary },
  emptySubText: { fontSize: 13, color: WeatherColors.textTertiary },
  fab: { position: "absolute" as const, right: 20, zIndex: 10 },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: WeatherColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalContainer: { flex: 1, backgroundColor: WeatherColors.backgroundDark },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: WeatherColors.separator,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" as const, color: "#FFFFFF" },
  postBtn: {
    backgroundColor: WeatherColors.accent,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 72,
    alignItems: "center" as const,
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { fontSize: 14, fontWeight: "700" as const, color: "#FFFFFF" },
  modalBody: { flex: 1 },
  previewContainer: { position: "relative" as const },
  previewImage: { width: "100%", height: SCREEN_WIDTH * 0.75, backgroundColor: WeatherColors.cardBackground },
  changePhotoBtn: {
    position: "absolute" as const,
    bottom: 12,
    right: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  changePhotoText: { fontSize: 12, fontWeight: "600" as const, color: "#FFFFFF" },
  inputGroup: { paddingHorizontal: 16, paddingTop: 16 },
  captionInput: {
    fontSize: 15,
    color: "#FFFFFF",
    minHeight: 60,
    textAlignVertical: "top" as const,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: WeatherColors.separator,
  },
  tagRow: { flexDirection: "row" as const, gap: 10, marginTop: 14 },
  tagInput: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tagTextInput: { flex: 1, fontSize: 13, color: "#FFFFFF" },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: WeatherColors.separator,
  },
  footerHint: { fontSize: 12, color: WeatherColors.textTertiary, textAlign: "center" as const },
  commentsHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: WeatherColors.separator,
  },
  commentPhotoHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: WeatherColors.separator,
    gap: 12,
  },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: WeatherColors.cardBackground },
  commentPhotoInfo: { flex: 1 },
  commentPhotoUsername: { fontSize: 14, fontWeight: "700" as const, color: "#FFFFFF" },
  commentPhotoCaption: { fontSize: 13, color: WeatherColors.textSecondary, marginTop: 2 },
  commentsListContent: { paddingHorizontal: 16, paddingTop: 8, flexGrow: 1 },
  commentItem: { flexDirection: "row" as const, paddingVertical: 10, gap: 10 },
  commentItemAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: WeatherColors.cardBackground },
  commentItemContent: { flex: 1 },
  commentItemHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  commentItemUsername: { fontSize: 13, fontWeight: "700" as const, color: "#FFFFFF" },
  commentItemTime: { fontSize: 11, color: WeatherColors.textTertiary },
  commentItemText: { fontSize: 14, color: WeatherColors.textSecondary, marginTop: 3, lineHeight: 19 },
  commentsEmpty: { alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 60, gap: 10 },
  commentsEmptyText: { fontSize: 16, fontWeight: "600" as const, color: WeatherColors.textSecondary },
  commentsEmptySubText: { fontSize: 13, color: WeatherColors.textTertiary },
  commentInputBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: WeatherColors.separator,
    gap: 10,
  },
  commentInputAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: WeatherColors.cardBackground },
  commentTextInput: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center" as const, justifyContent: "center" as const },
  commentSendBtnDisabled: { opacity: 0.5 },
});
