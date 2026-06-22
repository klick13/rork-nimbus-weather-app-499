import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const AUTH_URL = process.env.EXPO_PUBLIC_RORK_AUTH_URL!;
const APP_KEY = process.env.EXPO_PUBLIC_RORK_APP_KEY!;
const PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID!;

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64Encode(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? BASE64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : "=";
    result += i + 2 < bytes.length ? BASE64_CHARS[b3 & 63] : "=";
  }
  return result;
}

function base64Decode(str: string): string {
  const chars = BASE64_CHARS;
  let result = "";
  let i = 0;
  while (i < str.length) {
    const idx1 = chars.indexOf(str[i++]);
    const idx2 = chars.indexOf(str[i++]);
    const idx3 = chars.indexOf(str[i++]);
    const idx4 = chars.indexOf(str[i++]);
    const bits = (idx1 << 18) | (idx2 << 12) | (idx3 << 6) | idx4;
    result += String.fromCharCode((bits >> 16) & 0xff);
    if (idx3 !== 64) result += String.fromCharCode((bits >> 8) & 0xff);
    if (idx4 !== 64) result += String.fromCharCode(bits & 0xff);
  }
  return decodeURIComponent(escape(result));
}

function generateCodeVerifier(): string {
  const bytes = Crypto.getRandomBytes(32);
  return base64Encode(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier
  );
  const bytes = new Uint8Array(hashHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  return base64Encode(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
    const payload = JSON.parse(base64Decode(base64));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
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
  const codeVerifierRef = useRef<string | null>(null);
  const exchangeInProgressRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }, []);

  async function checkAuth() {
    try {
      const accessToken = await SecureStore.getItemAsync("access_token");
      if (!accessToken) {
        const refreshTokenStored = await SecureStore.getItemAsync("refresh_token");
        if (refreshTokenStored) {
          await refreshAccessToken();
        }
        return;
      }
      const decoded = userFromToken(accessToken);
      if (decoded) {
        setUser(decoded);
      } else {
        await refreshAccessToken();
      }
    } catch (err) {
      console.error("[Auth] Check failed:", err);
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
          setIsSigningIn(false);
        }
      }
    } catch (err) {
      console.error("[Auth] Deep link error:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
      setIsSigningIn(false);
    }
  }

  async function signIn(provider: "google" | "apple") {
    setIsSigningIn(true);
    setError(null);
    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      codeVerifierRef.current = verifier;

      const isWeb = Platform.OS === "web";

      const response = await fetch(`${AUTH_URL}/oauth/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_key: APP_KEY,
          provider,
          code_challenge: challenge,
          target: "rn",
          env: isWeb ? "preview" : "native",
        }),
      });

      if (!response.ok) {
        codeVerifierRef.current = null;
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody.error || `Sign in failed (${response.status})`;
        console.error(`[Auth] Initiate failed (${response.status}):`, errorBody);
        setError(message);
        return;
      }

      const { auth_url } = await response.json();

      if (isWeb) {
        const popup = window.open(auth_url, "_blank", "width=500,height=650");

        if (!popup) {
          codeVerifierRef.current = null;
          setError("Sign-in popup was blocked. Please allow popups for this site and try again.");
          return;
        }

        await new Promise<void>((resolve) => {
          const onMessage = (event: MessageEvent) => {
            if (event.data?.type !== "rork_auth_callback") return;
            window.removeEventListener("message", onMessage);
            clearInterval(pollTimer);
            const code = event.data.code;
            if (code) {
              exchangeCode(code).then(resolve);
            } else {
              codeVerifierRef.current = null;
              setError("Sign in completed but no code was received. Please try again.");
              resolve();
            }
          };
          window.addEventListener("message", onMessage);

          const pollTimer = setInterval(() => {
            if (popup.closed) {
              clearInterval(pollTimer);
              window.removeEventListener("message", onMessage);
              codeVerifierRef.current = null;
              resolve();
            }
          }, 500);
        });
      } else {
        const redirectUrl = `rork-${PROJECT_ID}://auth/callback`;
        const result = await WebBrowser.openAuthSessionAsync(auth_url, redirectUrl);

        if (result.type === "success") {
          const url = new URL(result.url);
          const code = url.searchParams.get("code");
          if (code) await exchangeCode(code);
        }
      }
    } catch (err) {
      console.error("[Auth] Sign in failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
      codeVerifierRef.current = null;
    } finally {
      setIsSigningIn(false);
    }
  }

  async function exchangeCode(code: string) {
    if (exchangeInProgressRef.current) return;
    exchangeInProgressRef.current = true;

    const verifier = codeVerifierRef.current;
    codeVerifierRef.current = null;

    if (!verifier) {
      setError("Session expired — please try signing in again.");
      exchangeInProgressRef.current = false;
      return;
    }

    try {
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
        return;
      }

      const { access_token, refresh_token, user: userData } = await response.json();
      await SecureStore.setItemAsync("access_token", access_token);
      await SecureStore.setItemAsync("refresh_token", refresh_token);
      setUser(userData);
      setIsSigningIn(false);
    } catch (err) {
      console.error("[Auth] Token exchange error:", err);
      setError(err instanceof Error ? err.message : "Token exchange failed");
    } finally {
      exchangeInProgressRef.current = false;
    }
  }

  async function refreshAccessToken() {
    const storedRefreshToken = await SecureStore.getItemAsync("refresh_token");
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
    await SecureStore.setItemAsync("access_token", access_token);
    setUser(userFromToken(access_token));
  }

  async function signOut() {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
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
