import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLiveKit as useWebRTC } from "../hooks/useLiveKit";
import VoiceControls from "./VoiceControls";
import CreateChannelModal from "./CreateChannelModal";
import type { Channel, VoiceRole } from "../types/voice.types";

interface VoiceChannelProps {
  courseId: string;
  userId: string;
  userName: string;
  userRole: VoiceRole;
}

// ── Inline SVG icons ────────────────────────────────────────────────────────

const SpeakerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 6a9 9 0 0 1 0 12" />
  </svg>
);

const SpeakerSmIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MicOffIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 4.9" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const UserXIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="17" y1="8" x2="23" y2="14" />
    <line x1="23" y1="8" x2="17" y2="14" />
  </svg>
);

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const UsersIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// ── Component ────────────────────────────────────────────────────────────────

const VoiceChannel = ({ courseId, userId, userName, userRole }: VoiceChannelProps) => {

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>("");
  // liveCount tracks the actual peer count while inside a room (source of truth)
  const [liveCount, setLiveCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [wasDeleted, setWasDeleted] = useState<boolean>(false);
  const [wasKicked, setWasKicked] = useState<boolean>(false);

  const isTeacher = userRole === "teacher";

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
    kickParticipant,
  } = useWebRTC({
    userId,
    name: userName,
    role: userRole,
    // Called when teacher deletes the room — remove channel from list
    onForceDisconnected: () => {
      setActiveChannelId(null);
      setActiveChannelName("");
      setLiveCount(0);
      setWasDeleted(true);
      setChannels((prev) => prev.filter((c) => c._id !== channelIdSnapshot.current));
    },
    // Called when kicked — clear active state but keep the channel visible
    onKicked: () => {
      setActiveChannelId(null);
      setActiveChannelName("");
      setLiveCount(0);
      setWasKicked(true);
      document.getElementById("voice-unblock-btn")?.remove();
    },
  });

  // Keep a ref to the active channel ID so onForceDisconnected closure can access it
  const channelIdSnapshot = useRef<string | null>(null);
  useEffect(() => { channelIdSnapshot.current = activeChannelId; }, [activeChannelId]);

  // Sync liveCount whenever peers change (peers = remote only, +1 for self)
  useEffect(() => {
    if (isConnected) {
      setLiveCount(peers.length + 1);
    }
  }, [peers, isConnected]);

  // ── Fetch channels ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch(`/voice/api/channels/${courseId}`);
        const data = await res.json();
        setChannels(data.channels ?? []);
      } catch {
        setError("Failed to load channels");
      }
    };
    fetchChannels();
  }, [courseId]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      document.querySelectorAll("[id^='lk-audio-']").forEach((el) => el.remove());
      document.getElementById("voice-unblock-btn")?.remove();
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleJoin = async (channel: Channel) => {
    if (activeChannelId) handleLeave();
    setLoading(true);
    setError(null);
    setLiveCount(0);
    try {
      await joinChannel(channel._id);
      setActiveChannelId(channel._id);
      setActiveChannelName(channel.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    leaveChannel();
    setActiveChannelId(null);
    setActiveChannelName("");
    setLiveCount(0);
    document.getElementById("voice-unblock-btn")?.remove();
  };

  const handleCreate = async (channelName: string) => {
    try {
      const res = await fetch("/voice/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: channelName, courseId, createdBy: userId,
          creatorName: userName, role: userRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to create channel"); return; }
      // NEW channels start with 0 participants — no stale MongoDB count shown
      setChannels((prev) => [{ ...data.channel, participants: [] } as Channel, ...prev]);
    } catch {
      setError("Failed to create channel");
    }
  };

  // ── Delete Channel (teacher only) ──────────────────────────────────────────
  // Calls the backend which: destroys the LiveKit room (kicking everyone),
  // marks the channel inactive, and ends open sessions.
  const handleDeleteChannel = useCallback(async (channelId: string) => {
    if (!confirm("Delete this channel? All participants will be removed.")) return;

    try {
      const res = await fetch("/voice/api/moderation/delete-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to delete channel");
        return;
      }
      // If we were inside this channel, leave gracefully
      if (activeChannelId === channelId) handleLeave();
      // Remove from the local channel list immediately
      setChannels((prev) => prev.filter((c) => c._id !== channelId));
    } catch {
      setError("Failed to delete channel");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId]);

  // ── Participant count for the channel list ─────────────────────────────────
  // FIX: When we're active in a channel, use liveCount (real-time) instead
  // of the stale MongoDB participants array. For all other channels, show 0
  // (we don't poll other channels' counts in real-time).
  const getChannelCount = (channelId: string): number => {
    if (activeChannelId === channelId) return liveCount;
    // For channels we're not in, don't show stale DB counts
    return 0;
  };

  // ── Collapsed state ────────────────────────────────────────────────────────
  if (!isPanelOpen) {
    return (
      <button type="button" style={styles.openLabel} onClick={() => setIsPanelOpen(true)}>
        <SpeakerIcon />
        <span>Voice Channels</span>
        <ChevronDownIcon />
      </button>
    );
  }

  // ── Expanded panel ─────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.titleRow}>
          <SpeakerIcon />
          <span style={styles.titleText}>Voice Channels</span>
        </span>
        <div style={styles.headerActions}>
          {isTeacher && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={styles.createBtn}
              title="Create new channel"
            >
              <PlusIcon /> New
            </button>
          )}
          <button
            type="button"
            style={styles.closeBtn}
            onClick={() => setIsPanelOpen(false)}
            aria-label="Close voice channels"
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.error}>
          <span>{error}</span>
          <button style={styles.errorDismiss} onClick={() => setError(null)}><XIcon /></button>
        </div>
      )}

      {/* Channel-deleted info banner */}
      {wasDeleted && !activeChannelId && (
        <div style={styles.infoBanner}>
          <span>Channel was deleted by the teacher</span>
          <button style={styles.errorDismiss} onClick={() => setWasDeleted(false)}><XIcon /></button>
        </div>
      )}

      {/* Kicked info banner */}
      {wasKicked && !activeChannelId && (
        <div style={styles.kickedBanner}>
          <span>You were removed from the channel</span>
          <button style={styles.errorDismiss} onClick={() => setWasKicked(false)}><XIcon /></button>
        </div>
      )}

      {/* Active channel box */}
      {activeChannelId && (
        <div style={styles.activeBox}>
          <div style={styles.activeName}>
            <SpeakerSmIcon />
            <span>{activeChannelName}</span>
          </div>
          <div style={styles.participantList}>
            {/* Local user */}
            <div style={styles.participant}>
              <span style={styles.dot} />
              <span style={styles.pName}>
                {userName}
                <span style={styles.youBadge}>you</span>
                {isMuted && <span style={styles.mutedBadge}>muted</span>}
                {isDeafened && <span style={styles.deafBadge}>deafened</span>}
              </span>
            </div>
            {/* Remote peers */}
            {peers.map((peer) => (
              <div key={peer.socketId} style={styles.participant}>
                <span style={styles.dot} />
                <span style={styles.pName}>
                  {peer.name}
                  {peer.isMuted && <span style={styles.mutedBadge}>muted</span>}
                </span>
                {/* Teacher moderation */}
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
                      {peer.isMuted ? <MicIcon /> : <MicOffIcon />}
                    </button>
                    <button
                      onClick={() => kickParticipant(peer.socketId)}
                      style={{ ...styles.modBtn, ...styles.kickBtn }}
                      title="Kick from channel"
                    >
                      <UserXIcon />
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
          />
        </div>
      )}

      {/* Channel list */}
      <div style={styles.list}>
        {channels.length === 0 && (
          <p style={styles.empty}>
            {isTeacher ? "No channels yet — create one above" : "No channels yet"}
          </p>
        )}
        {channels.map((ch) => {
          const count = getChannelCount(ch._id);
          const isActive = activeChannelId === ch._id;
          return (
            <div
              key={ch._id}
              style={{
                ...styles.channelRow,
                backgroundColor: isActive ? "rgba(37,99,235,0.15)" : "transparent",
                borderColor: isActive ? "rgba(37,99,235,0.4)" : "transparent",
              }}
            >
              <div style={styles.channelInfo}>
                <span style={styles.chName}>
                  <SpeakerSmIcon />
                  <span>{ch.name}</span>
                </span>
                {count > 0 && (
                  <span style={styles.chCount}>
                    <UsersIcon /> {count}
                  </span>
                )}
              </div>
              <div style={styles.channelActions}>
                {!isActive && (
                  <button
                    onClick={() => handleJoin(ch)}
                    disabled={loading}
                    style={styles.joinBtn}
                  >
                    {loading ? "…" : "Join"}
                  </button>
                )}
                {/* Delete — teacher only */}
                {isTeacher && (
                  <button
                    onClick={() => handleDeleteChannel(ch._id)}
                    style={styles.deleteBtn}
                    title="Delete channel"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  openLabel: {
    width: "100%", padding: "10px 12px", borderRadius: "8px",
    border: "none", backgroundColor: "transparent",
    color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", fontWeight: 500,
    textAlign: "left", display: "flex", alignItems: "center",
    gap: "8px", cursor: "pointer",
  },
  container: {
    width: "100%", maxHeight: "55vh", overflowY: "auto",
    backgroundColor: "var(--primary-bg, #0f172a)", borderRadius: "10px",
    border: "1px solid var(--border, #1e293b)", padding: "10px",
    color: "var(--text-primary, #f1f5f9)", fontFamily: "inherit", marginTop: "6px",
  },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: "10px",
  },
  titleRow: {
    display: "inline-flex", alignItems: "center", gap: "8px",
  },
  titleText: { fontSize: "13px", fontWeight: "600" },
  headerActions: { display: "flex", alignItems: "center", gap: "6px" },
  createBtn: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "4px 10px", backgroundColor: "#2563eb", color: "#fff",
    border: "none", borderRadius: "6px", fontSize: "12px",
    fontWeight: "500", cursor: "pointer",
  },
  closeBtn: {
    width: "26px", height: "26px", backgroundColor: "#1e293b",
    color: "#94a3b8", border: "1px solid #334155",
    borderRadius: "6px", cursor: "pointer", padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  error: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", backgroundColor: "#450a0a", color: "#fca5a5",
    borderRadius: "6px", fontSize: "12px", marginBottom: "10px",
    border: "1px solid #7f1d1d",
  },
  errorDismiss: {
    background: "transparent", border: "none", color: "#fca5a5",
    cursor: "pointer", padding: "0 0 0 8px",
    display: "flex", alignItems: "center",
  },
  activeBox: {
    backgroundColor: "var(--card, #1e293b)", borderRadius: "8px",
    padding: "10px 12px", marginBottom: "10px",
    border: "1px solid rgba(37,99,235,0.3)",
  },
  activeName: {
    display: "flex", alignItems: "center", gap: "6px",
    fontSize: "12px", fontWeight: "600", color: "#60a5fa", marginBottom: "8px",
  },
  participantList: {
    display: "flex", flexDirection: "column", gap: "5px", marginBottom: "6px",
  },
  participant: { display: "flex", alignItems: "center", gap: "8px", minHeight: "24px" },
  dot: {
    width: "7px", height: "7px", borderRadius: "50%",
    backgroundColor: "#22c55e", flexShrink: 0,
  },
  pName: {
    fontSize: "12px", color: "#cbd5e1", flex: 1,
    display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap",
  },
  youBadge: {
    fontSize: "10px", color: "#6b7280", padding: "1px 5px",
    backgroundColor: "#1f2937", borderRadius: "4px",
  },
  mutedBadge: {
    fontSize: "10px", color: "#f87171", padding: "1px 5px",
    backgroundColor: "rgba(239,68,68,0.1)", borderRadius: "4px",
  },
  deafBadge: {
    fontSize: "10px", color: "#fb923c", padding: "1px 5px",
    backgroundColor: "rgba(249,115,22,0.1)", borderRadius: "4px",
  },
  modActions: { display: "flex", alignItems: "center", gap: "3px", marginLeft: "auto" },
  modBtn: {
    width: "22px", height: "22px", border: "none", borderRadius: "4px",
    backgroundColor: "#374151", color: "#9ca3af", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
    transition: "background-color 0.15s",
  },
  kickBtn: { backgroundColor: "rgba(220,38,38,0.2)", color: "#f87171" },
  list: { display: "flex", flexDirection: "column", gap: "2px" },
  channelRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: "6px", padding: "7px 8px", borderRadius: "6px",
    border: "1px solid", transition: "background-color 0.15s",
  },
  channelInfo: { display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 },
  chName: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    fontSize: "12px", color: "var(--text-primary, #f1f5f9)",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  chCount: {
    display: "inline-flex", alignItems: "center", gap: "3px",
    fontSize: "11px", color: "#64748b", flexShrink: 0,
  },
  channelActions: { display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 },
  joinBtn: {
    padding: "3px 10px", backgroundColor: "#166534", color: "#86efac",
    border: "1px solid #166534", borderRadius: "5px",
    fontSize: "11px", fontWeight: "500", cursor: "pointer",
  },
  deleteBtn: {
    width: "22px", height: "22px", border: "none", borderRadius: "4px",
    backgroundColor: "transparent", color: "#64748b", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
    transition: "color 0.15s, background-color 0.15s",
  },
  empty: { fontSize: "12px", color: "#475569", margin: "6px 0", padding: "0 2px" },
  infoBanner: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", backgroundColor: "rgba(120,53,15,0.4)", color: "#fcd34d",
    borderRadius: "6px", fontSize: "12px", marginBottom: "10px",
    border: "1px solid rgba(180,83,9,0.5)",
  },
  kickedBanner: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", backgroundColor: "rgba(127,29,29,0.4)", color: "#fca5a5",
    borderRadius: "6px", fontSize: "12px", marginBottom: "10px",
    border: "1px solid rgba(153,27,27,0.5)",
  },
};

export default VoiceChannel;