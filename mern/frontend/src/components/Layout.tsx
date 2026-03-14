import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
// ThemeProvider is provided at the app root (App.tsx)

export default function Layout() {

  const [user, setUser] = useState<any>(null);

 
  useEffect(() => {
    async function loadUser() {
      const res = await fetch("/auth/user", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setUser(data);
    }
    loadUser();
  }, []);

  return (
    <>
      <Navbar user={user} />
      <Sidebar isOpen={false} />
      <main>
        <Outlet />
      </main>
    </>
  );
}