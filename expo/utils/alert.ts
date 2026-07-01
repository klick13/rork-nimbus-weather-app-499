import { Alert, Platform } from "react-native";

/**
 * Cross-platform alert. React Native Web does not reliably implement
 * `Alert.alert` (it silently no-ops in some versions), which made errors
 * like "couldn't get your location" appear to do nothing on web even after
 * the underlying operation had already finished. This falls back to the
 * browser's native `window.alert` so the user always sees the message.
 */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message ? `${title}\n\n${message}` : title);
    } else {
      console.warn(`[Alert] ${title}${message ? ` — ${message}` : ""}`);
    }
    return;
  }
  Alert.alert(title, message);
}
