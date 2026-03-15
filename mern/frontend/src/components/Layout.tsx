import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
// ThemeProvider is provided at the app root (App.tsx)

export default function Layout() {
  const { user } = useAuth();

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