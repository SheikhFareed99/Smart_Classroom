import { Router, Request, Response } from "express";
import { RoomServiceClient } from "livekit-server-sdk";
import auth = require("../middleware/auth");

const { requireAuth } = auth;

const router = Router();

// ── LiveKit RoomServiceClient ─────────────────────────────
function getLivekitClient(): RoomServiceClient {
  const host      = process.env.LIVEKIT_URL      || "";
  const apiKey    = process.env.LIVEKIT_API_KEY    || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "";

  // RoomServiceClient expects the HTTP(S) URL, not WSS
  const httpHost = host.replace("wss://", "https://").replace("ws://", "http://");
  return new RoomServiceClient(httpHost, apiKey, apiSecret);
}

// ── POST /api/moderation/mute ────────────────────────────
// Mute a specific participant by revoking their publish permission.
// Body: { roomName, participantIdentity }
router.post("/mute", requireAuth, async (req: Request, res: Response) => {
  const { roomName, participantIdentity } = req.body;

  if (!roomName || !participantIdentity) {
    return res.status(400).json({ message: "roomName and participantIdentity are required" });
  }

  try {
    const client = getLivekitClient();
    await client.updateParticipant(roomName, participantIdentity, undefined, {
      canPublish:     false,
      canSubscribe:   true,
      canPublishData: true,
    });

    console.log(`[moderation] muted ${participantIdentity} in ${roomName}`);
    return res.json({ success: true, action: "muted", participantIdentity });
  } catch (err: any) {
    console.error("[moderation] mute error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// ── POST /api/moderation/unmute ──────────────────────────
// Restore a participant's publish permission.
// Body: { roomName, participantIdentity }
router.post("/unmute", requireAuth, async (req: Request, res: Response) => {
  const { roomName, participantIdentity } = req.body;

  if (!roomName || !participantIdentity) {
    return res.status(400).json({ message: "roomName and participantIdentity are required" });
  }

  try {
    const client = getLivekitClient();
    await client.updateParticipant(roomName, participantIdentity, undefined, {
      canPublish:     true,
      canSubscribe:   true,
      canPublishData: true,
    });

    console.log(`[moderation] unmuted ${participantIdentity} in ${roomName}`);
    return res.json({ success: true, action: "unmuted", participantIdentity });
  } catch (err: any) {
    console.error("[moderation] unmute error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// ── POST /api/moderation/mute-all ────────────────────────
// Mute all participants in a room except the requesting teacher.
// Body: { roomName, excludeIdentity }
router.post("/mute-all", requireAuth, async (req: Request, res: Response) => {
  const { roomName, excludeIdentity } = req.body;

  if (!roomName) {
    return res.status(400).json({ message: "roomName is required" });
  }

  try {
    const client = getLivekitClient();
    const participants = await client.listParticipants(roomName);

    const mutePromises = participants
      .filter((p) => p.identity !== excludeIdentity)
      .map((p) =>
        client.updateParticipant(roomName, p.identity, undefined, {
          canPublish:     false,
          canSubscribe:   true,
          canPublishData: true,
        })
      );

    await Promise.all(mutePromises);

    console.log(`[moderation] muted all in ${roomName} (except ${excludeIdentity})`);
    return res.json({
      success: true,
      action:  "muted-all",
      count:   mutePromises.length,
    });
  } catch (err: any) {
    console.error("[moderation] mute-all error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// ── POST /api/moderation/kick ────────────────────────────
// Remove a participant from the LiveKit room entirely.
// Body: { roomName, participantIdentity }
router.post("/kick", requireAuth, async (req: Request, res: Response) => {
  const { roomName, participantIdentity } = req.body;

  if (!roomName || !participantIdentity) {
    return res.status(400).json({ message: "roomName and participantIdentity are required" });
  }

  try {
    const client = getLivekitClient();
    await client.removeParticipant(roomName, participantIdentity);

    console.log(`[moderation] kicked ${participantIdentity} from ${roomName}`);
    return res.json({ success: true, action: "kicked", participantIdentity });
  } catch (err: any) {
    console.error("[moderation] kick error:", err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
