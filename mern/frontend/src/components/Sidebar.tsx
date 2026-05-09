import "./Sidebar.css";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, BookOpen, CheckSquare, PenTool } from "lucide-react";
import Icon from "./ui/Icon";

type SidebarUser = {
  _id: string;
  name?: string;
} | null;

type SidebarProps = {
  isOpen: boolean;
  user: SidebarUser;
  /** Mobile drawer dismiss */
  onClose?: () => void;
};

// Sidebar component — navigation links on the left
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const closeIfMobile = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
      onClose?.();
    }
  };

  return (
    <>
      {/* Backdrop for mobile — closes sidebar when tapped */}
      <div
        className={`sidebar-backdrop ${isOpen ? "active" : ""}`}
        onClick={() => onClose?.()}
        aria-hidden={!isOpen}
      />

      <aside className={`sidebar ${isOpen ? "open" : ""}`} aria-label="Main navigation">
        <nav className="sidebar-nav">
          {/* Dashboard link */}
          <NavLink
            to="/dashboard"
            onClick={closeIfMobile}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Icon icon={LayoutDashboard} size={20} />
            Dashboard
          </NavLink>

          {/* Teaching section */}
          <div className="sidebar-section">Teaching</div>
          <NavLink
            to="/teacher-panel"
            onClick={closeIfMobile}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Icon icon={Users} size={20} />
            Teacher Panel
            
          </NavLink>

          {/* Enrolled section */}
          <div className="sidebar-section">Enrolled</div>
          <NavLink
            to="/student-panel"
            onClick={closeIfMobile}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Icon icon={BookOpen} size={20} />
            Student Panel
           
          </NavLink>
          <NavLink
            to="/todo"
            onClick={closeIfMobile}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Icon icon={CheckSquare} size={20} />
            To Do
          </NavLink>
          <NavLink
            to="/student-panel#jamboard"
            onClick={closeIfMobile}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Icon icon={PenTool} size={20} />
            Jamboard
          </NavLink>

          {/* General section */}
         
          
        </nav>
      </aside>
    </>
  );
}
