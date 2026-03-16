import React, { useEffect, useRef, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import VoiceControls from "./VoiceControls";
import type { Channel } from "../types/voice.types";

interface VoiceChannelProps {
  courseId: string;
  userId:   string;
  userName: string;
}

const VoiceIcon = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    style={styles.voiceIcon}
    aria-hidden="true"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 6a9 9 0 0 1 0 12" />
  </svg>
);

const VoiceChannel = ({ courseId, userId, userName }: VoiceChannelProps) => {

  const [channels,          setChannels]          = useState<Channel[]>([]);
  const [activeChannelId,   setActiveChannelId]   = useState<string | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>("");
  const [loading,           setLoading]           = useState<boolean>(false);
  const [error,             setError]             = useState<string | null>(null);
  const [isPanelOpen,       setIsPanelOpen]       = useState<boolean>(false);

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const {
    remoteStreams,
    peers,
    isMuted,
    isConnected,
    joinChannel,
    leaveChannel,
    toggleMute,
  } = useWebRTC({ userId, name: userName });

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res  = await fetch(`/voice/api/channels/${courseId}`);
        const data = await res.json();
        setChannels(data.channels ?? []);
      } catch {
        setError("Failed to load channels");
      }
    };
    fetchChannels();
  }, [courseId]);

  useEffect(() => {
    remoteStreams.forEach((stream, socketId) => {
      let audio = audioRefs.current.get(socketId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        document.body.appendChild(audio);
        audioRefs.current.set(socketId, audio);
      }
      if (audio.srcObject !== stream) audio.srcObject = stream;
    });

    audioRefs.current.forEach((audio, socketId) => {
      if (!remoteStreams.has(socketId)) {
        audio.srcObject = null;
        audio.remove();
        audioRefs.current.delete(socketId);
      }
    });
  }, [remoteStreams]);

  useEffect(() => {
    return () => {
      audioRefs.current.forEach((audio) => {
        audio.srcObject = null;
        audio.remove();
      });
      audioRefs.current.clear();
    };
  }, []);

  const handleJoin = async (channel: Channel) => {
    if (activeChannelId) handleLeave();
    setLoading(true);
    setError(null);
    try {
      await joinChannel(channel._id);
      setActiveChannelId(channel._id);
      setActiveChannelName(channel.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to join";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    leaveChannel();
    setActiveChannelId(null);
    setActiveChannelName("");
  };

  const handleCreate = async () => {
    const channelName = prompt("Channel name:");
    if (!channelName?.trim()) return;
    try {
      const res = await fetch("/voice/api/channels", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        channelName.trim(),
          courseId,
          createdBy:   userId,
          creatorName: userName,
        }),
      });
      const data = await res.json();
      setChannels((prev) => [data.channel as Channel, ...prev]);
    } catch {
      setError("Failed to create channel");
    }
  };

  const getChannelCount = (channelId: string): number => {
    if (activeChannelId !== channelId) return 0;
    return peers.length + 1;
  };

  if (!isPanelOpen) {
    return (
      <button
        type="button"
        style={styles.openLabel}
        onClick={() => setIsPanelOpen(true)}
      >
        <span style={styles.titleRow}>
          <VoiceIcon />
          <span>Voice Channels</span>
        </span>
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          <span style={styles.titleRow}>
            <VoiceIcon />
            <span>Voice Channels</span>
          </span>
        </h3>
        <div style={styles.headerActions}>
          <button onClick={handleCreate} style={styles.createBtn}>+ New</button>
          <button
            type="button"
            style={styles.closeBtn}
            onClick={() => setIsPanelOpen(false)}
            aria-label="Close voice channels"
          >
            ×
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {activeChannelId && (
        <div style={styles.activeBox}>
          <div style={styles.activeName}>#{activeChannelName}</div>
          <div style={styles.participantList}>
            <div style={styles.participant}>
              <span style={styles.dot} />
              <span style={styles.pName}>
                {userName} (you){isMuted ? " (muted)" : ""}
              </span>
            </div>
            {peers.map((peer) => (
              <div key={peer.socketId} style={styles.participant}>
                <span style={styles.dot} />
                <span style={styles.pName}>
                  {peer.name}{peer.isMuted ? " (muted)" : ""}
                </span>
              </div>
            ))}
          </div>
          <VoiceControls
            isMuted={isMuted}
            isConnected={isConnected}
            onToggleMute={toggleMute}
            onLeave={handleLeave}
          />
        </div>
      )}

      <div style={styles.list}>
        {channels.length === 0 && (
          <p style={styles.empty}>No channels yet — create one above</p>
        )}
        {channels.map((ch) => (
          <div
            key={ch._id}
            style={{
              ...styles.channelRow,
              backgroundColor:
                activeChannelId === ch._id ? "#1e3a5f" : "transparent",
            }}
          >
            <div style={styles.channelInfo}>
              <span style={styles.chName}>
                <VoiceIcon />
                <span>{ch.name}</span>
              </span>
              <span style={styles.chCount}>
                {getChannelCount(ch._id)} in channel
              </span>
            </div>
            {activeChannelId !== ch._id && (
              <button
                onClick={() => handleJoin(ch)}
                disabled={loading}
                style={styles.joinBtn}
              >
                {loading ? "..." : "Join"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  voiceIcon: {
    width: "20px",
    height: "20px",
    color: "currentColor",
    flexShrink: 0,
  },
  titleRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "12px",
  },
  openLabel: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
    fontWeight: 500,
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    textDecoration: "none",
  },
  container: {
    width: "100%",
    maxHeight: "50vh",
    overflowY: "auto",
    backgroundColor: "var(--primary-bg)",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    padding: "10px",
    color: "var(--text-primary)",
    fontFamily: "sans-serif",
    marginTop: "6px",
  },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: "12px",
  },
  headerActions: { display: "flex", alignItems: "center", gap: "6px" },
  title:     { fontSize: "14px", fontWeight: "600", margin: 0 },
  createBtn: {
    padding: "4px 10px", backgroundColor: "#2563eb", color: "#fff",
    border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
  },
  closeBtn: {
    width: "26px", height: "26px", backgroundColor: "#374151", color: "#fff",
    border: "none", borderRadius: "6px", fontSize: "16px", lineHeight: "26px",
    textAlign: "center", cursor: "pointer", padding: 0,
  },
  activeBox: {
    backgroundColor: "var(--card)", borderRadius: "8px",
    padding: "12px", marginBottom: "12px",
  },
  activeName: {
    fontSize: "13px", fontWeight: "600", color: "#60a5fa", marginBottom: "8px",
  },
  participantList: {
    display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px",
  },
  participant: { display: "flex", alignItems: "center", gap: "8px" },
  dot: {
    width: "8px", height: "8px", borderRadius: "50%",
    backgroundColor: "#22c55e", display: "inline-block", flexShrink: 0,
  },
  pName:     { fontSize: "13px", color: "#d1d5db" },
  list:      { display: "flex", flexDirection: "column", gap: "4px" },
  channelRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
    padding: "8px 10px", borderRadius: "6px",
  },
  channelInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
    flex: 1,
  },
  chName:  {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chCount: { fontSize: "11px", color: "#6b7280" },
  joinBtn: {
    padding: "4px 10px", backgroundColor: "#16a34a", color: "#fff",
    border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
  },
  empty: { fontSize: "12px", color: "#6b7280", margin: 0 },
  error: {
    padding: "8px 12px", backgroundColor: "#7f1d1d", color: "#fca5a5",
    borderRadius: "6px", fontSize: "13px", marginBottom: "10px",
  },
};

export default VoiceChannel;