import { useState, useRef, useCallback, useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { Device } from "mediasoup-client";
import type {
  Transport,
  Producer,
  Consumer,
  RtpCapabilities,
  DtlsParameters,
  RtpParameters,
} from "mediasoup-client/types";
import type { VoicePeer } from "../types/voice.types";

export interface UseMediasoupOptions {
  userId: string;
  name:   string;
}

export interface UseMediasoupReturn {
  peers:        VoicePeer[];
  remoteStreams: Map<string, MediaStream>;
  isMuted:      boolean;
  isConnected:  boolean;
  joinChannel:  (channelId: string) => Promise<void>;
  leaveChannel: () => void;
  toggleMute:   () => void;
}

export const useMediasoup = ({
  userId,
  name,
}: UseMediasoupOptions): UseMediasoupReturn => {

  const [peers, setPeers] = useState<VoicePeer[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map()
  );
  const [isMuted,       setIsMuted]       = useState(false);
  const [isConnected,   setIsConnected]   = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransport = useRef<Transport | null>(null);
  const recvTransport = useRef<Transport | null>(null);
  const producerRef = useRef<Producer | null>(null);
  const consumersRef = useRef<Map<string, Consumer>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelIdRef = useRef<string | null>(null);
  const rtpCapabilitiesRef = useRef<RtpCapabilities | null>(null);

  // ── Create send transport ────────────────────────────
  const createSendTransport = useCallback((socket: Socket, channelId: string) => {
    return new Promise<void>((resolve, reject) => {
      socket.emit("ms-create-transport", { channelId, direction: "send" });

      const onTransportCreated = async ({
        direction,
        transportOptions,
      }: {
        direction: "send" | "recv";
        transportOptions: unknown;
      }) => {
        if (direction !== "send") return;
        socket.off("ms-transport-created", onTransportCreated);

        if (!deviceRef.current) {
          reject(new Error("mediasoup device not initialised"));
          return;
        }

        const transport = deviceRef.current.createSendTransport(
          transportOptions as any
        );
        sendTransport.current = transport;

        transport.on(
          "connect",
          (
            { dtlsParameters }: { dtlsParameters: DtlsParameters },
            callback: () => void,
            errback: (error: Error) => void
          ) => {
            try {
              const onConnected = ({ direction: dir }: { direction: "send" | "recv" }) => {
                if (dir !== "send") return;
                socket.off("ms-transport-connected", onConnected);
                socket.off("ms-error", onError);
                callback();
              };

              const onError = ({ message }: { message: string }) => {
                socket.off("ms-transport-connected", onConnected);
                socket.off("ms-error", onError);
                errback(new Error(message));
              };

              socket.on("ms-transport-connected", onConnected);
              socket.on("ms-error", onError);
              socket.emit("ms-connect-transport", {
                direction: "send",
                dtlsParameters,
              });
            } catch (error) {
              errback(error as Error);
            }
          }
        );

        transport.on(
          "produce",
          async (
            {
              kind,
              rtpParameters,
            }: { kind: string; rtpParameters: RtpParameters },
            callback: ({ id }: { id: string }) => void,
            errback: (error: Error) => void
          ) => {
            try {
              const onProduced = ({ producerId }: { producerId: string }) => {
                socket.off("ms-produced", onProduced);
                socket.off("ms-error", onError);
                callback({ id: producerId });
              };

              const onError = ({ message }: { message: string }) => {
                socket.off("ms-produced", onProduced);
                socket.off("ms-error", onError);
                errback(new Error(message));
              };

              socket.on("ms-produced", onProduced);
              socket.on("ms-error", onError);
              socket.emit("ms-produce", { channelId, kind, rtpParameters });
            } catch (error) {
              errback(error as Error);
            }
          }
        );

        resolve();
      };

      socket.on("ms-transport-created", onTransportCreated);
    });
  }, []);

  // ── Create recv transport ────────────────────────────
  const createRecvTransport = useCallback((socket: Socket, channelId: string) => {
    return new Promise<void>((resolve, reject) => {
      socket.emit("ms-create-transport", { channelId, direction: "recv" });

      const onTransportCreated = async ({
        direction,
        transportOptions,
      }: {
        direction: "send" | "recv";
        transportOptions: unknown;
      }) => {
        if (direction !== "recv") return;
        socket.off("ms-transport-created", onTransportCreated);

        if (!deviceRef.current) {
          reject(new Error("mediasoup device not initialised"));
          return;
        }

        const transport = deviceRef.current.createRecvTransport(
          transportOptions as any
        );
        recvTransport.current = transport;

        transport.on(
          "connect",
          (
            { dtlsParameters }: { dtlsParameters: DtlsParameters },
            callback: () => void,
            errback: (error: Error) => void
          ) => {
            try {
              const onConnected = ({ direction: dir }: { direction: "send" | "recv" }) => {
                if (dir !== "recv") return;
                socket.off("ms-transport-connected", onConnected);
                socket.off("ms-error", onError);
                callback();
              };

              const onError = ({ message }: { message: string }) => {
                socket.off("ms-transport-connected", onConnected);
                socket.off("ms-error", onError);
                errback(new Error(message));
              };

              socket.on("ms-transport-connected", onConnected);
              socket.on("ms-error", onError);
              socket.emit("ms-connect-transport", {
                direction: "recv",
                dtlsParameters,
              });
            } catch (error) {
              errback(error as Error);
            }
          }
        );

        resolve();
      };

      socket.on("ms-transport-created", onTransportCreated);
    });
  }, []);

  // ── Consume a remote producer ─────────────────────────
  const consumeProducer = useCallback(async (
    socket: Socket,
    channelId: string,
    producerSocketId: string
  ) => {
    if (!recvTransport.current || !rtpCapabilitiesRef.current) return;

    socket.emit("ms-consume", {
      channelId,
      producerSocketId,
      rtpCapabilities: rtpCapabilitiesRef.current,
    });

    const onConsumed = async ({
      producerSocketId: sid,
      consumerParams,
    }: {
      producerSocketId: string;
      consumerParams: unknown;
    }) => {
      if (sid !== producerSocketId) return;
      socket.off("ms-consumed", onConsumed);

      const consumer = await recvTransport.current!.consume(consumerParams as any);
      consumersRef.current.set(sid, consumer);

      const stream = new MediaStream([consumer.track]);
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        updated.set(sid, stream);
        return updated;
      });

      setPeers((prev) => {
        if (prev.find((p) => p.socketId === sid)) return prev;
        return [...prev, { socketId: sid, userId: sid, name: "Peer", isMuted: false }];
      });
    };

    socket.on("ms-consumed", onConsumed);
  }, []);

  // ── Join channel ──────────────────────────────────────
  const joinChannel = useCallback(async (channelId: string) => {
    channelIdRef.current = channelId;

    // get mic access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    // connect socket
    const socket = io("/voice", {
      path:       "/voice/socket.io",
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("ms-join", { channelId, userId, name });
    });

    socket.on("disconnect", () => setIsConnected(false));

    // server sends router capabilities
    socket.on("ms-router-rtp-capabilities", async ({ rtpCapabilities }) => {
      // load device with router capabilities
      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
      rtpCapabilitiesRef.current = device.rtpCapabilities;

      // create both transports
      await createSendTransport(socket, channelId);
      await createRecvTransport(socket, channelId);

      // start producing audio
      const audioTrack = localStreamRef.current!.getAudioTracks()[0];
      const producer = await sendTransport.current!.produce({ track: audioTrack });
      producerRef.current = producer;

      // ask for existing producers
      socket.emit("ms-get-producers", { channelId });
    });

    // server tells us about existing producers
    socket.on("ms-existing-producers", async ({ producerSocketIds }: { producerSocketIds: string[] }) => {
      for (const sid of producerSocketIds) {
        await consumeProducer(socket, channelId, sid);
      }
    });

    // a new peer started producing
    socket.on("ms-new-producer", async ({ producerSocketId }: { producerSocketId: string }) => {
      await consumeProducer(socket, channelId, producerSocketId);
    });

    // a peer joined (UI update)
    socket.on("ms-user-joined", ({ socketId, userId: uid, name: n }: { socketId: string; userId: string; name: string }) => {
      setPeers((prev) => {
        if (prev.find((p) => p.socketId === socketId)) return prev;
        return [...prev, { socketId, userId: uid, name: n, isMuted: false }];
      });
    });

    // a peer left
    socket.on("ms-user-left", ({ socketId }: { socketId: string }) => {
      consumersRef.current.get(socketId)?.close();
      consumersRef.current.delete(socketId);
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        updated.delete(socketId);
        return updated;
      });
      setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    socket.on("ms-error", ({ message }: { message: string }) => {
      console.error("[mediasoup client]", message);
    });

  }, [userId, name, createSendTransport, createRecvTransport, consumeProducer]);

  // ── Leave channel ─────────────────────────────────────
  const leaveChannel = useCallback(() => {
    const channelId = channelIdRef.current;
    if (socketRef.current) {
      if (channelId) socketRef.current.emit("ms-leave", { channelId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    producerRef.current?.close();
    consumersRef.current.forEach((c) => c.close());
    consumersRef.current.clear();
    sendTransport.current?.close();
    recvTransport.current?.close();
    localStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    localStreamRef.current = null;
    deviceRef.current = null;
    setPeers([]);
    setRemoteStreams(new Map());
    setIsMuted(false);
    setIsConnected(false);
    channelIdRef.current = null;
  }, []);

  // ── Toggle mute ───────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      producerRef.current?.pause();
      setIsMuted(!track.enabled);
    }
  }, []);

  useEffect(() => {
    return () => { leaveChannel(); };
  }, [leaveChannel]);

  return {
    peers,
    remoteStreams,
    isMuted,
    isConnected,
    joinChannel,
    leaveChannel,
    toggleMute,
  };
};