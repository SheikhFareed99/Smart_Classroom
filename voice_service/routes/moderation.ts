import { Router, Request, Response } from "express";
import { RoomServiceClient, TrackSource } from "livekit-server-sdk";
import Channel from "../models/Channel";
import Session from "../models/Session";
import auth = require("../middleware/auth");
import { assertInstructorForVoiceChannel } from "../lib/channelAuth";
import { getCourseAccess } from "../lib/courseAccess";

const { requireAuth } = auth;

const router = Router();

function extractUserIdFromIdentity(identity: string): string {
  const trimmed = identity.trim();
  if (!trimmed) return "";
  const lastDash = trimmed.lastIndexOf("-");
  if (lastDash <= 0) return trimmed;
  return trimmed.slice(0, lastDash);
}

async function assertStudentTargetForModeration(
  roomName: string,
  participantIdentity: string,
  requesterId: string,
  res: Response
): Promise<boolean> {
  const ch = await Channel.findById(roomName).select("courseId").lean();
  if (!ch) {
    res.status(404).json({ message: "Channel not found" });
    return false;
  }

  const targetUserId = extractUserIdFromIdentity(participantIdentity);
  if (!targetUserId) {
    res.status(400).json({ message: "Invalid participant identity" });
    return false;
  }

  if (String(targetUserId) === String(requesterId)) {
    res.status(400).json({ message: "You cannot moderate yourself" });
    return false;
  }

  const targetAccess = await getCourseAccess(targetUserId, String(ch.courseId));
  if (!targetAccess) {
    res.status(403).json({ message: "Target user is not part of this course" });
    return false;
  }
  if (targetAccess !== "student") {
    res.status(403).json({ message: "Only students can be muted or removed" });
    return false;
  }

  return true;
}

function getLivekitClient(): RoomServiceClient {
  const host      = process.env.LIVEKIT_URL      || "";
  const apiKey    = process.env.LIVEKIT_API_KEY    || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "";
  const httpHost  = host.replace("wss://", "https://").replace("ws://", "http://");
  return new RoomServiceClient(httpHost, apiKey, apiSecret);
}

// ── Helper: find a participant's microphone track SID ─────────────────────────
// mutePublishedTrack() requires the trackSid. We look it up from the server.
async function getMicTrackSid(
  client: RoomServiceClient,
  roomName: string,
  identity: string
): Promise<string | null> {
  try {
    const participant = await client.getParticipant(roomName, identity);
    // TrackSource.MICROPHONE = 2 in the LiveKit protocol enum
    const micTrack = participant.tracks.find(
      (t) => t.source === TrackSource.MICROPHONE
    );
    return micTrack?.sid ?? null;
  } catch {
    return null;
  }
}

// ── POST /api/moderation/mute ────────────────────────────────────────────────
// Mutes a student's microphone track server-side WITHOUT revoking canPublish.
// The student's track stays published — they can still unmute themselves.
// Body: { roomName, participantIdentity }
router.post("/mute", requireAuth, async (req: Request, res: Response) => {
  const { roomName, participantIdentity } = req.body;
  if (!roomName || !participantIdentity) {
    return res.status(400).json({ message: "roomName and participantIdentity are required" });
  }

  const requesterId = req.voiceUser!.userId;
  if (!(await assertInstructorForVoiceChannel(requesterId, roomName, res))) return;
  if (!(await assertStudentTargetForModeration(roomName, participantIdentity, requesterId, res))) return;

  try {
    const client   = getLivekitClient();
    const trackSid = await getMicTrackSid(client, roomName, participantIdentity);

    if (!trackSid) {
      // Participant has no mic track (may already be muted/unpublished) — not an error
      console.log(`[moderation] no mic track for ${participantIdentity} in ${roomName}`);
      return res.json({ success: true, note: "no active mic track found" });
    }

    await client.mutePublishedTrack(roomName, participantIdentity, trackSid, true);
    console.log(`[moderation] muted mic of ${participantIdentity} in ${roomName}`);
    return res.json({ success: true, action: "muted", participantIdentity });
  } catch (err: any) {
    console.error("[moderation] mute error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// ── POST /api/moderation/unmute ──────────────────────────────────────────────
// Unmutes a student's microphone track server-side.
// Body: { roomName, participantIdentity }
router.post("/unmute", requireAuth, async (req: Request, res: Response) => {
  const { roomName, participantIdentity } = req.body;
  if (!roomName || !participantIdentity) {
    return res.status(400).json({ message: "roomName and participantIdentity are required" });
  }

  const requesterId = req.voiceUser!.userId;
  if (!(await assertInstructorForVoiceChannel(requesterId, roomName, res))) return;
  if (!(await assertStudentTargetForModeration(roomName, participantIdentity, requesterId, res))) return;

  try {
    const client   = getLivekitClient();
    const trackSid = await getMicTrackSid(client, roomName, participantIdentity);

    if (!trackSid) {
      console.log(`[moderation] no mic track to unmute for ${participantIdentity}`);
      return res.json({ success: true, note: "no active mic track found" });
    }

    await client.mutePublishedTrack(roomName, participantIdentity, trackSid, false);
    console.log(`[moderation] unmuted mic of ${participantIdentity} in ${roomName}`);
    return res.json({ success: true, action: "unmuted", participantIdentity });
  } catch (err: any) {
    console.error("[moderation] unmute error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// ── POST /api/moderation/kick ────────────────────────────────────────────────
// Remove a participant from the LiveKit room entirely.
// Body: { roomName, participantIdentity }
router.post("/kick", requireAuth, async (req: Request, res: Response) => {
  const { roomName, participantIdentity } = req.body;
  if (!roomName || !participantIdentity) {
    return res.status(400).json({ message: "roomName and participantIdentity are required" });
  }

  const requesterId = req.voiceUser!.userId;
  if (!(await assertInstructorForVoiceChannel(requesterId, roomName, res))) return;
  if (!(await assertStudentTargetForModeration(roomName, participantIdentity, requesterId, res))) return;

  try {
    const client = getLivekitClient();
    await client.removeParticipant(roomName, participantIdentity);
    return res.json({ success: true, action: "kicked", participantIdentity });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ── POST /api/moderation/delete-channel ──────────────────────────────────────
// Teacher-only: destroy the LiveKit room, mark channel inactive, end sessions.
// Body: { channelId }
router.post("/delete-channel", requireAuth, async (req: Request, res: Response) => {
  const { channelId } = req.body;
  if (!channelId) {
    return res.status(400).json({ message: "channelId is required" });
  }

  const requesterId = req.voiceUser!.userId;
  if (!(await assertInstructorForVoiceChannel(requesterId, channelId, res))) return;

  try {
    const client = getLivekitClient();

    try {
      await client.deleteRoom(channelId);
      console.log(`[moderation] LiveKit room deleted: ${channelId}`);
    } catch (livekitErr: any) {
      console.warn(`[moderation] deleteRoom skipped: ${livekitErr.message}`);
    }

    await Channel.findByIdAndUpdate(channelId, {
      $set: { isActive: false, participants: [] },
    });

    await Session.updateMany(
      { channelId, endedAt: null },
      { $set: { endedAt: new Date() } }
    );

    return res.json({ success: true, channelId });
  } catch (err: any) {
    console.error("[moderation] delete-channel error:", err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
