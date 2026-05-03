import { useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { CheckCircle2 } from "lucide-react";
import "./TeacherCreateAssignment.css";

export default function TeacherCreateAssignment() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // ── form state ──────────────────────────────────────────────────
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline]     = useState("");
  const [totalPoints, setTotalPoints] = useState("100");
  const [status, setStatus]         = useState<"draft" | "published">("draft");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── file handlers ────────────────────────────────────────────────
  function handleFileSelect(file: File) {
    setUploadedFile(file);
  }
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

  // ── submit ───────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (!courseId)      { setError("Course not found"); return; }

    setSubmitting(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("title", title.trim());
      body.append("description", description.trim());
      body.append("deadline", deadline);
      body.append("totalPoints", totalPoints);
      body.append("status", status);
      if (uploadedFile) body.append("file", uploadedFile);

      const res = await apiFetch(`/api/courses/${courseId}/deliverables`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create assignment");

      setSuccess(true);
      setTimeout(() => navigate(`/teacher-course/${courseId}`), 1500);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="main-content">
      {/* Breadcrumb */}
      <div className="sa-breadcrumb">
        <Link to="/teacher-panel" className="sa-breadcrumb-link">Teacher Panel</Link>
        <span className="sa-breadcrumb-sep">›</span>
        <Link to={`/teacher-course/${courseId}`} className="sa-breadcrumb-link">Course</Link>
        <span className="sa-breadcrumb-sep">›</span>
        <span className="sa-breadcrumb-current">Create Assignment</span>
      </div>

      <div className="tca-container">
        {/* ── Left: Form ── */}
        <div>
          <div className="card mb-24">
            <div className="card-body">
              <div className="flex items-center gap-16 mb-16">
                <div className="assignment-icon tca-icon-lg">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="13" x2="8" y2="13" />
                    <line x1="12" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div>
                  <h1 className="page-title tca-page-title">Create Assignment</h1>
                  <p className="sa-course-label">Fill in the details below</p>
                </div>
              </div>

              <div className="divider" />

              <form onSubmit={handleSubmit}>
                {/* Title */}
                <div className="tca-field mb-16">
                  <label className="tca-label">Assignment Title <span className="tca-required">*</span></label>
                  <input
                    className="tca-input"
                    type="text"
                    placeholder="e.g., Assignment 1: Heuristic Evaluation"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="tca-field mb-16">
                  <label className="tca-label">Instructions / Description</label>
                  <textarea
                    className="tca-input tca-textarea"
                    placeholder="Describe what students should do…"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={5}
                  />
                </div>

                {/* Deadline + Points row */}
                <div className="tca-row mb-16">
                  <div className="tca-field">
                    <label className="tca-label">Due Date</label>
                    <input
                      className="tca-input"
                      type="datetime-local"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                    />
                  </div>
                  <div className="tca-field">
                    <label className="tca-label">Total Points</label>
                    <input
                      className="tca-input"
                      type="number"
                      min="0"
                      max="1000"
                      value={totalPoints}
                      onChange={e => setTotalPoints(e.target.value)}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="tca-field mb-16">
                  <label className="tca-label">Publish Status</label>
                  <div className="tca-status-row">
                    <button
                      type="button"
                      className={`tca-status-btn ${status === "draft" ? "active" : ""}`}
                      onClick={() => setStatus("draft")}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="6" /></svg>
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      className={`tca-status-btn tca-status-btn-primary ${status === "published" ? "active" : ""}`}
                      onClick={() => setStatus("published")}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      Publish Now
                    </button>
                  </div>
                </div>

                {error && <p className="tca-error">{error}</p>}
                {success && (
                  <p className="sa-success-msg"><CheckCircle2 size={16} aria-hidden="true" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />Assignment created successfully! Redirecting…</p>
                )}

                <div className="tca-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => navigate(`/teacher-course/${courseId}`)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Creating…" : status === "published" ? "Publish Assignment" : "Save Draft"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ── Right: Optional attachment ── */}
        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-16">Attach Assignment File</h3>
              <p className="tca-hint mb-16">Optional — attach a PDF or DOCX with detailed instructions.</p>

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
                      <p className="file-size">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--danger)" }}
                      onClick={() => setUploadedFile(null)}
                      type="button"
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

              <div
                className={`upload-zone${isDragging ? " dragging" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <h4>Drag & drop a file here</h4>
                <p>or click to browse · PDF, DOCX up to 50MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.docx,.doc"
                onChange={handleInputChange}
              />

              {/* Info card */}
              <div className="tca-info-card mt-24">
                <div className="tca-info-row">
                  <span className="sa-meta-label">Format</span>
                  <span className="tca-info-val">PDF, DOCX</span>
                </div>
                <div className="tca-info-row">
                  <span className="sa-meta-label">Max Size</span>
                  <span className="tca-info-val">50 MB</span>
                </div>
                <div className="tca-info-row" style={{ borderBottom: "none" }}>
                  <span className="sa-meta-label">Storage</span>
                  <span className="tca-info-val">Azure Blob</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
