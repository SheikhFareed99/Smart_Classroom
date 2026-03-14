import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import "./Enrolled.css";

interface StreamPost {
  id: number;
  authorInitials: string;
  authorName: string;
  time: string;
  body: string;
}

interface Assignment {
  id: number;
  title: string;
  due: string;
  points: number;
  status: "Submitted" | "Pending" | "Not started";
}

interface Material {
  id: number;
  title: string;
  type: string;
  size: string;
  uploadedDate: string;
}

interface ChatMessage {
  id: number;
  role: "user" | "bot";
  text: string;
  time: string;
}


const SAMPLE_STREAM: StreamPost[] = [
  {
    id: 1,
    authorInitials: "AS",
    authorName: "Dr. Amina Siddiqui",
    time: "Feb 14, 2026 · 11:00 AM",
    body: "Welcome to Human Computer Interaction! This course will cover usability principles, user research methods, prototyping, and evaluation techniques. Please read the first two chapters of  before our next class.",
  },
  {
    id: 2,
    authorInitials: "AS",
    authorName: "Dr. Amina Siddiqui",
    time: "Feb 12, 2026 · 3:00 PM",
    body: "Assignment 1 on Heuristic Evaluation has been posted. You will work in teams of 3. Check the Assignments tab for details. Deadline: March 1, 2026.",
  },
  {
    id: 3,
    authorInitials: "AS",
    authorName: "Dr. Amina Siddiqui",
    time: "Feb 10, 2026 · 10:15 AM",
    body: 'Lecture slides for "Nielsen\'s 10 Usability Heuristics" have been uploaded. Please review the material and come prepared for an in-class discussion on Thursday.',
  },
];

const SAMPLE_ASSIGNMENTS: Assignment[] = [
  {
    id: 1,
    title: "Assignment 1: Heuristic Evaluation",
    due: "Mar 1, 2026",
    points: 100,
    status: "Submitted",
  },
  {
    id: 2,
    title: "Assignment 2: User Persona Design",
    due: "Mar 20, 2026",
    points: 80,
    status: "Pending",
  },
  {
    id: 3,
    title: "Assignment 3: Wireframe Prototype",
    due: "Apr 10, 2026",
    points: 120,
    status: "Not started",
  },
];

const SAMPLE_MATERIALS: Material[] = [
  {
    id: 1,
    title: "Course Outline – HCI Fall 2026",
    type: "PDF",
    size: "1.8 MB",
    uploadedDate: "Feb 1, 2026",
  },
  {
    id: 2,
    title: "Lecture 1 – Introduction to HCI",
    type: "PPTX",
    size: "3.2 MB",
    uploadedDate: "Feb 5, 2026",
  },
  {
    id: 3,
    title: "Lecture 2 – Nielsen's 10 Heuristics",
    type: "PPTX",
    size: "4.5 MB",
    uploadedDate: "Feb 10, 2026",
  },
  {
    id: 4,
    title: "Reading: Don Norman – Design of Everyday Things (Ch. 1–3)",
    type: "PDF",
    size: "8.4 MB",
    uploadedDate: "Feb 3, 2026",
  },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 1,
    role: "bot",
    text: "👋 Hi! I'm your HCI Course AI Assistant. I can help you with course content, assignment questions, and HCI concepts. How can I help you today?",
    time: "10:00 AM",
  },
  {
    id: 2,
    role: "user",
    text: "Can you explain what a heuristic evaluation is?",
    time: "10:02 AM",
  },
  {
    id: 3,
    role: "bot",
    text: `A heuristic evaluation is a usability inspection method where evaluators examine a user interface and judge its compliance against recognized usability principles (the "heuristics"). Jakob Nielsen's 10 usability heuristics are most commonly used:\n\n1. Visibility of system status\n2. Match between system and real world\n3. User control and freedom\n4. Consistency and standards\n5. Error prevention\n\n…and 5 more. Would you like me to explain any specific heuristic in detail?`,
    time: "10:02 AM",
  },
];

