import { useState, useRef } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import "./StudentAssignment.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssignmentData {
  id: number;
  title: string;
  course: string;
  courseCode: string;
  description: string;
  requirements: string[];
  dueDate: string;
  points: number;
  format: string;
  status: "Submitted" | "Pending" | "Not started";
  submittedOn?: string;
  grade?: string;
  fileName?: string;
  fileSize?: string;
}

// ─── Static sample data ───────────────────────────────────────────────────────

const SAMPLE_ASSIGNMENTS: Record<number, AssignmentData> = {
  1: {
    id: 1,
    title: "Assignment 1: Heuristic Evaluation",
    course: "Human Computer Interaction",
    courseCode: "CS-312",
    description:
      "Conduct a heuristic evaluation of a chosen website or mobile app using Jakob Nielsen's 10 usability heuristics. Your report should include:",
    requirements: [
      "Brief description of the selected interface",
      "Evaluation against each of the 10 heuristics",
      "Severity ratings (0–4 scale) for each issue found",
      "Screenshots annotated with identified issues",
      "Summary recommendations for improvement",
    ],
    dueDate: "Mar 1, 2026",
    points: 100,
    format: "PDF only",
    status: "Submitted",
    submittedOn: "Feb 27, 2026 – 4:30 PM",
    grade: "88 / 100",
    fileName: "Heuristic_Evaluation.pdf",
    fileSize: "2.3 MB · Uploaded Feb 27, 2026",
  },
  2: {
    id: 2,
    title: "Assignment 2: User Persona Design",
    course: "Human Computer Interaction",
    courseCode: "CS-312",
    description:
      "Design three distinct user personas for a mobile healthcare application. Each persona should be grounded in real user research and include:",
    requirements: [
      "Demographic profile and background",
      "Goals, frustrations, and motivations",
      "Technology comfort level and usage patterns",
      "A day-in-the-life narrative",
      "Design implications for the app",
    ],
    dueDate: "Mar 20, 2026",
    points: 80,
    format: "PDF or DOCX",
    status: "Pending",
  },
  3: {
    id: 3,
    title: "Assignment 3: Wireframe Prototype",
    course: "Human Computer Interaction",
    courseCode: "CS-312",
    description:
      "Create a low-fidelity wireframe prototype for a student productivity app using Figma or Balsamiq. Your submission must include:",
    requirements: [
      "At least 8 distinct screens",
      "Navigation flow diagram",
      "Annotation explaining key design decisions",
      "Usability considerations for each screen",
      "Exported PDF of all wireframes",
    ],
    dueDate: "Apr 10, 2026",
    points: 120,
    format: "PDF + Figma link",
    status: "Not started",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: AssignmentData["status"]) {
  if (status === "Submitted") return "badge badge-accent";
  if (status === "Pending") return "badge badge-warning";
  return "badge badge-neutral";
}

// ─── Main Component ───────────────────────────────────────────────────────────

function StudentAssignment() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const location = useLocation();

  // Try to get assignment from route state first, then fall back to sample data.
  // Enrolled.tsx only passes {id, title, due, points, status} so we merge with
  // the full sample record to ensure description/requirements/course are always present.
  const stateAssignment = (location.state as { assignment?: Partial<AssignmentData> })?.assignment;
  const numId = stateAssignment?.id ? Number(stateAssignment.id) : Number(assignmentId) || 1;
  const baseData: AssignmentData = SAMPLE_ASSIGNMENTS[numId] || SAMPLE_ASSIGNMENTS[1];
  // Merge: state values win for shared fields (title, status, etc.), base fills the rest
  const assignment: AssignmentData = stateAssignment
    ? { ...baseData, ...stateAssignment } as AssignmentData
    : baseData;

  // ── File upload state ──────────────────────────────────────────────────────
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleSubmit() {
    if (!uploadedFile && assignment.status !== "Submitted") return;
    setSubmitted(true);
  }

  // ── Enrolled course id (from URL context) ─────────────────────────────────
  // We'll extract from referrer or default
  const courseId = (location.state as any)?.courseId || "";

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
          {assignment.course}
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
                  <p className="sa-course-label">
                    {assignment.courseCode} · {assignment.course}
                  </p>
                </div>
              </div>

              <div className="divider" />

              <h3 className="font-semibold mb-8">Description</h3>
              <p className="sa-description">{assignment.description}</p>
              <ul className="sa-requirements">
                {assignment.requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>

              <div className="divider" />

              {/* Meta */}
              <div className="flex gap-24 sa-meta-row">
                <div>
                  <p className="sa-meta-label">Due Date</p>
                  <p className="font-semibold">{assignment.dueDate}</p>
                </div>
                <div>
                  <p className="sa-meta-label">Points</p>
                  <p className="font-semibold">{assignment.points}</p>
                </div>
                <div>
                  <p className="sa-meta-label">Format</p>
                  <p className="font-semibold">{assignment.format}</p>
                </div>
                <div>
                  <p className="sa-meta-label">Status</p>
                  <span className={statusBadgeClass(assignment.status)}>
                    {assignment.status}
                  </span>
                </div>
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
                  <span className={statusBadgeClass(assignment.status)}>
                    {submitted ? "Submitted" : assignment.status}
                  </span>
                </div>

                {(assignment.submittedOn || submitted) && (
                  <div className="sa-status-row">
                    <span className="text-sm sa-status-label">Submitted on</span>
                    <span className="text-sm font-semibold">
                      {submitted
                        ? new Date().toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : assignment.submittedOn}
                    </span>
                  </div>
                )}

                {assignment.grade && (
                  <div className="sa-status-row">
                    <span className="text-sm sa-status-label">Grade</span>
                    <span className="text-sm font-semibold sa-grade">
                      {assignment.grade}
                    </span>
                  </div>
                )}

                <div className="sa-status-row sa-status-row-last">
                  <span className="text-sm sa-status-label">Feedback</span>
                  <span className="sa-feedback-link">View feedback</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload / Submission Card */}
          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-16">Your Submission</h3>

              {/* Existing file (if already submitted) */}
              {(assignment.fileName || uploadedFile) && (
                <>
                  <div className="uploaded-file">
                    <div className="file-icon">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="file-info">
                      <p className="file-name">
                        {uploadedFile ? uploadedFile.name : assignment.fileName}
                      </p>
                      <p className="file-size">
                        {uploadedFile
                          ? `${(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB`
                          : assignment.fileSize}
                      </p>
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

              {/* Re-upload prompt */}
              {assignment.status === "Submitted" && (
                <p className="text-sm text-muted mb-16">
                  Need to update your submission? Upload a new file below:
                </p>
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
                <p>or click to browse · PDF, DOCX up to 10MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.docx"
                onChange={handleInputChange}
              />

              <button
                className="btn btn-primary w-full mt-24"
                onClick={handleSubmit}
                disabled={!uploadedFile && assignment.status !== "Submitted"}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {assignment.status === "Submitted"
                  ? "Re-submit Assignment"
                  : "Submit Assignment"}
              </button>

              {submitted && (
                <p className="sa-success-msg">
                  ✓ Assignment submitted successfully!
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

export default StudentAssignment;
