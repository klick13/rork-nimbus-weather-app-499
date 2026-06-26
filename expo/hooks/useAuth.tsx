import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const AUTH_URL = process.env.EXPO_PUBLIC_RORK_AUTH_URL!;
const APP_KEY = process.env.EXPO_PUBLIC_RORK_APP_KEY!;
const PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID!;

const ACCESS_TOKEN_KEY = "rork_access_token";
const REFRESH_TOKEN_KEY = "rork_refresh_token";
const CODE_VERIFIER_KEY = "rork_pkce_verifier";

// ---- Storage: localStorage on web, SecureStore on native ----

function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return Promise.resolve();
  }
  return SecureStore.setItemAsync(key, value);
}

function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return Promise.resolve(localStorage.getItem(key));
  }
  return SecureStore.getItemAsync(key);
}

function storageDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return Promise.resolve();
  }
  return SecureStore.deleteItemAsync(key);
}

// ---- PKCE utilities using expo-crypto (Hermes-compatible) ----

function base64UrlEncode(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : "=";
    result += i + 2 < bytes.length ? chars[b3 & 63] : "=";
  }
  return result.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  const bytes = Crypto.getRandomBytes(32);
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
  );
  const bytes = new Uint8Array(hashHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  return base64UrlEncode(bytes);
}

// ---- JWT decode ----

function base64UrlDecode(str: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  while (i < str.length) {
    const a = chars.indexOf(str[i++] ?? "=");
    const b = chars.indexOf(str[i++] ?? "=");
    const c = chars.indexOf(str[i++] ?? "=");
    const d = chars.indexOf(str[i++] ?? "=");
    const bits = (a << 18) | (b << 12) | (c << 6) | d;
    result += String.fromCharCode((bits >> 16) & 0xff);
    if (c !== 64) result += String.fromCharCode((bits >> 8) & 0xff);
    if (d !== 64) result += String.fromCharCode(bits & 0xff);
  }
  return decodeURIComponent(escape(result));
}

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

function userFromToken(token: string): User | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(base64UrlDecode(base64));

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email ?? "",
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

