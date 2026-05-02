import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";
import "./StudentPanel.css";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseAPIItem {
  _id: string;
  title: string;
  courseCode?: string;
  instructor?: { _id?: string; name?: string; email?: string } | null;
}

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

interface ScheduleEvent {
  date: string;
  title: string;
  desc: string;
  variant?: "accent" | "warning" | "danger" | "default";
}

interface WhiteboardItem {
  _id?: string;
  whiteboardID: string;
  title?: string;
  createdAt?: string;
  lastSavedAt?: string;
}

type JamboardColorFamily = "pink" | "purple" | "red" | "green" | "blue";

type JamboardColorOption = {
  shade: string;
  family: JamboardColorFamily;
};

// ─── Static data ──────────────────────────────────────────────────────────────

const COURSE_BANNER_COLORS = ["blue", "green", "purple", "orange", "pink", "teal", "indigo"];

function hashCourseSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getCourseBannerColor(courseId: string, fallbackIndex: number) {
  const seed = courseId || String(fallbackIndex);
  const colorIndex = hashCourseSeed(seed) % COURSE_BANNER_COLORS.length;
  return COURSE_BANNER_COLORS[colorIndex];
}

const JAMBOARD_SOFT_COLORS = [
  { shade: "#FFD6E5", family: "pink" },
  { shade: "#FBCFE8", family: "pink" },
  { shade: "#E9D5FF", family: "purple" },
  { shade: "#DDD6FE", family: "purple" },
  { shade: "#FECACA", family: "red" },
  { shade: "#FECDD3", family: "red" },
  { shade: "#BBF7D0", family: "green" },
  { shade: "#D9F99D", family: "green" },
  { shade: "#BFDBFE", family: "blue" },
  { shade: "#C7D2FE", family: "blue" },
] as const satisfies readonly JamboardColorOption[];

const TIMETABLE_ROWS = [
  { time: "8:00 AM", mon: { label: "AI (CS-401)", color: "" }, tue: null, wed: { label: "AI (CS-401)", color: "" }, thu: null, fri: { label: "AI Lab", color: "" } },
  { time: "9:30 AM", mon: null, tue: { label: "HCI (CS-312)", color: "green" }, wed: null, thu: { label: "HCI (CS-312)", color: "green" }, fri: null },
  { time: "11:00 AM", mon: { label: "NLP (CS-482)", color: "purple" }, tue: null, wed: { label: "NLP (CS-482)", color: "purple" }, thu: null, fri: { label: "NLP Lab", color: "purple" } },
  { time: "12:30 PM", mon: null, tue: null, wed: null, thu: null, fri: null, isLunch: true },
  { time: "2:00 PM", mon: null, tue: { label: "CV (CS-491)", color: "orange" }, wed: null, thu: { label: "CV (CS-491)", color: "orange" }, fri: null },
  { time: "3:30 PM", mon: { label: "CV Lab", color: "orange" }, tue: null, wed: null, thu: null, fri: null },
] as const;

const DEFAULT_TODOS: TodoItem[] = [
  { id: 1, text: "Read HCI Chapter 1-2", completed: true },
  { id: 2, text: "Complete AI Assignment 1", completed: false },
  { id: 3, text: "Study for NLP quiz", completed: false },
  { id: 4, text: "Prepare wireframes for HCI project", completed: false },
  { id: 5, text: "Review Deep Learning lecture notes", completed: false },
];

const SCHEDULE_EVENTS: ScheduleEvent[] = [
  { date: "Feb 15, 2026 · 8:00 AM", title: "AI Lecture – Game Trees", desc: "Room 301, CS Building", variant: "default" },
  { date: "Feb 15, 2026 · 9:30 AM", title: "HCI Lab Session", desc: "Lab 205, Design Wing", variant: "accent" },
  { date: "Feb 18, 2026 · 11:59 PM", title: "NLP Quiz 2 Deadline", desc: "Online submission via portal", variant: "warning" },
  { date: "Feb 28, 2026 · 11:59 PM", title: "AI Assignment 1 Due", desc: "Search Algorithms — Submit online", variant: "danger" },
  { date: "Mar 1, 2026 · 11:59 PM", title: "HCI Assignment 1 Due", desc: "Heuristic Evaluation — PDF only", variant: "default" },
  { date: "Mar 5, 2026 · 2:00 PM", title: "CV Guest Lecture", desc: "Auditorium — Dr. Li Wei on Object Detection", variant: "accent" },
];

