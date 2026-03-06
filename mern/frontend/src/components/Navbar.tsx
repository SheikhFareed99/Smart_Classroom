import { useState } from "react";
import { useTheme } from "./ThemeToggle";
import "./Navbar.css";

// Navbar component — sits at the top of the dashboard
export default function Navbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { darkMode, toggleTheme } = useTheme();
  const [searchText, setSearchText] = useState("");

  return (
    <nav className="navbar">
      {/* Left: menu toggle + logo */}
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>

        <a href="/dashboard" className="navbar-logo">
          <div className="logo-icon">AI</div>
          AI<span>Co</span>
        </a>
      </div>

      {/* Center: search bar */}
      <div className="navbar-center">
        <div className="search-box">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="7" />
            <path d="m15 15 2 2" />
          </svg>
          <input
            type="text"
            placeholder="Search courses, assignments…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Right: notifications, theme toggle, profile */}
      <div className="navbar-right">
        {/* Notification bell */}
        <button className="nav-icon-btn">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="notification-dot"></span>
        </button>

        {/* Dark mode toggle */}
        <button className="nav-icon-btn" onClick={toggleTheme}>
          {darkMode ? (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="4" />
              <path d="M10 1v2M10 17v2M3.3 3.3l1.4 1.4M15.3 15.3l1.4 1.4M1 10h2M17 10h2M3.3 16.7l1.4-1.4M15.3 4.7l1.4-1.4" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Profile button */}
        <button className="profile-btn">
          <div className="avatar">ZA</div>
          <span className="profile-name">Zaeem Ahmed</span>
          <svg className="profile-chevron" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
