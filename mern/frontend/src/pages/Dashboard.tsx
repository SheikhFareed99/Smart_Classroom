
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

const COURSE_BANNER_COLORS = ["blue", "green", "purple", "orange", "pink", "teal", "indigo"];

function hashCourseSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getCourseBannerColor(course: Course, fallbackIndex: number) {
  if (course.color) {
    return course.color;
  }

  const seed = course._id || course.title || String(fallbackIndex);
  const colorIndex = hashCourseSeed(seed) % COURSE_BANNER_COLORS.length;
  return COURSE_BANNER_COLORS[colorIndex];
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
  const name = user?.name ? user.name.split(" ").slice(0, 2).join(" ") : "Unknown Student";

  return (
   <>
   <JoinCourse onJoined={async () => {
     // refresh courses after join (test is this working)
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
            <h1 className="page-title">Welcome back, {name}</h1>
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
            teachingCourses.map((course, index) => {
              const bannerColor = getCourseBannerColor(course, index);
              return (
              <Link
                to={`/teacher-course/${course._id || ''}`}
                state={{ color: bannerColor }}
                key={course._id || course.title}
                className="course-card"
              >
                <div className={`course-card-banner ${bannerColor}`}>
                  <h3>{course.title}</h3>
                </div>
                <div className="course-card-body">
                  <p className="course-card-section">{course.courseCode || ''}</p>
                  <div className="course-card-meta">
                    <div className="course-card-students">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {course.students} students
                    </div>
                    <p id="active-text">active</p>
                    <span className={`badge badge-${course.badge === "Active" ? "primary" : "accent"}`}>
                      {course.badge}
                    </span>
                  </div>
                </div>
              </Link>
            );
            })
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
            enrolledCourses.map((course, index) => {
              const bannerColor = getCourseBannerColor(course, index);
              return (
              <Link to={`/enrolled/${course._id || ''}`} state={{ color: bannerColor }} key={course._id || course.title} className="course-card">
                <div className={`course-card-banner ${bannerColor}`}>
                  <h3>{course.title}</h3>
                </div>
                <div className="course-card-body">

                  <svg
      className="classroom-logo"
      width="32"
      height="32"
      viewBox="0 0 64 64"
      fill="white"
    >
      <path d="M4 12h56v28H4zM8 16v20h48V16zM12 44h40v4H12zM20 48h24v4H20z"/>
      <path d="M16 22h32v4H16zM16 28h20v4H16z"/>
    </svg>
                  <p className="course-card-section">{course.courseCode || ''} </p>
                  
                  <div className="course-card-meta">
                    <p id="enrolled-text">enrolled</p>
                    
                    <div className="course-card-students">{course.inviteCode ? `Invite: ${course.inviteCode}` : ""}</div>
                  
                  </div>
                </div>
              </Link>
            );
            })
          )}
        </div>

      </main>
    </>
  );
}

export default Dashboard;
