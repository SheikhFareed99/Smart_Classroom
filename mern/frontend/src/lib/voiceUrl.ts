/**
 * Voice microservice base URL (no trailing slash), e.g.
 * https://smartclassroom-production-f3e7.up.railway.app
 *
 * When empty, the app uses same-origin `/voice/api/...` paths so the Vite dev
 * proxy (see vite.config.ts) can forward to a local voice_service.
 */
export function getVoiceServiceOrigin(): string {
  return (import.meta.env.VITE_VOICE_URL ?? "").replace(/\/+$/, "");
}

/** Build the HTTP URL for a voice_service route — path must start with `/api/`. */
export function voiceHttpUrl(apiPath: string): string {
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const origin = getVoiceServiceOrigin();
  if (origin) return `${origin}${path}`;
  return `/voice${path}`;
}

/** Socket.IO: proxied `/voice/socket.io` in dev; default `/socket.io` on voice host. */
export function getVoiceSocketIoClientOptions(): {
  url: string;
  path: string;
  withCredentials: boolean;
} {
  const origin = getVoiceServiceOrigin();
  if (origin) {
    return { url: origin, path: "/socket.io", withCredentials: false };
  }
  if (typeof window === "undefined") {
    return { url: "", path: "/voice/socket.io", withCredentials: false };
  }
  return { url: window.location.origin, path: "/voice/socket.io", withCredentials: true };
}
