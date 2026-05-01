import { useState, useRef, useCallback, useEffect } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Track,
} from "livekit-client";
import type { VoicePeer, VoiceRole } from "../types/voice.types";

export interface UseLiveKitOptions {
  userId: string;
  name:   string;
  role:   VoiceRole;
}

export interface UseLiveKitReturn {
  peers:            VoicePeer[];
  isMuted:          boolean;
  isDeafened:       boolean;
  isConnected:      boolean;
  joinChannel:      (channelId: string) => Promise<void>;
  leaveChannel:     () => void;
  toggleMute:       () => void;
  toggleDeafen:     () => void;
  muteParticipant:  (identity: string) => Promise<void>;
  unmuteParticipant:(identity: string) => Promise<void>;
  muteAll:          () => Promise<void>;
  kickParticipant:  (identity: string) => Promise<void>;
}

const LIVEKIT_URL =
  import.meta.env.VITE_LIVEKIT_URL || "wss://smart-classroom-x64i9653.livekit.cloud";

export const useLiveKit = ({ userId, name, role }: UseLiveKitOptions): UseLiveKitReturn => {
  const [peers,       setPeers]       = useState<VoicePeer[]>([]);
  const [isMuted,     setIsMuted]     = useState(false);
  const [isDeafened,  setIsDeafened]  = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const roomRef       = useRef<Room | null>(null);
  const channelIdRef  = useRef<string | null>(null);

  // ── Token fetch ────────────────────────────────────────────────────────────
  const fetchToken = useCallback(async (channelId: string): Promise<string> => {
    const res = await fetch("/voice/api/livekit/token", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName:        channelId,
        participantName: name,
        participantId:   userId,
        role,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch LiveKit token");
    }
    const data = await res.json();
    return data.token;
  }, [userId, name, role]);

  // ── Derive peers list from room state ──────────────────────────────────────
  const updatePeers = useCallback((room: Room) => {
    const list: VoicePeer[] = [];
    room.remoteParticipants.forEach((p) => {
      list.push({
        socketId: p.identity,
        userId:   p.identity,
        name:     p.name || p.identity,
        // ✅ correctly read mute state: enabled=true means NOT muted
        isMuted:  !p.isMicrophoneEnabled,
      });
    });
    setPeers(list);
  }, []);

  // ── Audio track subscription ───────────────────────────────────────────────
  const handleTrackSubscribed = useCallback((
    track:       RemoteTrack,
    _pub:        RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    if (track.kind !== Track.Kind.Audio) return;

    // Remove any stale element for this participant first
    document.getElementById(`lk-audio-${participant.identity}`)?.remove();

    const audio = document.createElement("audio");
    audio.id       = `lk-audio-${participant.identity}`;
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    document.body.appendChild(audio);
    track.attach(audio);

    audio.play().catch(() => {
      // Autoplay blocked — show one-time unblock button
      if (document.getElementById("voice-unblock-btn")) return;
      const btn = document.createElement("button");
      btn.id          = "voice-unblock-btn";
      btn.textContent = "🔊 Click to enable audio";
      btn.style.cssText =
        "position:fixed;top:16px;left:50%;transform:translateX(-50%);" +
        "padding:10px 20px;background:#2563eb;color:white;border:none;" +
        "border-radius:8px;font-size:14px;cursor:pointer;z-index:9999;";
      btn.onclick = () => {
        document.querySelectorAll<HTMLAudioElement>("audio")
          .forEach((a) => a.play().catch(() => {}));
        btn.remove();
      };
      document.body.appendChild(btn);
    });

    console.log(`[livekit] 🔊 subscribed to audio from ${participant.identity}`);
  }, []);

  const handleTrackUnsubscribed = useCallback((
    track:       RemoteTrack,
    _pub:        RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    track.detach();
    document.getElementById(`lk-audio-${participant.identity}`)?.remove();
    console.log(`[livekit] 🔇 unsubscribed from ${participant.identity}`);
  }, []);

  // ── Join ───────────────────────────────────────────────────────────────────
  const joinChannel = useCallback(async (channelId: string) => {
    if (roomRef.current) {
      console.warn("[livekit] already in a room, leaving first");
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    channelIdRef.current = channelId;

    let token: string;
    try {
      token = await fetchToken(channelId);
    } catch (err) {
      console.error("[livekit] token fetch failed:", err);
      return;
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast:       true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl:  true,
      },
    });

    roomRef.current = room;

    room
      .on(RoomEvent.Connected, () => {
        setIsConnected(true);
        updatePeers(room);
        console.log(`[livekit] ✅ connected to room: ${channelId}`);
      })
      .on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setPeers([]);
        console.log("[livekit] disconnected");
      })
      .on(RoomEvent.ParticipantConnected, (p) => {
        console.log(`[livekit] participant joined: ${p.identity}`);
        updatePeers(room);
      })
      .on(RoomEvent.ParticipantDisconnected, (p) => {
        console.log(`[livekit] participant left: ${p.identity}`);
        document.getElementById(`lk-audio-${p.identity}`)?.remove();
        updatePeers(room);
      })
      .on(RoomEvent.TrackSubscribed,   handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.LocalTrackPublished, () => {
        console.log("[livekit] local track published ✅");
        updatePeers(room);
      })
      .on(RoomEvent.TrackMuted,   () => updatePeers(room))
      .on(RoomEvent.TrackUnmuted, () => updatePeers(room))
      // ✅ catch publish failures explicitly
      .on(RoomEvent.LocalTrackUnpublished, (pub) => {
        console.warn("[livekit] local track unpublished:", pub.trackSid);
      });

    try {
      // ✅ Pass mic as a connect option — this is the correct LiveKit pattern
      // for ensuring mic is ready at the moment the server registers you
      await room.connect(LIVEKIT_URL, token, {
        autoSubscribe: true,
      });
    } catch (err) {
      console.error("[livekit] connection failed:", err);
      roomRef.current = null;
      return;
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (!micPub || !micPub.track) {
      console.log("[livekit] mic not published yet, enabling now...");
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log("[livekit] 🎤 microphone enabled after connect");
      } catch (err) {
        console.error("[livekit] mic enable failed after connect:", err);
      }
    } else {
      console.log("[livekit] 🎤 mic already published, skipping re-enable");
    }

  }, [fetchToken, handleTrackSubscribed, handleTrackUnsubscribed, updatePeers]);

  // ── Leave ──────────────────────────────────────────────────────────────────
  const leaveChannel = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    channelIdRef.current = null;

    document.querySelectorAll("[id^='lk-audio-']").forEach((el) => el.remove());
    document.getElementById("voice-unblock-btn")?.remove();

    setPeers([]);
    setIsMuted(false);
    setIsDeafened(false);
    setIsConnected(false);
  }, []);

  // ── Toggle mute ────────────────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const newMuted = !isMuted;
    try {
      // ✅ setMicrophoneEnabled(false) = muted, (true) = unmuted
      await room.localParticipant.setMicrophoneEnabled(!newMuted);
      setIsMuted(newMuted);
      console.log(`[livekit] mic ${newMuted ? "muted 🔇" : "unmuted 🎤"}`);
    } catch (err) {
      console.error("[livekit] toggleMute failed:", err);
    }
  }, [isMuted]);

  // ── Toggle deafen ──────────────────────────────────────────────────────────
  // Deafen blocks all incoming audio by muting all remote audio elements.
  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);

    // Mute/unmute all remote audio elements
    document.querySelectorAll<HTMLAudioElement>("[id^='lk-audio-']").forEach((audio) => {
      audio.muted = newDeafened;
    });

    console.log(`[livekit] ${newDeafened ? "deafened 🔇" : "undeafened 🔊"}`);
  }, [isDeafened]);

  // ── Moderation: Mute a specific participant (teacher only) ─────────────────
  const muteParticipant = useCallback(async (identity: string) => {
    const channelId = channelIdRef.current;
    if (!channelId) return;

    try {
      const res = await fetch("/voice/api/moderation/mute", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: channelId, participantIdentity: identity }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to mute participant");
      }
      console.log(`[moderation] muted ${identity}`);
    } catch (err) {
      console.error("[moderation] mute failed:", err);
    }
  }, []);

  // ── Moderation: Unmute a specific participant (teacher only) ────────────────
  const unmuteParticipant = useCallback(async (identity: string) => {
    const channelId = channelIdRef.current;
    if (!channelId) return;

    try {
      const res = await fetch("/voice/api/moderation/unmute", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: channelId, participantIdentity: identity }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to unmute participant");
      }
      console.log(`[moderation] unmuted ${identity}`);
    } catch (err) {
      console.error("[moderation] unmute failed:", err);
    }
  }, []);

  // ── Moderation: Mute all participants (teacher only) ───────────────────────
  const muteAll = useCallback(async () => {
    const channelId = channelIdRef.current;
    const room = roomRef.current;
    if (!channelId || !room) return;

    try {
      const res = await fetch("/voice/api/moderation/mute-all", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName:        channelId,
          excludeIdentity: room.localParticipant.identity,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to mute all");
      }
      console.log("[moderation] muted all participants");
    } catch (err) {
      console.error("[moderation] mute-all failed:", err);
    }
  }, []);

  // ── Moderation: Kick a specific participant (teacher only) ─────────────────
  const kickParticipant = useCallback(async (identity: string) => {
    const channelId = channelIdRef.current;
    if (!channelId) return;

    try {
      const res = await fetch("/voice/api/moderation/kick", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: channelId, participantIdentity: identity }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to kick participant");
      }
      console.log(`[moderation] kicked ${identity}`);
    } catch (err) {
      console.error("[moderation] kick failed:", err);
    }
  }, []);

  useEffect(() => {
    return () => { leaveChannel(); };
  }, [leaveChannel]);

  return {
    peers,
    isMuted,
    isDeafened,
    isConnected,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    muteParticipant,
    unmuteParticipant,
    muteAll,
    kickParticipant,
  };
};