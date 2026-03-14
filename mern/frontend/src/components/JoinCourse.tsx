import React, { useState, useRef, type JSX } from "react";
import "./JoinCourse.css";

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

  async function join(code: string) {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const ures = await fetch("/auth/user", { credentials: "include" });
      if (!ures.ok) throw new Error("Not authenticated");
      const udata = await ures.json();

      const res = await fetch("/api/courses/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inviteCode: code.trim(), studentId: udata._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to join");

      setClassCode("");
      if (onJoined) onJoined();
      setMessage("Joined course successfully.");
      setMessageType("success");
      setTimeout(() => { setMessage(null); setMessageType(null); }, 3500);
      setOpen(false); // close modal after join
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
      <button className="join-course-btn" onClick={() => setOpen(true)} disabled={loading}>
        <span className="plus-icon">+</span> Join Course
      </button>

      {open && (
        <div className="join-course-overlay">
          <div className="join-course-modal">
            <h2>Enter Class Code</h2>
            <input
              type="text"
              placeholder="Class code"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              disabled={loading}
              autoFocus
            />
            <div className="join-course-actions">
              <button onClick={() => setOpen(false)} className="cancel-btn">Cancel</button>
              <button onClick={() => join(classCode)} className="submit-btn" disabled={loading}>
                {loading ? "Joining..." : "Join"}
              </button>
            </div>
            {message && (
              <div className={`join-course-notice ${messageType === "success" ? "success" : "error"}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}