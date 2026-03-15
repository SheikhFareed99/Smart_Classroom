// Builds the ICE server config from environment variables.
// Sprint 1: Google free STUN only.
// Sprint 3: Twilio TURN credentials added here — no frontend changes needed.

type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export const getIceConfig = () => {
  const iceServers: IceServer[] = [];

  // ── STUN servers ──────────────────────────────────────
  // STUN_URLS can be comma-separated for multiple servers
  // e.g. "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"
  const stunUrls = process.env.STUN_URLS;
  if (stunUrls) {
    stunUrls.split(",").forEach((url) => {
      iceServers.push({ urls: url.trim() });
    });
  } else {
    // fallback if STUN_URLS not set in .env
    iceServers.push({ urls: "stun:stun.l.google.com:19302" });
  }

  // ── TURN servers (Sprint 3) ────────────────────────────
  // Uncomment and fill in when Twilio TURN is configured
  // if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
  //   iceServers.push({
  //     urls:       process.env.TURN_URL,
  //     username:   process.env.TURN_USERNAME,
  //     credential: process.env.TURN_CREDENTIAL,
  //   });
  // }

  return { iceServers };
};