// import dotenv from "dotenv";
// dotenv.config();

// import express    from "express";
// import http       from "http";
// import { Server } from "socket.io";
// import mongoose   from "mongoose";
// import cors       from "cors";

// import Channel from "../models/Channel";
// import Session from "../models/Session";
// import channelRoutes                 from "./Channels";
// import iceRoutes                     from "./ice";
// import { registerSignalingHandlers } from "../sockets/signaling";
// import { registerMediasoupHandlers } from "../sockets/mediasoupSignaling";
// import { createWorker }              from "../sockets/mediasoupManager";

// const app    = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin:      process.env.CLIENT_ORIGIN || "http://localhost:5173",
//     methods:     ["GET", "POST"],
//     credentials: true,
//   },
// });

// app.use(cors({
//   origin:      process.env.CLIENT_ORIGIN || "http://localhost:5173",
//   credentials: true,
// }));
// app.use(express.json());

// app.get("/health", (req, res) => {
//   res.json({ status: "ok", service: "voice_service" });
// });

// app.use("/api/channels",   channelRoutes);
// app.use("/api/ice-config", iceRoutes);

// mongoose
//   .connect(process.env.MONGO_URI as string)
//   .then(() => console.log("[voice_service] MongoDB connected"))
//   .catch((err) => console.error("[voice_service] MongoDB error:", err));

// // ── Socket.io ─────────────────────────────────────────────
// io.on("connection", (socket) => {
//   console.log(`[socket] connected: ${socket.id}`);

//   // Sprint 1 — P2P signaling (kept for small calls / fallback)
//   registerSignalingHandlers(io, socket);

//   // Sprint 2 — mediasoup SFU (used for group sessions 3+ people)
//   registerMediasoupHandlers(io, socket);
// });

// // ── Start server + init mediasoup Worker ──────────────────
// const PORT = process.env.PORT || 4001;
// server.listen(PORT, async () => {
//   console.log(`[voice_service] Running on port ${PORT}`);
//   // Worker must be created after server starts
//   await createWorker();
// });