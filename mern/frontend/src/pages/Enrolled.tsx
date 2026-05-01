import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import VoiceChannel from "../voice/components/VoiceChannel";
import "./Enrolled.css";

// ─── Types ─────────────────────────────────────────────────────────────────────

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
interface ChatMessage {
  id: number;
  role: "user" | "bot";
  text: string;
  time: string;
  loading?: boolean;
}
interface ChatMaterial {
  _id: string;
  title: string;
  book_name: string;
  type: string;
}
interface Deliverable {
  _id: string; title: string; description?: string;
  deadline?: string; totalPoints: number;
  status: "draft" | "published"; createdAt: string;
  attachments: { fileName: string; url: string }[];
}
interface Submission {
  status: "not_submitted" | "submitted" | "late" | "graded";
  submittedAt?: string;
}
interface Module {
  _id: string; title: string; description?: string; order: number;
}
interface Material {
  _id: string; title: string; type: string; url: string; sizeBytes?: number; uploadedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadgeClass(status: Submission["status"]) {
  if (status === "submitted" || status === "graded") return "badge badge-accent";
  if (status === "late") return "badge badge-warning";
  return "badge badge-neutral";
}
function statusLabel(status: Submission["status"]) {
  if (status === "submitted")     return "Submitted";
  if (status === "graded")        return "Graded";
  if (status === "late")          return "Late";
  return "Not started";
}

// ─── Chat helpers ─────────────────────────────────────────────────────────────
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
// ─── SVG Icons ────────────────────────────────────────────────────────────────

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
const SendIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

function StudentCourse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Course
  const [courseData, setCourseData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "assignments" | "materials" | "chatbot">("stream");

  // Assignments
  const [deliverables, setDeliverables]   = useState<Deliverable[]>([]);
  const [submissions, setSubmissions]     = useState<Record<string, Submission>>({});
  const [aLoading, setALoading]           = useState(false);

  // Modules + Materials
  const [modules, setModules]             = useState<Module[]>([]);
  const [moduleMaterials, setModuleMaterials] = useState<Record<string, Material[]>>({});
  const [expandedMod, setExpandedMod]     = useState<Record<string, boolean>>({});
  const [mLoading, setMLoading]           = useState(false);

  // Chat
  const [chatMessages, setChatMessages]   = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]         = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chatbot material state
  const [chatMaterials, setChatMaterials]       = useState<ChatMaterial[]>([]);
  const [chatMaterialsLoading, setChatMaterialsLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<ChatMaterial | null>(null);
  const [chatBotLoading, setChatBotLoading]     = useState(false);

  // Stream announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [streamLoading, setStreamLoading] = useState(false);
  const [postingAnnouncementId, setPostingAnnouncementId] = useState<string | null>(null);
  const [announcementCommentInputs, setAnnouncementCommentInputs] = useState<Record<string, string>>({});
  const [expandedAnnouncementComments, setExpandedAnnouncementComments] = useState<Record<string, boolean>>({});

  // Leave modal
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveMsg, setLeaveMsg]           = useState<string | null>(null);
  const [leaveMsgType, setLeaveMsgType]   = useState<"success" | "error" | null>(null);

  const announcementApiBase = "/api/announcements";

  function nameFromAuthor(author?: { _id: string; name?: string; email?: string } | string): string {
    if (!author || typeof author === "string") return "Class member";
    return author.name || author.email || "Class member";
  }

