import { Server, Socket } from "socket.io";
import {
  getRouterRtpCapabilities,
  createWebRtcTransport,
  connectTransport,
  createProducer,
  createConsumer,
  resumeConsumer,       // ── FIX 3: new import
  getProducersInChannel,
  cleanupPeer,
} from "./mediasoupManager";
import {
  addParticipant,
  removeParticipant,
  getParticipant,
} from "./participantstore";

export const registerMediasoupHandlers = (io: Server, socket: Socket) => {

  // ── ms-join ───────────────────────────────────────────
  socket.on("ms-join", async ({ channelId, userId, name }) => {
    try {
      socket.join(channelId);
      addParticipant(socket.id, { userId, channelId, name });

      const rtpCapabilities = await getRouterRtpCapabilities(channelId);
      socket.emit("ms-router-rtp-capabilities", { rtpCapabilities });

      socket.to(channelId).emit("ms-user-joined", {
        socketId: socket.id,
        userId,
        name,
      });

      console.log(`[mediasoup] ${name} joined channel ${channelId}`);
    } catch (err) {
      console.error("[mediasoup] ms-join error:", err);
      socket.emit("ms-error", { message: "Failed to join channel" });
    }
  });

  // ── ms-create-transport ───────────────────────────────
  socket.on("ms-create-transport", async ({ channelId, direction }) => {
    try {
      const transport = await createWebRtcTransport(
        channelId,
        socket.id,
        direction
      );

      socket.emit("ms-transport-created", {
        direction,
        transportOptions: {
          id:             transport.id,
          iceParameters:  transport.iceParameters,
          iceCandidates:  transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });
    } catch (err) {
      console.error("[mediasoup] ms-create-transport error:", err);
      socket.emit("ms-error", { message: "Failed to create transport" });
    }
  });

  // ── ms-connect-transport ──────────────────────────────
  socket.on("ms-connect-transport", async ({ direction, dtlsParameters }) => {
    try {
      await connectTransport(socket.id, direction, dtlsParameters);
      socket.emit("ms-transport-connected", { direction });
    } catch (err) {
      console.error("[mediasoup] ms-connect-transport error:", err);
      socket.emit("ms-error", { message: "Failed to connect transport" });
    }
  });

  // ── ms-produce ────────────────────────────────────────
  socket.on("ms-produce", async ({ channelId, rtpParameters }) => {
    try {
      const producer = await createProducer(socket.id, rtpParameters);

      socket.emit("ms-produced", { producerId: producer.id });

      socket.to(channelId).emit("ms-new-producer", {
        producerSocketId: socket.id,
        producerId:       producer.id,
      });
    } catch (err) {
      console.error("[mediasoup] ms-produce error:", err);
      socket.emit("ms-error", { message: "Failed to produce" });
    }
  });

  // ── ms-consume ────────────────────────────────────────
  socket.on("ms-consume", async ({ channelId, producerSocketId, rtpCapabilities }) => {
    try {
      const consumer = await createConsumer(
        channelId,
        socket.id,
        producerSocketId,
        rtpCapabilities
      );

      if (!consumer) {
        socket.emit("ms-error", { message: "Cannot consume this producer" });
        return;
      }

      socket.emit("ms-consumed", {
        producerSocketId,
        consumerParams: {
          id:            consumer.id,
          producerId:    consumer.producerId,
          kind:          consumer.kind,
          rtpParameters: consumer.rtpParameters,
        },
      });

      // ── FIX 3: resume after sending params to client ──
      // Consumer is created paused — must resume so audio flows.
      // We resume server-side immediately after the client has the params.
      await resumeConsumer(socket.id, consumer.producerId);

    } catch (err) {
      console.error("[mediasoup] ms-consume error:", err);
      socket.emit("ms-error", { message: "Failed to consume" });
    }
  });

  // ── ms-get-producers ──────────────────────────────────
  socket.on("ms-get-producers", ({ channelId }) => {
    const producerSocketIds = getProducersInChannel(channelId)
      .filter((sid) => sid !== socket.id);

    console.log(`[mediasoup] ms-get-producers for ${channelId}:`, producerSocketIds);
    socket.emit("ms-existing-producers", { producerSocketIds });
  });

  // ── ms-leave + disconnect ─────────────────────────────
  socket.on("ms-leave", ({ channelId }) => {
    handleMsLeave(io, socket, channelId);
  });


};

const handleMsLeave = (io: Server, socket: Socket, channelId: string) => {
  const user = removeParticipant(socket.id);
  cleanupPeer(socket.id);
  socket.leave(channelId);

  if (user) {
    io.to(channelId).emit("ms-user-left", {
      socketId: socket.id,
      userId:   user.userId,
      name:     user.name,
    });
    console.log(`[mediasoup] ${user.name} left channel ${channelId}`);
  }
};