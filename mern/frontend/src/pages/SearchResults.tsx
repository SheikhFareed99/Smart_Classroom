import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/api";
import "./Dashboard.css";

type Course = {
  _id?: string;
  title: string;
  courseCode?: string;
  inviteCode?: string;
  students?: number;
  color?: string;
};

const COURSE_BANNER_COLORS = ["blue", "green", "purple", "orange", "pink", "teal", "indigo"];

function hashCourseSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getCourseBannerColor(courseId: string, fallbackIndex: number) {
  const seed = courseId || String(fallbackIndex);
  const colorIndex = hashCourseSeed(seed) % COURSE_BANNER_COLORS.length;
  return COURSE_BANNER_COLORS[colorIndex];
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { user } = useAuth();
  const [results, setResults] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function search() {
      if (!query.trim() || !user?._id) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await apiFetch(`/api/courses/user/${user._id}`);
        if (!res.ok) {
          setResults([]);
          setLoading(false);
          return;
        }

        const data = await res.json();
        const allCourses = [
          ...(Array.isArray(data.teaching) ? data.teaching : []),
          ...(Array.isArray(data.enrolled) ? data.enrolled : []),
        ];

        // Filter by query
        const filtered = allCourses.filter((course) => {
          const searchLower = query.toLowerCase();
          return (
            course.title?.toLowerCase().includes(searchLower) ||
            course.courseCode?.toLowerCase().includes(searchLower) ||
            course.inviteCode?.toLowerCase().includes(searchLower)
          );
        });

        setResults(filtered);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    search();
  }, [query, user?._id]);

  return (
    <main className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Search Results for &quot;<strong>{query}</strong>&quot;
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="courses-loading">
          <span className="courses-loading-spinner" />
          Searching…
        </div>
      ) : results.length === 0 ? (
        <div className="card" style={{ padding: 24 }}>
          <p>No courses found matching "{query}"</p>
        </div>
      ) : (
        <>
          <div className="section-header">
            <h2 className="section-title">
              Found {results.length} course{results.length !== 1 ? "s" : ""}
            </h2>
          </div>
          <div className="course-grid">
            {results.map((course, index) => {
              const bannerColor = getCourseBannerColor(course._id || "", index);
              return (
                <Link
                  key={course._id || course.title}
                  to={`/teacher-course/${course._id || ''}`}
                  state={{ color: bannerColor }}
                  className="course-card"
                >
                  <div className={`course-card-banner ${bannerColor}`}>
                    <h3>{course.title}</h3>
                  </div>
                  <div className="course-card-body">
                    <p className="course-card-section">
                      {course.courseCode || ""}
                      {course.inviteCode && ` · Invite: ${course.inviteCode}`}
                    </p>
                    <div className="course-card-meta">
                      <div className="course-card-students">
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          viewBox="0 0 24 24"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        {course.students || 0} students
                      </div>
                      <span className="badge badge-primary">Active</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
