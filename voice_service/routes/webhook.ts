import { Router, Request, Response } from "express";
import { WebhookReceiver } from "livekit-server-sdk";
import Channel from "../models/Channel";
import Session from "../models/Session";

const router = Router();

// ── LiveKit webhook receiver ──────────────────────────────
function getReceiver(): WebhookReceiver {
  const apiKey    = process.env.LIVEKIT_API_KEY    || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "";
  return new WebhookReceiver(apiKey, apiSecret);
}

// ── POST /api/livekit/webhook ─────────────────────────────
// Receives LiveKit webhook events for room cleanup.
// Must be configured in LiveKit Cloud dashboard.
router.post("/", async (req: Request, res: Response) => {
  try {
    const receiver = getReceiver();
    const authHeader = req.headers.authorization || "";

    // LiveKit sends the body as raw text; we need it as a string
    const rawBody = typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);

    const event = await receiver.receive(rawBody, authHeader);

    console.log(`[webhook] received event: ${event.event}`);

    // ── room_finished ───────────────────────────────────
    // Fired when a LiveKit room is fully empty and destroyed.
    if (event.event === "room_finished" && event.room) {
      const roomName = event.room.name;
      console.log(`[webhook] room_finished: ${roomName}`);

      // Deactivate matching channels
      await Channel.updateMany(
        { _id: roomName, isActive: true },
        { $set: { isActive: false, participants: [] } }
      );

      // End any open sessions
      await Session.updateMany(
        { channelId: roomName, endedAt: null },
        { $set: { endedAt: new Date() } }
      );
    }

    // ── participant_left ────────────────────────────────
    // Fired when a single participant leaves.
    if (event.event === "participant_left" && event.room && event.participant) {
      const roomName    = event.room.name;
      const identity    = event.participant.identity;
      console.log(`[webhook] participant_left: ${identity} from ${roomName}`);

      // Remove from channel participants array
      await Channel.findByIdAndUpdate(roomName, {
        $pull: { participants: { userId: identity } },
      });
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[webhook] error processing event:", err);
    // Return 200 anyway to prevent LiveKit from retrying
    return res.status(200).json({ received: false, error: err.message });
  }
});

export default router;
