import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppToast } from "../../components/ui/AppToastProvider";
import { Card } from "../../components/ui/Card";
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
import { CourseBuilderLeaveWarningModal } from "../../features/courses/components/course-builder/CourseBuilderLeaveWarningModal";
import type { BuilderStep } from "../../features/courses/components/course-builder/courseBuilderPageUtils";
import { TeacherDashboardCourses } from "../../features/teacher-dashboard/components/TeacherDashboardCourses";
import { TeacherDashboardOverview } from "../../features/teacher-dashboard/components/TeacherDashboardOverview";
import { TeacherDashboardProfile } from "../../features/teacher-dashboard/components/TeacherDashboardProfile";
import { TeacherDashboardSidebar } from "../../features/teacher-dashboard/components/TeacherDashboardSidebar";
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

function TeacherDashboardPlaceholder({
  title,
}: {
  title: string;
}) {
  return (
    <Card className="rounded-[2rem] bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 md:p-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          This section is still minimal. The course workflow is the primary dashboard surface.
        </p>
      </div>
    </Card>
  );
}

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
    useState<TeacherDashboardSectionId>("courses");
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
          text: getErrorMessage(error, "Unable to load your dashboard."),
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
      showSuccessToast("Profile saved.");
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to save your information."),
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
          ? "Draft could not be saved. Review the course form and try again."
          : "Complete the required course info before saving a draft."
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
          <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
            Loading profile...
          </Card>
        );
      case "overview":
        return (
          <TeacherDashboardOverview
            onOpenCourseBuilder={() => handleOpenCourseBuilder(null)}
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
          />
        );
      case "students":
        return <TeacherDashboardPlaceholder title="My students" />;
      
      case "messages":
        return <TeacherDashboardPlaceholder title="Messages" />;
      case "settings":
        return <TeacherDashboardPlaceholder title="Settings" />;
      default:
        return (
          <TeacherDashboardOverview
            onOpenCourseBuilder={() => handleOpenCourseBuilder(null)}
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
            <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
              Loading teacher dashboard...
            </Card>
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
