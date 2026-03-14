import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { ThemeProvider } from "./components/ThemeToggle";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Enrolled from "./pages/Enrolled";
import TeacherPanel from "./pages/TeacherPanel";



function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <Routes>
        {/* Public routes (no navbar/sidebar) */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes (inside Layout) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teacher-panel" element={<TeacherPanel />} />
          <Route path="/enrolled" element={<Enrolled />} />
          <Route path="/enrolled/:id" element={<Enrolled />} />
        </Route>
      </Routes>
      </ThemeProvider>

    </BrowserRouter>
  );
}

export default App;