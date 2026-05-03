import { useState, useRef, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Icon from "../components/ui/Icon";
import "./StudentAssignment.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssignmentData {
  _id: string;
  title: string;
  course: string;        // courseId (ObjectId)
  courseTitle?: string;
  courseCode?: string;
  description?: string;
  requirements?: string[];
  deadline?: string;
  totalPoints: number;
  status: "draft" | "published";
  attachments: { fileName: string; url: string; mimeType?: string }[];
  createdAt: string;
}

interface SubmissionData {
  _id?: string;
  status: "not_submitted" | "submitted" | "late" | "graded";
  submittedAt?: string;
  grade?: number;
  feedback?: string;
  attachments: { fileName: string; url: string }[];
  privateComments?: SubmissionComment[];
}

interface SubmissionComment {
  _id?: string;
  author?: { _id: string; name?: string; email?: string } | string;
  text: string;
  createdAt: string;
}

// ─── Badge helper ─────────────────────────────────────────────────────────────

function statusBadgeClass(status: SubmissionData["status"]) {
  if (status === "submitted" || status === "graded") return "badge badge-accent";
  if (status === "late") return "badge badge-warning";
  return "badge badge-neutral";
}

function statusLabel(status: SubmissionData["status"]) {
  if (status === "not_submitted") return "Not Submitted";
  if (status === "submitted")     return "Submitted";
  if (status === "late")          return "Late";
  if (status === "graded")        return "Graded";
  return status;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function StudentAssignment() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const location = useLocation();
  const { user } = useAuth();

  const courseId = (location.state as any)?.courseId || "";

  // ── Data state ─────────────────────────────────────────────────────────────
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Upload state ────────────────────────────────────────────────────────────
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [privateCommentText, setPrivateCommentText] = useState("");
  const [classCommentText, setClassCommentText] = useState("");
  const [postingScope, setPostingScope] = useState<"private" | "class" | null>(null);
  const [classComments, setClassComments] = useState<SubmissionComment[]>([]);
  const [classCommentsLoading, setClassCommentsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch assignment + existing submission ──────────────────────────────────
  useEffect(() => {
    if (!assignmentId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res  = await apiFetch(`/api/deliverables/${assignmentId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load assignment");
        if (!mounted) return;
        setAssignment(data.deliverable);
        setSubmission(
          data.submission || {
            status: "not_submitted",
            attachments: [],
            privateComments: [],
          }
        );

        setClassCommentsLoading(true);
        const cRes = await apiFetch(`/api/deliverables/${assignmentId}/class-comments`);
        const cData = await cRes.json();
        if (!cRes.ok) throw new Error(cData.message || "Failed to load class comments");
        if (mounted) setClassComments(cData.comments || []);
      } catch (err: any) {
        if (mounted) setFetchError(err.message || "Failed to load");
      } finally {
        if (mounted) setClassCommentsLoading(false);
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [assignmentId]);

  // ── File handlers ───────────────────────────────────────────────────────────
  function handleFileSelect(file: File) { setUploadedFile(file); }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function commentAuthorName(comment: SubmissionComment): string {
    if (!comment.author) return "Unknown";
    if (typeof comment.author === "string") return "Unknown";
    return comment.author.name || comment.author.email || "Unknown";
  }

  function isOwnComment(comment: SubmissionComment): boolean {
    return typeof comment.author === "object" && comment.author?._id === user?._id;
  }

  function commentAvatar(comment: SubmissionComment): string {
    const name = commentAuthorName(comment).trim();
    if (!name) return "?";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  async function postComment(scope: "private" | "class") {
    if (scope === "class" && !assignmentId) return;

    const text = (scope === "private" ? privateCommentText : classCommentText).trim();
    if (!text) return;

    setPostingScope(scope);
    setSubmitError(null);
    try {
      const res = scope === "private"
        ? (submission?._id
          ? await apiFetch(`/api/submissions/${submission._id}/comments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ scope, text }),
            })
          : await apiFetch(`/api/deliverables/${assignmentId}/private-comments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text }),
            }))
        : await apiFetch(`/api/deliverables/${assignmentId}/class-comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post comment");

      if (scope === "private" && data.submission) setSubmission(data.submission);
      if (scope === "class") setClassComments(data.comments || []);
      if (scope === "private") setPrivateCommentText("");
      else setClassCommentText("");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to post comment");
    } finally {
      setPostingScope(null);
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!uploadedFile || !assignmentId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const form = new FormData();
      form.append("file", uploadedFile);
      const res  = await apiFetch(`/api/deliverables/${assignmentId}/submit`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");
      setSubmission((prev) => ({
        ...data.submission,
        privateComments: data.submission?.privateComments || prev?.privateComments || [],
      }));
      setSubmitSuccess(true);
      setUploadedFile(null);
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render: loading / error ─────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="main-content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "var(--text-muted)" }}>
          Loading assignment…
        </div>
      </main>
    );
  }

  if (fetchError || !assignment) {
    return (
      <main className="main-content">
        <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: 20, borderRadius: 12 }}>
          <Icon icon={AlertTriangle} size={16} /> {fetchError || "Assignment not found"}
        </div>
      </main>
    );
  }

  const isSubmitted = submission?.status === "submitted" || submission?.status === "graded";
  const subFileName = submission?.attachments?.[0]?.fileName;

  return (
    <main className="main-content">

      {/* ── Breadcrumb ── */}
      <div className="sa-breadcrumb">
        <Link to="/dashboard" className="sa-breadcrumb-link">Dashboard</Link>
        <span className="sa-breadcrumb-sep">›</span>
        <Link
          to={courseId ? `/enrolled/${courseId}` : "/student-panel"}
          className="sa-breadcrumb-link"
        >
          Course
        </Link>
        <span className="sa-breadcrumb-sep">›</span>
        <span className="sa-breadcrumb-current">{assignment.title}</span>
      </div>

      <div className="two-col-grid">

        {/* ──────── LEFT: Assignment Details ──────── */}
        <div>
          <div className="card mb-24">
            <div className="card-body">

              {/* Header */}
              <div className="flex items-center gap-16 mb-16">
                <div className="assignment-icon sa-icon-lg">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h1 className="page-title sa-assignment-title">{assignment.title}</h1>
                  {assignment.courseCode && (
                    <p className="sa-course-label">{assignment.courseCode}</p>
                  )}
                </div>
              </div>

              <div className="divider" />

              {assignment.description && (
                <>
                  <h3 className="font-semibold mb-8">Description</h3>
                  <p className="sa-description">{assignment.description}</p>
                </>
              )}

              {assignment.requirements && assignment.requirements.length > 0 && (
                <ul className="sa-requirements">
                  {assignment.requirements.map((req, i) => <li key={i}>{req}</li>)}
                </ul>
              )}

              {/* Instructor attachment */}
              {assignment.attachments.length > 0 && (
                <>
                  <div className="divider" />
                  <h3 className="font-semibold mb-8">Assignment File</h3>
                  {assignment.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="uploaded-file"
                      style={{ textDecoration: "none", marginBottom: 0 }}
                      download
                    >
                      <div className="file-icon">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="file-info">
                        <p className="file-name">{att.fileName}</p>
                        <p className="file-size">Click to download</p>
                      </div>
                    </a>
                  ))}
                </>
              )}

              <div className="divider" />

              {/* Meta */}
              <div className="flex gap-24 sa-meta-row">
                <div>
                  <p className="sa-meta-label">Due Date</p>
                  <p className="font-semibold">
                    {assignment.deadline
                      ? new Date(assignment.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "No deadline"}
                  </p>
                </div>
                <div>
                  <p className="sa-meta-label">Points</p>
                  <p className="font-semibold">{assignment.totalPoints}</p>
                </div>
                <div>
                  <p className="sa-meta-label">Format</p>
                  <p className="font-semibold">PDF, DOCX</p>
                </div>
                <div>
                  <p className="sa-meta-label">Status</p>
                  <span className={statusBadgeClass(submission?.status || "not_submitted")}>
                    {statusLabel(submission?.status || "not_submitted")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-8">Class Comments</h3>
              

              <div className="sa-comment-list sa-class-thread-list">
                {classCommentsLoading && (
                  <p className="sa-comment-empty">Loading class comments...</p>
                )}
                {!classCommentsLoading && classComments.length === 0 && (
                  <p className="sa-comment-empty">No class comments yet.</p>
                )}
                {classComments.map((c, idx) => (
                  <div className="sa-class-comment-row" key={c._id || `${idx}-${c.createdAt}`}>
                    <div className="sa-class-avatar">{commentAvatar(c)}</div>
                    <div className="sa-class-comment-body">
                      <p className="sa-comment-meta">
                        <strong>{commentAuthorName(c)}</strong> · {
                          new Date(c.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                          })
                        }
                      </p>
                      <p className="sa-comment-text">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sa-class-input-row">
                <textarea
                  className="sa-comment-input sa-class-input"
                  rows={1}
                  placeholder="Add class comment..."
                  value={classCommentText}
                  onChange={(e) => setClassCommentText(e.target.value)}
                />
                <button
                  className="sa-class-send-btn"
                  onClick={() => postComment("class")}
                  disabled={postingScope !== null || !classCommentText.trim()}
                  title="Send class comment"
                >
                  {postingScope === "class" ? "..." : ">"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ──────── RIGHT: Upload & Status ──────── */}
        <div>

          {/* Submission Status Card */}
          <div className="card mb-24">
            <div className="card-body">
              <h3 className="font-semibold mb-16">Submission Status</h3>

              <div className="sa-status-list">
                <div className="sa-status-row">
                  <span className="text-sm sa-status-label">Status</span>
                  <span className={statusBadgeClass(submission?.status || "not_submitted")}>
                    {submitSuccess ? "Submitted" : statusLabel(submission?.status || "not_submitted")}
                  </span>
                </div>

                {(isSubmitted || submitSuccess) && submission?.submittedAt && (
                  <div className="sa-status-row">
                    <span className="text-sm sa-status-label">Submitted on</span>
                    <span className="text-sm font-semibold">
                      {new Date(submission.submittedAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                )}

                {submission?.grade !== undefined && (
                  <div className="sa-status-row">
                    <span className="text-sm sa-status-label">Marked Points</span>
                    <span className="text-sm font-semibold sa-grade">
                      {submission.grade} / {assignment.totalPoints}
                    </span>
                  </div>
                )}

                {submission?.feedback && (
                  <div className="sa-status-row">
                    <span className="text-sm sa-status-label">Feedback</span>
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {submission.feedback}
                    </span>
                  </div>
                )}

                <div className="sa-status-row sa-status-row-last">
                  <span className="text-sm sa-status-label">File</span>
                  <span className="text-sm">
                    {subFileName || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Card */}
          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-16">Your Submission</h3>

              {isSubmitted && (
                <p className="text-sm text-muted mb-16">
                  Already submitted. You can upload a new file to resubmit.
                </p>
              )}

              {/* Existing file row */}
              {uploadedFile && (
                <>
                  <div className="uploaded-file">
                    <div className="file-icon">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="file-info">
                      <p className="file-name">{uploadedFile.name}</p>
                      <p className="file-size">{(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--danger)" }}
                      onClick={() => setUploadedFile(null)}
                      title="Remove file"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                  <div className="divider" />
                </>
              )}

              {/* Drop zone */}
              <div
                className={`upload-zone${isDragging ? " dragging" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <h4>Drag &amp; drop your file here</h4>
                <p>or click to browse · PDF, DOCX up to 50MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.docx,.doc"
                onChange={handleInputChange}
              />

              {submitError && (
                <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginTop: 12, background: "var(--danger-bg)", borderRadius: 8, padding: "10px 14px" }}>
                  <Icon icon={AlertTriangle} size={16} /> {submitError}
                </p>
              )}

              <button
                className="btn btn-primary w-full mt-24"
                onClick={handleSubmit}
                disabled={!uploadedFile || submitting}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {submitting
                  ? "Uploading…"
                  : isSubmitted
                    ? "Re-submit Assignment"
                    : "Submit Assignment"}
              </button>

              {submitSuccess && (
                <p className="sa-success-msg"><Icon icon={CheckCircle2} size={16} /> Assignment submitted successfully!</p>
              )}
            </div>
          </div>

          <div className="card mt-24">
            <div className="card-body">
              <h3 className="font-semibold mb-16">Private Comments</h3>

              <div className="sa-comment-list">
                {(submission?.privateComments || []).length === 0 && (
                  <p className="sa-comment-empty">No private comments yet.</p>
                )}
                {(submission?.privateComments || []).map((c, idx) => (
                  <div
                    className={`sa-comment-item ${isOwnComment(c) ? "sa-comment-own" : ""}`}
                    key={c._id || `${idx}-${c.createdAt}`}
                  >
                    <p className="sa-comment-meta">
                      <strong>{commentAuthorName(c)}</strong> · {new Date(c.createdAt).toLocaleString()}
                    </p>
                    <p className="sa-comment-text">{c.text}</p>
                  </div>
                ))}
              </div>

              <textarea
                className="sa-comment-input"
                rows={3}
                placeholder="Write a private comment to your teacher..."
                value={privateCommentText}
                onChange={(e) => setPrivateCommentText(e.target.value)}
              />
              <div className="sa-comment-actions">
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

        </div>
      </div>
    </main>
  );
}

export default StudentAssignment;
