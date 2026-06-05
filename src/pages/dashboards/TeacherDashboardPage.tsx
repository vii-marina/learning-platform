import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppToast } from "../../components/ui/AppToastProvider";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import { supabase } from "../../lib/supabase";
import {
  CourseBuilderPage,
  type CourseBuilderPageHandle,
} from "../admin/CourseBuilderPage";
import {
  clearCurrentUserCache,
  getCurrentUser,
  updateCurrentUserProfile,
} from "../../features/auth/api/authApi";
import { clearAdminDashboardCache } from "../../features/admin-dashboard/api/adminDashboardApi";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import {
  canAccessDashboardRole,
  getDefaultRouteForRole,
} from "../../features/auth/lib/roleRouting";
import type {
  CurrentUser,
  UpdateCurrentUserProfileInput,
} from "../../features/auth/types";
import { uploadTeacherAvatar } from "../../features/teacher-dashboard/api/teacherProfileStorage";
import { CourseBuilderLeaveWarningModal } from "../../features/courses/components/course-builder/components/CourseBuilderLeaveWarningModal";
import type { BuilderStep } from "../../features/courses/components/course-builder/lib/courseBuilderPageUtils";
import { TeacherDashboardCourses } from "../../features/teacher-dashboard/components/TeacherDashboardCourses";
import { TeacherDashboardOverview } from "../../features/teacher-dashboard/components/TeacherDashboardOverview";
import { TeacherDashboardProfile } from "../../features/teacher-dashboard/components/TeacherDashboardProfile";
import { TeacherDashboardSidebar } from "../../features/teacher-dashboard/components/TeacherDashboardSidebar";
import { TeacherDashboardStudents } from "../../features/teacher-dashboard/components/TeacherDashboardStudents";
import type { TeacherDashboardSectionId } from "../../features/teacher-dashboard/types";

type PendingBuilderExitAction =
  | {
      type: "section";
      section: TeacherDashboardSectionId;
    }
  | {
      type: "builder";
      courseId: string | null;
      initialStep: BuilderStep;
    }
  | {
      type: "logout";
    };



