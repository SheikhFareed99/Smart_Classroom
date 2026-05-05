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
import { voiceFetch } from "../lib/voiceFetch";

export interface UseLiveKitOptions {
  userId: string;
  name: string;
  role: VoiceRole;
  onForceDisconnected?: () => void;  // called when the room is deleted
  onKicked?: () => void;  // called when this participant is kicked
  onTeacherMuted?: () => void;  // called when teacher mutes this student
}

export interface UseLiveKitReturn {
  peers: VoicePeer[];
  isMuted: boolean;
  isDeafened: boolean;
  isConnected: boolean;
  isScreenSharing: boolean;
  remoteScreenShares: Map<string, RemoteTrack>;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  muteParticipant: (identity: string) => Promise<void>;
  unmuteParticipant: (identity: string) => Promise<void>;
  muteAll: () => Promise<void>;
  kickParticipant: (identity: string) => Promise<void>;
}

const LIVEKIT_URL =
  import.meta.env.VITE_LIVEKIT_URL || "wss://smart-classroom-x64i9653.livekit.cloud";

export const useLiveKit = ({ userId, name, role, onForceDisconnected, onKicked, onTeacherMuted }: UseLiveKitOptions): UseLiveKitReturn => {
  const [peers, setPeers] = useState<VoicePeer[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenShares, setRemoteScreenShares] = useState<Map<string, RemoteTrack>>(new Map());

  // Keep the ref in sync with state so stable callbacks can read it
  // without needing isScreenSharing in their dependency arrays.
  const isScreenSharingRef = useRef(false);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

  const roomRef = useRef<Room | null>(null);
  const channelIdRef = useRef<string | null>(null);
  const micPublishedRef = useRef<boolean>(false);
  // Set to true while WE are initiating a mute so TrackMuted can tell the
  // difference between a self-mute and a teacher-initiated server mute.
  const selfMutingRef = useRef<boolean>(false);

  // ── Token fetch ────────────────────────────────────────────────────────────
  const fetchToken = useCallback(async (channelId: string): Promise<string> => {
    const res = await voiceFetch("/voice/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName: channelId,
        participantName: name,
        participantId: userId,
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
        userId: p.identity,
        name: p.name || p.identity,
        isMuted: micPub ? micPub.isMuted : false,
      });
    });
    setPeers(list);
  }, []);

  // ── Audio track subscription ───────────────────────────────────────────────
  const handleTrackSubscribed = useCallback((
    track: RemoteTrack,
    _pub: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    // ── Screen share track ─────────────────────────────────────────────────
    if (track.source === Track.Source.ScreenShare) {
      setRemoteScreenShares((prev) => {
        const next = new Map(prev);
        next.set(participant.identity, track);
        return next;
      });
      console.log(`[livekit] screen share started by: ${participant.identity}`);
      return;
    }

    if (track.kind !== Track.Kind.Audio) return;

    document.getElementById(`lk-audio-${participant.identity}`)?.remove();

    const audio = document.createElement("audio");
    audio.id = `lk-audio-${participant.identity}`;
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    document.body.appendChild(audio);
    track.attach(audio);

    audio.play().catch(() => {
      if (document.getElementById("voice-unblock-btn")) return;
      const btn = document.createElement("button");
      btn.id = "voice-unblock-btn";
      btn.textContent = "Click to enable audio";
      btn.style.cssText =
        "position:fixed;top:16px;left:50%;transform:translateX(-50%);" +
        "padding:10px 20px;background:#2563eb;color:white;border:none;" +
        "border-radius:8px;font-size:14px;cursor:pointer;z-index:9999;";
      btn.onclick = () => {
        document.querySelectorAll<HTMLAudioElement>("audio")
          .forEach((a) => a.play().catch(() => { }));
        btn.remove();
      };
      document.body.appendChild(btn);
    });
  }, []);

  const handleTrackUnsubscribed = useCallback((
    track: RemoteTrack,
    _pub: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    // ── Screen share ended ─────────────────────────────────────────────────
    if (track.source === Track.Source.ScreenShare) {
      setRemoteScreenShares((prev) => {
        const next = new Map(prev);
        next.delete(participant.identity);
        return next;
      });
      console.log(`[livekit] screen share stopped by: ${participant.identity}`);
      return;
    }

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

    // Reset local state
    setIsMuted(false);
    setIsScreenSharing(false);
    setRemoteScreenShares(new Map());

    let token: string;
    try {
      token = await fetchToken(channelId);
    } catch (err) {
      console.error("[livekit] token fetch failed:", err);
      return;
    }

    const room = new Room({
      // adaptiveStream / dynacast are good for voice — keep them.
      // NOTE: do NOT set videoCaptureDefaults here for screen share quality.
      //       videoCaptureDefaults only affects camera (getUserMedia), not
      //       screen capture (getDisplayMedia). Screen share options must be
      //       passed directly to setScreenShareEnabled().
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
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
        setIsScreenSharing(false);
        setRemoteScreenShares(new Map());
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
        // Clean up any screen share from the disconnected participant
        setRemoteScreenShares((prev) => {
          if (!prev.has(p.identity)) return prev;
          const next = new Map(prev);
          next.delete(p.identity);
          return next;
        });
        updatePeers(room);
      })
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        if (pub.source === Track.Source.Microphone) {
          micPublishedRef.current = true;
          // Sync mute state from the publication's actual muted state
          setIsMuted(pub.isMuted);
          console.log(`[livekit] mic published, isMuted=${pub.isMuted}`);
        }
        if (pub.source === Track.Source.ScreenShare) {
          setIsScreenSharing(true);
          console.log("[livekit] local screen share published");
        }
        updatePeers(room);
      })
      .on(RoomEvent.LocalTrackUnpublished, (pub) => {
        if (pub.source === Track.Source.ScreenShare) {
          setIsScreenSharing(false);
          console.log("[livekit] local screen share unpublished");
        }
        updatePeers(room);
      })
      .on(RoomEvent.TrackMuted, (pub, participant) => {
        if (
          participant === room.localParticipant &&
          pub.source === Track.Source.Microphone
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
          pub.source === Track.Source.Microphone
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
      const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const isAlreadyLive = micPub?.track && !micPub.isMuted;

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
  // IMPORTANT: no state values in the dependency array — only stable refs.
  // Adding state (e.g. isScreenSharing) would create a new leaveChannel
  // reference on every state change, causing the cleanup useEffect below to
  // call leaveChannel() (and disconnect the room) on every re-render.
  const leaveChannel = useCallback(() => {
    // Stop screen share cleanly before disconnecting (read via ref, not state)
    if (roomRef.current && isScreenSharingRef.current) {
      roomRef.current.localParticipant.setScreenShareEnabled(false).catch(() => { });
    }

    roomRef.current?.disconnect();
    roomRef.current = null;
    channelIdRef.current = null;
    micPublishedRef.current = false;  // reset for next join
    isScreenSharingRef.current = false;

    document.querySelectorAll("[id^='lk-audio-']").forEach((el) => el.remove());
    document.getElementById("voice-unblock-btn")?.remove();

    setPeers([]);
    setIsMuted(false);
    setIsDeafened(false);
    setIsConnected(false);
    setIsScreenSharing(false);
    setRemoteScreenShares(new Map());
  }, []); // stable — reads live values through refs only

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    // Mic was never published (e.g. browser dismissed the permission dialog on
    // join — losing the user-gesture context after the async room.connect()).
    // The button click IS a user gesture, so retry publishing now.
    if (!micPublishedRef.current) {
      console.log("[livekit] mic not published — retrying via user gesture...");
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        // micPublishedRef.current + isMuted will be updated by LocalTrackPublished
      } catch (err: any) {
        console.error(`[livekit] mic enable retry failed: ${err?.message || err}`);
      }
      return;
    }

    const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
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

  // ── Screen share ───────────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) {
      console.warn("[livekit] startScreenShare: not connected");
      return;
    }
    try {
      // ── Why these specific settings? ─────────────────────────────────────────
      // simulcast: false  → THE most important fix.
      //   With simulcast on, LiveKit publishes 3 quality layers and the SFU
      //   sends whichever layer matches the viewer's CSS pixel size. If the
      //   overlay <video> is smaller than 720p on screen the SFU sends the
      //   lowest layer (~150 kbps) → blurry. One layer = always full quality.
      //
      // 720p / 15 fps → stable, clear target.
      //   Lower fps = more bits allocated per frame = sharper text/slides.
      //   15 fps is imperceptible for slides; 30 fps at the same bitrate
      //   halves the per-frame quality.
      //
      // maxBitrate 2 Mbps → dedicated, non-adaptive ceiling.
      //   2 Mbps at 720p/15fps is generous — plenty for crisp text.
      //
      // degradationPreference "maintain-resolution" → when network is tight
      //   the browser drops frames rather than blurring the image.
      //
      // contentHint "detail" → biases the codec toward sharpness (not motion).
      // ───────────────────────────────────────────────────────────────────
      await room.localParticipant.setScreenShareEnabled(true,
        // Arg 2: capture constraints — passed to browser getDisplayMedia()
        {
          resolution: {
            width: 1280,
            height: 720,
            frameRate: 15,
          },
          contentHint: "detail",
        },
        // Arg 3: publish options — control how LiveKit publishes the track
        {
          simulcast: false,          // single layer, no adaptive switching
          videoEncoding: {
            maxBitrate: 2_000_000,  // 2 Mbps ceiling
            maxFramerate: 15,
            priority: "high",
          },
        }
      );
      console.log("[livekit] screen share started — 720p/15fps, 2 Mbps, simulcast OFF");
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (!msg.includes("Permission denied") && !msg.includes("cancelled")) {
        console.error(`[livekit] startScreenShare failed: ${msg}`);
      } else {
        console.log("[livekit] screen share cancelled by user");
      }
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(false);
      // isScreenSharing will be set to false via the LocalTrackUnpublished event
      console.log("[livekit] screen share stopped");
    } catch (err: any) {
      console.error(`[livekit] stopScreenShare failed: ${err?.message || err}`);
    }
  }, []);

  // ── Moderation: Mute participant ───────────────────────────────────────────
  const muteParticipant = useCallback(async (identity: string) => {
    const channelId = channelIdRef.current;
    if (!channelId) return;
    try {
      const res = await voiceFetch("/voice/api/moderation/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: channelId, participantIdentity: identity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Mute request failed");
      }
    } catch (err) {
      console.error("[moderation] mute failed:", err);
    }
  }, []);

  // ── Moderation: Unmute participant ─────────────────────────────────────────
  const unmuteParticipant = useCallback(async (identity: string) => {
    const channelId = channelIdRef.current;
    if (!channelId) return;
    try {
      const res = await voiceFetch("/voice/api/moderation/unmute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: channelId, participantIdentity: identity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Unmute request failed");
      }
    } catch (err) {
      console.error("[moderation] unmute failed:", err);
    }
  }, []);

  // ── Moderation: Mute all ───────────────────────────────────────────────────
  const muteAll = useCallback(async () => {
    const channelId = channelIdRef.current;
    const room = roomRef.current;
    if (!channelId || !room) return;
    try {
      await voiceFetch("/voice/api/moderation/mute-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: channelId,
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
      const res = await voiceFetch("/voice/api/moderation/kick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: channelId, participantIdentity: identity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Kick request failed");
      }
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
    isScreenSharing,
    remoteScreenShares,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    muteParticipant,
    unmuteParticipant,
    muteAll,
    kickParticipant,
  };
};