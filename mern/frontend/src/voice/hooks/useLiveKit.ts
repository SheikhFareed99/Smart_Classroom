import { useState, useRef, useCallback, useEffect } from "react";
import {
  Room,
  RoomEvent,
  DisconnectReason,
  LocalAudioTrack,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Track,
} from "livekit-client";
import type { VoicePeer, VoiceRole } from "../types/voice.types";

export interface UseLiveKitOptions {
  userId:               string;
  name:                 string;
  role:                 VoiceRole;
  onForceDisconnected?: () => void;  // called when the room is deleted
  onKicked?:            () => void;  // called when this participant is kicked
  onTeacherMuted?:      () => void;  // called when teacher mutes this student
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

export const useLiveKit = ({ userId, name, role, onForceDisconnected, onKicked, onTeacherMuted }: UseLiveKitOptions): UseLiveKitReturn => {
  const [peers,       setPeers]       = useState<VoicePeer[]>([]);
  const [isMuted,     setIsMuted]     = useState(false);
  const [isDeafened,  setIsDeafened]  = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const roomRef         = useRef<Room | null>(null);
  const channelIdRef    = useRef<string | null>(null);
  const micPublishedRef = useRef<boolean>(false);
  // Set to true while WE are initiating a mute so TrackMuted can tell the
  // difference between a self-mute and a teacher-initiated server mute.
  const selfMutingRef   = useRef<boolean>(false);

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
      // Read isMuted from the actual mic track publication.
      // !isMicrophoneEnabled is WRONG here — it returns false before the track
      // finishes publishing, making every new peer appear muted on join.
      const micPub = p.getTrackPublication(Track.Source.Microphone);
      list.push({
        socketId: p.identity,
        userId:   p.identity,
        name:     p.name || p.identity,
        isMuted:  micPub ? micPub.isMuted : false,
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

    document.getElementById(`lk-audio-${participant.identity}`)?.remove();

    const audio = document.createElement("audio");
    audio.id       = `lk-audio-${participant.identity}`;
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    document.body.appendChild(audio);
    track.attach(audio);

    audio.play().catch(() => {
      if (document.getElementById("voice-unblock-btn")) return;
      const btn = document.createElement("button");
      btn.id          = "voice-unblock-btn";
      btn.textContent = "Click to enable audio";
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
  }, []);

  const handleTrackUnsubscribed = useCallback((
    track:       RemoteTrack,
    _pub:        RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    track.detach();
    document.getElementById(`lk-audio-${participant.identity}`)?.remove();
  }, []);

  // ── Join ───────────────────────────────────────────────────────────────────
  const joinChannel = useCallback(async (channelId: string) => {
    // Leave any existing room cleanly first
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    channelIdRef.current = channelId;

    // Reset local mute state so we always start unmuted
    setIsMuted(false);

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
        console.log(`[livekit] connected to room: ${channelId}`);
      })
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        setIsConnected(false);
        setPeers([]);
        setIsMuted(false);
        setIsDeafened(false);
        console.log(`[livekit] disconnected, reason: ${reason}`);

        if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
          // Kicked by teacher — leave the active channel but keep it in the UI
          if (onKicked) onKicked();
        } else if (
          reason === DisconnectReason.SERVER_SHUTDOWN ||
          reason === DisconnectReason.ROOM_DELETED
        ) {
          // Room was deleted — remove the channel from the list
          if (onForceDisconnected) onForceDisconnected();
        }
      })
      .on(RoomEvent.ParticipantConnected, () => updatePeers(room))
      .on(RoomEvent.ParticipantDisconnected, (p) => {
        document.getElementById(`lk-audio-${p.identity}`)?.remove();
        updatePeers(room);
      })
      .on(RoomEvent.TrackSubscribed,      handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed,    handleTrackUnsubscribed)
      .on(RoomEvent.LocalTrackPublished,  (pub) => {
        if (pub.source === Track.Source.Microphone) {
          micPublishedRef.current = true;
          // Sync mute state from the publication's actual muted state
          setIsMuted(pub.isMuted);
          console.log(`[livekit] mic published, isMuted=${pub.isMuted}`);
        }
        updatePeers(room);
      })
      .on(RoomEvent.TrackMuted, (pub, participant) => {
        if (
          participant === room.localParticipant &&
          pub.source  === Track.Source.Microphone
        ) {
          setIsMuted(true);
          // If WE didn't initiate this mute, it was done by the teacher
          if (!selfMutingRef.current && onTeacherMuted) {
            onTeacherMuted();
          }
        }
        updatePeers(room);
      })
      .on(RoomEvent.TrackUnmuted, (pub, participant) => {
        // Sync local mute state when the local mic is unmuted
        if (
          participant === room.localParticipant &&
          pub.source  === Track.Source.Microphone
        ) {
          setIsMuted(false);
        }
        updatePeers(room);
      });

