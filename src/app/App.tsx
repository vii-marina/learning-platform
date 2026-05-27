import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  AdminCoursePreviewPage,
  AdminDashboardCoursesPage,
  AdminDashboardLayout,
  AdminDashboardPage,
  AdminDashboardSettingsPage,
  AdminDashboardStudentsPage,
  AdminDashboardTeachersPage,
  AdminStudentDetailsPage,
  AdminTeacherDetailsPage,
  CourseBuilderWorkspacePage,
  DashboardPage,
  EmailConfirmedPage,
  LandingPage,
  LoginPage,
  RegisterPage,
  StudentCoursePage,
  StudentDashboardPage,
  TeacherDashboardPage,
} from "../pages";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/email-confirmed" element={<EmailConfirmedPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="teachers" element={<AdminDashboardTeachersPage />} />
          <Route path="teachers/:teacherId" element={<AdminTeacherDetailsPage />} />
          <Route path="students" element={<AdminDashboardStudentsPage />} />
          <Route path="students/:studentId" element={<AdminStudentDetailsPage />} />
          <Route path="courses/:courseId" element={<AdminCoursePreviewPage />} />
          <Route path="courses" element={<AdminDashboardCoursesPage />} />
          <Route path="settings" element={<AdminDashboardSettingsPage />} />
        </Route>
        <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
        <Route path="/student/dashboard" element={<StudentDashboardPage />} />
        <Route path="/student/courses/:courseId" element={<StudentCoursePage />} />
        <Route path="/course-builder" element={<CourseBuilderWorkspacePage />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
