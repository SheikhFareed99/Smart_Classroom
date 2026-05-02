import { Router, Request, Response } from "express";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import auth = require("../middleware/auth");

const { requireAuth } = auth;

const router = Router();

// ── POST /api/livekit/token ──────────────────────────────
// Generate a LiveKit access token for joining a room.
// Body: { roomName, participantName, participantId, role }
// Role: "teacher" → roomAdmin + canPublish; "student" → canPublish + canSubscribe
router.post("/token", requireAuth, async (req: Request, res: Response) => {
  const { roomName, participantName, participantId, role } = req.body;

  if (!roomName || !participantName || !participantId) {
    return res.status(400).json({
      message: "roomName, participantName and participantId are required",
    });
  }

  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ message: "LiveKit credentials not configured" });
  }

  try {
    // Make identity unique per session to prevent LiveKit kicking duplicate identities
    const identity  = `${participantId}-${Date.now()}`;
    const isTeacher = role === "teacher";

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: participantName,
      // TTL as a string — the SDK accepts "1h", "30m", etc.
      // Using a number causes it to be converted to "3600s" internally,
      // but we use a string to be explicit and safe.
      ttl: "1h",
    });

    // ── Video grants ──────────────────────────────────────────────────────────
    // canPublish: true  → participant can send audio/video tracks
    // canPublishSources explicitly whitelists the microphone source.
    // This prevents LiveKit Cloud room-level policies from silently revoking
    // publish permission for unlisted sources.
    token.addGrant({
      room:               roomName,
      roomJoin:           true,
      roomAdmin:          isTeacher,
      canPublish:         true,
      canSubscribe:       true,
      canPublishData:     true,
      // Whitelist all sources this app uses.
      // MICROPHONE  — voice audio
      // SCREEN_SHARE       — screen video track
      // SCREEN_SHARE_AUDIO — system/tab audio during screen share
      canPublishSources:  [
        TrackSource.MICROPHONE,
        TrackSource.SCREEN_SHARE,
        TrackSource.SCREEN_SHARE_AUDIO,
      ],
    });

    const jwt = await token.toJwt();

    // Debug log — redact in production if needed
    console.log(
      `[livekit] token issued | identity=${identity} role=${role || "student"} ` +
      `room=${roomName} canPublish=true canPublishSources=[MICROPHONE,SCREEN_SHARE,SCREEN_SHARE_AUDIO]`
    );

    return res.json({ token: jwt, identity });

  } catch (err: any) {
    console.error("[livekit] token generation error:", err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;