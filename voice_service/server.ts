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
import { registerSignalingHandlers }         from "./sockets/signaling";
import { registerMediasoupHandlers }         from "./sockets/mediasoupSignaling";
import { createWorker, cleanupPeer }         from "./sockets/mediasoupManager";
import { getParticipant, removeParticipant } from "./sockets/participantstore";

const app    = express();
const server = http.createServer(app);

// ── Socket.io — wildcard CORS for dev ─────────────────────
const io = new Server(server, {
  cors: {
    origin:      "*",
    methods:     ["GET", "POST"],
    credentials: false,
  },
});

// ── Express — wildcard CORS for dev ───────────────────────
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "voice_service" });
});

app.use("/api/channels",   channelRoutes);
app.use("/api/ice-config", iceRoutes);

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("[voice_service] MongoDB connected"))
  .catch((err) => console.error("[voice_service] MongoDB error:", err));

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  let mode: "mediasoup" | "p2p" | null = null;

  socket.on("join-channel", () => { mode = "p2p"; });
  socket.on("ms-join",      () => { mode = "mediasoup"; });

  registerSignalingHandlers(io, socket);
  registerMediasoupHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id} (mode: ${mode})`);
    const user = getParticipant(socket.id);
    if (!user) return;

    if (mode === "mediasoup") {
      removeParticipant(socket.id);
      cleanupPeer(socket.id);
      io.to(user.channelId).emit("ms-user-left", {
        socketId: socket.id,
        userId:   user.userId,
        name:     user.name,
      });
    } else if (mode === "p2p") {
      removeParticipant(socket.id);
      io.to(user.channelId).emit("user-left", {
        socketId: socket.id,
        userId:   user.userId,
        name:     user.name,
      });
    }
  });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, async () => {
  console.log(`[voice_service] Running on port ${PORT}`);
  try {
    await createWorker();
  } catch (err) {
    console.error("[mediasoup] Worker creation FAILED:", err);
  }
});