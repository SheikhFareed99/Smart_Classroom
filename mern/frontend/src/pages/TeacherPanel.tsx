import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/api";
import { X } from "lucide-react";
import { getCourseBannerColor } from "../lib/courseColors";

import "./Dashboard.css";
import "./TeacherPanel.css";

type Course = {
  _id: string;
  title: string;
  courseCode?: string;
  inviteCode?: string;
  isArchived?: boolean;
};



export default function TeacherPanel() {
  const { user: currentUser } = useAuth();
  const [teaching, setTeaching] = useState<Course[]>([]);
  const [enrolled, setEnrolled] = useState<Course[]>([]);



  const activeCount = (teaching.filter((c) => !c.isArchived).length);
  //   for each course, we can calculate the number of active students by looking at the length of the enrollments array (after filtering out archived courses). However, since we don't have the enrollments data in this component, we'll just display the count of active courses for now. In a real implementation, we would likely need to fetch the enrollments data for each course to get the student count, or have that data included in the course object from the backend.

  const activeStudents = enrolled.length;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    let mounted = true;
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!currentUser?._id) throw new Error("Not authenticated");

        const res = await apiFetch(`/api/courses/user/${currentUser._id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) {
          setTeaching(Array.isArray(data.teaching) ? data.teaching : []);
          setEnrolled(Array.isArray(data.enrolled) ? data.enrolled : []);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load courses");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCourses();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // Create course handler
  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();

    if (!currentUser) return alert("Not authenticated");
    const titleInput = (document.getElementById("create-title") as HTMLInputElement)?.value;
    const codeInput = (document.getElementById("create-code") as HTMLInputElement)?.value;
    try {
      const res = await apiFetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput, courseCode: codeInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create course");
      document.getElementById('createClassModal')?.classList.remove('active');
      // Add new course to state
      setTeaching([...teaching, data.course]);
      // Clear form
      (document.getElementById("create-title") as HTMLInputElement).value = '';
      (document.getElementById("create-code") as HTMLInputElement).value = '';
    } catch (err: any) {
      alert(err.message || "Error");
    }
  }

  // Join course via invite code
  async function handleJoinCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return alert("Not authenticated");
    const code = (document.getElementById("join-code") as HTMLInputElement)?.value;
    try {
      const res = await apiFetch("/api/courses/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to join");
      document.getElementById('joinCourseModal')?.classList.remove('active');
      // Re-fetch courses
      const res2 = await apiFetch(`/api/courses/user/${currentUser._id}`);
      if (res2.ok) {
        const data2 = await res2.json();
        setTeaching(Array.isArray(data2.teaching) ? data2.teaching : []);
        setEnrolled(Array.isArray(data2.enrolled) ? data2.enrolled : []);
      }
    } catch (err: any) {
      alert(err.message || "Error");
    }
  }

  // Delete course (instructor)
  async function handleDeleteCourse(courseId: string) {
    if (!confirm("Delete this course? This action cannot be undone.")) return;
    try {
      const res = await apiFetch(`/api/courses/${courseId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      // Remove from state instead of reloading
      setTeaching(teaching.filter(c => c._id !== courseId));
    } catch (err: any) {
      alert(err.message || "Error");
    }
  }


  // Manage students modal
  async function openManageStudents(courseId: string) {
    try {
      const res = await apiFetch(`/api/courses/${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load course");
      const body = document.getElementById('manage-students-body');
      if (!body) return;
      body.innerHTML = '';
      const enrollments = data.course.enrollments || [];
      if (enrollments.length === 0) {
        body.innerHTML = '<p>No students enrolled.</p>';
      } else {
        const list = document.createElement('div');
        enrollments.forEach((en: any) => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.alignItems = 'center';
          row.style.padding = '8px 0';
          row.innerHTML = `<div>${en.student?.name || en.student?.email || 'Unknown'}</div>`;
          const btn = document.createElement('button');
          btn.className = 'btn btn-outline';
          btn.textContent = 'Remove';
          btn.onclick = async () => {
            if (!confirm('Remove this student from the course?')) return;
            try {
              const r = await apiFetch(`/api/courses/${courseId}/students/${en.student._id}`, { method: 'DELETE' });
              const dj = await r.json();
              if (!r.ok) throw new Error(dj.message || 'Failed');
              // refresh modal
              openManageStudents(courseId);
            } catch (err: any) { alert(err.message || 'Error'); }
          };
          row.appendChild(btn);
          list.appendChild(row);
        });
        body.appendChild(list);
      }
      document.getElementById('manageStudentsModal')?.classList.add('active');
    } catch (err: any) {
      alert(err.message || 'Error');
    }
  }

  return (
    <>
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Teacher Panel</h1>
            <p className="page-subtitle">Manage your courses, assignments, and AI tools.</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /></svg>
            </div>
            <div className="stat-value">{loading ? "…" : activeCount ? activeCount : 0}</div>
            <div className="stat-label">Active Courses</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>
            </div>
            <div className="stat-value">{loading ? "…" : activeStudents ? activeStudents : 0}</div>
            <div className="stat-label">Total Students</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
            </div>
            <div className="stat-value">—</div>
            <div className="stat-label">Assignments</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div className="stat-value">—</div>
            <div className="stat-label">Pending Reviews</div>
          </div>
        </div>

        <div className="section-header">
          <h2 className="section-title">
            <svg className="icon" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            Quick Actions
          </h2>
        </div>

        <div className="action-grid mb-32">
          <div className="action-card" onClick={() => document.getElementById('createClassModal')?.classList.add('active')}>
            <div className="action-card-icon blue">
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
            </div>
            <h3>Create Class</h3>
            <p>Set up a new course with sections and students</p>
          </div>

        </div>

        <div className="section-header">
          <h2 className="section-title">
            <svg className="icon" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /></svg>
            My Courses
          </h2>
        </div>

        {loading && <p>Loading courses…</p>}
        {error && <p style={{ color: "var(--danger)" }}>Error: {error}</p>}

        {!loading && teaching.length === 0 && enrolled.length === 0 && (
          <div className="card">
            <div style={{ padding: 24 }}>
              <p>No courses found.</p>
            </div>
          </div>
        )}
        <div className="section-header" style={{ marginTop: 16 }}>
          <h3>Teaching</h3>
        </div>
        <div className="course-grid">
          {teaching.map((c) => {
            const bannerColor = getCourseBannerColor();
            return (
              <Link key={c._id} to={`/teacher-course/${c._id}`} state={{ color: bannerColor }} className="course-card">
                <div className={`course-card-banner ${bannerColor}`}>
                  <h3>{c.title}</h3>
                </div>
                <div className="course-card-body">
                  <p className="course-card-section">{c.courseCode || ""}{c.inviteCode && ` · Invite: ${c.inviteCode}`}</p>
                  <div className="course-card-meta">
                    <div></div>
                    <div>
                      <button className="btn btn-outline" onClick={(e) => {e.preventDefault(); openManageStudents(c._id);}}>Manage</button>
                      <button className="btn" style={{ marginLeft: 8 }} onClick={(e) => {e.preventDefault(); handleDeleteCourse(c._id);}}>Delete</button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>



      </main>
      {/* Modals (keep forms empty; submission is a no-op) */}
      <div className="modal-overlay" id="createClassModal">
        <div className="modal">
          <div className="modal-header">
            <h2>Create New Class</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => document.getElementById('createClassModal')?.classList.remove('active')} aria-label="Close"><X size={18} aria-hidden="true" /></button>
          </div>
          <form onSubmit={handleCreateCourse}>
            <div className="modal-body">
              <div className="form-group mb-16">
                <label className="form-label">Course Name</label>
                <input className="form-input" name="title" id="create-title" type="text" placeholder="e.g., Introduction to AI" />
              </div>
              <div className="form-group mb-16">
                <label className="form-label">Course Code</label>
                <input className="form-input" name="courseCode" id="create-code" type="text" placeholder="e.g., CS-401" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => document.getElementById('createClassModal')?.classList.remove('active')}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Class</button>
            </div>
          </form>
        </div>
      </div>

      {/* Join modal */}
      <div className="modal-overlay" id="joinCourseModal">
        <div className="modal">
          <div className="modal-header">
            <h2>Join Course</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => document.getElementById('joinCourseModal')?.classList.remove('active')} aria-label="Close"><X size={18} aria-hidden="true" /></button>
          </div>
          <form onSubmit={handleJoinCourse}>
            <div className="modal-body">
              <div className="form-group mb-16">
                <label className="form-label">Invite Code</label>
                <input className="form-input" id="join-code" type="text" placeholder="Enter invite code" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => document.getElementById('joinCourseModal')?.classList.remove('active')}>Cancel</button>
              <button type="submit" className="btn btn-primary">Join</button>
            </div>
          </form>
        </div>
      </div>

      {/* Manage students modal */}
      <div className="modal-overlay" id="manageStudentsModal">
        <div className="modal">
          <div className="modal-header">
            <h2>Manage Students</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => document.getElementById('manageStudentsModal')?.classList.remove('active')} aria-label="Close"><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="modal-body" id="manage-students-body">
            {/* populated dynamically */}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => document.getElementById('manageStudentsModal')?.classList.remove('active')}>Close</button>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="generateQuestionsModal">
        <div className="modal">
          <div className="modal-header">
            <h2>AI Question Generator</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => document.getElementById('generateQuestionsModal')?.classList.remove('active')} aria-label="Close"><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="modal-body">
            <div className="form-group mb-16">
              <label className="form-label">Topic / Chapter</label>
              <input className="form-input" type="text" placeholder="e.g., Chapter 3 – Informed Search" />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => document.getElementById('generateQuestionsModal')?.classList.remove('active')}>Cancel</button>
            <button className="btn btn-primary">Generate Questions</button>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="generateSummaryModal">
        <div className="modal">
          <div className="modal-header">
            <h2>AI Summary Generator</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => document.getElementById('generateSummaryModal')?.classList.remove('active')} aria-label="Close"><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="modal-body">
            <div className="form-group mb-16">
              <label className="form-label">Source Material</label>
              <select className="form-select form-input">
                <option>Lecture 1</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => document.getElementById('generateSummaryModal')?.classList.remove('active')}>Cancel</button>
            <button className="btn btn-primary">Generate Summary</button>
          </div>
        </div>
      </div>
    </>
  );
}
