import React, { useState } from "react";
import type { VoiceRole } from "../types/voice.types";

interface VoiceControlsProps {
  isMuted:            boolean;
  isDeafened:         boolean;
  isConnected:        boolean;
  isScreenSharing:    boolean;
  userRole:           VoiceRole;
  onToggleMute:       () => void;
  onToggleDeafen:     () => void;
  onLeave:            () => void;
  onStartScreenShare: () => void;
  onStopScreenShare:  () => void;
}

// ── Inline SVG icons ─────────────────────────────────────────────────────────

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
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
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

const LogOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const ScreenShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <polyline points="10 10 12 8 14 10"/>
    <line x1="12" y1="8" x2="12" y2="14"/>
  </svg>
);

const ScreenShareOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);

// ── Hover-aware button ────────────────────────────────────────────────────────

interface VcBtnProps {
  onClick:    () => void;
  baseColor:  string;
  hoverColor: string;
  label:      string;
  ariaLabel:  string;
  children:   React.ReactNode;
  danger?:    boolean;
  pulse?:     boolean;
}

const VcBtn = ({ onClick, baseColor, hoverColor, label, ariaLabel, children, pulse }: VcBtnProps) => {
  const [hov, setHov] = useState(false);
  const [act, setAct] = useState(false);

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setAct(false); }}
      onMouseDown={() => setAct(true)}
      onMouseUp={() => setAct(false)}
      style={{
        display:         "inline-flex",
        alignItems:      "center",
        gap:             "5px",
        padding:         "5px 10px",
        border:          pulse ? `1px solid ${baseColor}` : "none",
        borderRadius:    "6px",
        color:           "#ffffff",
        fontSize:        "12px",
        fontWeight:      "500",
        cursor:          "pointer",
        backgroundColor: hov ? hoverColor : baseColor,
        transform:       act ? "scale(0.95)" : "scale(1)",
        boxShadow:       pulse
          ? `0 0 10px ${baseColor}88, 0 0 3px ${baseColor}44`
          : hov
            ? `0 0 8px ${baseColor}55`
            : "none",
        transition:      "background-color 0.18s ease, transform 0.1s ease, box-shadow 0.18s ease",
        animation:       pulse ? "vcPulse 2s ease-in-out infinite" : "none",
      }}
    >
      {children}
      <span>{label}</span>
    </button>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

const VoiceControls = ({
  isMuted,
  isDeafened,
  isConnected,
  isScreenSharing,
  onToggleMute,
  onToggleDeafen,
  onLeave,
  onStartScreenShare,
  onStopScreenShare,
}: VoiceControlsProps) => {
  return (
    <div style={styles.container}>
      {/* Pulse animation keyframes injected once */}
      <style>{`
        @keyframes vcPulse {
          0%, 100% { box-shadow: 0 0 6px #dc262688, 0 0 2px #dc262644; }
          50%       { box-shadow: 0 0 14px #dc2626cc, 0 0 5px #dc262688; }
        }
      `}</style>

      {/* Connection status pill */}
      <div style={styles.statusRow}>
        <span style={{
          ...styles.statusDot,
          backgroundColor: isConnected ? "#22c55e" : "#ef4444",
          boxShadow:       isConnected ? "0 0 6px #22c55e88" : "none",
        }} />
        <span style={styles.statusText}>
          {isConnected ? "Live" : "Disconnected"}
        </span>
      </div>

      {/* Mute / Unmute */}
      <VcBtn
        onClick={onToggleMute}
        baseColor={isMuted ? "#dc2626" : "#2563eb"}
        hoverColor={isMuted ? "#b91c1c" : "#1d4ed8"}
        label={isMuted ? "Unmute" : "Mute"}
        ariaLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
      >
        {isMuted ? <MicOffIcon /> : <MicIcon />}
      </VcBtn>

      {/* Deafen / Undeafen */}
      <VcBtn
        onClick={onToggleDeafen}
        baseColor={isDeafened ? "#d97706" : "#4f46e5"}
        hoverColor={isDeafened ? "#b45309" : "#4338ca"}
        label={isDeafened ? "Undeafen" : "Deafen"}
        ariaLabel={isDeafened ? "Undeafen audio" : "Deafen audio"}
      >
        {isDeafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
      </VcBtn>

      {/* Screen Share / Stop Sharing */}
      <VcBtn
        onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
        baseColor={isScreenSharing ? "#dc2626" : "#0f766e"}
        hoverColor={isScreenSharing ? "#b91c1c" : "#0d6460"}
        label={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        ariaLabel={isScreenSharing ? "Stop screen sharing" : "Share your screen"}
        pulse={isScreenSharing}
      >
        {isScreenSharing ? <ScreenShareOffIcon /> : <ScreenShareIcon />}
      </VcBtn>

      {/* Leave */}
      <VcBtn
        onClick={onLeave}
        baseColor="#4b5563"
        hoverColor="#374151"
        label="Leave"
        ariaLabel="Leave voice channel"
      >
        <LogOutIcon />
      </VcBtn>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

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
    border:          "1px solid #374151",
  },
  statusRow: {
    display:     "flex",
    alignItems:  "center",
    gap:         "6px",
    marginRight: "4px",
  },
  statusDot: {
    width:        "8px",
    height:       "8px",
    borderRadius: "50%",
    display:      "inline-block",
    flexShrink:   0,
    transition:   "background-color 0.3s ease, box-shadow 0.3s ease",
  },
  statusText: { color: "#9ca3af", fontSize: "12px" },
};

export default VoiceControls;