const POMODORO_DURATION = 25 * 60; // seconds
const CIRCUMFERENCE = 2 * Math.PI * 90; // ~565.48

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single enrolled course card */
function EnrolledCourseCard({ course, index }: { course: CourseAPIItem; index: number }) {
  const bannerColor = getCourseBannerColor(course._id, index);
  const instructorName =
    course.instructor && typeof course.instructor === "object" && course.instructor.name
      ? course.instructor.name
      : "Instructor";
  return (
    <Link to={`/enrolled/${course._id}`} state={{ color: bannerColor }} className="course-card">
      <div className={`course-card-banner ${bannerColor}`}>
        <h3>{course.title}</h3>
      </div>
      <div className="course-card-body">
        <p className="course-card-section">{course.courseCode || ""}</p>
        <div className="course-card-meta">
          <div className="course-card-students">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            {instructorName}
          </div>
          <span className="badge badge-primary">Active</span>
        </div>
      </div>
    </Link>
  );
}

/** Pomodoro timer widget */
function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("Focus Session");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const progress = (POMODORO_DURATION - timeLeft) / POMODORO_DURATION;
  const offset = CIRCUMFERENCE * progress;

  function start() {
    if (running) return;
    setRunning(true);
    setLabel("Focus in progress…");
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setLabel("Time's up! Take a break.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function pause() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setLabel("Paused");
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setTimeLeft(POMODORO_DURATION);
    setLabel("Focus Session");
  }

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold flex items-center gap-8">
          <svg width="20" height="20" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Pomodoro Timer
        </h3>
      </div>
      <div className="card-body pomodoro-card">
        <div className="pomodoro-progress">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle className="bg" cx="100" cy="100" r="90" />
            <circle
              className="fg"
              cx="100" cy="100" r="90"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="pomodoro-time-inside">{mins}:{secs}</div>
        </div>
        <p className="pomodoro-label">{label}</p>
        <div className="pomodoro-controls">
          <button className="btn btn-primary" onClick={start}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start
          </button>
          <button className="btn btn-outline" onClick={pause}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            Pause
          </button>
          <button className="btn btn-ghost" onClick={reset}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

/** To-do list widget */
function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>(DEFAULT_TODOS);
  const [input, setInput] = useState("");
  const nextId = useRef(DEFAULT_TODOS.length + 1);

  function addTodo() {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: nextId.current++, text, completed: false }]);
    setInput("");
  }

  function toggleTodo(id: number) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  function deleteTodo(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold flex items-center gap-8">
          <svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          To-Do List
        </h3>
      </div>
      <div className="card-body">
        <div className="todo-input-group">
          <input
            type="text"
            placeholder="Add a new task…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTodo(); }}
          />
          <button className="btn btn-primary btn-sm" onClick={addTodo}>Add</button>
        </div>
        <div className="todo-list">
          {todos.map((todo) => (
            <div key={todo.id} className="todo-item">
              <div
                className={`todo-checkbox${todo.completed ? " checked" : ""}`}
                onClick={() => toggleTodo(todo.id)}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="10 2 4 8 1 5" />
                </svg>
              </div>
              <span className={`todo-text${todo.completed ? " completed" : ""}`}>{todo.text}</span>
              <button className="todo-delete" onClick={() => deleteTodo(todo.id)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A single timetable cell */
function TimetableCell({ block }: { block: { label: string; color: string } | null }) {
  if (!block) return <td />;
  return (
    <td>
      <span className={`class-block${block.color ? ` ${block.color}` : ""}`}>
        {block.label}
      </span>
    </td>
  );
}

/** Weekly timetable */
function WeeklyTimetable() {
  return (
    <div className="card mb-32">
      <div className="card-header">
        <h3 className="font-semibold flex items-center gap-8">
          <svg width="20" height="20" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Weekly Timetable
        </h3>
      </div>
      <div className="card-body" style={{ overflowX: "auto" }}>
        <table className="timetable">
          <thead>
            <tr>
              <th>Time</th>
              <th>Monday</th>
              <th>Tuesday</th>
              <th>Wednesday</th>
              <th>Thursday</th>
              <th>Friday</th>
            </tr>
          </thead>
          <tbody>
            {TIMETABLE_ROWS.map((row) => (
              <tr key={row.time}>
                <td className="time-col">{row.time}</td>
                {"isLunch" in row && row.isLunch ? (
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                    — Lunch Break —
                  </td>
                ) : (
                  <>
                    <TimetableCell block={"mon" in row ? row.mon as { label: string; color: string } | null : null} />
                    <TimetableCell block={"tue" in row ? row.tue as { label: string; color: string } | null : null} />
                    <TimetableCell block={"wed" in row ? row.wed as { label: string; color: string } | null : null} />
                    <TimetableCell block={"thu" in row ? row.thu as { label: string; color: string } | null : null} />
                    <TimetableCell block={"fri" in row ? row.fri as { label: string; color: string } | null : null} />
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Jamboard / sticky notes */
function Jamboard({ studentID }: { studentID?: string }) {
  const [title, setTitle] = useState("My Whiteboard");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [boardPendingDelete, setBoardPendingDelete] = useState<WhiteboardItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [boards, setBoards] = useState<WhiteboardItem[]>([]);
  const [error, setError] = useState("");
  const boardCardColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    let previousFamily: JamboardColorFamily | null = null;

    boards.forEach((board) => {
      const eligibleColors = previousFamily
        ? JAMBOARD_SOFT_COLORS.filter((color) => color.family !== previousFamily)
        : JAMBOARD_SOFT_COLORS;
      const pool = eligibleColors.length ? eligibleColors : JAMBOARD_SOFT_COLORS;
      const randomIndex = Math.floor(Math.random() * pool.length);
      const chosen = pool[randomIndex];

      colorMap[board.whiteboardID] = chosen.shade;
      previousFamily = chosen.family;
    });

    return colorMap;
  }, [boards]);

  async function loadBoards(currentStudentID: string) {
    setIsLoadingBoards(true);
    try {
      const res = await apiFetch(`/api/whiteboard/student/${currentStudentID}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data)) {
        throw new Error("Failed to load saved Jamboards");
      }

      const sortedBoards = [...data].sort((a: WhiteboardItem, b: WhiteboardItem) => {
        const aTime = new Date(a.lastSavedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.lastSavedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      setBoards(sortedBoards);
    } catch (err: any) {
      setError(err?.message || "Could not load saved Jamboards");
    } finally {
      setIsLoadingBoards(false);
    }
  }

  function openJamboard(whiteboardID: string) {
    const jamboardUrl = new URL(`/jamboard/${whiteboardID}`, window.location.origin).toString();
    window.open(jamboardUrl, "_blank", "noopener,noreferrer");
  }

  function getBoardDisplayDate(board: WhiteboardItem) {
    const raw = board.lastSavedAt || board.createdAt;
    if (!raw) return "No activity yet";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "No activity yet";
    return date.toLocaleString();
  }

  useEffect(() => {
    setError("");
    if (!studentID) {
      setBoards([]);
      return;
    }
    loadBoards(studentID);
  }, [studentID]);

  async function createJamboard() {
    if (!studentID || isCreating) return;
    setIsCreating(true);
    setError("");

    try {
      const res = await apiFetch("/api/whiteboard/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentID,
          title: title.trim() || "My Whiteboard",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.whiteboardID) {
        throw new Error(data?.error || data?.message || "Failed to create Jamboard");
      }

      await loadBoards(studentID);
      setIsCreateModalOpen(false);
      openJamboard(data.whiteboardID);
    } catch (err: any) {
      setError(err?.message || "Could not create Jamboard");
    } finally {
      setIsCreating(false);
    }
  }

  async function deleteJamboard() {
    if (!boardPendingDelete || isDeleting) return;
    setIsDeleting(true);
    setError("");

    try {
      const res = await apiFetch(`/api/whiteboard/${boardPendingDelete.whiteboardID}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Failed to delete Jamboard");
      }

      setBoards((prev) => prev.filter((board) => board.whiteboardID !== boardPendingDelete.whiteboardID));
      setBoardPendingDelete(null);
    } catch (err: any) {
      setError(err?.message || "Could not delete Jamboard");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="card mb-32">
      <div className="card-header">
        <h3 className="font-semibold flex items-center gap-8">
          <svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <rect x="2" y="2" width="16" height="16" rx="2" />
            <path d="M8 2v16" />
            <path d="M2 8h6" />
          </svg>
          Jamboard
        </h3>
        <div className="jamboard-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setTitle("My Whiteboard");
              setIsCreateModalOpen(true);
            }}
            disabled={!studentID}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="1" x2="7" y2="13" />
              <line x1="1" y1="7" x2="13" y2="7" />
            </svg>
            Create Jamboard
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="jamboard-boards-grid">
          {boards.map((board) => (
            <article
              key={board.whiteboardID}
              className="jamboard-board-card"
              style={{
                backgroundColor: boardCardColors[board.whiteboardID],
                borderColor: "rgba(15, 23, 42, 0.08)",
              }}
              onClick={() => openJamboard(board.whiteboardID)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openJamboard(board.whiteboardID);
                }
              }}
              tabIndex={0}
              role="button"
              title="Open board"
            >
              <div className="jamboard-board-content">
                <p className="jamboard-board-title">{board.title?.trim() || "Untitled Whiteboard"}</p>
                <p className="jamboard-board-meta">Last updated: {getBoardDisplayDate(board)}</p>
              </div>
              <button
                type="button"
                className="jamboard-board-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  setBoardPendingDelete(board);
                }}
                title="Delete board"
                aria-label={`Delete ${board.title?.trim() || "untitled board"}`}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                  <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </article>
          ))}
        </div>
        {isLoadingBoards && <p className="jamboard-note">Refreshing your Jamboards...</p>}
        {!isLoadingBoards && boards.length === 0 && studentID && (
          <p className="jamboard-note">No saved Jamboards yet. Create one to get started.</p>
        )}
        {error && <p className="jamboard-error">{error}</p>}
        {!studentID && <p className="jamboard-error">Sign in again to create a Jamboard.</p>}
      </div>

      {isCreateModalOpen && (
        <div className="jamboard-modal-overlay" role="presentation" onClick={() => !isCreating && setIsCreateModalOpen(false)}>
          <div
            className="jamboard-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="jamboard-create-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 id="jamboard-create-title">Create Jamboard</h4>
            <label className="jamboard-modal-field">
              <span>Board name</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="My Whiteboard"
                onKeyDown={(event) => {
                  if (event.key === "Enter") createJamboard();
                }}
                autoFocus
              />
            </label>
            <div className="jamboard-modal-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={createJamboard} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {boardPendingDelete && (
        <div className="jamboard-modal-overlay" role="presentation" onClick={() => !isDeleting && setBoardPendingDelete(null)}>
          <div
            className="jamboard-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="jamboard-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 id="jamboard-delete-title">Delete Jamboard?</h4>
            <p className="jamboard-modal-message">
              This will permanently remove "{boardPendingDelete.title?.trim() || "Untitled Whiteboard"}".
            </p>
            <div className="jamboard-modal-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBoardPendingDelete(null)} disabled={isDeleting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm jamboard-modal-confirm-delete"
                onClick={deleteJamboard}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Upcoming schedule */
function UpcomingSchedule() {
  return (
    <div className="card">
      <div className="card-header flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-8">
          <svg width="20" height="20" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Upcoming Schedule
        </h3>
        <button className="btn btn-outline btn-sm">+ Add Event</button>
      </div>
      <div className="card-body">
        <div className="scheduler-grid">
          {SCHEDULE_EVENTS.map((ev, i) => (
            <div key={i} className={`schedule-card${ev.variant && ev.variant !== "default" ? ` ${ev.variant}` : ""}`}>
              <p className="schedule-date">{ev.date}</p>
              <p className="schedule-title">{ev.title}</p>
              <p className="schedule-desc">{ev.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function StudentDashboard() {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<CourseAPIItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    let mounted = true;
    async function fetchCourses() {
      try {
        if (!user?._id) {
          if (mounted) setCoursesLoading(false);
          return;
        }

        if (mounted) setUserName(user.name || "");
        const res = await apiFetch(`/api/courses/user/${user._id}`);
        if (!res.ok) { if (mounted) setCoursesLoading(false); return; }
        const data = await res.json();
        if (!mounted) return;
        setEnrolledCourses(Array.isArray(data.enrolled) ? data.enrolled : []);
      } catch {
        // ignore network errors
      } finally {
        if (mounted) setCoursesLoading(false);
      }
    }
    fetchCourses();
    return () => { mounted = false; };
  }, [user]);

  return (
    <main className="main-content">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Panel</h1>
          <p className="page-subtitle">
            {userName ? `Welcome, ${userName}. ` : ""}Manage your study tools, schedule, and productivity.
          </p>
        </div>
      </div>

      {/* ===== Enrolled Courses ===== */}
      <div className="section-header">
        <h2 className="section-title">
          <svg className="icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Enrolled Courses
        </h2>
      </div>

      {coursesLoading ? (
        <div className="courses-loading mb-32">
          <span className="courses-loading-spinner" />
          Loading courses…
        </div>
      ) : enrolledCourses.length === 0 ? (
        <p className="mb-32" style={{ color: "var(--text-muted)", padding: "16px 0" }}>
          You are not enrolled in any courses yet.
        </p>
      ) : (
        <div className="course-grid mb-32">
          {enrolledCourses.map((course, i) => (
            <EnrolledCourseCard key={course._id} course={course} index={i} />
          ))}
        </div>
      )}

      {/* ===== Two-column: Pomodoro + To-Do ===== */}
      <div className="two-col-grid mb-32">
        <PomodoroTimer />
        <TodoList />
      </div>

      {/* ===== Weekly Timetable ===== */}
      <WeeklyTimetable />

      {/* ===== Jamboard ===== */}
      <Jamboard studentID={user?._id} />

      {/* ===== Upcoming Schedule ===== */}
      <UpcomingSchedule />

    </main>
  );
}

export default StudentDashboard;