import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { ThemeProvider } from "./components/ThemeToggle";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import PublicOnlyRoute from "./auth/PublicOnlyRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Enrolled from "./pages/Enrolled";
import TeacherPanel from "./pages/TeacherPanel";
import TeacherCourse from "./pages/TeacherCourse";
import TeacherCreateAssignment from "./pages/TeacherCreateAssignment";
import StudentPanel from "./pages/StudentPanel";
import StudentAssignment from "./pages/StudentAssignment";
import StudentMaterials from "./pages/StudentMaterials";
import JamboardEditor from "./pages/JamboardEditor";
import ToDo from "./pages/ToDo";
import TeacherPlagiarismReport from "./pages/TeacherPlagiarismReport";
import SearchResults from "./pages/SearchResults";



function App() {
  return (
    <>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes (no navbar/sidebar) */}
            <Route
              path="/"
              element={
                <PublicOnlyRoute>
                  <Landing />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
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
              <Route path="/search" element={<SearchResults />} />
              <Route path="/teacher-panel" element={<TeacherPanel />} />
              <Route path="/student-panel" element={<StudentPanel />} />
              <Route path="/enrolled" element={<Enrolled />} />
              <Route path="/enrolled/:id" element={<Enrolled />} />
              <Route path="/teacher-course/:id" element={<TeacherCourse />} />
              <Route path="/teacher-course/:courseId/create-assignment" element={<TeacherCreateAssignment />} />
              <Route path="/teacher-course/:courseId/assignment/:deliverableId/plagiarism" element={<TeacherPlagiarismReport />} />
              <Route path="/student-assignment/:assignmentId" element={<StudentAssignment />} />
              <Route path="/enrolled/:courseId/materials" element={<StudentMaterials />} />
              <Route path="/todo" element={<ToDo />} />
            </Route>

            <Route
              path="/jamboard/:whiteboardID"
              element={
                <ProtectedRoute>
                  <JamboardEditor />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </ThemeProvider>

    </BrowserRouter>

    </>
  );
}

export default App;