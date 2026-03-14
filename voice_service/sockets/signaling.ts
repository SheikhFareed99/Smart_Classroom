import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import Channel from "../models/Channel";

// helper — validates MongoDB ObjectId before DB calls
const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

interface SocketUser {
  userId:    string;
  channelId: string;
  name:      string;
}

const connectedUsers = new Map<string, SocketUser>();

export const registerSignalingHandlers = (io: Server, socket: Socket) => {

  socket.on("join-channel", async ({ channelId, userId, name }) => {
    try {
      socket.join(channelId);
      connectedUsers.set(socket.id, { userId, channelId, name });

      const roomSockets = await io.in(channelId).fetchSockets();
      const existingUsers = roomSockets
        .filter((s) => s.id !== socket.id)
        .map((s) => {
          const user = connectedUsers.get(s.id);
          return { socketId: s.id, userId: user?.userId, name: user?.name };
        });

      socket.emit("existing-users", existingUsers);

      socket.to(channelId).emit("user-joined", {
        socketId: socket.id,
        userId,
        name,
      });

      // only sync to MongoDB if channelId is a real ObjectId
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

  socket.on("offer", ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit("offer", {
      sdp,
      senderSocketId: socket.id,
    });
  });

  socket.on("answer", ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit("answer", {
      sdp,
      senderSocketId: socket.id,
    });
  });

  socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit("ice-candidate", {
      candidate,
      senderSocketId: socket.id,
    });
  });

  socket.on("leave-channel", async ({ channelId }) => {
    await handleLeave(io, socket, channelId);
  });

  socket.on("disconnect", async () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      await handleLeave(io, socket, user.channelId);
    }
  });
};

const handleLeave = async (io: Server, socket: Socket, channelId: string) => {
  try {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    socket.leave(channelId);
    connectedUsers.delete(socket.id);

    io.to(channelId).emit("user-left", {
      socketId: socket.id,
      userId:   user.userId,
      name:     user.name,
    });

    // only sync to MongoDB if channelId is a real ObjectId
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