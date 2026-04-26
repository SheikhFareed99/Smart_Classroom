// import { useState, useRef, useCallback, useEffect } from "react";
// import { io, type Socket } from "socket.io-client";
// import { Device } from "mediasoup-client";
// import type {
//   Transport,
//   Producer,
//   Consumer,
//   RtpCapabilities,
//   DtlsParameters,
//   RtpParameters,
// } from "mediasoup-client/types";
// import type { VoicePeer } from "../types/voice.types";

// export interface UseMediasoupOptions {
//   userId: string;
//   name:   string;
// }

// export interface UseMediasoupReturn {
//   peers:        VoicePeer[];
//   remoteStreams: Map<string, MediaStream>;
//   isMuted:      boolean;
//   isConnected:  boolean;
//   joinChannel:  (channelId: string) => Promise<void>;
//   leaveChannel: () => void;
//   toggleMute:   () => void;
// }

// export const useMediasoup = ({
//   userId,
//   name,
// }: UseMediasoupOptions): UseMediasoupReturn => {

//   const [peers,         setPeers]        = useState<VoicePeer[]>([]);
//   const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
//   const [isMuted,       setIsMuted]      = useState(false);
//   const [isConnected,   setIsConnected]  = useState(false);

//   const socketRef          = useRef<Socket | null>(null);
//   const deviceRef          = useRef<Device | null>(null);
//   const sendTransportRef   = useRef<Transport | null>(null);
//   const recvTransportRef   = useRef<Transport | null>(null);
//   const producerRef        = useRef<Producer | null>(null);
//   const consumersRef       = useRef<Map<string, Consumer>>(new Map());
//   const localStreamRef     = useRef<MediaStream | null>(null);
//   const channelIdRef       = useRef<string | null>(null);
//   const rtpCapabilitiesRef = useRef<RtpCapabilities | null>(null);
//   const consumingRef       = useRef<Set<string>>(new Set());

//   // ── Create send transport ──────────────────────────────
//   const createSendTransport = useCallback((socket: Socket, channelId: string) => {
//     return new Promise<void>((resolve, reject) => {
//       socket.emit("ms-create-transport", { channelId, direction: "send" });

//       const onCreated = ({ direction, transportOptions }: {
//         direction: "send" | "recv"; transportOptions: unknown;
//       }) => {
//         if (direction !== "send") return;
//         socket.off("ms-transport-created", onCreated);

//         if (!deviceRef.current) return reject(new Error("Device not ready"));

//         const transport = deviceRef.current.createSendTransport(transportOptions as any);
//         sendTransportRef.current = transport;

//         transport.on("connect", (
//           { dtlsParameters }: { dtlsParameters: DtlsParameters },
//           callback: () => void,
//           _errback: (e: Error) => void
//         ) => {
//           const onConnected = ({ direction: dir }: { direction: string }) => {
//             if (dir !== "send") return;
//             socket.off("ms-transport-connected", onConnected);
//             callback();
//           };
//           socket.on("ms-transport-connected", onConnected);
//           socket.emit("ms-connect-transport", { direction: "send", dtlsParameters });
//         });

//         transport.on("produce", (
//           { kind, rtpParameters }: { kind: string; rtpParameters: RtpParameters },
//           callback: (p: { id: string }) => void,
//           _errback: (e: Error) => void
//         ) => {
//           const onProduced = ({ producerId }: { producerId: string }) => {
//             socket.off("ms-produced", onProduced);
//             callback({ id: producerId });
//           };
//           socket.on("ms-produced", onProduced);
//           socket.emit("ms-produce", { channelId, kind, rtpParameters });
//         });

//         resolve();
//       };

//       socket.on("ms-transport-created", onCreated);
//     });
//   }, []);

//   // ── Create recv transport ──────────────────────────────
//   const createRecvTransport = useCallback((socket: Socket, channelId: string) => {
//     return new Promise<void>((resolve, reject) => {
//       socket.emit("ms-create-transport", { channelId, direction: "recv" });

//       const onCreated = ({ direction, transportOptions }: {
//         direction: "send" | "recv"; transportOptions: unknown;
//       }) => {
//         if (direction !== "recv") return;
//         socket.off("ms-transport-created", onCreated);

//         if (!deviceRef.current) return reject(new Error("Device not ready"));

