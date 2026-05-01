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
}

// ── Inline SVG icons (Lucide-compatible design) ────────────────────────────

const MicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8"  y1="23" x2="16" y2="23"/>
  </svg>
);

const MicOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
    <path d="M5 10v2a7 7 0 0 0 12 4.9"/>
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8"  y1="23" x2="16" y2="23"/>
  </svg>
);

const HeadphonesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
    <path d="M3  19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
);

const HeadphonesOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 14h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3"/>
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"/>
    <path d="M21 14V12a9 9 0 0 0-15.12-6.6"/>
    <path d="M3 14v-2c0-2.12.73-4.07 1.95-5.6"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);

const VolumeXIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
);

const LogOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const VoiceControls = ({
  isMuted,
  isDeafened,
  isConnected,
  onToggleMute,
  onToggleDeafen,
  onLeave,
}: VoiceControlsProps) => {
  return (
    <div style={styles.container}>
      {/* Connection status */}
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
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
      >
        {isMuted ? <MicOffIcon /> : <MicIcon />}
        <span>{isMuted ? "Unmute" : "Mute"}</span>
      </button>

      {/* Deafen / Undeafen */}
      <button
        onClick={onToggleDeafen}
        style={{
          ...styles.btn,
          backgroundColor: isDeafened ? "#f59e0b" : "#6366f1",
        }}
        title={isDeafened ? "Undeafen" : "Deafen"}
        aria-label={isDeafened ? "Undeafen audio" : "Deafen audio"}
      >
        {isDeafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
        <span>{isDeafened ? "Undeafen" : "Deafen"}</span>
      </button>


      {/* Leave */}
      <button
        onClick={onLeave}
        style={{ ...styles.btn, backgroundColor: "#6b7280" }}
        title="Leave channel"
        aria-label="Leave voice channel"
      >
        <LogOutIcon />
        <span>Leave</span>
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display:         "flex",
    alignItems:      "center",
    gap:             "6px",
    padding:         "10px 12px",
    backgroundColor: "#1f2937",
    borderRadius:    "8px",
    flexWrap:        "wrap",
    marginTop:       "10px",
  },
  statusRow: {
    display: "flex", alignItems: "center", gap: "6px",
    marginRight: "4px",
  },
  statusDot: {
    width: "8px", height: "8px", borderRadius: "50%",
    display: "inline-block", flexShrink: 0,
  },
  statusText: { color: "#9ca3af", fontSize: "12px" },
  btn: {
    display:    "inline-flex",
    alignItems: "center",
    gap:        "5px",
    padding:    "5px 10px",
    border:     "none",
    borderRadius: "6px",
    color:      "#ffffff",
    fontSize:   "12px",
    fontWeight: "500",
    cursor:     "pointer",
    transition: "opacity 0.15s ease",
  },
};

export default VoiceControls;