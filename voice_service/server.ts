import dotenv from "dotenv";
dotenv.config();

import express    from "express";
import http       from "http";
import { Server } from "socket.io";
import mongoose   from "mongoose";
import cors       from "cors";

// ── Models (imported so mongoose registers the schemas) ───
import Channel from "./models/Channel";
import Session from "./models/Session";

const app    = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods:     ["GET", "POST"],
    credentials: true,
  },
});

// ── Express middleware ────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "voice_service" });
});

// ── MongoDB ───────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("[voice_service] MongoDB connected"))
  .catch((err) => console.error("[voice_service] MongoDB error:", err));

// // ── TEMP: VC-4 smoke test — DELETE after confirming ───────
// mongoose.connection.once("open", async () => {
//   try {
//     const testChannel = await Channel.create({
//       name:      "Test Room",
//       courseId:  "course_001",
//       createdBy: "dev_user",
//     });
//     console.log("[VC-4 test] Channel created:", testChannel._id);

//     const testSession = await Session.create({
//       channelId:      testChannel._id,
//       participantIds: ["dev_user"],
//       peakCount:      1,
//     });
//     console.log("[VC-4 test] Session created:", testSession._id);

//     await Session.findByIdAndDelete(testSession._id);
//     await Channel.findByIdAndDelete(testChannel._id);
//     console.log("[VC-4 test] Cleaned up — schemas working correctly ✓");
//   } catch (err: any) {
//     console.error("[VC-4 test] Error:", err.message);
//   }
// });
// // ── END TEMP ──────────────────────────────────────────────

// ── Socket.io connection ──────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`[voice_service] Running on port ${PORT}`);
});