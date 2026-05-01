import React, { useEffect, useState } from "react";
import { useLiveKit as useWebRTC } from "../hooks/useLiveKit";
import VoiceControls from "./VoiceControls";
import CreateChannelModal from "./CreateChannelModal";
import type { Channel, VoiceRole } from "../types/voice.types";

interface VoiceChannelProps {
  courseId:  string;
  userId:   string;
  userName: string;
  userRole: VoiceRole;
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

const VoiceChannel = ({ courseId, userId, userName, userRole }: VoiceChannelProps) => {

  const [channels,          setChannels]          = useState<Channel[]>([]);
  const [activeChannelId,   setActiveChannelId]   = useState<string | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>("");
  const [loading,           setLoading]           = useState<boolean>(false);
  const [error,             setError]             = useState<string | null>(null);
  const [isPanelOpen,       setIsPanelOpen]       = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const isTeacher = userRole === "teacher";

  // LiveKit manages all audio elements internally — no audioRefs needed
  const {
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
  } = useWebRTC({ userId, name: userName, role: userRole });

  // ── Fetch channels ─────────────────────────────────────
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

  // ── Cleanup on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      document.querySelectorAll("[id^='lk-audio-']").forEach((el) => el.remove());
      document.getElementById("voice-unblock-btn")?.remove();
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
    document.getElementById("voice-unblock-btn")?.remove();
  };

  const handleCreate = async (channelName: string) => {
    try {
      const res = await fetch("/voice/api/channels", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        channelName,
          courseId,
          createdBy:   userId,
          creatorName: userName,
          role:        userRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to create channel");
        return;
      }
      setChannels((prev) => [data.channel as Channel, ...prev]);
    } catch {
      setError("Failed to create channel");
    }
  };

  const getChannelCount = (channelId: string): number => {
    if (activeChannelId === channelId) return peers.length + 1;
    const ch = channels.find((c) => c._id === channelId);
    return ch?.participants?.length ?? 0;
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
          {/* Only teachers see the create button */}
          {isTeacher && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={styles.createBtn}
            >
              + New
            </button>
          )}
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
            {/* local user */}
            <div style={styles.participant}>
              <span style={styles.dot} />
              <span style={styles.pName}>
                {userName} (you){isMuted ? " (muted)" : ""}
                {isDeafened ? " (deafened)" : ""}
              </span>
            </div>
            {/* remote peers */}
            {peers.map((peer) => (
              <div key={peer.socketId} style={styles.participant}>
                <span style={styles.dot} />
                <span style={styles.pName}>
                  {peer.name}{peer.isMuted ? " (muted)" : ""}
                </span>
                {/* Teacher moderation buttons for each peer */}
                {isTeacher && (
                  <span style={styles.modActions}>
                    <button
                      onClick={() =>
                        peer.isMuted
                          ? unmuteParticipant(peer.socketId)
                          : muteParticipant(peer.socketId)
                      }
                      style={styles.modBtn}
                      title={peer.isMuted ? "Unmute" : "Mute"}
                    >
                      {peer.isMuted ? "🔊" : "🔇"}
                    </button>
                    <button
                      onClick={() => kickParticipant(peer.socketId)}
                      style={{ ...styles.modBtn, ...styles.kickBtn }}
                      title="Kick"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
          <VoiceControls
            isMuted={isMuted}
            isDeafened={isDeafened}
            isConnected={isConnected}
            userRole={userRole}
            onToggleMute={toggleMute}
            onToggleDeafen={toggleDeafen}
            onLeave={handleLeave}
            onMuteAll={muteAll}
          />
        </div>
      )}

      <div style={styles.list}>
        {channels.length === 0 && (
          <p style={styles.empty}>
            {isTeacher
              ? "No channels yet — create one above"
              : "No channels yet — waiting for teacher"}
          </p>
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

      {/* Custom Create Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  voiceIcon: {
    width: "20px", height: "20px",
    color: "currentColor", flexShrink: 0,
  },
  titleRow: {
    display: "inline-flex", alignItems: "center", gap: "12px",
  },
  openLabel: {
    width: "100%", padding: "10px 12px", borderRadius: "8px",
    border: "none", backgroundColor: "transparent",
    color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500,
    textAlign: "left", display: "flex", alignItems: "center",
    gap: "12px", cursor: "pointer", textDecoration: "none",
  },
  container: {
    width: "100%", maxHeight: "50vh", overflowY: "auto",
    backgroundColor: "var(--primary-bg)", borderRadius: "10px",
    border: "1px solid var(--border)", padding: "10px",
    color: "var(--text-primary)", fontFamily: "sans-serif", marginTop: "6px",
  },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: "12px",
  },
  headerActions: { display: "flex", alignItems: "center", gap: "6px" },
  title: { fontSize: "14px", fontWeight: "600", margin: 0 },
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
  participant: {
    display: "flex", alignItems: "center", gap: "8px",
  },
  dot: {
    width: "8px", height: "8px", borderRadius: "50%",
    backgroundColor: "#22c55e", display: "inline-block", flexShrink: 0,
  },
  pName:     { fontSize: "13px", color: "#d1d5db", flex: 1 },
  modActions: {
    display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto",
  },
  modBtn: {
    width: "24px", height: "24px", border: "none", borderRadius: "4px",
    backgroundColor: "#374151", color: "#fff", fontSize: "12px",
    cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", padding: 0,
  },
  kickBtn: {
    backgroundColor: "#dc2626", fontSize: "11px",
  },
  list:      { display: "flex", flexDirection: "column", gap: "4px" },
  channelRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: "8px", padding: "8px 10px", borderRadius: "6px",
  },
  channelInfo: {
    display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1,
  },
  chName: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    fontSize: "13px", color: "var(--text-primary)",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
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