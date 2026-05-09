
import "./Dashboard.css";
import JoinCourse from "../components/JoinCourse";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/api";
import { Users, BookOpen } from "lucide-react";
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

      
      <main className="main-content main-content--with-joinfab">

        {/* Page header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
             {name}
              
            </h1>
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
                    <div className="course-card-meta-actions">
                      {course.badge && (
                        <span className={`badge badge-${course.badge === "Active" ? "primary" : "accent"}`}>
                          {course.badge}
                        </span>
                      )}
                      <span className="badge course-card-status">Active</span>
                    </div>
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
