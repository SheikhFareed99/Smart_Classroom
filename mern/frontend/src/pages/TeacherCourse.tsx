import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import VoiceChannel from "../voice/components/VoiceChannel";
import "./TeacherCourse.css";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnnouncementComment {
  _id?: string;
  author?: { _id: string; name?: string; email?: string } | string;
  text: string;
  createdAt: string;
}

interface Announcement {
  _id: string;
  author?: { _id: string; name?: string; email?: string } | string;
  text: string;
  comments: AnnouncementComment[];
  createdAt: string;
}

interface Deliverable {
  _id: string; title: string; description?: string;
  deadline?: string; totalPoints: number;
  status: "draft" | "published"; createdAt: string;
  plagiarismLastCheckedAt?: string;
  plagiarismAutoCheckedAt?: string;
  attachments: { fileName: string; url: string }[];
}

interface SubmissionComment {
  _id?: string;
  author?: { _id: string; name?: string; email?: string } | string;
  text: string;
  createdAt: string;
}

type ClassComment = SubmissionComment;

interface Submission {
  _id: string;
  student: { _id: string; name: string; email: string } | null;
  status: "submitted" | "late" | "graded" | "not_submitted";
  submittedAt?: string;
  grade?: number;
  feedback?: string;
  attachments: { fileName: string; url: string; mimeType?: string; sizeBytes?: number }[];
  privateComments?: SubmissionComment[];
  classComments?: SubmissionComment[];
}

interface Module { _id: string; title: string; description?: string; order: number; }
interface Material { _id: string; title: string; type: string; url: string; sizeBytes?: number; uploadedAt: string; }

// ─── SVG helpers ─────────────────────────────────────────────────────────────

const FileIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const FolderIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// ─── Badge helpers ───────────────────────────────────────────────────────────

function AssignmentBadge({ status }: { status: Deliverable["status"] }) {
  const map = { published: "badge-accent", draft: "badge-neutral" };
  return <span className={`badge ${map[status]}`}>{status === "published" ? "Published" : "Draft"}</span>;
}

function SubStatusBadge({ status }: { status: Submission["status"] }) {
  const map: Record<string, string> = {
    submitted: "badge-accent", graded: "badge-primary",
    late: "badge-warning", not_submitted: "badge-neutral",
  };
  const label: Record<string, string> = {
    submitted: "Submitted", graded: "Graded",
    late: "Late", not_submitted: "Not Submitted",
  };
  return <span className={`badge ${map[status] || "badge-neutral"}`}>{label[status] || status}</span>;
}