// ─── Badge Component ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Assignment["status"] }) {
  const map: Record<Assignment["status"], string> = {
    Submitted: "badge-accent",
    Pending: "badge-warning",
    "Not started": "badge-neutral",
  };
  return <span className={`badge ${map[status]}`}>{status}</span>;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const FileIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface StudentCourseProps {
  courseName?: string;
  courseCode?: string;
  section?: string;
  term?: string;
  professor?: string;
  courseId?: string;
  bannerGradient?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function StudentCourse({
  courseName,
  courseCode,
  section = "Section C",
  term = "Fall 2026",
  professor,
  courseId,
  bannerGradient = "linear-gradient(135deg, #D97706, #F59E0B)",
}: StudentCourseProps) {

  const { id } = useParams();
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "assignments" | "materials" | "chatbot">("stream");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null);
  const [leaveMsgType, setLeaveMsgType] = useState<'success'|'error'|null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    let mounted = true;
    async function loadCourse() {
      if (!id) return;
      try {
        const res = await fetch(`/api/courses/${id}`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setCourseData(data.course || null);
      } catch (err) {
        // ignore
      }
    }
    loadCourse();
    return () => { mounted = false; };
  }, [id]);

  // If we're viewing a specific course by id, show a loading state
  // until `courseData` has been fetched to avoid showing hardcoded defaults.
  if (id && courseData === null) {
    return (
      <>
        <main className="main-content">
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div className="loader" style={{ marginBottom: 12 }} />
            <div>Loading course…</div>
          </div>
        </main>
      </>
    );
  }

  async function handleLeave() {
    if (!id) return;
    setLeaveMessage(null);
    try {
      const ures = await fetch('/auth/user', { credentials: 'include' });
      if (!ures.ok) throw new Error('Not authenticated');
      const udata = await ures.json();
      const res = await fetch(`/api/courses/${id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId: udata._id }),
      });
      const dj = await res.json();
      if (!res.ok) throw new Error(dj.message || 'Failed to leave');
      setLeaveMessage('You have left the class.');
      setLeaveMsgType('success');
      setShowLeaveConfirm(false);
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (err: any) {
      setLeaveMessage(err?.message || 'Error leaving the class');
      setLeaveMsgType('error');
    }
  }

  function sendMessage() {
    const msg = chatInput.trim();
    if (!msg) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: msg,
      time: now,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    // Simulated bot reply — replace with real API call
    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "bot",
        text: "That's a great question about HCI! Based on what we've covered in lectures, I can help you understand this concept better. Would you like me to provide specific examples or reference the lecture slides?",
        time: now,
      };
      setChatMessages((prev) => [...prev, botMsg]);
    }, 800);
  }

  return (
    <>
      <main className="main-content">
        {/* ── Course Banner ── */}
        <div className="course-banner" style={{ background: bannerGradient }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h1>{courseData?.title || courseName}</h1>
                <p>
                  {courseData?.courseCode || courseCode} · {section} · {term} · {courseData?.instructor?.name || professor}
                </p>
                <span className="course-code">Code: {courseData?._id || courseId}</span>
              </div>
              <div>
                <button className="btn btn-outline" onClick={() => setShowLeaveConfirm(true)}>Unenroll</button>
              </div>
            </div>
          {leaveMessage && (
            <div style={{ marginTop: 12 }}>
              <div className={`badge ${leaveMsgType === 'success' ? 'badge-accent' : 'badge-danger'}`}>{leaveMessage}</div>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="tabs">
          {(["stream", "assignments", "materials", "chatbot"] as const).map((tab) => (
            <button
              key={tab}
              className={`tab-btn${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ══════════════ TAB: Stream ══════════════ */}
        {activeTab === "stream" && (
          <div className="tab-content active" id="stream">
            <div className="stream-compose">
              <div className="avatar">ZA</div>
              <span>Add a class comment…</span>
            </div>

            {SAMPLE_STREAM.map((post) => (
              <div className="stream-post" key={post.id}>
                <div className="stream-post-header">
                  <div className="avatar" style={{ background: "#FEF3C7", color: "#B45309" }}>
                    {post.authorInitials}
                  </div>
                  <div>
                    <p className="stream-post-author">{post.authorName}</p>
                    <p className="stream-post-time">{post.time}</p>
                  </div>
                </div>
                <div className="stream-post-body">{post.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ TAB: Assignments ══════════════ */}
        {activeTab === "assignments" && (
          <div className="tab-content active" id="assignments">
            <h3 className="font-semibold mb-24">Your Assignments</h3>
            <div className="assignment-list">
              {SAMPLE_ASSIGNMENTS.map((a) => (
                <a href="student_assignment.html" className="assignment-item" key={a.id}>
                  <div className="assignment-icon">
                    <FileIcon />
                  </div>
                  <div className="assignment-info">
                    <p className="assignment-title">{a.title}</p>
                    <p className="assignment-due">
                      Due: {a.due} · {a.points} points
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ TAB: Materials ══════════════ */}
        {activeTab === "materials" && (
          <div className="tab-content active" id="materials">
            <h3 className="font-semibold mb-24">Course Materials</h3>
            {SAMPLE_MATERIALS.map((m) => (
              <div className="material-item" key={m.id}>
                <div className="material-icon">
                  <FileIcon />
                </div>
                <div className="material-info">
                  <p className="material-title">{m.title}</p>
                  <p className="material-meta">
                    {m.type} · {m.size} · Uploaded {m.uploadedDate}
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm">Download</button>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ TAB: Chatbot ══════════════ */}
        {activeTab === "chatbot" && (
          <div className="tab-content active" id="chatbot">
            <div className="chatbot-container">
              <div className="chatbot-card">
                {/* Header */}
                <div className="chatbot-header">
                  <div className="chatbot-header-icon">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </div>
                  <div>
                    <h3>Course AI Assistant</h3>
                    <p>{courseName}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="chatbot-messages" id="chatMessages">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                      {msg.text.split("\n").map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < msg.text.split("\n").length - 1 && <br />}
                        </span>
                      ))}
                      <div className="msg-time">{msg.time}</div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chatbot-input">
                  <input
                    type="text"
                    id="chatInput"
                    placeholder={`Ask about ${courseName} concepts…`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <button onClick={sendMessage}>
                    <SendIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Leave confirmation modal */}
      {showLeaveConfirm && (
        <div className={`modal-overlay active`}>
          <div className="modal">
            <div className="modal-header">
              <h2>Unenroll</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowLeaveConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to unenroll from this class?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowLeaveConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleLeave}>Unenroll</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StudentCourse;