  function initialsFromAuthor(author?: { _id: string; name?: string; email?: string } | string): string {
    const name = nameFromAuthor(author);
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "C";
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
    if (!id) return;
    setStreamLoading(true);
    try {
      const r = await apiFetch(`${announcementApiBase}/courses/${id}/announcements`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed to load announcements");
      setAnnouncements(Array.isArray(d.announcements) ? d.announcements : []);
    } catch {
      setAnnouncements([]);
    } finally {
      setStreamLoading(false);
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
    } catch {
      // keep UI simple here; stream refresh will sync state
    } finally {
      setPostingAnnouncementId(null);
    }
  }

  // ── Load course details ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    apiFetch(`/api/courses/${id}`)
      .then(r => r.json())
      .then(d => { if (mounted && d.success) setCourseData(d.course); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [id]);

  // ── Load deliverables when assignments tab is opened ─────────────────────────
  useEffect(() => {
    if (activeTab !== "assignments" || !id) return;
    let mounted = true;
    setALoading(true);
    apiFetch(`/api/courses/${id}/deliverables`)
      .then(r => r.json())
      .then(async d => {
        if (!mounted) return;
        const list: Deliverable[] = (d.deliverables || []).filter(
          (a: Deliverable) => a.status === "published"
        );
        setDeliverables(list);

        // fetch own submission status for each
        if (user?._id) {
          const subs: Record<string, Submission> = {};
          await Promise.all(list.map(async (a) => {
            try {
              const r2 = await apiFetch(`/api/deliverables/${a._id}`);
              const d2 = await r2.json();
              subs[a._id] = d2.submission || { status: "not_submitted", attachments: [] };
            } catch { subs[a._id] = { status: "not_submitted" }; }
          }));
          if (mounted) setSubmissions(subs);
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setALoading(false); });
    return () => { mounted = false; };
  }, [activeTab, id, user]);

  // ── Load modules + materials when materials tab is opened ────────────────────
  useEffect(() => {
    if (activeTab !== "materials" || !id) return;
    let mounted = true;
    setMLoading(true);

    const load = async () => {
      try {
        const r = await apiFetch(`/api/courses/${id}/modules`);
        const d = await r.json();
        if (!mounted) return;
        const mods: Module[] = d.modules || [];
        setModules(mods);
        if (mods.length > 0) setExpandedMod({ [mods[0]._id]: true });

        const entries = await Promise.all(
          mods.map(async m => {
            const mr = await apiFetch(`/api/courses/${id}/modules/${m._id}/materials`);
            const md = await mr.json();
            return [m._id, md.materials || []] as [string, Material[]];
          })
        );
        if (mounted) setModuleMaterials(Object.fromEntries(entries));
      } catch {}
      finally { if (mounted) setMLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "stream") return;
    loadAnnouncements();
  }, [activeTab, id]);

  // ── Load chatbot materials when chatbot tab opens ────────────────────────────
  useEffect(() => {
    if (activeTab !== "chatbot" || !id) return;
    let mounted = true;
    setChatMaterialsLoading(true);
    apiFetch(`/api/chatbot/courses/${id}/materials`)
      .then(r => r.json())
      .then(d => {
        if (!mounted) return;
        const mats: ChatMaterial[] = d.materials || [];
        setChatMaterials(mats);
        // Reset chat when switching tabs or course
        setSelectedMaterial(null);
        setChatMessages([{
          id: Date.now(),
          role: "bot",
          text: mats.length === 0
            ? "📚 No course materials have been indexed yet. Ask your teacher to upload study materials."
            : `👋 Hi! I'm your Course AI Assistant.\n`,
          time: nowTime(),
        }]);
      })
      .catch(() => {
        if (!mounted) return;
        setChatMaterials([]);
        setChatMessages([{ id: Date.now(), role: "bot", text: "⚠️ Could not load course materials. Please try again later.", time: nowTime() }]);
      })
      .finally(() => { if (mounted) setChatMaterialsLoading(false); });
    return () => { mounted = false; };
  }, [activeTab, id]);

  // ── Chat scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Leave course ─────────────────────────────────────────────────────────────
  async function handleLeave() {
    if (!id) return;
    setLeaveMsg(null);
    try {
      const r = await apiFetch(`/api/courses/${id}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const dj = await r.json();
      if (!r.ok) throw new Error(dj.message || "Failed to leave");
      setLeaveMsg("You have left the class.");
      setLeaveMsgType("success");
      setShowLeaveConfirm(false);
      setTimeout(() => navigate("/dashboard"), 700);
    } catch (err: any) {
      setLeaveMsg(err?.message || "Error leaving the class");
      setLeaveMsgType("error");
    }
  }

  // ── Select a material to chat about ──────────────────────────────────────────
  function selectMaterial(mat: ChatMaterial) {
    setSelectedMaterial(mat);
    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        role: "bot",
        text: `✅ You selected '${mat.title}'. I'm ready to answer your questions! Go ahead and ask anything about this material.`,
        time: nowTime(),
      },
    ]);
  }

  // ── Send chat message ────────────────────────────────────────────────────────
  async function sendMessage() {
    const msg = chatInput.trim();
    if (!msg || chatBotLoading) return;
    if (!selectedMaterial) {
      setChatMessages(prev => [
        ...prev,
        { id: Date.now(), role: "bot", text: "⚠️ Please select a material first by clicking one of the buttons above.", time: nowTime() },
      ]);
      return;
    }

    const userMsg: ChatMessage = { id: Date.now(), role: "user", text: msg, time: nowTime() };
    const loadingMsg: ChatMessage = { id: Date.now() + 1, role: "bot", text: "...", time: nowTime(), loading: true };
    setChatMessages(prev => [...prev, userMsg, loadingMsg]);
    setChatInput("");
    setChatBotLoading(true);

    try {
      const res = await apiFetch("/api/chatbot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_name: selectedMaterial.book_name, query: msg }),
      });
      const data = await res.json();
      const answer = data.answer || "Sorry, I couldn't generate an answer.";
      setChatMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, text: answer, loading: false }
            : m
        )
      );
    } catch {
      setChatMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, text: "⚠️ Error connecting to AI. Please try again.", loading: false }
            : m
        )
      );
    } finally {
      setChatBotLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const courseName = courseData?.title || "Course";
  const instructorName = courseData?.instructor?.name || "Instructor";

  if (!courseData) {
    return (
      <main className="main-content">
        <div style={{ padding: 48, textAlign: "center" }}>
          <div className="loader" style={{ marginBottom: 12 }} />
          <div>Loading course…</div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="main-content">
        {/* ── Course Banner ── */}
        <div className="course-banner" style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div>
              <h1>{courseName}</h1>
              <p>{courseData?.courseCode} · {instructorName}</p>
              <span className="course-code">ID: {id}</span>
            </div>
            <button className="btn btn-outline" onClick={() => setShowLeaveConfirm(true)}>Unenroll</button>
          </div>
          {leaveMsg && (
            <div style={{ marginTop: 12 }}>
              <div className={`badge ${leaveMsgType === "success" ? "badge-accent" : "badge-danger"}`}>{leaveMsg}</div>
            </div>
          )}
        </div>

        {/* ── Voice Channel ── */}
        {id && user?._id && (
          <div style={{ padding: "0 24px", marginBottom: 16 }}>
            <VoiceChannel
              courseId={id}
              userId={user._id}
              userName={user.name || "User"}
            />
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="tabs">
          {(["stream", "assignments", "materials", "chatbot"] as const).map(tab => (
            <button
              key={tab}
              className={`tab-btn${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ══ STREAM ══ */}
        {activeTab === "stream" && (
          <div className="tab-content active" id="stream">
           

            {streamLoading && <p className="ec-loading">Loading announcements...</p>}

            {!streamLoading && announcements.length === 0 && (
              <div className="ec-empty">
                <p>No announcements yet.</p>
              </div>
            )}

            {!streamLoading && announcements.map(post => (
              <div className="stream-post" key={post._id}>
                <div className="stream-post-header">
                  <div className="avatar" style={{ background: "#FEF3C7", color: "#B45309" }}>
                    {initialsFromAuthor(post.author)}
                  </div>
                  <div>
                    <p className="stream-post-author">{nameFromAuthor(post.author)}</p>
                    <p className="stream-post-time">{formatWhen(post.createdAt)}</p>
                  </div>
                </div>
                <div className="stream-post-body">{post.text}</div>

                <button
                  className="ec-ann-comment-toggle"
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
                  <div className="ec-ann-comment-panel">
                    {(post.comments || []).map((c, idx) => (
                      <div key={c._id || `${idx}-${c.createdAt}`} className="ec-ann-comment-item">
                        <p className="stream-post-time">
                          <strong className="ec-ann-comment-author">{nameFromAuthor(c.author)}</strong>
                          {" · "}
                          {formatWhen(c.createdAt)}
                        </p>
                        <p className="ec-ann-comment-text">{c.text}</p>
                      </div>
                    ))}

                    <div className="ec-ann-comment-compose">
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

        {/* ══ ASSIGNMENTS ══ (real data) */}
        {activeTab === "assignments" && (
          <div className="tab-content active" id="assignments">
            <h3 className="font-semibold mb-24">Your Assignments</h3>

            {aLoading && <p className="ec-loading">Loading assignments…</p>}

            {!aLoading && deliverables.length === 0 && (
              <div className="ec-empty">
                <FileIcon />
                <p>No assignments published yet.</p>
              </div>
            )}

            <div className="assignment-list">
              {deliverables.map(a => {
                const sub = submissions[a._id];
                const subStatus = sub?.status || "not_submitted";
                return (
                  <Link
                    key={a._id}
                    to={`/student-assignment/${a._id}`}
                    state={{ courseId: id }}
                    className="assignment-item"
                  >
                    <div className="assignment-icon"><FileIcon /></div>
                    <div className="assignment-info">
                      <p className="assignment-title">{a.title}</p>
                      <p className="assignment-due">
                        {a.deadline
                          ? `Due: ${new Date(a.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                          : "No deadline"
                        }
                        {" · "}{a.totalPoints} pts
                      </p>
                    </div>
                    <span className={statusBadgeClass(subStatus as Submission["status"])}>
                      {statusLabel(subStatus as Submission["status"])}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ MATERIALS ══ (real modules + materials) */}
        {activeTab === "materials" && (
          <div className="tab-content active" id="materials">
            <h3 className="font-semibold mb-24">Course Modules &amp; Materials</h3>

            {mLoading && <p className="ec-loading">Loading materials…</p>}

            {!mLoading && modules.length === 0 && (
              <div className="ec-empty">
                <FolderIcon />
                <p>No modules have been uploaded yet.</p>
              </div>
            )}

            <div className="ec-module-list">
              {modules.map(mod => {
                const mats = moduleMaterials[mod._id] || [];
                const isOpen = !!expandedMod[mod._id];
                return (
                  <div key={mod._id} className="ec-module-card">
                    {/* Module header */}
                    <button
                      className="ec-module-header"
                      onClick={() => setExpandedMod(p => ({ ...p, [mod._id]: !p[mod._id] }))}
                    >
                      <div className="ec-mod-icon"><FolderIcon /></div>
                      <div className="ec-mod-meta">
                        <p className="ec-mod-title">{mod.title}</p>
                        {mod.description && <p className="ec-mod-desc">{mod.description}</p>}
                        <p className="ec-mod-count">{mats.length} {mats.length === 1 ? "file" : "files"}</p>
                      </div>
                      <svg
                        className={`ec-chevron${isOpen ? " open" : ""}`}
                        width="18" height="18" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* Materials inside */}
                    {isOpen && (
                      <div className="ec-materials-body">
                        {mats.length === 0 ? (
                          <p className="ec-no-mats">No files in this module yet.</p>
                        ) : (
                          mats.map(mat => (
                            <div key={mat._id} className="material-item ec-mat-row">
                              <div className="material-icon"><FileIcon /></div>
                              <div className="material-info">
                                <p className="material-title">{mat.title}</p>
                                <p className="material-meta">
                                  {mat.type.toUpperCase()}
                                  {mat.sizeBytes ? ` · ${formatBytes(mat.sizeBytes)}` : ""}
                                  {" · "}
                                  {new Date(mat.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </p>
                              </div>
                              <a
                                href={mat.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-sm"
                                download
                                onClick={e => e.stopPropagation()}
                              >
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
          </div>
        )}

        {/* ══ CHATBOT ══ */}
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
                      <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </div>
                  <div>
                    <h3>Course AI Assistant</h3>
                    <p>{selectedMaterial ? `📖 ${selectedMaterial.title}` : courseName}</p>
                  </div>
                  {selectedMaterial && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginLeft: "auto", fontSize: 12 }}
                      onClick={() => {
                        setSelectedMaterial(null);
                        setChatMessages(prev => [
                          ...prev,
                          { id: Date.now(), role: "bot", text: "Material deselected. Choose another material to continue.", time: nowTime() },
                        ]);
                      }}
                    >
                      Change material
                    </button>
                  )}
                </div>

                {/* Material selector pills */}
                {!selectedMaterial && (
                  <div className="chatbot-materials-bar">
                    {chatMaterialsLoading && <p className="ec-loading" style={{ margin: "10px 16px" }}>Loading materials…</p>}
                    {!chatMaterialsLoading && chatMaterials.length > 0 && (
                      <>
                        <p className="chatbot-materials-label">Select a material to chat about:</p>
                        <div className="chatbot-materials-list">
                          {chatMaterials.map(mat => (
                            <button
                              key={mat._id}
                              className={`chatbot-mat-btn${selectedMaterial && (selectedMaterial as ChatMaterial)._id === mat._id ? " active" : ""}`}
                              onClick={() => selectMaterial(mat)}
                            >
                              <FileIcon />
                              <span>{mat.title}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="chatbot-messages" id="chatMessages">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`chat-message ${msg.role}${msg.loading ? " loading" : ""}`}>
                      {msg.loading
                        ? <span className="chat-typing"><span /><span /><span /></span>
                        : msg.text.split("\n").map((line, i, arr) => (
                            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                          ))
                      }
                      {!msg.loading && <div className="msg-time">{msg.time}</div>}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chatbot-input">
                  <input
                    type="text"
                    placeholder={
                      selectedMaterial
                        ? `Ask about "${selectedMaterial.title}"…`
                        : "Select a material above, then ask a question…"
                    }
                    value={chatInput}
                    disabled={chatBotLoading}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                  />
                  <button onClick={sendMessage} disabled={chatBotLoading || !chatInput.trim()}>
                    <SendIcon />
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Leave Confirmation Modal ── */}
      {showLeaveConfirm && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h2>Unenroll</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowLeaveConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to unenroll from <strong>{courseName}</strong>?</p>
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