function formatBytes(b?: number) {
  if (!b) return "";
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TeacherCourse() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stream" | "assignments" | "students" | "materials">("stream");

  // Course info
  const [courseName, setCourseName] = useState("Loading…");
  const [courseDetails, setCourseDetails] = useState("");
  const [courseCode, setCourseCode] = useState("");

  // Stream announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [streamLoading, setStreamLoading] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [postingAnnouncementId, setPostingAnnouncementId] = useState<string | null>(null);
  const [announcementCommentInputs, setAnnouncementCommentInputs] = useState<Record<string, string>>({});
  const [expandedAnnouncementComments, setExpandedAnnouncementComments] = useState<Record<string, boolean>>({});

  // Assignments
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [aLoading, setALoading] = useState(false);

  // Submissions drawer
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [privateCommentText, setPrivateCommentText] = useState("");
  const [classCommentText, setClassCommentText] = useState("");
  const [postingScope, setPostingScope] = useState<"private" | "class" | null>(null);
  const [showClassComments, setShowClassComments] = useState(false);
  const [classComments, setClassComments] = useState<ClassComment[]>([]);
  const [classCommentsLoading, setClassCommentsLoading] = useState(false);

  // Enrolled students
  const [enrolledStudents, setEnrolledStudents] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [stuLoading, setStuLoading] = useState(false);

  // Modules & Materials
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleMaterials, setModuleMaterials] = useState<Record<string, Material[]>>({});
  const [mLoading, setMLoading] = useState(false);
  const [expandedMod, setExpandedMod] = useState<Record<string, boolean>>({});

  // Create module modal state
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [newModTitle, setNewModTitle] = useState("");
  const [newModDesc, setNewModDesc]   = useState("");
  const [modCreating, setModCreating] = useState(false);

  // Upload material modal state
  const [uploadForModule, setUploadForModule] = useState<Module | null>(null);
  const [matTitle, setMatTitle]   = useState("");
  const [matFile, setMatFile]     = useState<File | null>(null);
  const [matUploading, setMatUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Error/success toast
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const announcementApiBase = "/api/announcements";

  function nameFromAuthor(author?: { _id: string; name?: string; email?: string } | string): string {
    if (!author || typeof author === "string") return "Instructor";
    return author.name || author.email || "Instructor";
  }

  function initialsFromAuthor(author?: { _id: string; name?: string; email?: string } | string): string {
    const name = nameFromAuthor(author);
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "T";
  }

  function formatWhen(dateIso?: string): string {
    if (!dateIso) return "Now";
    const dt = new Date(dateIso);
    if (Number.isNaN(dt.getTime())) return "Now";
    return dt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function loadAnnouncements() {
    if (!courseId) return;
    setStreamLoading(true);
    try {
      const r = await apiFetch(`${announcementApiBase}/courses/${courseId}/announcements`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed to load announcements");
      setAnnouncements(Array.isArray(d.announcements) ? d.announcements : []);
    } catch (err: any) {
      showToast(err.message || "Failed to load announcements", "err");
    } finally {
      setStreamLoading(false);
    }
  }

  async function postAnnouncement() {
    if (!courseId) return;
    const text = announcementText.trim();
    if (!text) return;

    setPostingAnnouncement(true);
    try {
      const r = await apiFetch(`${announcementApiBase}/courses/${courseId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // backend currently reads courseId from body
        body: JSON.stringify({ courseId, text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed to post announcement");
      setAnnouncementText("");
      showToast("Announcement posted");
      await loadAnnouncements();
    } catch (err: any) {
      showToast(err.message || "Failed to post announcement", "err");
    } finally {
      setPostingAnnouncement(false);
    }
  }

  async function postAnnouncementComment(announcementId: string) {
    const text = (announcementCommentInputs[announcementId] || "").trim();
    if (!text) return;

    setPostingAnnouncementId(announcementId);
    try {
      const r = await apiFetch(`${announcementApiBase}/announcements/${announcementId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed to post comment");
      if (d.announcement) {
        setAnnouncements(prev => prev.map(a => (a._id === announcementId ? d.announcement : a)));
      }
      setAnnouncementCommentInputs(prev => ({ ...prev, [announcementId]: "" }));
      showToast("Comment posted");
    } catch (err: any) {
      showToast(err.message || "Failed to post comment", "err");
    } finally {
      setPostingAnnouncementId(null);
    }
  }

  // ── Load course info ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!courseId) return;
    apiFetch(`/api/courses/${courseId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.course) {
          setCourseName(d.course.title);
          setCourseCode(d.course.courseCode || "");
          const stuCount = d.course.enrollments?.length || 0;
          setCourseDetails(`${d.course.courseCode || ""} · ${stuCount} Students`);
        }
      })
      .catch(() => {});
  }, [courseId]);

  useEffect(() => {
    if (activeTab !== "stream") return;
    loadAnnouncements();
  }, [activeTab, courseId]);

  // ── Load deliverables when tab active ────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "assignments" || !courseId) return;
    setALoading(true);
    apiFetch(`/api/courses/${courseId}/deliverables`)
      .then(r => r.json())
      .then(d => { if (d.success) setDeliverables(d.deliverables || []); })
      .catch(() => {})
      .finally(() => setALoading(false));
  }, [activeTab, courseId]);

  // ── Load enrolled students ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "students" || !courseId) return;
    setStuLoading(true);
    apiFetch(`/api/courses/${courseId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.course) {
          const enrolled = (d.course.enrollments || []).map((e: any) =>
            typeof e === "object" && e.user ? e.user : e
          );
          setEnrolledStudents(enrolled.filter((s: any) => s && s._id));
        }
      })
      .catch(() => {})
      .finally(() => setStuLoading(false));
  }, [activeTab, courseId]);

  // ── Load submissions for a selected deliverable ───────────────────────────────
  async function openSubmissions(deliv: Deliverable) {
    setSelectedDeliverable(deliv);
    setSubsLoading(true);
    setSubmissions([]);
    setSelectedSubmission(null);
    setShowClassComments(false);
    setClassComments([]);
    try {
      const r = await apiFetch(`/api/deliverables/${deliv._id}/submissions`);
      const d = await r.json();
      if (d.success) {
        const rows: Submission[] = d.submissions || [];
        setSubmissions(rows);
        setGradeInputs(
          Object.fromEntries(rows.map((s) => [s._id, s.grade !== undefined ? String(s.grade) : ""]))
        );
      }
    } catch { /* ignore */ }
    finally { setSubsLoading(false); }
  }

  async function saveGrade(sub: Submission) {
    if (!selectedDeliverable) return;
    const raw = gradeInputs[sub._id] ?? "";
    const grade = Number(raw);

    if (!Number.isFinite(grade) || grade < 0) {
      showToast("Enter a valid non-negative mark", "err");
      return;
    }
    if (grade > selectedDeliverable.totalPoints) {
      showToast(`Marks cannot exceed ${selectedDeliverable.totalPoints}`, "err");
      return;
    }

    setGradingSubmissionId(sub._id);
    try {
      const r = await apiFetch(`/api/submissions/${sub._id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed to save marks");

      if (d.submission) {
        setSubmissions((prev) => prev.map((s) => (s._id === d.submission._id ? d.submission : s)));
        if (selectedSubmission?._id === d.submission._id) setSelectedSubmission(d.submission);
      }
      showToast("Marks saved");
    } catch (err: any) {
      showToast(err.message || "Failed to save marks", "err");
    } finally {
      setGradingSubmissionId(null);
    }
  }

  async function loadClassComments(deliverableId: string) {
    setClassCommentsLoading(true);
    try {
      const r = await apiFetch(`/api/deliverables/${deliverableId}/class-comments`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed to load class comments");
      setClassComments(d.comments || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load class comments", "err");
    } finally {
      setClassCommentsLoading(false);
    }
  }

  async function postComment(scope: "private" | "class") {
    if (scope === "private" && !selectedSubmission?._id) {
      showToast("Select a student submission first", "err");
      return;
    }
    if (scope === "class" && !selectedDeliverable?._id) {
      showToast("Assignment not selected", "err");
      return;
    }

    const text = (scope === "private" ? privateCommentText : classCommentText).trim();
    if (!text) return;

    setPostingScope(scope);
    try {
      const r = scope === "private"
        ? await apiFetch(`/api/submissions/${selectedSubmission!._id}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scope, text }),
          })
        : await apiFetch(`/api/deliverables/${selectedDeliverable!._id}/class-comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed to post comment");

      if (scope === "private" && d.submission) {
        setSubmissions((prev) => prev.map((sub) => (sub._id === d.submission._id ? d.submission : sub)));
        setSelectedSubmission(d.submission);
      }

      if (scope === "class") {
        setClassComments(d.comments || []);
      }

      if (scope === "private") setPrivateCommentText("");
      else setClassCommentText("");
      showToast("Comment posted");
    } catch (err: any) {
      showToast(err.message || "Failed to post comment", "err");
    } finally {
      setPostingScope(null);
    }
  }

  function authorName(comment: SubmissionComment): string {
    if (!comment.author) return "Unknown";
    if (typeof comment.author === "string") return "Unknown";
    return comment.author.name || comment.author.email || "Unknown";
  }

  // ── Load modules when tab active ──────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "materials" || !courseId) return;
    loadModules();
  }, [activeTab, courseId]);

  async function loadModules() {
    if (!courseId) return;
    setMLoading(true);
    try {
      const r = await apiFetch(`/api/courses/${courseId}/modules`);
      const d = await r.json();
      if (d.success) {
        const mods: Module[] = d.modules || [];
        setModules(mods);
        if (mods.length > 0) setExpandedMod({ [mods[0]._id]: true });
        const entries = await Promise.all(
          mods.map(async m => {
            const mr = await apiFetch(`/api/courses/${courseId}/modules/${m._id}/materials`);
            const md = await mr.json();
            return [m._id, md.materials || []] as [string, Material[]];
          })
        );
        setModuleMaterials(Object.fromEntries(entries));
      }
    } catch {
    } finally {
      setMLoading(false);
    }
  }

  // ── Create module ─────────────────────────────────────────────────────────────
  async function handleCreateModule(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId || !newModTitle.trim()) return;
    setModCreating(true);
    try {
      const r = await apiFetch(`/api/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newModTitle.trim(), description: newModDesc.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed");
      setShowCreateModule(false);
      setNewModTitle(""); setNewModDesc("");
      showToast("Module created!");
      await loadModules();
    } catch (err: any) {
      showToast(err.message || "Error", "err");
    } finally {
      setModCreating(false);
    }
  }

  // ── Delete module ─────────────────────────────────────────────────────────────
  async function handleDeleteModule(mod: Module) {
    if (!courseId) return;
    if (!confirm(`Delete module "${mod.title}" and ALL its materials? This cannot be undone.`)) return;
    try {
      const r = await apiFetch(`/api/courses/${courseId}/modules/${mod._id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed");
      showToast("Module deleted");
      await loadModules();
    } catch (err: any) {
      showToast(err.message || "Error", "err");
    }
  }

  // ── Upload material ────────────────────────────────────────────────────────────
  async function handleUploadMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId || !uploadForModule || !matFile) return;
    setMatUploading(true);
    try {
      const form = new FormData();
      form.append("file", matFile);
      form.append("title", matTitle.trim() || matFile.name);
      const r = await apiFetch(
        `/api/courses/${courseId}/modules/${uploadForModule._id}/materials`,
        { method: "POST", body: form }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed");
      setUploadForModule(null);
      setMatTitle(""); setMatFile(null);
      showToast("Material uploaded!");
      await loadModules();
    } catch (err: any) {
      showToast(err.message || "Upload failed", "err");
    } finally {
      setMatUploading(false);
    }
  }

  // ── Delete material ────────────────────────────────────────────────────────────
  async function handleDeleteMaterial(mod: Module, mat: Material) {
    if (!courseId) return;
    if (!confirm(`Delete "${mat.title}"?`)) return;
    try {
      const r = await apiFetch(
        `/api/courses/${courseId}/modules/${mod._id}/materials/${mat._id}`,
        { method: "DELETE" }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed");
      showToast("Material deleted");
      await loadModules();
    } catch (err: any) {
      showToast(err.message || "Error", "err");
    }
  }

  // ── Delete assignment ──────────────────────────────────────────────────────────
  async function handleDeleteDeliverable(id: string, title: string) {
    if (!confirm(`Delete assignment "${title}"?`)) return;
    try {
      const r = await apiFetch(`/api/deliverables/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed");
      showToast("Assignment deleted");
      setDeliverables(prev => prev.filter(a => a._id !== id));
      if (selectedDeliverable?._id === id) setSelectedDeliverable(null);
    } catch (err: any) {
      showToast(err.message || "Error", "err");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const AVATAR_COLORS = ["#DBEAFE:#2563EB", "#D1FAE5:#059669", "#FEF3C7:#B45309", "#F3E8FF:#7C3AED", "#FCE7F3:#DB2777"];
  const avatarStyle = (i: number) => {
    const [bg, color] = AVATAR_COLORS[i % AVATAR_COLORS.length].split(":");
    return { background: bg, color };
  };


  return (
    <>
      <main className="main-content">
        {/* Toast */}
        {toast && (
          <div className={`tc-toast ${toast.type === "err" ? "tc-toast-err" : "tc-toast-ok"}`}>
            {toast.type === "ok" ? "✓" : "⚠"} {toast.msg}
          </div>
        )}

        {/* Banner */}
        <div className="course-banner">
          <h1>{courseName}</h1>
          <p>{courseDetails}</p>
          <span className="course-code">Code: {courseCode}</span>
        </div>

        {/* Voice Channel */}
        {courseId && user?._id && (
          <div style={{ padding: "0 24px", marginBottom: 16 }}>
            <VoiceChannel
              courseId={courseId}
              userId={user._id}
              userName={user.name || "User"}
              userRole="teacher"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {(["stream", "assignments", "students", "materials"] as const).map(tab => (
            <button
              key={tab}
              className={`tab-btn${activeTab === tab ? " active" : ""}`}
              onClick={() => { setActiveTab(tab); setSelectedDeliverable(null); }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ══ STREAM ══ */}
        {activeTab === "stream" && (
          <div className="tab-content active" id="stream">
            <div className="stream-compose">
              <div className="avatar">T</div>
              <div style={{ width: "100%" }}>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Announce something to your class..."
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={postAnnouncement}
                    disabled={postingAnnouncement || !announcementText.trim()}
                  >
                    {postingAnnouncement ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>

            {streamLoading && <p className="tc-loading">Loading announcements...</p>}

            {!streamLoading && announcements.length === 0 && (
              <div className="tc-empty">
                <p>No announcements yet.</p>
              </div>
            )}

            {!streamLoading && announcements.map(post => (
              <div className="stream-post" key={post._id}>
                <div className="stream-post-header">
                  <div className="avatar">{initialsFromAuthor(post.author)}</div>
                  <div>
                    <p className="stream-post-author">{nameFromAuthor(post.author)}</p>
                    <p className="stream-post-time">{formatWhen(post.createdAt)}</p>
                  </div>
                </div>
                <div className="stream-post-body">{post.text}</div>

                <button
                  className="tc-ann-comment-toggle"
                  onClick={() =>
                    setExpandedAnnouncementComments((prev) => ({
                      ...prev,
                      [post._id]: !prev[post._id],
                    }))
                  }
                >
                  <span>
                    {(post.comments || []).length} class {(post.comments || []).length === 1 ? "comment" : "comments"}
                  </span>
                  <span>{expandedAnnouncementComments[post._id] ? "Hide" : "Show"}</span>
                </button>

                {expandedAnnouncementComments[post._id] && (
                  <div className="tc-ann-comment-panel">
                    {(post.comments || []).map((c, idx) => (
                      <div key={c._id || `${idx}-${c.createdAt}`} className="tc-ann-comment-item">
                        <p className="stream-post-time">
                          <strong className="tc-ann-comment-author">{nameFromAuthor(c.author)}</strong>
                          {" · "}
                          {formatWhen(c.createdAt)}
                        </p>
                        <p className="tc-ann-comment-text">{c.text}</p>
                      </div>
                    ))}

                    <div className="tc-ann-comment-compose">
                      <input
                        className="form-input"
                        placeholder="Write a public class comment..."
                        value={announcementCommentInputs[post._id] || ""}
                        onChange={(e) => setAnnouncementCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
                      />
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => postAnnouncementComment(post._id)}
                        disabled={postingAnnouncementId === post._id || !(announcementCommentInputs[post._id] || "").trim()}
                      >
                        {postingAnnouncementId === post._id ? "Posting..." : "Comment"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══ ASSIGNMENTS ══ */}
        {activeTab === "assignments" && (
          <div className="tab-content active" id="assignments">

            {/* If a deliverable is selected, show its submissions panel */}
            {selectedDeliverable ? (
              <div>
                {/* ── Submissions header ── */}
                <div className="tc-subs-header">
           
                  <div className="tc-subs-title-block">
                    <h3 className="font-semibold">{selectedDeliverable.title}</h3>
                    <p className="text-sm tc-subs-meta">
                      {selectedDeliverable.deadline
                        ? `Due: ${new Date(selectedDeliverable.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                        : "No deadline"}
                      {" · "}{selectedDeliverable.totalPoints} pts
                      {" · "}<AssignmentBadge status={selectedDeliverable.status} />
                    </p>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/teacher-course/${courseId}/assignment/${selectedDeliverable._id}/plagiarism`)}
                  >
                    Plagiarism
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      const next = !showClassComments;
                      setShowClassComments(next);
                      if (next && selectedDeliverable?._id) loadClassComments(selectedDeliverable._id);
                    }}
                  >
                    Class Comments
                  </button>
                </div>

                {/* ── Submission count bar ── */}
                <div className="tc-sub-stats-bar">
                  <div className="tc-stat-badge tc-stat-submitted">
                    <strong>{submissions.filter(s => s.status === "submitted" || s.status === "graded").length}</strong> Submitted
                  </div>
                  <div className="tc-stat-badge tc-stat-pending">
                    <strong>{submissions.filter(s => s.status === "not_submitted").length}</strong> Pending
                  </div>
                  <div className="tc-stat-badge tc-stat-late">
                    <strong>{submissions.filter(s => s.status === "late").length}</strong> Late
                  </div>
                  <div className="tc-stat-badge tc-stat-total">
                    <strong>{submissions.length}</strong> Total
                  </div>
                </div>

                {subsLoading && <p className="tc-loading">Loading submissions…</p>}

                {!subsLoading && submissions.length === 0 && (
                  <div className="tc-empty">
                    <UsersIcon />
                    <p>No submissions yet for this assignment.</p>
                  </div>
                )}

                {/* ── Submissions table ── */}
                {!subsLoading && submissions.length > 0 && (
                  <div className="tc-subs-table-wrap">
                    <table className="tc-subs-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Student</th>
                          <th>Submitted At</th>
                          <th>File</th>
                          <th>Marks</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((sub, i) => {
                          const student = sub.student;
                          const file = sub.attachments?.[0];
                          const initials = student?.name
                            ? student.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                            : "?";
                          return (
                            <tr key={sub._id}>
                              <td className="tc-subs-num">{i + 1}</td>
                              <td>
                                <div className="tc-student-cell">
                                  <div className="avatar avatar-sm" style={avatarStyle(i)}>{initials}</div>
                                  <div>
                                    <p className="tc-stu-name">
                                      {student?.name
                                        ? student.name.split(" ").slice(0, 2).join(" ")
                                        : "Unknown Student"}
                                    </p>
                                    <p className="tc-stu-email">{student?.email || "—"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="tc-subs-date">
                                {sub.submittedAt
                                  ? new Date(sub.submittedAt).toLocaleString("en-US", {
                                      month: "short", day: "numeric", year: "numeric",
                                      hour: "2-digit", minute: "2-digit",
                                    })
                                  : "—"}
                              </td>
                              <td>
                                {file ? (
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline btn-sm tc-dl-btn"
                                    download
                                  >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    {file.fileName}
                                  </a>
                                ) : <span className="tc-no-file">No file</span>}
                              </td>
                              <td>
                                <div className="tc-grade-cell">
                                  <input
                                    className="form-input tc-grade-input"
                                    type="number"
                                    min={0}
                                    max={selectedDeliverable.totalPoints}
                                    value={gradeInputs[sub._id] ?? ""}
                                    onChange={(e) => setGradeInputs({ ...gradeInputs, [sub._id]: e.target.value })}
                                    placeholder="0"
                                  />
                                  <span className="tc-grade-total">/ {selectedDeliverable.totalPoints}</span>
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => saveGrade(sub)}
                                    disabled={!file || gradingSubmissionId === sub._id || !(gradeInputs[sub._id] ?? "").trim()}
                                  >
                                    {gradingSubmissionId === sub._id ? "Saving..." : "Save"}
                                  </button>
                                </div>
                              </td>
                              <td>
                                <div className="tc-sub-actions">
                                  <SubStatusBadge status={sub.status} />
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setSelectedSubmission(sub)}
                                  >
                                    Comments
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!subsLoading && selectedSubmission && (
                  <div className="tc-comments-panel">
                    <div className="tc-comments-head">
                      <h4>Comments for {selectedSubmission.student?.name || "Student"}</h4>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSubmission(null)}>Close</button>
                    </div>

                    <div className="tc-comment-thread">
                      <h5>Private Comments</h5>
                      <div className="tc-thread-list">
                        {(selectedSubmission.privateComments || []).length === 0 && (
                          <p className="tc-thread-empty">No private comments yet.</p>
                        )}
                        {(selectedSubmission.privateComments || []).map((c, idx) => (
                          <div className="tc-comment-item" key={c._id || `${idx}-${c.createdAt}`}>
                            <p className="tc-comment-meta">
                              <strong>{authorName(c)}</strong> · {new Date(c.createdAt).toLocaleString()}
                            </p>
                            <p className="tc-comment-text">{c.text}</p>
                          </div>
                        ))}
                      </div>
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Write a private comment..."
                        value={privateCommentText}
                        onChange={(e) => setPrivateCommentText(e.target.value)}
                      />
                      <div className="tc-comment-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => postComment("private")}
                          disabled={postingScope !== null || !privateCommentText.trim()}
                        >
                          {postingScope === "private" ? "Posting..." : "Post Private"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!subsLoading && showClassComments && (
                  <div className="tc-comments-panel">
                    <div className="tc-comments-head">
                      <h4>All Class Comments</h4>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowClassComments(false)}>Close</button>
                    </div>

                    <div className="tc-comment-thread">

                      <div className="tc-thread-list">
                        {classCommentsLoading && <p className="tc-thread-empty">Loading class comments...</p>}
                        {!classCommentsLoading && classComments.length === 0 && (
                          <p className="tc-thread-empty">No class comments yet.</p>
                        )}

                        {classComments.map((c, idx) => (
                          <div className="tc-comment-item" key={c._id || `${idx}-${c.createdAt}`}>
                            <p className="tc-comment-meta">
                              <strong>{authorName(c)}</strong> · {new Date(c.createdAt).toLocaleString()}
                            </p>
                            <p className="tc-comment-text">{c.text}</p>
                          </div>
                        ))}
                      </div>

                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Write a class comment..."
                        value={classCommentText}
                        onChange={(e) => setClassCommentText(e.target.value)}
                      />
                      <div className="tc-comment-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => postComment("class")}
                          disabled={postingScope !== null || !classCommentText.trim()}
                        >
                          {postingScope === "class" ? "Posting..." : "Post Class"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            ) : (
              /* ── Assignments list ── */
              <div>
                <div className="flex justify-between items-center mb-24">
                  <h3 className="font-semibold">All Assignments</h3>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/teacher-course/${courseId}/create-assignment`)}
                  >
                    + Create Assignment
                  </button>
                </div>

                {aLoading && <p className="tc-loading">Loading assignments…</p>}

                {!aLoading && deliverables.length === 0 && (
                  <div className="tc-empty">
                    <FileIcon />
                    <p>No assignments yet. Create your first one!</p>
                  </div>
                )}

                <div className="assignment-list">
                  {deliverables.map(a => (
                    <div className="assignment-item tc-assignment-item" key={a._id}>
                      <div className="assignment-icon"><FileIcon /></div>
                      <div className="assignment-info">
                        <p className="assignment-title">{a.title}</p>
                        <p className="assignment-due">
                          {a.deadline
                            ? `Due: ${new Date(a.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                            : "No deadline"}
                          {" · "}{a.totalPoints} pts
                        </p>
                      </div>
                      <AssignmentBadge status={a.status} />
                      {/* View Submissions button */}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/teacher-course/${courseId}/assignment/${a._id}/plagiarism`)}
                        title="Open plagiarism checker"
                      >
                        Plagiarism
                      </button>
                      <button
                        className="btn btn-outline btn-sm tc-view-subs-btn"
                        onClick={() => openSubmissions(a)}
                        title="View Submissions"
                      >
                        <UsersIcon />
                        Submissions
                      </button>
                      <button
                        className="btn btn-ghost btn-sm tc-del-btn"
                        onClick={() => handleDeleteDeliverable(a._id, a.title)}
                        title="Delete assignment"
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STUDENTS ══ */}
        {activeTab === "students" && (
          <div className="tab-content active" id="students">
            <div className="flex justify-between items-center mb-24">
              <h3 className="font-semibold">Enrolled Students</h3>
              <span className="badge badge-neutral">{enrolledStudents.length} students</span>
            </div>
            {stuLoading && <p className="tc-loading">Loading students…</p>}
            {!stuLoading && enrolledStudents.length === 0 && (
              <div className="tc-empty">
                <UsersIcon />
                <p>No students enrolled yet.</p>
              </div>
            )}
            {!stuLoading && enrolledStudents.length > 0 && (
              <div className="card">
                <div className="student-list">
                  {enrolledStudents.map((s, i) => {
                    const initials = (s.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <div className="student-item" key={s._id}>
                        <div className="avatar" style={avatarStyle(i)}>{initials}</div>
                        <div>
                          <p className="student-name">{s.name}</p>
                          <p className="student-email">{s.email}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ MATERIALS ══ */}
        {activeTab === "materials" && (
          <div className="tab-content active" id="materials">
            <div className="flex justify-between items-center mb-24">
              <h3 className="font-semibold">Course Modules &amp; Materials</h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreateModule(true)}
              >
                + Create Module
              </button>
            </div>

            {mLoading && <p className="tc-loading">Loading modules…</p>}

            {!mLoading && modules.length === 0 && (
              <div className="tc-empty">
                <FolderIcon />
                <p>No modules yet. Create a module and upload materials inside it.</p>
              </div>
            )}

            {/* Module accordion */}
            <div className="tc-module-list">
              {modules.map(mod => {
                const mats = moduleMaterials[mod._id] || [];
                const isOpen = !!expandedMod[mod._id];
                return (
                  <div key={mod._id} className="tc-module-card">
                    <div className="tc-module-header">
                      <button
                        className="tc-module-toggle"
                        onClick={() => setExpandedMod(p => ({ ...p, [mod._id]: !p[mod._id] }))}
                      >
                        <div className="tc-mod-icon"><FolderIcon /></div>
                        <div className="tc-mod-meta">
                          <p className="tc-mod-title">{mod.title}</p>
                          {mod.description && <p className="tc-mod-desc">{mod.description}</p>}
                          <p className="tc-mod-count">{mats.length} {mats.length === 1 ? "file" : "files"}</p>
                        </div>
                        <svg
                          className={`tc-chevron${isOpen ? " open" : ""}`}
                          width="18" height="18" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      <div className="tc-mod-actions">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => { setUploadForModule(mod); setMatTitle(""); setMatFile(null); }}
                        >+ Upload</button>
                        <button
                          className="btn btn-ghost btn-sm tc-del-btn"
                          onClick={() => handleDeleteModule(mod)}
                          title="Delete module"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="tc-materials-body">
                        {mats.length === 0 && (
                          <p className="tc-no-mats">No files yet — click "+ Upload" to add materials.</p>
                        )}
                        {mats.map(mat => (
                          <div className="material-item tc-mat-row" key={mat._id}>
                            <div className="material-icon"><FileIcon /></div>
                            <div className="material-info">
                              <p className="material-title">{mat.title}</p>
                              <p className="material-meta">
                                {mat.type.toUpperCase()}
                                {mat.sizeBytes ? ` · ${formatBytes(mat.sizeBytes)}` : ""}
                                {" · Uploaded "}
                                {new Date(mat.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                            <a href={mat.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                              Download
                            </a>
                            <button
                              className="btn btn-ghost btn-sm tc-del-btn"
                              onClick={() => handleDeleteMaterial(mod, mat)}
                              title="Delete material"
                            >
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ══ CREATE MODULE MODAL ══ */}
      {showCreateModule && (
        <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowCreateModule(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>Create New Module</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateModule(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateModule}>
              <div className="modal-body">
                <div className="form-group mb-16">
                  <label className="form-label">Module Title <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g., Week 1 – Introduction"
                    value={newModTitle}
                    onChange={e => setNewModTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <textarea
                    className="form-input"
                    placeholder="Brief description of this module…"
                    value={newModDesc}
                    onChange={e => setNewModDesc(e.target.value)}
                    rows={3}
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModule(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={modCreating}>
                  {modCreating ? "Creating…" : "Create Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ UPLOAD MATERIAL MODAL ══ */}
      {uploadForModule && (
        <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) setUploadForModule(null); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>Upload Material</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setUploadForModule(null)}>✕</button>
            </div>
            <form onSubmit={handleUploadMaterial}>
              <div className="modal-body">
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: 16 }}>
                  Module: <strong style={{ color: "var(--text-primary)" }}>{uploadForModule.title}</strong>
                </p>
                <div className="form-group mb-16">
                  <label className="form-label">Display Title</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Leave blank to use filename"
                    value={matTitle}
                    onChange={e => setMatTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">File <span style={{ color: "var(--danger)" }}>*</span></label>
                  {matFile ? (
                    <div className="tc-uploaded-file">
                      <FileIcon />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="file-name">{matFile.name}</p>
                        <p className="file-size">{formatBytes(matFile.size)}</p>
                      </div>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setMatFile(null)}>✕</button>
                    </div>
                  ) : (
                    <div
                      className={`upload-zone${isDragging ? " dragging" : ""}`}
                      style={{ padding: "28px 20px" }}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setMatFile(f); }}
                    >
                      <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
                        Drag &amp; drop or <strong>click to browse</strong><br />
                        <span style={{ fontSize: "0.75rem" }}>PDF, DOCX, PPTX, MP4 up to 100MB</span>
                      </p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" style={{ display: "none" }} accept=".pdf,.docx,.doc,.pptx,.ppt,.mp4,.png,.jpg"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setMatFile(f); }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setUploadForModule(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!matFile || matUploading}>
                  {matUploading ? "Uploading…" : "Upload Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
