import { useState, useRef, useCallback, useEffect } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Track,
} from "livekit-client";
import type { VoicePeer } from "../types/voice.types";

export interface UseLiveKitOptions {
  userId:   string;
  name:     string;
}

export interface UseLiveKitReturn {
  peers:        VoicePeer[];
  isMuted:      boolean;
  isConnected:  boolean;
  joinChannel:  (channelId: string) => Promise<void>;
  leaveChannel: () => void;
  toggleMute:   () => void;
}

export const useLiveKit = ({ userId, name }: UseLiveKitOptions): UseLiveKitReturn => {

  const [peers,        setPeers]       = useState<VoicePeer[]>([]);
  const [isMuted,      setIsMuted]     = useState(false);
  const [isConnected,  setIsConnected] = useState(false);

  const roomRef       = useRef<Room | null>(null);
  const channelIdRef  = useRef<string | null>(null);

  // ── Fetch token from voice_service ───────────────────────
  const fetchToken = async (channelId: string): Promise<string> => {
    const res = await fetch("/voice/api/livekit/token", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName:        channelId,
        participantName: name,
        participantId:   userId,
      }),
    });
    if (!res.ok) throw new Error("Failed to fetch LiveKit token");
    const data = await res.json();
    return data.token;
  };

  // ── Handle remote participant audio ──────────────────────
  const handleTrackSubscribed = useCallback((
    track:        RemoteTrack,
    _publication: RemoteTrackPublication,
    participant:  RemoteParticipant
  ) => {
    if (track.kind !== Track.Kind.Audio) return;

    // LiveKit handles audio attachment automatically
    // We just need to attach the track to an audio element
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    track.attach(audio);
    document.body.appendChild(audio);
    audio.id = `lk-audio-${participant.identity}`;

    audio.play().catch(() => {
      const existing = document.getElementById("voice-unblock-btn");
      if (existing) return;
      const btn = document.createElement("button");
      btn.id = "voice-unblock-btn";
      btn.textContent = "🔊 Click to enable audio";
      btn.style.cssText = [
        "position:fixed", "top:16px", "left:50%",
        "transform:translateX(-50%)",
        "padding:10px 20px", "background:#2563eb",
        "color:white", "border:none", "border-radius:8px",
        "font-size:14px", "cursor:pointer", "z-index:9999",
      ].join(";");
      btn.onclick = () => {
        document.querySelectorAll("audio").forEach((a) => a.play().catch(() => {}));
        btn.remove();
      };
      document.body.appendChild(btn);
    });

    console.log(`[livekit] subscribed to audio from ${participant.identity}`);
  }, []);

  const handleTrackUnsubscribed = useCallback((
    track:       RemoteTrack,
    _pub:        RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    track.detach();
    const audio = document.getElementById(`lk-audio-${participant.identity}`);
    if (audio) audio.remove();
  }, []);

  const updatePeers = useCallback((room: Room) => {
    const remotePeers: VoicePeer[] = [];
    room.remoteParticipants.forEach((participant) => {
      remotePeers.push({
        socketId: participant.identity,
        userId:   participant.identity,
        name:     participant.name || participant.identity,
        isMuted:  participant.isMicrophoneEnabled === false,
      });
    });
    setPeers(remotePeers);
  }, []);

  // ── Join channel ──────────────────────────────────────────
  const joinChannel = useCallback(async (channelId: string) => {
    channelIdRef.current = channelId;

    const token = await fetchToken(channelId);

    const room = new Room({
      adaptiveStream:    true,
      dynacast:          true,
      audioCaptureDefaults: {
        echoCancellation:   true,
        noiseSuppression:   true,
        autoGainControl:    true,
      },
    });

    roomRef.current = room;

    // ── Room event handlers ───────────────────────────────
    room
      .on(RoomEvent.Connected, () => {
        setIsConnected(true);
        updatePeers(room);
        console.log("[livekit] connected to room:", channelId);
      })
      .on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setPeers([]);
        console.log("[livekit] disconnected from room");
      })
      .on(RoomEvent.ParticipantConnected, () => updatePeers(room))
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        const audio = document.getElementById(`lk-audio-${participant.identity}`);
        if (audio) audio.remove();
        updatePeers(room);
      })
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.LocalTrackPublished, () => updatePeers(room))
      .on(RoomEvent.TrackMuted, () => updatePeers(room))
      .on(RoomEvent.TrackUnmuted, () => updatePeers(room));

    // connect to LiveKit cloud
    await room.connect(
      import.meta.env.VITE_LIVEKIT_URL || "wss://smart-classroom-x64i9653.livekit.cloud",
      token
    );

    // publish local audio
    await room.localParticipant.setMicrophoneEnabled(true);

  }, [userId, name, handleTrackSubscribed, handleTrackUnsubscribed, updatePeers]);

  // ── Leave channel ─────────────────────────────────────────
  const leaveChannel = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;

    // clean up all audio elements
    document.querySelectorAll("[id^='lk-audio-']").forEach((el) => el.remove());
    document.getElementById("voice-unblock-btn")?.remove();

    setPeers([]);
    setIsMuted(false);
    setIsConnected(false);
    channelIdRef.current = null;
  }, []);

  // ── Toggle mute ───────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const newMuted = !isMuted;
    room.localParticipant.setMicrophoneEnabled(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  useEffect(() => {
    return () => { leaveChannel(); };
  }, [leaveChannel]);

  return { peers, isMuted, isConnected, joinChannel, leaveChannel, toggleMute };
};