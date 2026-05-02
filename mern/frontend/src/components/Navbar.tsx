import { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeToggle";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./Navbar.css";

type NavbarProps = {
  user: any;
};




export default function Navbar({  user }: NavbarProps) {
  const { darkMode, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  function handleSearchSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchText.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchText)}`);
      setSearchText("");
    }
  }

const profileName = user?.name 
  ? user.name.split(" ").slice(0, 2).join(" ") 
  : (user?.email || "");

  const profileInitials = profileName
    ? profileName
        .split(" ")
        .map((s: string) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  // close dropdown when clicking outside
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!profileRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!profileRef.current.contains(e.target)) setProfileOpen(false);
    }

    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  return (
    <nav className="navbar">
      {/* Left */}
      <div className="navbar-left">
     

        <Link to="/dashboard" className="navbar-logo">
          <div className="logo-icon">AI</div>
          AI<span>Co</span>
        </Link>
      </div>

      {/* Center */}
      <div className="navbar-center">
        <div className="search-box">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="7" />
            <path d="m15 15 2 2" />
          </svg>

          <input
            type="text"
            placeholder="Search courses"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleSearchSubmit}
          />
        </div>
      </div>

      {/* Right */}
      <div className="navbar-right">
        {/* Notification */}
  

        {/* Theme toggle */}
        <button className="nav-icon-btn" onClick={toggleTheme}>
          {darkMode ? (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="10" cy="10" r="4" />
              <path d="M10 1v2M10 17v2M3.3 3.3l1.4 1.4M15.3 15.3l1.4 1.4M1 10h2M17 10h2" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Profile */}
        <div className="profile-wrap" ref={profileRef}>
          <button
            className="profile-btn"
            onClick={() => setProfileOpen((s) => !s)}
            aria-expanded={profileOpen}
          >
            <div className="avatar">{profileInitials || "U"}</div>

            <span className="profile-name">{profileName}</span>

            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>

          {profileOpen && (
            <div className="profile-menu">
              <button
                className="profile-menu-item"
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}