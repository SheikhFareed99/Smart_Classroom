import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { ThemeProvider } from "./components/ThemeToggle";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import PublicOnlyRoute from "./auth/PublicOnlyRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Enrolled from "./pages/Enrolled";
import TeacherPanel from "./pages/TeacherPanel";
import StudentPanel from "./pages/StudentPanel";



function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes (no navbar/sidebar) */}
            <Route
              path="/"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <Signup />
                </PublicOnlyRoute>
              }
            />

            {/* Protected routes (inside Layout) */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/teacher-panel" element={<TeacherPanel />} />
              <Route path="/student-panel" element={<StudentPanel />} />
              <Route path="/enrolled" element={<Enrolled />} />
              <Route path="/enrolled/:id" element={<Enrolled />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>

    </BrowserRouter>
  );
}

export default App;