//         const transport = deviceRef.current.createRecvTransport(transportOptions as any);
//         recvTransportRef.current = transport;

//         transport.on("connect", (
//           { dtlsParameters }: { dtlsParameters: DtlsParameters },
//           callback: () => void,
//           _errback: (e: Error) => void
//         ) => {
//           const onConnected = ({ direction: dir }: { direction: string }) => {
//             if (dir !== "recv") return;
//             socket.off("ms-transport-connected", onConnected);
//             callback();
//           };
//           socket.on("ms-transport-connected", onConnected);
//           socket.emit("ms-connect-transport", { direction: "recv", dtlsParameters });
//         });

//         resolve();
//       };

//       socket.on("ms-transport-created", onCreated);
//     });
//   }, []);

//   // ── Consume a remote producer ──────────────────────────
//   // FIX: use socket.once() instead of socket.on() for ms-consumed
//   // to prevent stale listeners from intercepting future consume events.
//   // Also filter by producerSocketId so crossed responses never misfire.
//   const consumeProducer = useCallback(async (
//     socket: Socket,
//     channelId: string,
//     producerSocketId: string
//   ) => {
//     if (consumingRef.current.has(producerSocketId)) {
//       console.log("[mediasoup] already consuming", producerSocketId, "— skipping");
//       return;
//     }
//     if (!recvTransportRef.current || !rtpCapabilitiesRef.current) {
//       console.warn("[mediasoup] consumeProducer called before transport/device ready");
//       return;
//     }

//     consumingRef.current.add(producerSocketId);
//     console.log("[mediasoup] requesting consume for", producerSocketId);

//     return new Promise<void>((resolve) => {
//       // ── KEY FIX: use a named handler so we can remove it precisely.
//       // socket.on("ms-consumed") was accumulating one listener per peer,
//       // causing old handlers to fire for new peers' responses.
//       const onConsumed = async ({
//         producerSocketId: sid,
//         consumerParams,
//       }: {
//         producerSocketId: string;
//         consumerParams: unknown;
//       }) => {
//         // Ignore responses meant for other peers
//         if (sid !== producerSocketId) return;

//         // Remove this listener immediately — we got our response
//         socket.off("ms-consumed", onConsumed);

//         try {
//           const consumer = await recvTransportRef.current!.consume(consumerParams as any);
//           consumersRef.current.set(sid, consumer);

//           // Resume client-side first
//           //await consumer.resume();

//           // Then tell server to resume its side
//           socket.emit("ms-resume-consumer", { producerSocketId: sid });

//           const stream = new MediaStream([consumer.track]);
//           console.log("[audio] stream for", sid, "tracks:", stream.getTracks().length);

//           setRemoteStreams((prev) => {
//             const updated = new Map(prev);
//             updated.set(sid, stream);
//             return updated;
//           });

//           setPeers((prev) => {
//             if (prev.find((p) => p.socketId === sid)) return prev;
//             return [...prev, { socketId: sid, userId: sid, name: "Peer", isMuted: false }];
//           });

//           resolve();
//         } catch (err) {
//           console.error("[mediasoup] consume error:", err);
//           consumingRef.current.delete(producerSocketId);
//           resolve();
//         }
//       };

//       socket.on("ms-consumed", onConsumed);

//       socket.emit("ms-consume", {
//         channelId,
//         producerSocketId,
//         rtpCapabilities: rtpCapabilitiesRef.current,
//       });
//     });
//   }, []);

//   // ── Join channel ───────────────────────────────────────
//   const joinChannel = useCallback(async (channelId: string) => {
//     channelIdRef.current = channelId;

//     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//     localStreamRef.current = stream;

//     const socket = io("http://localhost:4001", {
//       transports: ["websocket"],
//     });
//     socketRef.current = socket;

//     socket.on("connect", () => {
//       setIsConnected(true);
//       socket.emit("ms-join", { channelId, userId, name });
//     });

//     socket.on("disconnect", () => setIsConnected(false));

//     socket.on("ms-router-rtp-capabilities", async ({ rtpCapabilities }) => {
//       try {
//         const device = new Device();
//         await device.load({ routerRtpCapabilities: rtpCapabilities });
//         deviceRef.current = device;
//         rtpCapabilitiesRef.current = device.rtpCapabilities;

