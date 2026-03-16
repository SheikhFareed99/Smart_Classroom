import React from "react";

interface VoiceControlsProps {
  isMuted:      boolean;
  isConnected:  boolean;
  onToggleMute: () => void;
  onLeave:      () => void;
}

const VoiceControls = ({
  isMuted,
  isConnected,
  onToggleMute,
  onLeave,
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
      <button
        onClick={onToggleMute}
        style={{
          ...styles.btn,
          backgroundColor: isMuted ? "#ef4444" : "#3b82f6",
        }}
      >
        {isMuted ? "Unmute" : "Mute"}
      </button>
      <button
        onClick={onLeave}
        style={{ ...styles.btn, backgroundColor: "#6b7280" }}
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
    gap:             "12px",
    padding:         "10px 16px",
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
    padding: "8px 16px", border: "none", borderRadius: "6px",
    color: "#ffffff", fontSize: "13px", fontWeight: "500", cursor: "pointer",
  },
};

export default VoiceControls;