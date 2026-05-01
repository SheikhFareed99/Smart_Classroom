import React from "react";
import type { VoiceRole } from "../types/voice.types";

interface VoiceControlsProps {
  isMuted:        boolean;
  isDeafened:     boolean;
  isConnected:    boolean;
  userRole:       VoiceRole;
  onToggleMute:   () => void;
  onToggleDeafen: () => void;
  onLeave:        () => void;
  onMuteAll?:     () => void;
}

const VoiceControls = ({
  isMuted,
  isDeafened,
  isConnected,
  userRole,
  onToggleMute,
  onToggleDeafen,
  onLeave,
  onMuteAll,
}: VoiceControlsProps) => {
  return (
    <div style={styles.container}>
      <div style={styles.statusRow}>
        <span style={{
          ...styles.statusDot,
          backgroundColor: isConnected ? "#22c55e" : "#ef4444",
        }} />
        <span style={styles.statusText}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Mute / Unmute */}
      <button
        onClick={onToggleMute}
        style={{
          ...styles.btn,
          backgroundColor: isMuted ? "#ef4444" : "#3b82f6",
        }}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "🔇 Unmute" : "🎤 Mute"}
      </button>

      {/* Deafen / Undeafen */}
      <button
        onClick={onToggleDeafen}
        style={{
          ...styles.btn,
          backgroundColor: isDeafened ? "#f59e0b" : "#6366f1",
        }}
        title={isDeafened ? "Undeafen" : "Deafen"}
      >
        {isDeafened ? "🔕 Undeafen" : "🎧 Deafen"}
      </button>

      {/* Mute All — teacher only */}
      {userRole === "teacher" && onMuteAll && (
        <button
          onClick={onMuteAll}
          style={{ ...styles.btn, backgroundColor: "#dc2626" }}
          title="Mute all students"
        >
          🔇 Mute All
        </button>
      )}

      {/* Leave */}
      <button
        onClick={onLeave}
        style={{ ...styles.btn, backgroundColor: "#6b7280" }}
        title="Leave channel"
      >
        Leave
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display:         "flex",
    alignItems:      "center",
    gap:             "8px",
    padding:         "10px 12px",
    backgroundColor: "#1f2937",
    borderRadius:    "8px",
    flexWrap:        "wrap",
    marginTop:       "10px",
  },
  statusRow: {
    display: "flex", alignItems: "center", gap: "6px",
  },
  statusDot: {
    width: "10px", height: "10px", borderRadius: "50%",
    display: "inline-block", flexShrink: 0,
  },
  statusText: { color: "#d1d5db", fontSize: "13px" },
  btn: {
    padding: "6px 12px", border: "none", borderRadius: "6px",
    color: "#ffffff", fontSize: "12px", fontWeight: "500", cursor: "pointer",
  },
};

export default VoiceControls;