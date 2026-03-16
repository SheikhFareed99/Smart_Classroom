import { useState } from "react";
import { useParams } from "react-router-dom";
import "./TeacherCourse.css";

// dummy data below remove when connect with backedn

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
  submitted: string;
  badge: "Active" | "Upcoming" | "Draft";
}

interface Student {
  id: number;
  initials: string;
  name: string;
  email: string;
  status: "Submitted" | "Pending" | "Late";
  avatarBg: string;
  avatarColor: string;
}

interface Material {
  id: number;
  title: string;
  type: string;
  size: string;
  uploadedDate: string;
  action: string;
}

const DUMMY_STREAM: StreamPost[] = [
  {
    id: 1,
    authorInitials: "ZA",
    authorName: "Zaeem Ahmed",
    time: "Feb 14, 2026 · 10:30 AM",
    body: "Welcome to Artificial Intelligence (CS-401)! Please review the course outline attached in the Materials tab. Our first assignment on Search Algorithms will be posted next week. Looking forward to a great semester!",
  },
  {
    id: 2,
    authorInitials: "ZA",
    authorName: "Zaeem Ahmed",
    time: "Feb 12, 2026 · 2:15 PM",
    body: "Reminder: Assignment 1 on Search Algorithms is due by Feb 28. Please submit via the Assignments tab. Late submissions will not be accepted.",
  },
  {
    id: 3,
    authorInitials: "ZA",
    authorName: "Zaeem Ahmed",
    time: "Feb 10, 2026 · 9:00 AM",
    body: 'Lecture 3 slides on Informed Search Strategies (A* algorithm) have been uploaded to Materials. Please review before Thursday\'s class.',
  },
];

const DUMMY_ASSIGNMENTS: Assignment[] = [
  {
    id: 1,
    title: "Assignment 1: Search Algorithms",
    due: "Due: Feb 28, 2026 · 38 of 42 submitted",
    submitted: "38 of 42",
    badge: "Active",
  },
  {
    id: 2,
    title: "Assignment 2: Knowledge Representation",
    due: "Due: Mar 15, 2026 · 0 of 42 submitted",
    submitted: "0 of 42",
    badge: "Upcoming",
  },
  {
    id: 3,
    title: "Assignment 3: Neural Networks",
    due: "Due: Apr 5, 2026 · Not yet published",
    submitted: "Not yet published",
    badge: "Draft",
  },
];

const DUMMY_STUDENTS: Student[] = [
  { id: 1, initials: "AA", name: "Ahmed Ali", email: "ahmed.ali@university.edu", status: "Submitted", avatarBg: "#DBEAFE", avatarColor: "#2563EB" },
  { id: 2, initials: "SF", name: "Sara Fayyaz", email: "sara.f@university.edu", status: "Submitted", avatarBg: "#D1FAE5", avatarColor: "#059669" },
  { id: 3, initials: "MK", name: "Muhammad Khan", email: "m.khan@university.edu", status: "Pending", avatarBg: "#FEF3C7", avatarColor: "#B45309" },
  { id: 4, initials: "HN", name: "Hira Nawaz", email: "hira.n@university.edu", status: "Submitted", avatarBg: "#F3E8FF", avatarColor: "#7C3AED" },
  { id: 5, initials: "UR", name: "Usman Raza", email: "usman.r@university.edu", status: "Late", avatarBg: "#FFE4E6", avatarColor: "#E11D48" },
  { id: 6, initials: "FA", name: "Fatima Ashraf", email: "fatima.a@university.edu", status: "Submitted", avatarBg: "#DBEAFE", avatarColor: "#2563EB" },
];

const DUMMY_MATERIALS: Material[] = [
  { id: 1, title: "Course Outline – AI Fall 2026", type: "PDF", size: "2.4 MB", uploadedDate: "Feb 1, 2026", action: "Download" },
  { id: 2, title: "Lecture 1 – Introduction to AI", type: "PPTX", size: "5.1 MB", uploadedDate: "Feb 5, 2026", action: "Download" },
  { id: 3, title: "Lecture 2 – Uninformed Search", type: "PPTX", size: "4.7 MB", uploadedDate: "Feb 8, 2026", action: "Download" },
  { id: 4, title: "Lecture 3 – Informed Search (A*)", type: "PPTX", size: "6.2 MB", uploadedDate: "Feb 10, 2026", action: "Download" },
  { id: 5, title: "Reference: AIMA Textbook (Chapter 1-4)", type: "Link", size: "", uploadedDate: "Feb 1, 2026", action: "Open" },
];

/* ── SVG Icons ──────────────────────────────────────────────────── */

const FileIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

/* ── Badge helpers ──────────────────────────────────────────────── */

function AssignmentBadge({ badge }: { badge: Assignment["badge"] }) {
  const map: Record<Assignment["badge"], string> = {
    Active: "badge-accent",
    Upcoming: "badge-warning",
    Draft: "badge-neutral",
  };
  return <span className={`badge ${map[badge]}`}>{badge}</span>;
}

function StudentBadge({ status }: { status: Student["status"] }) {
  const map: Record<Student["status"], string> = {
    Submitted: "badge-accent",
    Pending: "badge-warning",
    Late: "badge-danger",
  };
  return <span className={`badge ${map[status]}`}>{status}</span>;
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function TeacherCourse() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<"stream" | "assignments" | "students" | "materials">("stream");

  // For now we use dummy data — no backend needed
  const courseName = "Artificial Intelligence";
  const courseDetails = "CS-401 · Section A · Fall 2026 · 42 Students";
  const courseCode = "AI-2026-FA";

  return (
    <main className="main-content">
      {/* ── Course Banner ── */}
      <div className="course-banner">
        <h1>{courseName}</h1>
        <p>{courseDetails}</p>
        <span className="course-code">Code: {courseCode}</span>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        <button
          className={`tab-btn${activeTab === "stream" ? " active" : ""}`}
          onClick={() => setActiveTab("stream")}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "middle" }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Stream
        </button>
        <button
          className={`tab-btn${activeTab === "assignments" ? " active" : ""}`}
          onClick={() => setActiveTab("assignments")}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "middle" }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Assignments
        </button>
        <button
          className={`tab-btn${activeTab === "students" ? " active" : ""}`}
          onClick={() => setActiveTab("students")}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "middle" }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          Students
        </button>
        <button
          className={`tab-btn${activeTab === "materials" ? " active" : ""}`}
          onClick={() => setActiveTab("materials")}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "middle" }}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Materials
        </button>
      </div>

      {/* ══════════════ TAB: Stream ══════════════ */}
      {activeTab === "stream" && (
        <div className="tab-content active" id="stream">
          <div className="stream-compose">
            <div className="avatar">ZA</div>
            <span>Announce something to your class…</span>
          </div>

          {DUMMY_STREAM.map((post) => (
            <div className="stream-post" key={post.id}>
              <div className="stream-post-header">
                <div className="avatar">{post.authorInitials}</div>
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
          <div className="flex justify-between items-center mb-24">
            <h3 className="font-semibold">All Assignments</h3>
            <button className="btn btn-primary btn-sm">+ Create Assignment</button>
          </div>

          <div className="assignment-list">
            {DUMMY_ASSIGNMENTS.map((a) => (
              <a href="#" className="assignment-item" key={a.id}>
                <div className="assignment-icon">
                  <FileIcon />
                </div>
                <div className="assignment-info">
                  <p className="assignment-title">{a.title}</p>
                  <p className="assignment-due">{a.due}</p>
                </div>
                <AssignmentBadge badge={a.badge} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ TAB: Students ══════════════ */}
      {activeTab === "students" && (
        <div className="tab-content active" id="students">
          <div className="flex justify-between items-center mb-24">
            <h3 className="font-semibold">Enrolled Students (42)</h3>
            <button className="btn btn-outline btn-sm">+ Invite Student</button>
          </div>

          <div className="card">
            <div className="student-list">
              {DUMMY_STUDENTS.map((s) => (
                <div className="student-item" key={s.id}>
                  <div
                    className="avatar"
                    style={{ background: s.avatarBg, color: s.avatarColor }}
                  >
                    {s.initials}
                  </div>
                  <div>
                    <p className="student-name">{s.name}</p>
                    <p className="student-email">{s.email}</p>
                  </div>
                  <span style={{ marginLeft: "auto" }}>
                    <StudentBadge status={s.status} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: Materials ══════════════ */}
      {activeTab === "materials" && (
        <div className="tab-content active" id="materials">
          <div className="flex justify-between items-center mb-24">
            <h3 className="font-semibold">Course Materials</h3>
            <button className="btn btn-primary btn-sm">+ Upload Material</button>
          </div>

          {DUMMY_MATERIALS.map((m) => (
            <div className="material-item" key={m.id}>
              <div className="material-icon">
                <FileIcon />
              </div>
              <div className="material-info">
                <p className="material-title">{m.title}</p>
                <p className="material-meta">
                  {m.type}{m.size ? ` · ${m.size}` : ""} · Uploaded {m.uploadedDate}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm">{m.action}</button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
