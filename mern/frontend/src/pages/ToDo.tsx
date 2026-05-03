import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { AlertTriangle } from "lucide-react";
import Icon from "../components/ui/Icon";
import "./ToDo.css";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TodoItem {
  _id: string;
  title: string;
  description: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  deadline: string | null;
  totalPoints: number;
  todoStatus: "assigned" | "submitted" | "graded" | "missing" | "late";
  submittedAt: string | null;
  grade: number | null;
  createdAt: string;
}

type FilterTab = "all" | "assigned" | "missing" | "done";

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusBadge(status: TodoItem["todoStatus"]) {
  const map: Record<TodoItem["todoStatus"], { label: string; className: string }> = {
    assigned:  { label: "Assigned",  className: "todo-badge todo-badge--assigned"  },
    submitted: { label: "Turned in", className: "todo-badge todo-badge--submitted" },
    graded:    { label: "Graded",    className: "todo-badge todo-badge--graded"    },
    missing:   { label: "Missing",   className: "todo-badge todo-badge--missing"   },
    late:      { label: "Late",      className: "todo-badge todo-badge--late"      },
  };
  const s = map[status] || map.assigned;
  return <span className={s.className}>{s.label}</span>;
}

function formatDeadline(dateStr: string | null) {
  if (!dateStr) return "No due date";
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) {
    return `Today, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  }
  if (isTomorrow) {
    return `Tomorrow, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(deadline: string | null) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function timeUntil(deadline: string | null): string {
  if (!deadline) return "";
  const now = new Date().getTime();
  const due = new Date(deadline).getTime();
  const diff = due - now;
  if (diff <= 0) return "Overdue";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ToDo() {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("/api/todo");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load");
        if (mounted) setItems(data.items || []);
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // ── Filter + count ──────────────────────────────────────────────────────

  const counts = useMemo(() => {
    let assigned = 0, missing = 0, done = 0;
    for (const item of items) {
      if (item.todoStatus === "assigned") assigned++;
      else if (item.todoStatus === "missing") missing++;
      else if (item.todoStatus === "submitted" || item.todoStatus === "graded" || item.todoStatus === "late") done++;
    }
    return { all: items.length, assigned, missing, done };
  }, [items]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return items;
    if (activeTab === "assigned") return items.filter((i) => i.todoStatus === "assigned");
    if (activeTab === "missing") return items.filter((i) => i.todoStatus === "missing");
    return items.filter((i) => ["submitted", "graded", "late"].includes(i.todoStatus));
  }, [items, activeTab]);

  // ── Group by course ────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const map = new Map<string, { courseTitle: string; courseCode: string; courseId: string; items: TodoItem[] }>();
    for (const item of filtered) {
      const key = item.courseId;
      if (!map.has(key)) {
        map.set(key, {
          courseTitle: item.courseTitle,
          courseCode: item.courseCode,
          courseId: item.courseId,
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [filtered]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="main-content">
        <div className="todo-loading">
          <div className="todo-loading-spinner" />
          <p>Loading your assignments…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="main-content">
        <div className="todo-error"><Icon icon={AlertTriangle} size={16} /> {error}</div>
      </main>
    );
  }

  return (
    <main className="main-content">
      {/* Header */}
      <div className="todo-header">
        <div className="todo-header-icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div>
          <h1 className="todo-title">To Do</h1>
          <p className="todo-subtitle">Track your assignments across all courses</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="todo-tabs">
        {(["all", "assigned", "missing", "done"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            className={`todo-tab ${activeTab === tab ? "todo-tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="todo-tab-label">{tab === "all" ? "All" : tab === "assigned" ? "Assigned" : tab === "missing" ? "Missing" : "Done"}</span>
            <span className={`todo-tab-count ${tab === "missing" && counts.missing > 0 ? "todo-tab-count--danger" : ""}`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="todo-empty">
          <svg width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <h3>
            {activeTab === "all" ? "No assignments yet" :
             activeTab === "assigned" ? "Nothing assigned right now" :
             activeTab === "missing" ? "You're all caught up!" :
             "No completed assignments yet"}
          </h3>
          <p>
            {activeTab === "missing"
              ? "Great job — no missing assignments."
              : "Assignments from your enrolled courses will appear here."}
          </p>
        </div>
      )}

      {/* Grouped assignment cards */}
      {grouped.map((group) => (
        <div key={group.courseId} className="todo-course-group">
          <div className="todo-course-header">
            <div className="todo-course-dot" />
            <h2 className="todo-course-title">{group.courseTitle}</h2>
            {group.courseCode && <span className="todo-course-code">{group.courseCode}</span>}
            <span className="todo-course-count">{group.items.length} {group.items.length === 1 ? "item" : "items"}</span>
          </div>

          <div className="todo-items">
            {group.items.map((item) => {
              const overdue = item.todoStatus === "assigned" && isOverdue(item.deadline);
              return (
                <Link
                  key={item._id}
                  to={`/student-assignment/${item._id}`}
                  state={{ courseId: item.courseId }}
                  className={`todo-card ${overdue ? "todo-card--urgent" : ""}`}
                >
                  <div className="todo-card-left">
                    <div className={`todo-card-icon ${item.todoStatus === "submitted" || item.todoStatus === "graded" ? "todo-card-icon--done" : overdue ? "todo-card-icon--urgent" : ""}`}>
                      {item.todoStatus === "submitted" || item.todoStatus === "graded" ? (
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      )}
                    </div>
                    <div className="todo-card-info">
                      <p className="todo-card-title">{item.title}</p>
                      {item.description && (
                        <p className="todo-card-desc">{item.description.length > 100 ? item.description.slice(0, 100) + "…" : item.description}</p>
                      )}
                      <div className="todo-card-meta">
                        <span className={`todo-card-due ${overdue ? "todo-card-due--overdue" : ""}`}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {formatDeadline(item.deadline)}
                        </span>
                        {item.deadline && item.todoStatus === "assigned" && !isOverdue(item.deadline) && (
                          <span className="todo-card-countdown">{timeUntil(item.deadline)}</span>
                        )}
                        <span className="todo-card-points">{item.totalPoints} pts</span>
                      </div>
                    </div>
                  </div>
                  <div className="todo-card-right">
                    {statusBadge(item.todoStatus)}
                    {item.todoStatus === "graded" && item.grade !== null && (
                      <span className="todo-card-grade">{item.grade}/{item.totalPoints}</span>
                    )}
                    <svg className="todo-card-chevron" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </main>
  );
}
