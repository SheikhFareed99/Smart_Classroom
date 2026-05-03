
import "./Dashboard.css";
import JoinCourse from "../components/JoinCourse";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/api";
import { Users, BookOpen, Hand } from "lucide-react";
import Icon from "../components/ui/Icon";
import Badge from "../components/ui/Badge";
import { SkeletonCard } from "../components/ui/Skeleton";
import { getCourseBannerColor } from "../lib/courseColors";

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
function CourseCard({ _id, title, code, courseCode, students, color, badge }: {
  _id?: string;
  title: string;
  code?: string;
  courseCode?: string;
  students?: number;
  color?: string;
  badge?: string;
}) {
  const displayCode = code || courseCode || '';
  
  return (
    <Link to={`/teacher-course/${_id || ''}`} className="course-card">
      <div className={`course-card-banner ${color || 'blue'}`}>
        <h3>{title}</h3>
      </div>
      <div className="course-card-body">
        
        <p className="course-card-section">{displayCode}</p>
        <div className="course-card-meta">
          <div className="course-card-students">
            <Icon icon={Users} size={16} />
            {students} students
          </div>
          {badge && (
            <Badge variant={badge === "Active" ? "primary" : "success"}>
              {badge}
            </Badge>
          )}
        </div>
      </div>
    </Link>
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
            <h1 className="page-title">
              Welcome back, {name}
              <Icon icon={Hand} size={28} className="wave-icon" />
            </h1>
            <p className="page-subtitle">Here's your classroom overview for today.</p>
          </div>
        </div>

        {/* ===== Teaching Section ===== */}
        <div className="section-header">
          <h2 className="section-title">
            <Icon icon={Users} size={24} className="section-icon" />
            Teaching
          </h2>
          <a href="#" className="btn-view-all">View All</a>
        </div>

        <div className="course-grid">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            teachingCourses.map((course) => {
              const bannerColor = course.color || getCourseBannerColor();
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
            <Icon icon={BookOpen} size={24} className="section-icon" />
            Enrolled
          </h2>
          <a href="#" className="btn-view-all">View All</a>
        </div>

        <div className="course-grid">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            enrolledCourses.map((course) => {
              const bannerColor = course.color || getCourseBannerColor();
              return (
              <Link to={`/enrolled/${course._id || ''}`} state={{ color: bannerColor }} key={course._id || course.title} className="course-card">
                <div className={`course-card-banner ${bannerColor}`}>
                  <h3>{course.title}</h3>
                </div>
                <div className="course-card-body">
                  <p className="course-card-section">{course.courseCode || ''}</p>
                  <div className="course-card-meta">
                    <div className="course-card-students">
                      {course.inviteCode ? `Invite: ${course.inviteCode}` : ""}
                    </div>
                    <Badge variant="neutral">Enrolled</Badge>
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
