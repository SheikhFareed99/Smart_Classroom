import { Router, Request, Response } from "express";
import Channel from "../models/Channel";
import auth = require("../middleware/auth");

const { requireAuth } = auth;

const router = Router();

// ── POST /api/channels ────────────────────────────────────
// Create a new voice channel for a course.
// Body: { name: string, courseId: string, createdBy: string }
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const { name, courseId, createdBy } = req.body;

  if (!name || !courseId || !createdBy) {
    return res.status(400).json({
      message: "name, courseId, and createdBy are required",
    });
  }

  try {
    const channel = await Channel.create({
      name,
      courseId,
      createdBy,
      // first participant is the host who created it
      participants: [
        {
          userId: createdBy,
          name:   req.body.creatorName || "Host",
          role:   "host",
        },
      ],
    });

    return res.status(201).json({ channel });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ── GET /api/channels/:courseId ───────────────────────────
// List all active channels for a given course.
// Returns empty array if no channels exist yet.
router.get("/:courseId", requireAuth, async (req: Request, res: Response) => {
  const { courseId } = req.params;

  try {
    const channels = await Channel.find({
      courseId,
      isActive: true,
    }).sort({ createdAt: -1 }); // newest first

    return res.status(200).json({ channels });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/channels/:id ──────────────────────────────
// Soft-delete a channel — sets isActive: false.
// Does NOT remove the document (session history is preserved).
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const channel = await Channel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }  // return the updated document
    );

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    return res.status(200).json({
      message: "Channel closed",
      channel,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;