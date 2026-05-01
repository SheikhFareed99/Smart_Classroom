import dotenv from "dotenv";
dotenv.config();

import express    from "express";
import http       from "http";
import { Server } from "socket.io";
import mongoose   from "mongoose";
import cors       from "cors";

import Channel from "./models/Channel";
import Session from "./models/Session";
import channelRoutes                         from "./routes/Channels";
import iceRoutes                             from "./routes/ice";
import livekitRoutes                         from "./routes/livekit";
import moderationRoutes                      from "./routes/moderation";
import webhookRoutes                         from "./routes/webhook";
import { registerSignalingHandlers }         from "./sockets/signaling";
import { getParticipant, removeParticipant } from "./sockets/participantstore";

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:      "*",
    methods:     ["GET", "POST"],
    credentials: false,
  },
});

app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "voice_service" });
});

app.use("/api/channels",       channelRoutes);
app.use("/api/ice-config",     iceRoutes);
app.use("/api/livekit",        livekitRoutes);
app.use("/api/moderation",     moderationRoutes);
app.use("/api/livekit/webhook", webhookRoutes);

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("[voice_service] MongoDB connected"))
  .catch((err) => console.error("[voice_service] MongoDB error:", err));

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  let mode: "p2p" | null = null;
  socket.on("join-channel", () => { mode = "p2p"; });

  registerSignalingHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id}`);
    const user = getParticipant(socket.id);
    if (!user) return;
    removeParticipant(socket.id);
    io.to(user.channelId).emit("user-left", {
      socketId: socket.id,
      userId:   user.userId,
      name:     user.name,
    });
  });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`[voice_service] Running on port ${PORT}`);
});

// ── Graceful shutdown ──────────────────────────────────────
// Handles SIGTERM (Docker/PM2) and SIGINT (Ctrl+C) signals.
// Ensures all connections are closed cleanly before exiting.
async function gracefulShutdown(signal: string) {
  console.log(`\n[voice_service] Received ${signal}, shutting down gracefully...`);

  // 1. Stop accepting new connections
  server.close(() => {
    console.log("[voice_service] HTTP server closed");
  });

  // 2. Disconnect all Socket.IO clients
  try {
    const sockets = await io.fetchSockets();
    for (const s of sockets) {
      s.disconnect(true);
    }
    console.log(`[voice_service] Disconnected ${sockets.length} socket(s)`);
  } catch (err) {
    console.error("[voice_service] Error disconnecting sockets:", err);
  }

  // 3. Close MongoDB connection
  try {
    await mongoose.connection.close();
    console.log("[voice_service] MongoDB connection closed");
  } catch (err) {
    console.error("[voice_service] Error closing MongoDB:", err);
  }

  console.log("[voice_service] Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));