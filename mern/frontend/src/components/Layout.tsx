import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);

  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const applyScrollLock = () => {
      document.body.style.overflow = sidebarOpen && mq.matches ? "hidden" : "";
    };
    applyScrollLock();
    mq.addEventListener("change", applyScrollLock);
    return () => {
      mq.removeEventListener("change", applyScrollLock);
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSidebar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen, closeSidebar]);

  return (
    <>
      <Navbar user={user} sidebarOpen={sidebarOpen} onMenuToggle={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} user={user} onClose={closeSidebar} />
      <main>
        <Outlet />
      </main>
    </>
  );
}
