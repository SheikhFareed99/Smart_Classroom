import { getVoiceServiceOrigin as voiceOrigin } from "./voiceUrl";

export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

// Service URLs from .env
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export { getVoiceServiceOrigin, voiceHttpUrl } from "./voiceUrl";

/** Voice host URL when VITE_VOICE_URL is set; empty means use /voice dev proxy paths */
export const VOICE_BASE_URL = voiceOrigin();
export const AI_BASE_URL    = import.meta.env.VITE_AI_URL       ?? "";

const TOKEN_KEY = "auth_token";

export const getStoredToken  = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setStoredToken  = (token: string)   => localStorage.setItem(TOKEN_KEY, token);
export const clearStoredToken = ()               => localStorage.removeItem(TOKEN_KEY);

/** Resolves a relative path to the full backend URL. */
function resolveUrl(input: RequestInfo | URL): string {
  const url = typeof input === "string" ? input : input.toString();
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return ${API_BASE_URL}${url};
}

/**
 * Drop-in replacement for fetch — automatically attaches the JWT from
 * localStorage as Authorization: Bearer <token>.
 * No cookies, no CSRF — works cross-domain on every browser.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});

  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", Bearer ${token});
  }

  const response = await fetch(resolveUrl(input), {
    ...init,
    headers,
    credentials: "include", // kept for session fallback in local dev
  });

  if (response.status === 401) {
    clearStoredToken();
    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
  }

  return response;
}

/** @deprecated No longer needed — kept for call-site compatibility */
export function clearCsrfTokenCache() { /* no-op */ }