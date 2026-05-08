import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getCourseBannerColor } from "../lib/courseColors";
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

type ScheduleEventVariant = "accent" | "warning" | "danger" | "default";

interface StudentTodoItem {
  _id: string;
  text: string;
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface StudentEventItem {
  _id: string;
  date: string;
  title: string;
  desc: string;
  variant?: ScheduleEventVariant;
  createdAt?: string;
  updatedAt?: string;
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



const POMODORO_DURATION = 25 * 60; // seconds
const CIRCUMFERENCE = 2 * Math.PI * 90; // ~565.48

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single enrolled course card */
function EnrolledCourseCard({ course }: { course: CourseAPIItem }) {
  const bannerColor = getCourseBannerColor();
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
  const [todos, setTodos] = useState<StudentTodoItem[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadTodos = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await apiFetch("/api/student-todos");
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || "Failed to load todos");
        if (mounted) setTodos(Array.isArray(data?.items) ? data.items : []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Could not load todos");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadTodos();
    return () => { mounted = false; };
  }, []);

  async function addTodo() {
    const text = input.trim();
    if (!text || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const res = await apiFetch("/api/student-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to add todo");
      if (data?.item) {
        setTodos((prev) => [data.item, ...prev]);
      }
      setInput("");
    } catch (err: any) {
      setError(err?.message || "Could not add todo");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleTodo(todo: StudentTodoItem) {
    if (updatingId) return;
    setUpdatingId(todo._id);
    setError("");
    try {
      const res = await apiFetch(`/api/student-todos/${todo._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !todo.completed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to update todo");
      if (data?.item) {
        setTodos((prev) => prev.map((t) => (t._id === todo._id ? data.item : t)));
      }
    } catch (err: any) {
      setError(err?.message || "Could not update todo");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteTodo(todoId: string) {
    if (deletingId) return;
    setDeletingId(todoId);
    setError("");
    try {
      const res = await apiFetch(`/api/student-todos/${todoId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to delete todo");
      setTodos((prev) => prev.filter((t) => t._id !== todoId));
    } catch (err: any) {
      setError(err?.message || "Could not delete todo");
    } finally {
      setDeletingId(null);
    }
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
          <button className="btn btn-primary btn-sm" onClick={addTodo} disabled={isSaving}>Add</button>
        </div>
        {error && <p className="todo-error">{error}</p>}
        {isLoading && <p className="todo-note">Loading your tasks...</p>}
        <div className="todo-list">
          {todos.map((todo) => (
            <div key={todo._id} className="todo-item">
              <div
                className={`todo-checkbox${todo.completed ? " checked" : ""}`}
                onClick={() => toggleTodo(todo)}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="10 2 4 8 1 5" />
                </svg>
              </div>
              <span className={`todo-text${todo.completed ? " completed" : ""}`}>{todo.text}</span>
              <button className="todo-delete" onClick={() => deleteTodo(todo._id)} disabled={deletingId === todo._id || updatingId === todo._id}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        {!isLoading && !error && todos.length === 0 && (
          <p className="todo-note">No personal tasks yet. Add one to get started.</p>
        )}
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
  const [events, setEvents] = useState<StudentEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<StudentEventItem | null>(null);
  const [formState, setFormState] = useState({
    date: "",
    title: "",
    desc: "",
    variant: "default" as ScheduleEventVariant,
  });

  useEffect(() => {
    let mounted = true;
    const loadEvents = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await apiFetch("/api/student-events");
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || "Failed to load events");
        if (mounted) setEvents(Array.isArray(data?.items) ? data.items : []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Could not load events");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadEvents();
    return () => { mounted = false; };
  }, []);

  function openCreateModal() {
    setEditingEvent(null);
    setFormState({ date: "", title: "", desc: "", variant: "default" });
    setIsModalOpen(true);
  }

  function openEditModal(event: StudentEventItem) {
    setEditingEvent(event);
    setFormState({
      date: event.date,
      title: event.title,
      desc: event.desc,
      variant: event.variant || "default",
    });
    setIsModalOpen(true);
  }

  async function saveEvent() {
    if (isSaving) return;
    const date = formState.date.trim();
    const title = formState.title.trim();
    const desc = formState.desc.trim();
    if (!date || !title || !desc) {
      setError("Date, title, and description are required");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const payload = { date, title, desc, variant: formState.variant };
      const endpoint = editingEvent
        ? `/api/student-events/${editingEvent._id}`
        : "/api/student-events";
      const method = editingEvent ? "PATCH" : "POST";
      const res = await apiFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to save event");
      if (data?.item) {
        setEvents((prev) => {
          if (editingEvent) {
            return prev.map((ev) => (ev._id === editingEvent._id ? data.item : ev));
          }
          return [data.item, ...prev];
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Could not save event");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEvent(event: StudentEventItem) {
    if (deletingId) return;
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    setDeletingId(event._id);
    setError("");
    try {
      const res = await apiFetch(`/api/student-events/${event._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to delete event");
      setEvents((prev) => prev.filter((ev) => ev._id !== event._id));
    } catch (err: any) {
      setError(err?.message || "Could not delete event");
    } finally {
      setDeletingId(null);
    }
  }

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
        <button className="btn btn-outline btn-sm" onClick={openCreateModal}>
          + Add Event
        </button>
      </div>
      <div className="card-body">
        {error && <p className="event-error">{error}</p>}
        {isLoading && <p className="event-note">Loading events...</p>}
        <div className="scheduler-grid">
          {events.map((ev) => (
            <div key={ev._id} className={`schedule-card${ev.variant && ev.variant !== "default" ? ` ${ev.variant}` : ""}`}>
              <div className="schedule-card-header">
                <p className="schedule-title">{ev.title}</p>
                <div className="schedule-card-actions">
                  <button
                    type="button"
                    className="schedule-card-action"
                    onClick={() => openEditModal(ev)}
                    title="Edit event"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="schedule-card-action"
                    onClick={() => deleteEvent(ev)}
                    title="Delete event"
                    disabled={deletingId === ev._id}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                      <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="schedule-date">{ev.date}</p>
              <p className="schedule-desc">{ev.desc}</p>
            </div>
          ))}
        </div>
        {!isLoading && !error && events.length === 0 && (
          <p className="event-note">No upcoming events yet. Add one to plan your week.</p>
        )}
      </div>
      {isModalOpen && (
        <div className="event-modal-overlay" role="presentation" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div
            className="event-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 id="event-modal-title">{editingEvent ? "Edit Event" : "Add Event"}</h4>
            <label className="event-modal-field">
              <span>Date and time</span>
              <input
                type="text"
                value={formState.date}
                onChange={(e) => setFormState((prev) => ({ ...prev, date: e.target.value }))}
                maxLength={120}
                placeholder="Mar 5, 2026 · 2:00 PM"
              />
            </label>
            <label className="event-modal-field">
              <span>Title</span>
              <input
                type="text"
                value={formState.title}
                onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                maxLength={160}
                placeholder="Guest lecture"
              />
            </label>
            <label className="event-modal-field">
              <span>Description</span>
              <textarea
                value={formState.desc}
                onChange={(e) => setFormState((prev) => ({ ...prev, desc: e.target.value }))}
                maxLength={500}
                rows={3}
                placeholder="Auditorium A"
              />
            </label>
            <label className="event-modal-field">
              <span>Priority</span>
              <select
                value={formState.variant}
                onChange={(e) => setFormState((prev) => ({ ...prev, variant: e.target.value as ScheduleEventVariant }))}
              >
                <option value="default">Default</option>
                <option value="accent">Accent</option>
                <option value="warning">Warning</option>
                <option value="danger">Danger</option>
              </select>
            </label>
            <div className="event-modal-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={saveEvent} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function StudentDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [enrolledCourses, setEnrolledCourses] = useState<CourseAPIItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchCourses() {
      try {
        if (!user?._id) {
          if (mounted) setCoursesLoading(false);
          return;
        }

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

  useEffect(() => {
    if (!location.hash) return;
    const targetId = location.hash.replace("#", "");
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <main className="main-content">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Panel</h1>
         
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
          {enrolledCourses.map((course) => (
            <EnrolledCourseCard key={course._id} course={course} />
          ))}
        </div>
      )}

      {/* ===== Two-column: Pomodoro + To-Do ===== */}
      <div className="two-col-grid mb-32">
        <PomodoroTimer />
        <TodoList />
      </div>


      {/* ===== Jamboard ===== */}
      <div id="jamboard">
        <Jamboard studentID={user?._id} />
      </div>

      {/* ===== Upcoming Schedule ===== */}
      <UpcomingSchedule />

    </main>
  );
}

export default StudentDashboard;