// ---- Context ----

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  signIn: (provider: "google" | "apple") => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageListenerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const popupRef = useRef<Window | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Restore session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Clean up message listener on unmount
  useEffect(() => {
    return () => {
      if (messageListenerRef.current) {
        window.removeEventListener("message", messageListenerRef.current);
        messageListenerRef.current = null;
      }
    };
  }, []);

  // Listen for deep links (native callback)
  useEffect(() => {
    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }, []);

  async function checkAuth() {
    try {
      const accessToken = await storageGet(ACCESS_TOKEN_KEY);
      if (accessToken) {
        const decoded = userFromToken(accessToken);
        if (decoded) {
          setUser(decoded);
          setIsLoading(false);
          return;
        }
      }
      // No usable access token — try refresh if we have a refresh token
      const refreshTokenStored = await storageGet(REFRESH_TOKEN_KEY);
      if (refreshTokenStored) {
        await refreshToken();
      }
    } catch (err) {
      console.error("[Auth] Session check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeepLink(event: { url: string }) {
    try {
      const url = new URL(event.url);
      if (url.pathname === "/auth/callback") {
        const code = url.searchParams.get("code");
        if (code) {
          await exchangeCode(code);
        }
      }
    } catch (err) {
      console.error("[Auth] Deep link handling failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  async function signIn(provider: "google" | "apple") {
    setIsSigningIn(true);
    setError(null);

    const isWeb = Platform.OS === "web";

    // Pre-compute PKCE values
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    // Persist verifier in localStorage so it survives any popup close / reload
    await storageSet(CODE_VERIFIER_KEY, verifier);

    try {
      const target = "rn";
      const env = isWeb ? "preview" : "native";

      const response = await fetch(`${AUTH_URL}/oauth/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_key: APP_KEY, provider, code_challenge: challenge, target, env }),
      });

      if (!response.ok) {
        await storageDelete(CODE_VERIFIER_KEY);
        const body = await response.json().catch(() => ({}));
        const message = body.error || `Sign in failed (${response.status})`;
        console.error(`[Auth] Initiate failed (${response.status}):`, body);
        setError(message);
        return;
      }

      const { auth_url } = await response.json();

      if (isWeb) {
        // Open popup — even though we're after an await, the reference pattern
        // does this and it works in most browsers. The web.md notes mention
        // Safari/Firefox can be strict; for now this matches the reference.
        const popup = window.open(auth_url, "_blank", "width=500,height=650");
        popupRef.current = popup;

        if (!popup) {
          await storageDelete(CODE_VERIFIER_KEY);
          setError("Sign-in popup was blocked. Please allow popups for this site and try again.");
          return;
        }

        await new Promise<void>((resolve, reject) => {
          const onMessage = async (event: MessageEvent) => {
            if (event.data?.type !== "rork_auth_callback") return;
            window.removeEventListener("message", onMessage);
            messageListenerRef.current = null;
            clearInterval(pollTimer);
            clearTimeout(fallbackTimer);
            const code = event.data.code;
            if (code) {
              try {
                await exchangeCode(code);
                resolve();
              } catch (e) {
                reject(e);
              }
            } else {
              await storageDelete(CODE_VERIFIER_KEY);
              reject(new Error("No authorization code received"));
            }
          };
          messageListenerRef.current = onMessage;
          window.addEventListener("message", onMessage);

          const pollTimer = setInterval(() => {
            if (popup?.closed) {
              clearInterval(pollTimer);
              clearTimeout(fallbackTimer);
              window.removeEventListener("message", onMessage);
              messageListenerRef.current = null;
              // Don't clear verifier here — the message may arrive after
              // the popup closes. It persists in localStorage.
              resolve();
            }
          }, 500);

          const fallbackTimer = setTimeout(() => {
            clearInterval(pollTimer);
            window.removeEventListener("message", onMessage);
            messageListenerRef.current = null;
            try { popup?.close(); } catch { /* ignore */ }
            storageDelete(CODE_VERIFIER_KEY);
            reject(new Error("Sign-in timed out. Please try again."));
          }, 120_000);
        });
      } else {
        // Native: WebBrowser flow
        const result = await WebBrowser.openAuthSessionAsync(auth_url, `rork-${PROJECT_ID}://auth/callback`);

        if (result.type === "success") {
          const url = new URL(result.url);
          const code = url.searchParams.get("code");
          if (code) {
            await exchangeCode(code);
          }
        } else {
          await storageDelete(CODE_VERIFIER_KEY);
        }
      }
    } catch (err) {
      console.error("[Auth] Sign in failed:", err);
      if (err instanceof Error && err.message === "Request timed out") {
        setError("The sign-in service took too long to respond. Please check your connection and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      }
      await storageDelete(CODE_VERIFIER_KEY);
    } finally {
      setIsSigningIn(false);
      // Clean up popup if still open
      if (popupRef.current && !popupRef.current.closed) {
        try { popupRef.current.close(); } catch { /* ignore */ }
      }
      popupRef.current = null;
    }
  }

  async function exchangeCode(code: string) {
    const verifier = await storageGet(CODE_VERIFIER_KEY);
    if (!verifier) {
      setError("Session expired — please try signing in again.");
      throw new Error("Missing PKCE verifier");
    }
    await storageDelete(CODE_VERIFIER_KEY);

    const response = await fetch(`${AUTH_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_key: APP_KEY, code, code_verifier: verifier }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = body.error || `Token exchange failed (${response.status})`;
      console.error(`[Auth] Token exchange failed (${response.status}):`, body);
      setError(message);
      throw new Error(message);
    }

    const { access_token, refresh_token, user: userData } = await response.json();

    await storageSet(ACCESS_TOKEN_KEY, access_token);
    await storageSet(REFRESH_TOKEN_KEY, refresh_token);

    setUser(userData);
  }

  async function refreshToken() {
    try {
      const storedRefreshToken = await storageGet(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) {
        setUser(null);
        return;
      }

      const response = await fetch(`${AUTH_URL}/oauth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_key: APP_KEY, refresh_token: storedRefreshToken }),
      });

      if (!response.ok) {
        await signOut();
        return;
      }

      const { access_token } = await response.json();
      await storageSet(ACCESS_TOKEN_KEY, access_token);
      setUser(userFromToken(access_token));
    } catch (err) {
      console.error("[Auth] Token refresh failed:", err);
      await signOut();
    }
  }

  async function signOut() {
    try {
      await storageDelete(ACCESS_TOKEN_KEY);
      await storageDelete(REFRESH_TOKEN_KEY);
      await storageDelete(CODE_VERIFIER_KEY);
    } catch { /* best effort */ }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isSigningIn, error, signIn, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
