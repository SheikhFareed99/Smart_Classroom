import { useState, useRef, useCallback, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import type { VoicePeer, IceConfig, UseWebRTCReturn } from "../types/voice.types";

export interface UseWebRTCOptions {
  userId: string;
  name:   string;
}

export const useWebRTC = ({ userId, name }: UseWebRTCOptions): UseWebRTCReturn => {

  const [localStream,   setLocalStream]   = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams]  = useState<Map<string, MediaStream>>(new Map());
  const [peers,         setPeers]         = useState<VoicePeer[]>([]);
  const [isMuted,       setIsMuted]       = useState<boolean>(false);
  const [isConnected,   setIsConnected]   = useState<boolean>(false);

  const socketRef      = useRef<Socket | null>(null);
  const peerConnsRef   = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceConfigRef   = useRef<IceConfig | null>(null);
  const channelIdRef   = useRef<string | null>(null);

  const upsertPeer = useCallback((peer: VoicePeer) => {
    setPeers((prev) => {
      const filtered = prev.filter((p) => p.socketId !== peer.socketId);
      return [...filtered, { ...peer, isMuted: false }];
    });
  }, []);

  const fetchIceConfig = async (): Promise<IceConfig> => {
    if (iceConfigRef.current) return iceConfigRef.current;
    const res = await fetch("/voice/api/ice-config");
    const config: IceConfig = await res.json();
    iceConfigRef.current = config;
    return config;
  };

  const createPeerConnection = useCallback(
    (targetSocketId: string): RTCPeerConnection => {
      const iceConfig = iceConfigRef.current || {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      };

      const pc = new RTCPeerConnection(iceConfig);

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(targetSocketId, remoteStream);
          return updated;
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", {
            targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      peerConnsRef.current.set(targetSocketId, pc);
      return pc;
    },
    []
  );

  const closePeerConnection = useCallback((targetSocketId: string) => {
    const pc = peerConnsRef.current.get(targetSocketId);
    if (pc) {
      pc.close();
      peerConnsRef.current.delete(targetSocketId);
    }
    setRemoteStreams((prev) => {
      const updated = new Map(prev);
      updated.delete(targetSocketId);
      return updated;
    });
    setPeers((prev) => prev.filter((p) => p.socketId !== targetSocketId));
  }, []);

  const joinChannel = useCallback(async (channelId: string) => {
    channelIdRef.current = channelId;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    setLocalStream(stream);

    await fetchIceConfig();

const socket = io("http://localhost:5173", {
  path:            "/voice/socket.io",
  transports:      ["websocket"],
  withCredentials: true,
});
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-channel", { channelId, userId, name });
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("existing-users", async (users: VoicePeer[]) => {
      for (const user of users) {
        if (!user.socketId) continue;
        if (user.userId === userId || user.socketId === socket.id) continue;

        upsertPeer(user);

        const pc = createPeerConnection(user.socketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { targetSocketId: user.socketId, sdp: offer });
      }
    });

    socket.on("user-joined", (user: VoicePeer) => {
      if (!user.socketId) return;
      if (user.userId === userId || user.socketId === socket.id) return;

      upsertPeer(user);
      createPeerConnection(user.socketId);
    });

    socket.on("offer", async ({ sdp, senderSocketId }: { sdp: RTCSessionDescriptionInit; senderSocketId: string }) => {
      let pc = peerConnsRef.current.get(senderSocketId);
      if (!pc) pc = createPeerConnection(senderSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { targetSocketId: senderSocketId, sdp: answer });
    });

    socket.on("answer", async ({ sdp, senderSocketId }: { sdp: RTCSessionDescriptionInit; senderSocketId: string }) => {
      const pc = peerConnsRef.current.get(senderSocketId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice-candidate", async ({ candidate, senderSocketId }: { candidate: RTCIceCandidateInit; senderSocketId: string }) => {
      const pc = peerConnsRef.current.get(senderSocketId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("user-left", ({ socketId }: { socketId: string }) => {
      closePeerConnection(socketId);
    });

  }, [userId, name, createPeerConnection, closePeerConnection, upsertPeer]);

  const leaveChannel = useCallback(() => {
    const channelId = channelIdRef.current;
    if (socketRef.current) {
      if (channelId) socketRef.current.emit("leave-channel", { channelId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    peerConnsRef.current.forEach((pc) => pc.close());
    peerConnsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
    setPeers([]);
    setIsMuted(false);
    setIsConnected(false);
    channelIdRef.current = null;
  }, []);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  useEffect(() => {
    return () => { leaveChannel(); };
  }, [leaveChannel]);

  return {
    localStream,
    remoteStreams,
    peers,
    isMuted,
    isConnected,
    joinChannel,
    leaveChannel,
    toggleMute,
  };
};