export function TeacherDashboardPage() {
  const navigate = useNavigate();
  const { showSuccessToast } = useAppToast();
  const builderRef = useRef<CourseBuilderPageHandle | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pageMessage, setPageMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [profileMessage, setProfileMessage] = useState<{
    type: "error";
    text: string;
    details?: unknown;
  } | null>(null);
  const [activeSection, setActiveSection] =
    useState<TeacherDashboardSectionId>("overview");
  const [builderCourseId, setBuilderCourseId] = useState<string | null>(null);
  const [builderInitialStep, setBuilderInitialStep] = useState<BuilderStep>(1);
  const [pendingBuilderExit, setPendingBuilderExit] =
    useState<PendingBuilderExitAction | null>(null);
  const [leaveBuilderError, setLeaveBuilderError] = useState<string | null>(null);
  const [isSavingDraftBeforeExit, setIsSavingDraftBeforeExit] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const isBuilderSection = activeSection === "builder";

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const currentUser = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        if (!canAccessDashboardRole(currentUser.role, "teacher")) {
          navigate(getDefaultRouteForRole(currentUser.role), { replace: true });
          return;
        }

        setCurrentUser(currentUser);
        setHasAccess(true);
        setPageMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof BackendApiError && error.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        setPageMessage({
          type: "error",
          text: getErrorMessage(error, "Не вдалося завантажити дашборд."),
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (!isLoading && !hasAccess && !pageMessage) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSaveProfile(
    input: UpdateCurrentUserProfileInput,
    avatarFile: File | null
  ) {
    if (!currentUser) {
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileMessage(null);
      const avatarPath = avatarFile
        ? await uploadTeacherAvatar(currentUser.id, avatarFile)
        : input.avatarPath;
      const updatedUser = await updateCurrentUserProfile({
        ...input,
        avatarPath,
      });
      setCurrentUser(updatedUser);
      showSuccessToast("Профіль збережено.");
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error, "Не вдалося зберегти ваші дані."),
        details: error instanceof BackendApiError ? error.details : undefined,
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function performLogout() {
    setIsLoggingOut(true);
    setLogoutMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLogoutMessage(error.message);
      setIsLoggingOut(false);
      return;
    }

    clearCurrentUserCache();
    clearAdminDashboardCache();
    navigate("/login", { replace: true });
  }

  function requestBuilderExit(action: PendingBuilderExitAction) {
    const builderHandle = builderRef.current;

    if (
      activeSection !== "builder" ||
      !builderHandle ||
      !builderHandle.hasUnsavedChanges
    ) {
      if (action.type === "section") {
        setActiveSection(action.section);
      } else if (action.type === "builder") {
        setBuilderCourseId(action.courseId);
        setBuilderInitialStep(action.initialStep);
        setActiveSection("builder");
      } else {
        void performLogout();
      }
      return;
    }

    setLeaveBuilderError(null);
    setPendingBuilderExit(action);
  }

  function handleSidebarSectionChange(section: TeacherDashboardSectionId) {
    if (section === activeSection) {
      return;
    }

    requestBuilderExit({
      type: "section",
      section,
    });
  }

  function handleOpenCourseBuilder(
    courseId: string | null = null,
    initialStep: BuilderStep = 1
  ) {
    if (
      activeSection === "builder" &&
      builderCourseId === courseId &&
      builderInitialStep === initialStep
    ) {
      return;
    }

    requestBuilderExit({
      type: "builder",
      courseId,
      initialStep,
    });
  }

  async function handleSaveDraftAndLeaveBuilder() {
    const builderHandle = builderRef.current;

    if (!builderHandle || !pendingBuilderExit) {
      return;
    }

    setIsSavingDraftBeforeExit(true);
    setLeaveBuilderError(null);

    const didSaveDraft = await builderHandle.saveDraft();

    setIsSavingDraftBeforeExit(false);

    if (!didSaveDraft) {
      setLeaveBuilderError(
        builderHandle.canSaveDraft
          ? "Не вдалося зберегти чернетку. Перевірте форму курсу й спробуйте ще раз."
          : "Заповніть обовʼязкову інформацію про курс перед збереженням чернетки."
      );
      return;
    }

    const nextAction = pendingBuilderExit;
    setPendingBuilderExit(null);

    if (nextAction.type === "section") {
      setActiveSection(nextAction.section);
      return;
    }

    if (nextAction.type === "builder") {
      setBuilderCourseId(nextAction.courseId);
      setBuilderInitialStep(nextAction.initialStep);
      setActiveSection("builder");
      return;
    }

    void performLogout();
  }

  function renderTeacherSection() {
    switch (activeSection) {
      case "profile":
        return currentUser ? (
          <TeacherDashboardProfile
            teacher={currentUser}
            isSaving={isSavingProfile}
            onSave={handleSaveProfile}
            saveMessage={profileMessage}
            onClearSaveMessage={() => setProfileMessage(null)}
          />
        ) : (
          <LoadingState variant="section" />
        );
      case "overview":
        return (
          <TeacherDashboardOverview
            teacherId={currentUser?.id ?? null}
            onOpenCourseBuilder={() => handleOpenCourseBuilder(null)}
            onContinueCourse={(courseId) => handleOpenCourseBuilder(courseId)}
          />
        );
      case "courses":
        return (
          <TeacherDashboardCourses
            teacherId={currentUser?.id ?? null}
            onCreateCourse={() => handleOpenCourseBuilder(null)}
            onContinueCourse={(courseId) => handleOpenCourseBuilder(courseId)}
            onOpenPublishCourse={(courseId) => handleOpenCourseBuilder(courseId, 3)}
          />
        );
      case "builder":
        return (
          <CourseBuilderPage
            key={`${builderCourseId ?? "new-course"}-${builderInitialStep}`}
            ref={builderRef}
            embedded
            initialCourseId={builderCourseId}
            initialStep={builderInitialStep}
            onBackToCourses={() =>
              requestBuilderExit({
                type: "section",
                section: "courses",
              })
            }
          />
        );
      case "students":
        return <TeacherDashboardStudents teacherId={currentUser?.id ?? null} />;
      
      default:
        return (
          <TeacherDashboardOverview
            teacherId={currentUser?.id ?? null}
            onOpenCourseBuilder={() => handleOpenCourseBuilder(null)}
            onContinueCourse={(courseId) => handleOpenCourseBuilder(courseId)}
          />
        );
    }
  }

  return (
    <div
      className="min-h-screen bg-[#f6f7fb] text-slate-900"
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1720px] flex-col lg:flex-row">
        <TeacherDashboardSidebar
          activeSection={activeSection}
          onSectionChange={handleSidebarSectionChange}
          currentUser={currentUser}
          onOpenProfile={() => handleSidebarSectionChange("profile")}
          onCreateCourse={() => handleOpenCourseBuilder(null)}
          onContinueCourse={(courseId) => handleOpenCourseBuilder(courseId)}
          onLogout={() => requestBuilderExit({ type: "logout" })}
          isLoggingOut={isLoggingOut}
          logoutMessage={logoutMessage}
          compactOnDesktop={isBuilderSection}
        />

        <main
          className={`min-w-0 flex-1 ${
            isBuilderSection
              ? "px-0 py-0"
              : "px-4 py-6 md:px-8 md:py-8 xl:px-10"
          }`}
        >
          {pageMessage ? (
            <Card
              className={`rounded-[1.75rem] p-6 shadow-none ${
                pageMessage.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              <p className="text-sm font-medium">{pageMessage.text}</p>
            </Card>
          ) : null}

          {isLoading ? (
            <LoadingState variant="page" />
          ) : hasAccess ? (
            renderTeacherSection()
          ) : null}
        </main>
      </div>

      <CourseBuilderLeaveWarningModal
        isOpen={pendingBuilderExit !== null}
        onClose={() => {
          setPendingBuilderExit(null);
          setLeaveBuilderError(null);
        }}
        canSaveDraft={pendingBuilderExit ? builderRef.current?.canSaveDraft ?? false : false}
        isSavingDraft={isSavingDraftBeforeExit || Boolean(builderRef.current?.isSavingDraft)}
        errorMessage={leaveBuilderError}
        onSaveDraft={() => {
          void handleSaveDraftAndLeaveBuilder();
        }}
        onLeaveWithoutSaving={() => {
          if (!pendingBuilderExit) {
            return;
          }

          const nextAction = pendingBuilderExit;
          setPendingBuilderExit(null);
          setLeaveBuilderError(null);

          if (nextAction.type === "section") {
            setActiveSection(nextAction.section);
            return;
          }

          if (nextAction.type === "builder") {
            setBuilderCourseId(nextAction.courseId);
            setBuilderInitialStep(nextAction.initialStep);
            setActiveSection("builder");
            return;
          }

          void performLogout();
        }}
      />
    </div>
  );
}
