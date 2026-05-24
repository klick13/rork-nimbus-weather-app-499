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
import AsyncStorage from "@react-native-async-storage/async-storage";
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
} from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";
import { WeatherColors } from "@/constants/colors";
import { CommunityPhoto, mockCommunityPhotos } from "@/mocks/communityPhotos";

const STORAGE_KEY = "nimbus_community_photos";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: string;
}

export default function CommunityFeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [photos, setPhotos] = useState<CommunityPhoto[]>(mockCommunityPhotos);
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
  const [commentsByPhoto, setCommentsByPhoto] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState("");
  const commentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadUserPhotos();
  }, []);

  const loadUserPhotos = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const userPhotos: CommunityPhoto[] = JSON.parse(stored);
        setPhotos([...userPhotos, ...mockCommunityPhotos]);
      }
    } catch (e) {
      console.log("[Community] Error loading user photos:", e);
    }
  }, []);

  const saveUserPhoto = useCallback(async (photo: CommunityPhoto) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existing: CommunityPhoto[] = stored ? JSON.parse(stored) : [];
      const updated = [photo, ...existing];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.log("[Community] Error saving photo:", e);
    }
  }, []);

  const toggleLike = useCallback((id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              isLiked: !p.isLiked,
              likes: p.isLiked ? p.likes - 1 : p.likes + 1,
            }
          : p
      )
    );
  }, []);

  const pickFromLibrary = useCallback(async () => {
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
        if (!asset.base64) {
          console.log("[Community] No base64 returned, using URI:", asset.uri);
          setSelectedImage(asset.uri);
        } else {
          const uri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
          console.log("[Community] Image picked as base64, length:", uri.length);
          setSelectedImage(uri);
        }
        setShowPostModal(true);
      }
    } catch (e) {
      console.log("[Community] Error picking image:", e);
      Alert.alert("Error", "Could not access your photo library.");
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Camera access is required to take photos."
        );
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
        if (!asset.base64) {
          console.log("[Community] No base64 from camera, using URI:", asset.uri);
          setSelectedImage(asset.uri);
        } else {
          const uri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
          console.log("[Community] Photo taken as base64, length:", uri.length);
          setSelectedImage(uri);
        }
        setShowPostModal(true);
      }
    } catch (e) {
      console.log("[Community] Error taking photo:", e);
      Alert.alert("Error", "Could not access the camera.");
    }
  }, []);

  const showPhotoOptions = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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

  const handlePost = useCallback(async () => {
    if (!selectedImage) return;
    setPosting(true);

    const newPhoto: CommunityPhoto = {
      id: `user_${Date.now()}`,
      userId: "me",
      username: "you",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
      imageUrl: selectedImage,
      caption: caption || "Check out this weather!",
      location: locationTag || "My Location",
      weatherTag: weatherTag || "Weather",
      likes: 0,
      comments: 0,
      timestamp: "Just now",
      isLiked: false,
    };

    await saveUserPhoto(newPhoto);
    setPhotos((prev) => [newPhoto, ...prev]);
    setShowPostModal(false);
    setSelectedImage(null);
    setCaption("");
    setLocationTag("");
    setWeatherTag("");
    setPosting(false);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setTimeout(() => {
      scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 300);
  }, [selectedImage, caption, locationTag, weatherTag, saveUserPhoto]);

  const handleFabPressIn = useCallback(() => {
    Animated.spring(fabScale, {
      toValue: 0.88,
      useNativeDriver: true,
    }).start();
  }, [fabScale]);

  const handleFabPressOut = useCallback(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [fabScale]);

  const openComments = useCallback((photoId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPhotoId(photoId);
    setShowCommentsModal(true);
    setTimeout(() => commentInputRef.current?.focus(), 400);
  }, []);

  const handleAddComment = useCallback(() => {
    if (!newComment.trim() || !selectedPhotoId) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const comment: Comment = {
      id: `comment_${Date.now()}`,
      username: "you",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
      text: newComment.trim(),
      timestamp: "Just now",
    };
    setCommentsByPhoto((prev) => ({
      ...prev,
      [selectedPhotoId]: [...(prev[selectedPhotoId] || []), comment],
    }));
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === selectedPhotoId ? { ...p, comments: p.comments + 1 } : p
      )
    );
    setNewComment("");
  }, [newComment, selectedPhotoId]);

  const handleShare = useCallback(async (item: CommunityPhoto) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await Share.share({
        message: `Check out this weather moment from ${item.username}: "${item.caption}" - shared via Nimbus Weather`,
      });
    } catch (e) {
      console.log("[Community] Share error:", e);
    }
  }, []);

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId);
  const selectedComments = selectedPhotoId ? (commentsByPhoto[selectedPhotoId] || []) : [];

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
          onError={() => console.log("[Community] Image load error for:", item.id)}
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
            <Text
              style={[
                styles.actionCount,
                item.isLiked && styles.actionCountLiked,
              ]}
            >
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[WeatherColors.backgroundDark, "#0D1F38", WeatherColors.backgroundMid]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID="community-back"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Camera size={16} color={WeatherColors.accent} strokeWidth={1.5} />
          <Text style={styles.headerTitle}>Community Feed</Text>
        </View>
        <View style={styles.headerRight} />
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
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Weather Moments</Text>
            <Text style={styles.listHeaderSub}>
              Share your weather photos with the Nimbus community
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
          {
            bottom: insets.bottom + 24,
            transform: [{ scale: fabScale }],
          },
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
              style={[
                styles.postBtn,
                (!selectedImage || posting) && styles.postBtnDisabled,
              ]}
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
                <TouchableOpacity
                  style={styles.changePhotoBtn}
                  onPress={pickFromLibrary}
                >
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
                uri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
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
              disabled={!newComment.trim()}
              style={[
                styles.commentSendBtn,
                !newComment.trim() && styles.commentSendBtnDisabled,
              ]}
              testID="comment-send-btn"
            >
              <Send size={18} color={newComment.trim() ? WeatherColors.accent : WeatherColors.textTertiary} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WeatherColors.backgroundDark,
  },
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
  headerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  headerRight: {
    width: 36,
  },
  listContent: {
    paddingHorizontal: 0,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  listHeaderSub: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
    marginTop: 4,
  },
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WeatherColors.cardBackground,
  },
  cardHeaderText: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  cardMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: WeatherColors.textTertiary,
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: WeatherColors.textTertiary,
  },
  weatherBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(244, 164, 54, 0.12)",
  },
  weatherBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
  },
  cardImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: WeatherColors.cardBackground,
  },
  cardActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 20,
  },
  actionBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: WeatherColors.textSecondary,
  },
  actionCountLiked: {
    color: "#FF4B6E",
  },
  captionRow: {
    flexDirection: "row" as const,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexWrap: "wrap" as const,
  },
  captionUsername: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginRight: 6,
  },
  captionText: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  empty: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: WeatherColors.textSecondary,
  },
  emptySubText: {
    fontSize: 13,
    color: WeatherColors.textTertiary,
  },
  fab: {
    position: "absolute" as const,
    right: 20,
    zIndex: 10,
  },
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
  modalContainer: {
    flex: 1,
    backgroundColor: WeatherColors.backgroundDark,
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: WeatherColors.separator,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  postBtn: {
    backgroundColor: WeatherColors.accent,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 72,
    alignItems: "center" as const,
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  modalBody: {
    flex: 1,
    paddingTop: 0,
  },
  previewContainer: {
    position: "relative" as const,
  },
  previewImage: {
    width: "100%",
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: WeatherColors.cardBackground,
  },
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
  changePhotoText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  inputGroup: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  captionInput: {
    fontSize: 15,
    color: "#FFFFFF",
    minHeight: 60,
    textAlignVertical: "top" as const,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: WeatherColors.separator,
  },
  tagRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginTop: 14,
  },
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
  tagTextInput: {
    flex: 1,
    fontSize: 13,
    color: "#FFFFFF",
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: WeatherColors.separator,
  },
  footerHint: {
    fontSize: 12,
    color: WeatherColors.textTertiary,
    textAlign: "center" as const,
  },
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
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WeatherColors.cardBackground,
  },
  commentPhotoInfo: {
    flex: 1,
  },
  commentPhotoUsername: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  commentPhotoCaption: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
    marginTop: 2,
  },
  commentsListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: "row" as const,
    paddingVertical: 10,
    gap: 10,
  },
  commentItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground,
  },
  commentItemContent: {
    flex: 1,
  },
  commentItemHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  commentItemUsername: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  commentItemTime: {
    fontSize: 11,
    color: WeatherColors.textTertiary,
  },
  commentItemText: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
    marginTop: 3,
    lineHeight: 19,
  },
  commentsEmpty: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 60,
    gap: 10,
  },
  commentsEmptyText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: WeatherColors.textSecondary,
  },
  commentsEmptySubText: {
    fontSize: 13,
    color: WeatherColors.textTertiary,
  },
  commentInputBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: WeatherColors.separator,
    gap: 10,
  },
  commentInputAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: WeatherColors.cardBackground,
  },
  commentTextInput: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  commentSendBtnDisabled: {
    opacity: 0.5,
  },
});
