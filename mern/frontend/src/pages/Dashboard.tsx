import { useState } from "react";
import "./Dashboard.css";
import { ThemeProvider } from "../components/ThemeToggle";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

// A single course card — keeps things simple and readable
function CourseCard({ title, code, students, color, badge }: {
  title: string;
  code: string;
  students: number;
  color: string;
  badge: string;
}) {
  return (
    <a href="#" className="course-card">
      <div className={`course-card-banner ${color}`}>
        <h3>{title}</h3>
      </div>
      <div className="course-card-body">
        <p className="course-card-section">{code}</p>
        <div className="course-card-meta">
          <div className="course-card-students">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            {students} students
          </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  // Teaching courses data
  const teachingCourses = [
    { title: "Artificial Intelligence", code: "CS-401 · Section A · Fall 2026", students: 42, color: "blue", badge: "Active" },
    { title: "Machine Learning", code: "CS-471 · Section B · Fall 2026", students: 38, color: "green", badge: "Active" },
    { title: "Data Structures", code: "CS-201 · Section A · Fall 2026", students: 55, color: "purple", badge: "Active" },
  ];

  // Enrolled courses data
  const enrolledCourses = [
    { title: "Human Computer Interaction", code: "CS-312 · Section C · Fall 2026", students: 35, color: "orange", badge: "Enrolled" },
    { title: "Natural Language Processing", code: "CS-482 · Section A · Fall 2026", students: 30, color: "pink", badge: "Enrolled" },
    { title: "Computer Vision", code: "CS-491 · Section B · Fall 2026", students: 28, color: "teal", badge: "Enrolled" },
    { title: "Deep Learning", code: "CS-495 · Section A · Fall 2026", students: 33, color: "indigo", badge: "Enrolled" },
  ];

  return (
    <ThemeProvider>
      {/* Top navigation bar */}
      <Navbar onMenuToggle={toggleSidebar} />

      {/* Left sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Main content area */}
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
          {teachingCourses.map((course) => (
            <CourseCard key={course.title} {...course} />
          ))}
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
          {enrolledCourses.map((course) => (
            <CourseCard key={course.title} {...course} />
          ))}
        </div>

      </main>
    </ThemeProvider>
  );
}

export default Dashboard;
