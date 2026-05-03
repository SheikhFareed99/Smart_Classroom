import { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeToggle";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Search, Bell, Sun, Moon, ChevronDown, LogOut } from "lucide-react";
import Icon from "./ui/Icon";
import Avatar from "./ui/Avatar";
import "./Navbar.css";

type NavbarProps = {
  user: any;
};

export default function Navbar({ user }: NavbarProps) {
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
          <Icon icon={Search} size={18} className="search-box__icon" />
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
        <button className="nav-icon-btn" aria-label="Notifications">
          <Icon icon={Bell} size={20} />
          <span className="notification-dot" />
        </button>

        {/* Theme toggle */}
        <button className="nav-icon-btn" onClick={toggleTheme} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
          <Icon icon={darkMode ? Sun : Moon} size={20} />
        </button>

        {/* Profile */}
        <div className="profile-wrap" ref={profileRef}>
          <button
            className="profile-btn"
            onClick={() => setProfileOpen((s) => !s)}
            aria-expanded={profileOpen}
            aria-label="User menu"
          >
            <Avatar name={profileName} size="sm" />
            <span className="profile-name">{profileName}</span>
            <Icon icon={ChevronDown} size={16} className="profile-chevron" />
          </button>

          {profileOpen && (
            <div className="profile-menu" role="menu">
              <button
                className="profile-menu-item"
                role="menuitem"
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              >
                <Icon icon={LogOut} size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}