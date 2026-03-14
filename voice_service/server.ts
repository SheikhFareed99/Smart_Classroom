import dotenv from "dotenv";
dotenv.config();

import express    from "express";
import http       from "http";
import { Server } from "socket.io";
import mongoose   from "mongoose";
import cors       from "cors";

import Channel from "./models/Channel";
import Session from "./models/Session";
import channelRoutes from "./routes/Channels";
import { registerSignalingHandlers } from "./sockets/signaling";

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods:     ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({
  origin:      process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "voice_service" });
});

app.use("/api/channels", channelRoutes);

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("[voice_service] MongoDB connected"))
  .catch((err) => console.error("[voice_service] MongoDB error:", err));

// ── Socket.io ─────────────────────────────────────────────
// Pass both io and socket to the signaling handler so it can
// emit to specific rooms and specific socket IDs.
io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);
  registerSignalingHandlers(io, socket);
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`[voice_service] Running on port ${PORT}`);
});