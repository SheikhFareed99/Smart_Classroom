import React, { useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title:         string;
  message:       string;
  confirmLabel?: string;   // default "Confirm"
  danger?:       boolean;  // red confirm button
}

interface ConfirmModalProps extends ConfirmOptions {
  isOpen:    boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div style={s.overlay} onClick={onCancel} aria-modal="true" role="dialog">
      <div style={s.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={s.title}>{title}</h3>
        <p style={s.message}>{message}</p>
        <div style={s.actions}>
          <button style={s.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button
            style={{ ...s.confirmBtn, ...(danger ? s.dangerBtn : s.primaryBtn) }}
            onClick={() => { onConfirm(); }}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position:        "fixed",
    inset:           0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          9999,
    backdropFilter:  "blur(2px)",
    animation:       "vcFadeIn 0.15s ease",
  },
  dialog: {
    backgroundColor: "#1e293b",
    border:          "1px solid #334155",
    borderRadius:    "12px",
    padding:         "24px",
    width:           "320px",
    maxWidth:        "90vw",
    boxShadow:       "0 20px 60px rgba(0,0,0,0.5)",
    animation:       "vcSlideUp 0.18s ease",
  },
  title: {
    margin:     "0 0 10px",
    fontSize:   "15px",
    fontWeight: "600",
    color:      "#f1f5f9",
  },
  message: {
    margin:     "0 0 20px",
    fontSize:   "13px",
    color:      "#94a3b8",
    lineHeight: "1.5",
  },
  actions: {
    display:        "flex",
    gap:            "10px",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    padding:         "7px 16px",
    backgroundColor: "#374151",
    color:           "#d1d5db",
    border:          "1px solid #4b5563",
    borderRadius:    "7px",
    fontSize:        "12px",
    fontWeight:      "500",
    cursor:          "pointer",
    transition:      "background-color 0.15s",
  },
  confirmBtn: {
    padding:      "7px 16px",
    border:       "none",
    borderRadius: "7px",
    fontSize:     "12px",
    fontWeight:   "600",
    cursor:       "pointer",
    color:        "#fff",
    transition:   "opacity 0.15s, transform 0.1s",
  },
  dangerBtn:  { backgroundColor: "#dc2626" },
  primaryBtn: { backgroundColor: "#2563eb" },
};

export default ConfirmModal;
