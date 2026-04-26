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

app.use("/api/channels",   channelRoutes);
app.use("/api/ice-config", iceRoutes);
app.use("/api/livekit",    livekitRoutes);

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