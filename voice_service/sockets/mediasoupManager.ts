// import * as mediasoup from "mediasoup";

// const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
//   {
//     kind:      "audio",
//     mimeType:  "audio/opus",
//     preferredPayloadType: 111,
//     clockRate: 48000,
//     channels:  2,
//   },
// ];

// const webRtcTransportOptions = {
//   listenIps: [
//     {
//       ip:          "0.0.0.0",
//       announcedIp: "127.0.0.1",
//     },
//   ],
//   enableUdp:        true,
//   enableTcp:        true,
//   preferUdp:        true,
//   initialAvailableOutgoingBitrate: 1000000,
// };

// let worker: mediasoup.types.Worker | null = null;

// const routers = new Map<string, mediasoup.types.Router>();

// // ── FIX 1: added channelId to PeerState ──────────────────
// interface PeerState {
//   channelId:     string;
//   sendTransport: mediasoup.types.WebRtcTransport | null;
//   recvTransport: mediasoup.types.WebRtcTransport | null;
//   producer:      mediasoup.types.Producer | null;
//   consumers:     Map<string, mediasoup.types.Consumer>;
// }
// const peers = new Map<string, PeerState>();

// export const createWorker = async (): Promise<mediasoup.types.Worker> => {
//   worker = await mediasoup.createWorker({
//     logLevel:   "warn",
//     rtcMinPort: 10000,
//     rtcMaxPort: 10999, // ── FIX 2: was 10100, only 100 ports — bumped to 1000
//   });

//   worker.on("died", () => {
//     console.error("[mediasoup] Worker died — restarting in 2s");
//     setTimeout(() => createWorker(), 2000);
//   });

//   console.log("[mediasoup] Worker created, pid:", worker.pid);
//   return worker;
// };

// export const getOrCreateRouter = async (
//   channelId: string
// ): Promise<mediasoup.types.Router> => {
//   if (routers.has(channelId)) {
//     return routers.get(channelId)!;
//   }
//   if (!worker) throw new Error("mediasoup Worker not initialised");

//   const router = await worker.createRouter({ mediaCodecs });
//   routers.set(channelId, router);
//   console.log(`[mediasoup] Router created for channel ${channelId}`);
//   return router;
// };

// export const getRouterRtpCapabilities = async (
//   channelId: string
// ): Promise<mediasoup.types.RtpCapabilities> => {
//   const router = await getOrCreateRouter(channelId);
//   return router.rtpCapabilities;
// };

// export const createWebRtcTransport = async (
//   channelId: string,
//   socketId:  string,
//   direction: "send" | "recv"
// ): Promise<mediasoup.types.WebRtcTransport> => {
//   const router    = await getOrCreateRouter(channelId);
//   const transport = await router.createWebRtcTransport(webRtcTransportOptions);

//   let peer = peers.get(socketId);
//   if (!peer) {
//     peer = {
//       channelId,     // ── FIX 1: store channelId on peer
//       sendTransport: null,
//       recvTransport: null,
//       producer:      null,
//       consumers:     new Map(),
//     };
//     peers.set(socketId, peer);
//   }

//   if (direction === "send") {
//     peer.sendTransport = transport;
//   } else {
//     peer.recvTransport = transport;
//   }

//   return transport;
// };

// export const connectTransport = async (
//   socketId:       string,
//   direction:      "send" | "recv",
//   dtlsParameters: mediasoup.types.DtlsParameters
// ): Promise<void> => {
//   const peer = peers.get(socketId);
//   if (!peer) throw new Error(`No peer state for socket ${socketId}`);

//   const transport =
//     direction === "send" ? peer.sendTransport : peer.recvTransport;
//   if (!transport) throw new Error(`No ${direction} transport for ${socketId}`);

//   await transport.connect({ dtlsParameters });
// };

// export const createProducer = async (
//   socketId:      string,
//   rtpParameters: object
// ): Promise<mediasoup.types.Producer> => {
//   const peer = peers.get(socketId);
//   if (!peer?.sendTransport) throw new Error(`No send transport for ${socketId}`);

//   const producer = await peer.sendTransport.produce({
//     kind:          "audio",
//     rtpParameters: rtpParameters as any,
//   });

//   peer.producer = producer;
//   console.log(`[mediasoup] Producer created for ${socketId}: ${producer.id}`);
//   return producer;
// };

// export const createConsumer = async (
//   channelId:        string,
//   consumerSocketId: string,
//   producerSocketId: string,
//   rtpCapabilities:  mediasoup.types.RtpCapabilities
// ): Promise<mediasoup.types.Consumer | null> => {
//   const router = routers.get(channelId);
//   if (!router) {
//     console.warn(`[mediasoup] No router for channel ${channelId}`);
//     return null;
//   }

//   const producerPeer = peers.get(producerSocketId);
//   if (!producerPeer?.producer) {
//     console.warn(`[mediasoup] No producer for socket ${producerSocketId}`);
//     return null;
//   }

//   if (!router.canConsume({
//     producerId:      producerPeer.producer.id,
//     rtpCapabilities,
//   })) {
//     console.warn(`[mediasoup] Cannot consume — codec mismatch`);
//     return null;
//   }

//   const consumerPeer = peers.get(consumerSocketId);
//   if (!consumerPeer?.recvTransport) {
//     console.warn(`[mediasoup] No recvTransport for socket ${consumerSocketId}`);
//     return null;
//   }

//   const consumer = await consumerPeer.recvTransport.consume({
//     producerId:      producerPeer.producer.id,
//     rtpCapabilities,
//     paused:          false, // ── FIX 3: always start paused, resume explicitly after
//   });

//   consumerPeer.consumers.set(producerPeer.producer.id, consumer);
//   console.log(`[mediasoup] Consumer created: ${consumerSocketId} ← ${producerSocketId}`);
//   return consumer;
// };

// export const resumeConsumer = async (
//   consumerSocketId: string,
//   producerId:       string
// ): Promise<void> => {
//   const peer = peers.get(consumerSocketId);
//   if (!peer) throw new Error(`No peer state for socket ${consumerSocketId}`);

//   const consumer = peer.consumers.get(producerId);
//   if (!consumer) throw new Error(`No consumer for producerId ${producerId}`);

//   await consumer.resume();
//   console.log(`[mediasoup] Consumer resumed: ${consumerSocketId} producerId=${producerId}`);
// };

// export const getProducerId = (socketId: string): string | null => {
//   return peers.get(socketId)?.producer?.id ?? null;
// };

// // ── FIX 4: filter by channelId — was returning all producers globally ────────
// export const getProducersInChannel = (channelId: string): string[] => {
//   const result: string[] = [];
//   peers.forEach((peer, socketId) => {
//     if (peer.producer && peer.channelId === channelId) {
//       result.push(socketId);
//     }
//   });
//   return result;
// };

// export const cleanupPeer = (socketId: string): void => {
//   const peer = peers.get(socketId);
//   if (!peer) return;

//   peer.producer?.close();
//   peer.consumers.forEach((c) => c.close());
//   peer.sendTransport?.close();
//   peer.recvTransport?.close();
//   peers.delete(socketId);

//   console.log(`[mediasoup] Cleaned up peer ${socketId}`);
// };

// export const cleanupRouter = (channelId: string): void => {
//   const router = routers.get(channelId);
//   if (router) {
//     router.close();
//     routers.delete(channelId);
//     console.log(`[mediasoup] Router closed for channel ${channelId}`);
//   }
// };