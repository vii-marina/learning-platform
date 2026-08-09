import { lazy, Suspense, type ComponentType } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoadingState } from "../components/ui/LoadingState";

function lazyPage<K extends string, M extends Record<K, ComponentType>>(
  name: K,
  loader: () => Promise<M>
) {
  return lazy(() => loader().then((module) => ({ default: module[name] })));
}

// Lazy so the Supabase client stays out of the entry chunk; it renders null, so
// its own Suspense boundary keeps a pending chunk from blanking the page.
const AuthSessionWatcher = lazyPage("AuthSessionWatcher", () => import("../features/auth/components/AuthSessionWatcher"));

const LandingPage = lazyPage("LandingPage", () => import("../pages/landing/LandingPage"));
const NotFoundPage = lazyPage("NotFoundPage", () => import("../pages/not-found/NotFoundPage"));
const EmailConfirmedPage = lazyPage("EmailConfirmedPage", () => import("../pages/auth/EmailConfirmedPage"));
const LoginPage = lazyPage("LoginPage", () => import("../pages/auth/LoginPage"));
const RegisterPage = lazyPage("RegisterPage", () => import("../pages/auth/RegisterPage"));
const DashboardPage = lazyPage("DashboardPage", () => import("../pages/dashboard/DashboardPage"));

const AdminDashboardLayout = lazyPage("AdminDashboardLayout", () => import("../pages/dashboards/AdminDashboardLayout"));
const AdminDashboardPage = lazyPage("AdminDashboardPage", () => import("../pages/dashboards/AdminDashboardPage"));
const AdminDashboardTeachersPage = lazyPage("AdminDashboardTeachersPage", () => import("../pages/dashboards/AdminDashboardTeachersPage"));
const AdminTeacherDetailsPage = lazyPage("AdminTeacherDetailsPage", () => import("../pages/dashboards/AdminTeacherDetailsPage"));
const AdminDashboardStudentsPage = lazyPage("AdminDashboardStudentsPage", () => import("../pages/dashboards/AdminDashboardStudentsPage"));
const AdminStudentDetailsPage = lazyPage("AdminStudentDetailsPage", () => import("../pages/dashboards/AdminStudentDetailsPage"));
const AdminCoursePreviewPage = lazyPage("AdminCoursePreviewPage", () => import("../pages/dashboards/AdminCoursePreviewPage"));
const AdminDashboardCoursesPage = lazyPage("AdminDashboardCoursesPage", () => import("../pages/dashboards/AdminDashboardCoursesPage"));
const AdminDashboardLandingPage = lazyPage("AdminDashboardLandingPage", () => import("../pages/dashboards/AdminDashboardLandingPage"));
const AdminDashboardSettingsPage = lazyPage("AdminDashboardSettingsPage", () => import("../pages/dashboards/AdminDashboardSettingsPage"));
const TeacherDashboardPage = lazyPage("TeacherDashboardPage", () => import("../pages/dashboards/TeacherDashboardPage"));
const StudentDashboardPage = lazyPage("StudentDashboardPage", () => import("../pages/dashboards/StudentDashboardPage"));
const StudentCoursePage = lazyPage("StudentCoursePage", () => import("../pages/dashboards/StudentCoursePage"));

const CourseBuilderWorkspacePage = lazyPage("CourseBuilderWorkspacePage", () => import("../pages/course-builder/CourseBuilderWorkspacePage"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <AuthSessionWatcher />
      </Suspense>
      <Suspense fallback={<LoadingState variant="page" />}>
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
            <Route path="landing" element={<AdminDashboardLandingPage />} />
            <Route path="settings" element={<AdminDashboardSettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
          <Route path="/student/dashboard" element={<StudentDashboardPage />} />
          <Route path="/student/courses/:courseId" element={<StudentCoursePage />} />
          <Route path="/course-builder" element={<CourseBuilderWorkspacePage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
