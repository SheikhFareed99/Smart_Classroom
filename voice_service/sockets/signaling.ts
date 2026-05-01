import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import Channel from "../models/Channel";
import {
  addParticipant,
  removeParticipant,
  getParticipant,
  getParticipantsInChannel,
} from "./participantstore";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const registerSignalingHandlers = (io: Server, socket: Socket) => {

  // ── join-channel ────────────────────────────────────────
  socket.on("join-channel", async ({ channelId, userId, name }) => {
    try {
      socket.join(channelId);

      // add to participant store
      addParticipant(socket.id, { userId, channelId, name });

      // get all OTHER sockets already in this room
      const roomSockets = await io.in(channelId).fetchSockets();
      const existingUsers = roomSockets
        .filter((s) => s.id !== socket.id)
        .map((s) => {
          const user = getParticipant(s.id);
          return { socketId: s.id, userId: user?.userId, name: user?.name };
        });

      // tell the new joiner who is already here
      socket.emit("existing-users", existingUsers);

      // tell everyone else a new user joined
      socket.to(channelId).emit("user-joined", {
        socketId: socket.id,
        userId,
        name,
      });

      // sync to MongoDB
      if (isValidObjectId(channelId)) {
        await Channel.findByIdAndUpdate(channelId, {
          $push: {
            participants: {
              userId,
              name,
              role:     "participant",
              isMuted:  false,
              joinedAt: new Date(),
            },
          },
        });
      }

      console.log(`[signaling] ${name} joined channel ${channelId}`);
    } catch (err) {
      console.error("[signaling] join-channel error:", err);
    }
  });

  // ── offer ───────────────────────────────────────────────
  socket.on("offer", ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit("offer", {
      sdp,
      senderSocketId: socket.id,
    });
  });

  // ── answer ──────────────────────────────────────────────
  socket.on("answer", ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit("answer", {
      sdp,
      senderSocketId: socket.id,
    });
  });

  // ── ice-candidate ───────────────────────────────────────
  socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit("ice-candidate", {
      candidate,
      senderSocketId: socket.id,
    });
  });

  // ── leave-channel ───────────────────────────────────────
  socket.on("leave-channel", async ({ channelId }) => {
    await handleLeave(io, socket, channelId);
  });

  // ── disconnect ──────────────────────────────────────────

};

// ── Shared leave/disconnect cleanup ──────────────────────
const handleLeave = async (io: Server, socket: Socket, channelId: string) => {
  try {
    const user = removeParticipant(socket.id);
    if (!user) return;

    socket.leave(channelId);

    io.to(channelId).emit("user-left", {
      socketId: socket.id,
      userId:   user.userId,
      name:     user.name,
    });

    if (isValidObjectId(channelId)) {
      await Channel.findByIdAndUpdate(channelId, {
        $pull: { participants: { userId: user.userId } },
      });
    }

    console.log(`[signaling] ${user.name} left channel ${channelId}`);
  } catch (err) {
    console.error("[signaling] leave error:", err);
  }
};