import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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

// ---- PKCE: browser native crypto on web, expo-crypto on native ----

function randomBytes(length: number): Uint8Array {
  if (Platform.OS === "web") {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }
  return Crypto.getRandomBytes(length);
}

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
  return base64UrlEncode(randomBytes(32));
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  if (Platform.OS === "web") {
    // Browser: use native Web Crypto (fast, doesn't lose user gesture)
    const data = new TextEncoder().encode(verifier);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(hash));
  }
  // Native: use expo-crypto (Hermes-compatible)
  const hashHex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  const bytes = new Uint8Array(hashHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  return base64UrlEncode(bytes);
}

// ---- Storage ----

function storageGet(key: string): string | null {
  if (Platform.OS === "web") return localStorage.getItem(key);
  // SecureStore is async-only; for PKCE verifier we use a ref instead on native.
  return null;
}

function storageSet(key: string, value: string): void {
  if (Platform.OS === "web") localStorage.setItem(key, value);
  // On native the verifier lives in a ref (SecureStore is async and we need sync access).
}

function storageDelete(key: string): void {
  if (Platform.OS === "web") localStorage.removeItem(key);
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") { localStorage.setItem(key, value); return; }
  return SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") { localStorage.removeItem(key); return; }
  return SecureStore.deleteItemAsync(key);
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
  const verifierRef = useRef<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    const sub = Linking.addEventListener("url", handleDeepLink);
    return () => sub.remove();
  }, []);

  async function checkAuth() {
    try {
      const token = await secureGet(ACCESS_TOKEN_KEY);
      if (token) {
        const decoded = userFromToken(token);
        if (decoded) { setUser(decoded); setIsLoading(false); return; }
      }
      const refresh = await secureGet(REFRESH_TOKEN_KEY);
      if (refresh) await refreshToken();
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
        if (code) await exchangeCode(code);
      }
    } catch (err) {
      console.error("[Auth] Deep link failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  async function signIn(provider: "google" | "apple") {
    setIsSigningIn(true);
    setError(null);

    const isWeb = Platform.OS === "web";
    const isPreview = isWeb && window.parent !== window;

    // --- Web path: open popup FIRST to preserve user gesture ---
    let popup: Window | null = null;
    if (isWeb) {
      popup = window.open("about:blank", "_blank", "width=500,height=650");
      popupRef.current = popup;
      if (!popup) {
        setIsSigningIn(false);
        setError("Sign-in popup was blocked. Please allow popups for this site.");
        return;
      }
    }

    // Generate PKCE
    const verifier = generateCodeVerifier();
    verifierRef.current = verifier;
    storageSet(CODE_VERIFIER_KEY, verifier);
    const challenge = await generateCodeChallenge(verifier);

    try {
      // Build initiate request — use target:"web" on web so the backend
      // generates a web-hosted callback URL (not a native deep-link scheme).
      const body: Record<string, unknown> = {
        app_key: APP_KEY,
        provider,
        code_challenge: challenge,
        target: isWeb ? "web" : "rn",
        env: isWeb ? "preview" : "native",
      };
      if (isPreview) body.app_path = "expo";

      const response = await fetch(`${AUTH_URL}/oauth/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        verifierRef.current = null;
        storageDelete(CODE_VERIFIER_KEY);
        const errBody = await response.json().catch(() => ({}));
        const msg = errBody.error || `Sign in failed (${response.status})`;
        console.error(`[Auth] Initiate failed (${response.status}):`, errBody);
        setError(msg);
        if (popup) try { popup.close(); } catch { /* ignore */ }
        return;
      }

      const { auth_url } = await response.json();

      if (isWeb && popup) {
        // Navigate the already-open popup to the auth URL
        popup.location.href = auth_url;

        await new Promise<void>((resolve) => {
          const onMessage = (event: MessageEvent) => {
            if (event.data?.type !== "rork_auth_callback") return;
            window.removeEventListener("message", onMessage);
            clearInterval(pollTimer);
            const code: string | undefined = event.data.code;
            if (code) {
              exchangeCode(code).then(resolve, resolve);
            } else {
              storageDelete(CODE_VERIFIER_KEY);
              resolve();
            }
          };
          window.addEventListener("message", onMessage);

          const pollTimer = setInterval(() => {
            if (popup?.closed) {
              clearInterval(pollTimer);
              window.removeEventListener("message", onMessage);
              verifierRef.current = null;
              storageDelete(CODE_VERIFIER_KEY);
              resolve();
            }
          }, 500);
        });
      } else {
        // Native: WebBrowser flow
        const result = await WebBrowser.openAuthSessionAsync(
          auth_url,
          `rork-${PROJECT_ID}://auth/callback`,
        );
        if (result.type === "success") {
          const url = new URL(result.url);
          const code = url.searchParams.get("code");
          if (code) await exchangeCode(code);
        } else {
          verifierRef.current = null;
          storageDelete(CODE_VERIFIER_KEY);
        }
      }
    } catch (err) {
      console.error("[Auth] Sign in failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
      verifierRef.current = null;
      storageDelete(CODE_VERIFIER_KEY);
    } finally {
      setIsSigningIn(false);
      if (popupRef.current && !popupRef.current.closed) {
        try { popupRef.current.close(); } catch { /* ignore */ }
      }
      popupRef.current = null;
    }
  }

  async function exchangeCode(code: string) {
    const verifier = verifierRef.current || storageGet(CODE_VERIFIER_KEY);
    if (!verifier) {
      setError("Session expired — please try signing in again.");
      return;
    }
    verifierRef.current = null;
    storageDelete(CODE_VERIFIER_KEY);

    const response = await fetch(`${AUTH_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_key: APP_KEY, code, code_verifier: verifier }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = body.error || `Token exchange failed (${response.status})`;
      console.error(`[Auth] Token exchange failed (${response.status}):`, body);
      setError(msg);
      return;
    }

    const { access_token, refresh_token, user: userData } = await response.json();
    await secureSet(ACCESS_TOKEN_KEY, access_token);
    await secureSet(REFRESH_TOKEN_KEY, refresh_token);
    setUser(userData);
  }

  async function refreshToken() {
    try {
      const stored = await secureGet(REFRESH_TOKEN_KEY);
      if (!stored) { setUser(null); return; }

      const response = await fetch(`${AUTH_URL}/oauth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_key: APP_KEY, refresh_token: stored }),
      });

      if (!response.ok) { await signOut(); return; }

      const { access_token } = await response.json();
      await secureSet(ACCESS_TOKEN_KEY, access_token);
      setUser(userFromToken(access_token));
    } catch (err) {
      console.error("[Auth] Token refresh failed:", err);
      await signOut();
    }
  }

  async function signOut() {
    try {
      await secureDelete(ACCESS_TOKEN_KEY);
      await secureDelete(REFRESH_TOKEN_KEY);
      storageDelete(CODE_VERIFIER_KEY);
      verifierRef.current = null;
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