    try {
      await room.connect(LIVEKIT_URL, token, { autoSubscribe: true });
    } catch (err) {
      console.error("[livekit] connection failed:", err);
      roomRef.current = null;
      return;
    }

    // ── Enable microphone after connect ────────────────────────────────────
    // We reset micPublishedRef before attempting — it gets set to true only
    // inside the LocalTrackPublished event handler when the server confirms.
    micPublishedRef.current = false;

    try {
      const micPub           = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const isAlreadyLive    = micPub?.track && !micPub.isMuted;

      if (!isAlreadyLive) {
        console.log("[livekit] enabling microphone...");
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log("[livekit] microphone enabled successfully");
      } else {
        micPublishedRef.current = true; // already live from a previous session
        console.log("[livekit] mic already live, skipping enable");
      }

      // Re-read the actual state (LocalTrackPublished may have already set it)
      const enabled = room.localParticipant.isMicrophoneEnabled;
      setIsMuted(!enabled);
    } catch (err: any) {
      // PublishTrackError: insufficient permissions — the token canPublish grant
      // was not accepted by the server. This should be fixed by the updated
      // canPublishSources grant in routes/livekit.ts.
      const msg = err?.message || String(err);
      console.error(`[livekit] mic enable failed: ${msg}`);
      console.error(
        "[livekit] If you see 'insufficient permissions', ensure the token has " +
        "canPublish: true and canPublishSources: [MICROPHONE] in routes/livekit.ts"
      );
      // Reflect the failed state — mic is not available
      micPublishedRef.current = false;
      setIsMuted(true);
    }

  }, [fetchToken, handleTrackSubscribed, handleTrackUnsubscribed, updatePeers]);

  // ── Leave ──────────────────────────────────────────────────────────────────
  const leaveChannel = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current         = null;
    channelIdRef.current    = null;
    micPublishedRef.current = false;  // reset for next join

    document.querySelectorAll("[id^='lk-audio-']").forEach((el) => el.remove());
    document.getElementById("voice-unblock-btn")?.remove();

    setPeers([]);
    setIsMuted(false);
    setIsDeafened(false);
    setIsConnected(false);
  }, []);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    if (!micPublishedRef.current) {
      console.warn("[livekit] toggleMute skipped — mic not published");
      return;
    }

    const pub      = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    const micTrack = pub?.track as LocalAudioTrack | undefined;

    if (!micTrack) {
      console.warn("[livekit] toggleMute: mic track not found in publication");
      return;
    }

    // Mark as self-initiated so TrackMuted doesn't fire onTeacherMuted
    selfMutingRef.current = true;
    try {
      if (isMuted) {
        await micTrack.unmute();
        setIsMuted(false);
      } else {
        await micTrack.mute();
        setIsMuted(true);
      }
    } catch (err: any) {
      console.error(`[livekit] toggleMute failed: ${err?.message || err}`);
    } finally {
      // Small delay — the TrackMuted event fires after the await
      setTimeout(() => { selfMutingRef.current = false; }, 200);
    }
  }, [isMuted]);

  // ── Toggle deafen ──────────────────────────────────────────────────────────
  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    document.querySelectorAll<HTMLAudioElement>("[id^='lk-audio-']").forEach((audio) => {
      audio.muted = newDeafened;
    });
  }, [isDeafened]);

  // ── Moderation: Mute participant ───────────────────────────────────────────
  const muteParticipant = useCallback(async (identity: string) => {
    const channelId = channelIdRef.current;
    if (!channelId) return;
    try {
      await fetch("/voice/api/moderation/mute", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: channelId, participantIdentity: identity }),
      });
    } catch (err) {
      console.error("[moderation] mute failed:", err);
    }
  }, []);

  // ── Moderation: Unmute participant ─────────────────────────────────────────
  const unmuteParticipant = useCallback(async (identity: string) => {
    const channelId = channelIdRef.current;
    if (!channelId) return;
    try {
      await fetch("/voice/api/moderation/unmute", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: channelId, participantIdentity: identity }),
      });
    } catch (err) {
      console.error("[moderation] unmute failed:", err);
    }
  }, []);

  // ── Moderation: Mute all ───────────────────────────────────────────────────
  const muteAll = useCallback(async () => {
    const channelId = channelIdRef.current;
    const room      = roomRef.current;
    if (!channelId || !room) return;
    try {
      await fetch("/voice/api/moderation/mute-all", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName:        channelId,
          excludeIdentity: room.localParticipant.identity,
        }),
      });
    } catch (err) {
      console.error("[moderation] mute-all failed:", err);
    }
  }, []);

  // ── Moderation: Kick participant ───────────────────────────────────────────
  const kickParticipant = useCallback(async (identity: string) => {
    const channelId = channelIdRef.current;
    if (!channelId) return;
    try {
      await fetch("/voice/api/moderation/kick", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: channelId, participantIdentity: identity }),
      });
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