import * as mediasoup from "mediasoup";

// ── Media codecs we support ───────────────────────────────
// Opus is the standard for WebRTC audio — high quality, low latency
const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
  {
    kind:      "audio",
    mimeType:  "audio/opus",
    preferredPayloadType: 111,
    clockRate: 48000,
    channels:  2,
  },
];

// ── WebRTC transport options ──────────────────────────────
const webRtcTransportOptions = {
  listenIps: [
    {
      ip:          "0.0.0.0",
      announcedIp: "127.0.0.1", // change to public IP in production
    },
  ],
  enableUdp:        true,
  enableTcp:        true,
  preferUdp:        true,
  initialAvailableOutgoingBitrate: 1000000,
};

// ── In-memory state ───────────────────────────────────────
let worker: mediasoup.types.Worker | null = null;

// channelId → Router
const routers = new Map<string, mediasoup.types.Router>();

// socketId → { sendTransport, recvTransport, producer, consumers[] }
interface PeerState {
  sendTransport: mediasoup.types.WebRtcTransport | null;
  recvTransport: mediasoup.types.WebRtcTransport | null;
  producer:      mediasoup.types.Producer | null;
  consumers:     Map<string, mediasoup.types.Consumer>; // producerId → Consumer
}
const peers = new Map<string, PeerState>();

// ── Create mediasoup Worker on server start ───────────────
export const createWorker = async (): Promise<mediasoup.types.Worker> => {
  worker = await mediasoup.createWorker({
    logLevel: "warn",
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  worker.on("died", () => {
    console.error("[mediasoup] Worker died — restarting in 2s");
    setTimeout(() => createWorker(), 2000);
  });

  console.log("[mediasoup] Worker created, pid:", worker.pid);
  return worker;
};

// ── Get or create a Router for a channel ─────────────────
export const getOrCreateRouter = async (
  channelId: string
): Promise<mediasoup.types.Router> => {
  if (routers.has(channelId)) {
    return routers.get(channelId)!;
  }

  if (!worker) throw new Error("mediasoup Worker not initialised");

  const router = await worker.createRouter({ mediaCodecs });
  routers.set(channelId, router);
  console.log(`[mediasoup] Router created for channel ${channelId}`);
  return router;
};

// ── Get router RTP capabilities for a channel ─────────────
export const getRouterRtpCapabilities = async (
  channelId: string
): Promise<mediasoup.types.RtpCapabilities> => {
  const router = await getOrCreateRouter(channelId);
  return router.rtpCapabilities;
};

// ── Create a WebRTC transport (send or receive) ───────────
export const createWebRtcTransport = async (
  channelId: string,
  socketId:  string,
  direction: "send" | "recv"
): Promise<mediasoup.types.WebRtcTransport> => {
  const router = await getOrCreateRouter(channelId);
  const transport = await router.createWebRtcTransport(webRtcTransportOptions);

  // store in peer state
  let peer = peers.get(socketId);
  if (!peer) {
    peer = {
      sendTransport: null,
      recvTransport: null,
      producer:      null,
      consumers:     new Map(),
    };
    peers.set(socketId, peer);
  }

  if (direction === "send") {
    peer.sendTransport = transport;
  } else {
    peer.recvTransport = transport;
  }

  return transport;
};

// ── Connect a transport (called after client connects) ────
export const connectTransport = async (
  socketId:    string,
  direction:   "send" | "recv",
  dtlsParameters: mediasoup.types.DtlsParameters
): Promise<void> => {
  const peer = peers.get(socketId);
  if (!peer) throw new Error(`No peer state for socket ${socketId}`);

  const transport =
    direction === "send" ? peer.sendTransport : peer.recvTransport;
  if (!transport) throw new Error(`No ${direction} transport for ${socketId}`);

  await transport.connect({ dtlsParameters });
};

// ── Create a producer (peer starts sending audio) ─────────
export const createProducer = async (
  socketId:      string,
  rtpParameters: object
): Promise<mediasoup.types.Producer> => {
  const peer = peers.get(socketId);
  if (!peer?.sendTransport) throw new Error(`No send transport for ${socketId}`);

  const producer = await peer.sendTransport.produce({
    kind:          "audio",
    rtpParameters: rtpParameters as any,
  });

  peer.producer = producer;
  console.log(`[mediasoup] Producer created for ${socketId}: ${producer.id}`);
  return producer;
};

// ── Create a consumer (peer starts receiving someone's audio)
export const createConsumer = async (
  channelId:          string,
  consumerSocketId:   string,  // who is consuming
  producerSocketId:   string,  // whose audio
  rtpCapabilities:    mediasoup.types.RtpCapabilities
): Promise<mediasoup.types.Consumer | null> => {
  const router = routers.get(channelId);
  if (!router) return null;

  const producerPeer = peers.get(producerSocketId);
  if (!producerPeer?.producer) return null;

  // check if the consumer can receive this producer's codec
  if (!router.canConsume({
    producerId:      producerPeer.producer.id,
    rtpCapabilities,
  })) {
    console.warn(`[mediasoup] Cannot consume — codec mismatch`);
    return null;
  }

  const consumerPeer = peers.get(consumerSocketId);
  if (!consumerPeer?.recvTransport) return null;

  const consumer = await consumerPeer.recvTransport.consume({
    producerId:      producerPeer.producer.id,
    rtpCapabilities,
    paused:          false,
  });

  consumerPeer.consumers.set(producerPeer.producer.id, consumer);
  console.log(`[mediasoup] Consumer created: ${consumerSocketId} ← ${producerSocketId}`);
  return consumer;
};

// ── Get producer ID for a socket ─────────────────────────
export const getProducerId = (socketId: string): string | null => {
  return peers.get(socketId)?.producer?.id ?? null;
};

// ── Get all producer socket IDs in a channel ─────────────
export const getProducersInChannel = (channelId: string): string[] => {
  const result: string[] = [];
  peers.forEach((peer, socketId) => {
    if (peer.producer) result.push(socketId);
  });
  return result;
};

// ── Cleanup when a peer disconnects ──────────────────────
export const cleanupPeer = (socketId: string): void => {
  const peer = peers.get(socketId);
  if (!peer) return;

  peer.producer?.close();
  peer.consumers.forEach((c) => c.close());
  peer.sendTransport?.close();
  peer.recvTransport?.close();
  peers.delete(socketId);

  console.log(`[mediasoup] Cleaned up peer ${socketId}`);
};

// ── Cleanup router when channel is empty ─────────────────
export const cleanupRouter = (channelId: string): void => {
  const router = routers.get(channelId);
  if (router) {
    router.close();
    routers.delete(channelId);
    console.log(`[mediasoup] Router closed for channel ${channelId}`);
  }
};