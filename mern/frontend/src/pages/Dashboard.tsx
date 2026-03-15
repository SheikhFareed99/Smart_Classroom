
import "./Dashboard.css";
import JoinCourse from "../components/JoinCourse";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/api";

type Course = {
  _id?: string;
  title: string;
  courseCode?: string;
  inviteCode?: string;
  students?: number;
  color?: string;
  badge?: string;
};

// A single course card — keeps things simple and readable
function CourseCard({ title, code, courseCode, students, color, badge }: {
  title: string;
  code?: string;
  courseCode?: string;
  students?: number;
  color?: string;
  badge?: string;
}) {
  const displayCode = code || courseCode || '';
  return (
    <a href="#" className="course-card">
      <div className={`course-card-banner ${color || 'blue'}`}>
        <h3>{title}</h3>
      </div>
      <div className="course-card-body">
        
        <p className="course-card-section">{displayCode}</p>
        <div className="course-card-meta">
          <div className="course-card-students">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            
            {students} students

          </div>
          <p id="active-text">
          active
          </p>
          <span className={`badge badge-${badge === "Active" ? "primary" : "accent"}`}>
            {badge}
          </span>
        </div>
      </div>
    </a>
  );
}

function Dashboard() {
  // Sidebar open/close state (for mobile)
  const { user } = useAuth();

  const [teachingCourses, setTeachingCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchCourses() {
      setLoading(true);
      try {
        if (!user?._id) {
          if (mounted) setLoading(false);
          return;
        }
        const res = await apiFetch(`/api/courses/user/${user._id}`);
        if (!res.ok) { if (mounted) setLoading(false); return; }
        const data = await res.json();
        if (!mounted) return;
        setTeachingCourses(Array.isArray(data.teaching) ? data.teaching : []);
        setEnrolledCourses(Array.isArray(data.enrolled) ? data.enrolled : []);
      } catch (err) {
        // ignore for now
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchCourses();
    return () => { mounted = false; };
  }, [user]);

  return (
   <>
   <JoinCourse onJoined={async () => {
     // refresh courses after join
     try {
       if (!user?._id) return;
       const res = await apiFetch(`/api/courses/user/${user._id}`);
       if (!res.ok) return;
       const data = await res.json();
       setTeachingCourses(Array.isArray(data.teaching) ? data.teaching : []);
       setEnrolledCourses(Array.isArray(data.enrolled) ? data.enrolled : []);
     } catch (err) {
       // ignore
     }
   }} />

      
      <main className="main-content">

        {/* Page header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome back, Zaeem 👋</h1>
            <p className="page-subtitle">Here's your classroom overview for today.</p>
          </div>
        </div>

        {/* ===== Teaching Section ===== */}
        <div className="section-header">
          <h2 className="section-title">
            <svg className="icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Teaching
          </h2>
          <a href="#" className="btn btn-outline btn-sm">View All</a>
        </div>

        <div className="course-grid">
          {loading ? (
            <div className="courses-loading">
              <span className="courses-loading-spinner" />
              Loading courses…
            </div>
          ) : (
            teachingCourses.map((course) => (
              <CourseCard key={course.title} {...course} />
            ))
          )}
        </div>

        {/* ===== Enrolled Section ===== */}
        <div className="section-header">
          <h2 className="section-title">
            <svg className="icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Enrolled
          </h2>
          <a href="#" className="btn btn-outline btn-sm">View All</a>
        </div>

        <div className="course-grid">
          {loading ? (
            <div className="courses-loading">
              <span className="courses-loading-spinner" />
              Loading courses…
            </div>
          ) : (
            enrolledCourses.map((course) => (
              <Link to={`/enrolled/${course._id || ''}`} key={course._id || course.title} className="course-card">
                <div className={`course-card-banner ${course.color || 'green'}`}>
                  <h3>{course.title}</h3>
                </div>
                <div className="course-card-body">
                  
                  <p className="course-card-section">{course.courseCode || ''} </p>
                  
                  <div className="course-card-meta">
                    <p id="enrolled-text">enrolled</p>
                    
                    <div className="course-card-students">{course.inviteCode ? `Invite: ${course.inviteCode}` : ""}</div>
                  
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

      </main>
    </>
  );
}

export default Dashboard;
