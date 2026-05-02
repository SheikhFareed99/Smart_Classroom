import React, { useState, useRef, useEffect, type JSX } from "react";
import { Plus, X } from "lucide-react";
import Icon from "./ui/Icon";
import Button from "./ui/Button";
import { CheckCircle2, XCircle } from "lucide-react";
import "./JoinCourse.css";
import { apiFetch } from "../lib/api";

type Props = {
  onJoined?: () => void;
};

export default function JoinCourse({ onJoined }: Props): JSX.Element {
  const [classCode, setClassCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [open, setOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  async function join(code: string) {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/courses/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to join");

      setClassCode("");
      if (onJoined) onJoined();
      setMessage("Joined course successfully.");
      setMessageType("success");
      setTimeout(() => { setMessage(null); setMessageType(null); }, 3500);
      setOpen(false);
    } catch (err: any) {
      setMessage(err?.message || "Failed to join course");
      setMessageType("error");
      setTimeout(() => { setMessage(null); setMessageType(null); }, 5000);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && classCode.trim()) {
      join(classCode);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        iconLeft={Plus}
        onClick={() => setOpen(true)}
        disabled={loading}
        className="join-course-btn"
      >
        Join Course
      </Button>

      {open && (
        <div
          className="join-course-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-course-title"
        >
          <div className="join-course-modal" ref={modalRef}>
            <div className="join-course-header">
              <h2 id="join-course-title">Enter Class Code</h2>
              <button className="join-course-close" onClick={() => setOpen(false)} aria-label="Close">
                <Icon icon={X} size={20} />
              </button>
            </div>
            <input
              type="text"
              className="join-course-input"
              placeholder="Class code"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              disabled={loading}
            />
            <div className="join-course-actions">
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => join(classCode)} loading={loading}>
                Join
              </Button>
            </div>
            {message && (
              <div className={`join-course-notice ${messageType}`}>
                <Icon icon={messageType === "success" ? CheckCircle2 : XCircle} size={16} />
                {message}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}