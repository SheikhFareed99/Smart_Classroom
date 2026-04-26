import { Router, Request, Response } from "express";
import { AccessToken } from "livekit-server-sdk";

const router = Router();

router.post("/token", async (req: Request, res: Response) => {
  const { roomName, participantName, participantId } = req.body;

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
    const identity = `${participantId}-${Date.now()}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: participantName,
      ttl:  3600,
    });

    token.addGrant({
      room:           roomName,
      roomJoin:       true,
      canPublish:     true,      
      canSubscribe:   true,      
      canPublishData: true,
    });

    const jwt = await Promise.resolve(token.toJwt());
    console.log(`[livekit] token issued for ${identity} in room ${roomName}`);
    return res.json({ token: jwt, identity });

  } catch (err: any) {
    console.error("[livekit] token generation error:", err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;