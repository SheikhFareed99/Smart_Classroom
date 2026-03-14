import { Router, Request, Response } from "express";
import auth = require("../middleware/auth");
import { getIceConfig } from "../config/ice";

const router = Router();

// ── GET /api/ice-config ───────────────────────────────────
// Returns ICE server config for WebRTC peer connections.
// Frontend calls this once before creating RTCPeerConnection.
// Auth required — prevents abuse of TURN credentials in Sprint 3.
router.get("/", auth.requireAuth, (req: Request, res: Response) => {
  const config = getIceConfig();
  return res.status(200).json(config);
});

export default router;