import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { AlertTriangle } from "lucide-react";
import Icon from "../components/ui/Icon";
import "./StudentMaterials.css";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Material {
  _id: string;
  title: string;
  type: "pdf" | "video" | "link" | "text" | "image";
  url: string;
  sizeBytes?: number;
  uploadedAt: string;
}

interface Module {
  _id: string;
  title: string;
  description?: string;
  order: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeLabel(type: Material["type"]): string {
  return type.toUpperCase();
}

function typeBadgeClass(type: Material["type"]): string {
  switch (type) {
    case "pdf":   return "sm-badge sm-badge-pdf";
    case "video": return "sm-badge sm-badge-video";
    case "image": return "sm-badge sm-badge-image";
    default:      return "sm-badge sm-badge-doc";
  }
}

function FileTypeIcon({ type }: { type: Material["type"] }) {
  if (type === "video") {
    return (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    );
  }
  if (type === "image") {
    return (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function StudentMaterials() {
  const { courseId } = useParams<{ courseId: string }>();
  const [modules, setModules]     = useState<Module[]>([]);
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [courseName] = useState("Course");

  // Fetch modules, then materials per module
  useEffect(() => {
    if (!courseId) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch modules
        const modRes = await apiFetch(`/api/courses/${courseId}/modules`);
        const modData = await modRes.json();
        if (!modRes.ok) throw new Error(modData.message || "Failed to load modules");

        const mods: Module[] = modData.modules || [];
        if (!mounted) return;
        setModules(mods);

        // Auto-expand first module
        if (mods.length > 0) {
          setExpanded({ [mods[0]._id]: true });
        }

        // Fetch materials for each module in parallel
        const entries = await Promise.all(
          mods.map(async (m) => {
            const r = await apiFetch(`/api/courses/${courseId}/modules/${m._id}/materials`);
            const d = await r.json();
            return [m._id, d.materials || []] as [string, Material[]];
          })
        );
        if (!mounted) return;
        setMaterials(Object.fromEntries(entries));
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load materials");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [courseId]);

  function toggleModule(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const totalMaterials = Object.values(materials).reduce((a, b) => a + b.length, 0);

  return (
    <main className="main-content">
      {/* Breadcrumb */}
      <div className="sa-breadcrumb">
        <Link to="/dashboard" className="sa-breadcrumb-link">Dashboard</Link>
        <span className="sa-breadcrumb-sep">›</span>
        <Link to={courseId ? `/enrolled/${courseId}` : "/student-panel"} className="sa-breadcrumb-link">
          {courseName}
        </Link>
        <span className="sa-breadcrumb-sep">›</span>
        <span className="sa-breadcrumb-current">Course Materials</span>
      </div>

      {/* Header */}
      <div className="sm-header mb-24">
        <div className="sm-header-left">
          <div className="sm-header-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="page-title">Course Materials</h1>
            <p className="sa-course-label">
              {loading ? "Loading…" : `${modules.length} modules · ${totalMaterials} files`}
            </p>
          </div>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="sm-empty-state">
          <div className="sm-spinner" />
          <p>Loading modules…</p>
        </div>
      )}

      {!loading && error && (
        <div className="sm-error-card">
          <p><Icon icon={AlertTriangle} size={16} /> {error}</p>
        </div>
      )}

      {!loading && !error && modules.length === 0 && (
        <div className="sm-empty-state">
          <svg width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <h3>No materials yet</h3>
          <p>Your instructor hasn't uploaded any materials for this course yet.</p>
        </div>
      )}

      {/* Module list */}
      {!loading && !error && modules.length > 0 && (
        <div className="sm-module-list">
          {modules.map((mod) => {
            const mats = materials[mod._id] || [];
            const isOpen = !!expanded[mod._id];

            return (
              <div key={mod._id} className="sm-module-card">
                {/* Module header — click to expand/collapse */}
                <button
                  className="sm-module-header"
                  onClick={() => toggleModule(mod._id)}
                  aria-expanded={isOpen}
                >
                  <div className="sm-module-icon">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="sm-module-meta">
                    <p className="sm-module-title">{mod.title}</p>
                    {mod.description && (
                      <p className="sm-module-desc">{mod.description}</p>
                    )}
                    <p className="sm-module-count">
                      {mats.length} {mats.length === 1 ? "file" : "files"}
                    </p>
                  </div>
                  <svg
                    className={`sm-chevron ${isOpen ? "open" : ""}`}
                    width="20" height="20" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Materials inside module */}
                {isOpen && (
                  <div className="sm-materials-body">
                    {mats.length === 0 ? (
                      <p className="sm-no-materials">No files uploaded to this module yet.</p>
                    ) : (
                      mats.map((mat) => (
                        <div key={mat._id} className="sm-material-row">
                          <div className="sm-mat-icon-wrap">
                            <FileTypeIcon type={mat.type} />
                          </div>
                          <div className="sm-mat-info">
                            <p className="sm-mat-title">{mat.title}</p>
                            <p className="sm-mat-meta">
                              <span className={typeBadgeClass(mat.type)}>{typeLabel(mat.type)}</span>
                              {mat.sizeBytes ? ` · ${formatBytes(mat.sizeBytes)}` : ""}
                              {" · "}
                              {new Date(mat.uploadedAt).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric"
                              })}
                            </p>
                          </div>
                          <a
                            href={mat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline sm-download-btn"
                            download
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
