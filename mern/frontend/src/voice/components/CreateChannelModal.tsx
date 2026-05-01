import React, { useState, useRef, useEffect } from "react";
import "./CreateChannelModal.css";

interface CreateChannelModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  onCreate: (name: string) => void;
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [channelName, setChannelName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setChannelName("");
      // Small delay to allow animation to start
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = channelName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    onClose();
  };

  // Close on backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="ccm-overlay" onClick={handleOverlayClick}>
      <div className="ccm-modal" role="dialog" aria-modal="true" aria-label="Create voice channel">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="ccm-header">
            <h3>Create Voice Channel</h3>
            <button
              type="button"
              className="ccm-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="ccm-body">
            <label className="ccm-label" htmlFor="ccm-channel-name">
              Channel Name
            </label>
            <input
              ref={inputRef}
              id="ccm-channel-name"
              className="ccm-input"
              type="text"
              placeholder="e.g. Lecture Discussion"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              maxLength={64}
              autoComplete="off"
            />
          </div>

          {/* Footer */}
          <div className="ccm-footer">
            <button
              type="button"
              className="ccm-btn ccm-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ccm-btn ccm-btn-create"
              disabled={!channelName.trim()}
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
