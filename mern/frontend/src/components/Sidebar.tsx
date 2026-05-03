import "./Sidebar.css";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, BookOpen, CheckSquare, PenTool, Settings } from "lucide-react";
import Icon from "./ui/Icon";

type SidebarUser = {
  _id: string;
  name?: string;
} | null;

// Sidebar component — navigation links on the left
export default function Sidebar({ isOpen }: { isOpen: boolean; user: SidebarUser }) {
  return (
    <>
      {/* Backdrop for mobile — closes sidebar when clicked */}
      <div className={`sidebar-backdrop ${isOpen ? "active" : ""}`}></div>

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <nav className="sidebar-nav">
          {/* Dashboard link */}
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon icon={LayoutDashboard} size={20} />
            Dashboard
          </NavLink>

          {/* Teaching section */}
          <div className="sidebar-section">Teaching</div>
          <NavLink to="/teacher-panel" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon icon={Users} size={20} />
            Teacher Panel
            
          </NavLink>

          {/* Enrolled section */}
          <div className="sidebar-section">Enrolled</div>
          <NavLink to="/student-panel" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon icon={BookOpen} size={20} />
            Student Panel
           
          </NavLink>
          <NavLink to="/todo" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon icon={CheckSquare} size={20} />
            To Do
          </NavLink>
          <a href="#" className="sidebar-link">
            <Icon icon={PenTool} size={20} />
            Jamboard
          </a>

          {/* General section */}
          <div className="sidebar-section">General</div>
          <a href="#" className="sidebar-link">
            <Icon icon={Settings} size={20} />
            Settings
          </a>
        </nav>
      </aside>
    </>
  );
}
