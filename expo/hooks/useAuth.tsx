import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const AUTH_URL = process.env.EXPO_PUBLIC_RORK_AUTH_URL!;
const APP_KEY = process.env.EXPO_PUBLIC_RORK_APP_KEY!;
const PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID!;

const INITIATE_TIMEOUT_MS = 20_000;
const TOKEN_TIMEOUT_MS = 15_000;
const REFRESH_TIMEOUT_MS = 10_000;
const POPUP_TOTAL_TIMEOUT_MS = 120_000;

/** Fetch with a timeout using Promise.race — avoids AbortController which is unreliable in React Native. */
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
    ),
  ]);
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
  const codeVerifierRef = useRef<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  // Listen for deep links (native callback)
  useEffect(() => {
    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }, []);

  async function restoreSession() {
    try {
      const accessToken = await SecureStore.getItemAsync("access_token");
      if (accessToken) {
        const decoded = userFromToken(accessToken);
        if (decoded) {
          setUser(decoded);
          return;
        }
      }
      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      if (refreshToken) {
        await refreshAccessToken();
      }
    } catch (err) {
      console.error("[Auth] Session restore failed:", err);
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
      console.error("[Auth] Deep link error:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signIn(provider: "google" | "apple") {
    // Guard against double-taps
    if (isSigningIn) return;

    setIsSigningIn(true);
    setError(null);

    const isWeb = Platform.OS === "web";

    // CRITICAL: Open popup BEFORE any await to preserve user gesture context.
    // If window.open is called after an await, the browser treats it as a
    // non-user-initiated popup and blocks it silently.
    let popup: Window | null = null;
    if (isWeb) {
      popup = window.open("about:blank", "_blank", "width=500,height=650");
      if (!popup) {
        setError("Sign-in popup was blocked. Please allow popups for this site and try again.");
        setIsSigningIn(false);
        return;
      }
    }

    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      codeVerifierRef.current = verifier;

      const response = await fetchWithTimeout(
        `${AUTH_URL}/oauth/initiate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_key: APP_KEY,
            provider,
            code_challenge: challenge,
            target: "rn",
            env: isWeb ? "preview" : "native",
          }),
        },
        INITIATE_TIMEOUT_MS,
      );

      if (!response.ok) {
        codeVerifierRef.current = null;
        let message = `Sign in failed (${response.status})`;
        try {
          const body = await response.json();
          if (body.error) message = body.error;
        } catch { /* use default message */ }
        console.error(`[Auth] Initiate failed (${response.status}):`, message);
        setError(message);
        popup?.close();
        return;
      }

      const { auth_url } = await response.json();

      if (!auth_url || typeof auth_url !== "string") {
        codeVerifierRef.current = null;
        setError("Could not start sign-in. Please try again.");
        popup?.close();
        return;
      }

      if (isWeb && popup) {
        // Navigate the already-open popup to the auth URL
        popup.location.href = auth_url;

        // Wait for postMessage from the popup OR popup close OR total timeout
        await new Promise<void>((resolve, reject) => {
          let settled = false;

          const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            clearInterval(pollTimer);
            clearTimeout(totalTimer);
            window.removeEventListener("message", onMessage);
            fn();
          };

          const onMessage = (event: MessageEvent) => {
            if (event.data?.type !== "rork_auth_callback") return;
            const code = event.data.code;
            if (code) {
              finish(() => {
                exchangeCode(code).then(resolve, reject);
              });
            } else {
              finish(() => {
                codeVerifierRef.current = null;
                reject(new Error("Sign in completed but no authorization code was received."));
              });
            }
          };

          window.addEventListener("message", onMessage);

          const pollTimer = setInterval(() => {
            if (popup?.closed) {
              finish(() => {
                codeVerifierRef.current = null;
                // Popup closed without message — user likely cancelled
                resolve();
              });
            }
          }, 500);

          const totalTimer = setTimeout(() => {
            finish(() => {
              codeVerifierRef.current = null;
              popup?.close();
              reject(new Error("Sign-in timed out. Please try again."));
            });
          }, POPUP_TOTAL_TIMEOUT_MS);
        });
      } else {
        // Native: WebBrowser flow
        const redirectUrl = `rork-${PROJECT_ID}://auth/callback`;
        const result = await WebBrowser.openAuthSessionAsync(auth_url, redirectUrl);

        if (result.type === "success") {
          const url = new URL(result.url);
          const code = url.searchParams.get("code");
          if (code) {
            await exchangeCode(code);
          } else {
            setError("Sign in completed but no authorization code was received.");
          }
        }
        // If user cancelled (result.type !== "success"), just stop the spinner
      }
    } catch (err) {
      console.error("[Auth] Sign in failed:", err);
      if (err instanceof Error && err.message === "Request timed out") {
        setError("The sign-in service took too long to respond. Please check your connection and try again.");
      } else if (err instanceof Error && err.message === "Sign-in timed out. Please try again.") {
        setError("Sign-in took too long. Please check your connection and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      }
      codeVerifierRef.current = null;
    } finally {
      setIsSigningIn(false);
    }
  }

  async function exchangeCode(code: string) {
    const verifier = codeVerifierRef.current;
    codeVerifierRef.current = null;

    if (!verifier) {
      setError("Session expired — please try signing in again.");
      return;
    }

    const response = await fetchWithTimeout(
      `${AUTH_URL}/oauth/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_key: APP_KEY, code, code_verifier: verifier }),
      },
      TOKEN_TIMEOUT_MS,
    );

    if (!response.ok) {
      let message = `Token exchange failed (${response.status})`;
      try {
        const body = await response.json();
        if (body.error) message = body.error;
      } catch { /* use default message */ }
      console.error(`[Auth] Token exchange failed (${response.status}):`, message);
      throw new Error(message);
    }

    const { access_token, refresh_token, user: userData } = await response.json();
    await SecureStore.setItemAsync("access_token", access_token);
    await SecureStore.setItemAsync("refresh_token", refresh_token);
    setUser(userData);
  }

  async function refreshAccessToken() {
    try {
      const storedRefreshToken = await SecureStore.getItemAsync("refresh_token");
      if (!storedRefreshToken) {
        setUser(null);
        return;
      }

      const response = await fetchWithTimeout(
        `${AUTH_URL}/oauth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_key: APP_KEY, refresh_token: storedRefreshToken }),
        },
        REFRESH_TIMEOUT_MS,
      );

      if (!response.ok) {
        await signOut();
        return;
      }

      const { access_token } = await response.json();
      await SecureStore.setItemAsync("access_token", access_token);
      setUser(userFromToken(access_token));
    } catch (err) {
      console.error("[Auth] Token refresh failed:", err);
      await signOut();
    }
  }

  async function signOut() {
    try {
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
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