//         await createSendTransport(socket, channelId);
//         await createRecvTransport(socket, channelId);

//         // Produce audio — this triggers the transport "connect" event
//         // which fires ms-connect-transport for the send transport.
//         // The recv transport only connects lazily on first consume().
//         const audioTrack = localStreamRef.current!.getAudioTracks()[0];
//         const producer = await sendTransportRef.current!.produce({ track: audioTrack });
//         producerRef.current = producer;
//         console.log("[mediasoup] local producer ready:", producer.id);

//         // Now safe to ask for existing producers — our producer is live
//         socket.emit("ms-get-producers", { channelId });

//       } catch (err) {
//         console.error("[mediasoup] setup error:", err);
//       }
//     });

//     socket.on("ms-existing-producers", async ({ producerSocketIds }: {
//       producerSocketIds: string[];
//     }) => {
//       console.log("[mediasoup] existing producers:", producerSocketIds);
//       for (const sid of producerSocketIds) {
//         await consumeProducer(socket, channelId, sid);
//       }
//     });

//     socket.on("ms-new-producer", async ({ producerSocketId }: {
//       producerSocketId: string;
//     }) => {
//       console.log("[mediasoup] new producer announced:", producerSocketId);
//       await consumeProducer(socket, channelId, producerSocketId);
//     });

//     socket.on("ms-user-joined", ({ socketId, userId: uid, name: n }: {
//       socketId: string; userId: string; name: string;
//     }) => {
//       setPeers((prev) => {
//         const existing = prev.find((p) => p.socketId === socketId);
//         if (existing) {
//           return prev.map((p) =>
//             p.socketId === socketId ? { ...p, name: n, userId: uid } : p
//           );
//         }
//         return [...prev, { socketId, userId: uid, name: n, isMuted: false }];
//       });
//     });

//     socket.on("ms-user-left", ({ socketId }: { socketId: string }) => {
//       consumersRef.current.get(socketId)?.close();
//       consumersRef.current.delete(socketId);
//       consumingRef.current.delete(socketId);
//       setRemoteStreams((prev) => {
//         const updated = new Map(prev);
//         updated.delete(socketId);
//         return updated;
//       });
//       setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
//     });

//     socket.on("ms-error", ({ message }: { message: string }) => {
//       console.error("[mediasoup client] error:", message);
//     });

//   }, [userId, name, createSendTransport, createRecvTransport, consumeProducer]);

//   // ── Leave channel ──────────────────────────────────────
//   const leaveChannel = useCallback(() => {
//     const channelId = channelIdRef.current;
//     if (socketRef.current) {
//       if (channelId) socketRef.current.emit("ms-leave", { channelId });
//       socketRef.current.disconnect();
//       socketRef.current = null;
//     }
//     producerRef.current?.close();
//     consumersRef.current.forEach((c) => c.close());
//     consumersRef.current.clear();
//     consumingRef.current.clear();
//     sendTransportRef.current?.close();
//     recvTransportRef.current?.close();
//     localStreamRef.current?.getTracks().forEach((t) => t.stop());
//     localStreamRef.current   = null;
//     deviceRef.current        = null;
//     sendTransportRef.current = null;
//     recvTransportRef.current = null;
//     producerRef.current      = null;
//     rtpCapabilitiesRef.current = null;
//     setPeers([]);
//     setRemoteStreams(new Map());
//     setIsMuted(false);
//     setIsConnected(false);
//     channelIdRef.current = null;
//   }, []);

//   // ── Toggle mute ────────────────────────────────────────
//   const toggleMute = useCallback(() => {
//     if (!localStreamRef.current) return;
//     const track = localStreamRef.current.getAudioTracks()[0];
//     if (!track) return;

//     const newMutedState = track.enabled; // true = unmuted = about to mute
//     track.enabled = !track.enabled;

//     if (newMutedState) {
//       producerRef.current?.pause();
//     } else {
//       producerRef.current?.resume();
//     }

//     setIsMuted(newMutedState);
//   }, []);

//   useEffect(() => {
//     return () => { leaveChannel(); };
//   }, [leaveChannel]);

//   return { peers, remoteStreams, isMuted, isConnected, joinChannel, leaveChannel, toggleMute };
// };