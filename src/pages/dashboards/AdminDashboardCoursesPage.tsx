import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  deleteAdminCourse,
  loadAdminCoursesData,
  updateAdminCourseStatus,
} from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminCourseCatalog } from "../../features/admin-dashboard/components/AdminCourseCatalog";
import { AdminDeleteWarningModal } from "../../features/admin-dashboard/components/AdminDeleteWarningModal";
import { getAdminCourseAuthorName } from "../../features/admin-dashboard/lib/adminCoursePreview";
import {
  isArchivedAdminCourse,
  isPublishedAdminCourse,
  sortAdminCoursesByRecent,
} from "../../features/admin-dashboard/lib/adminCourseStatus";
import type { AdminDashboardCourseSummary } from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";

type PageMessage =
  | {
      type: "error" | "success";
      text: string;
    }
  | null;

type PendingCourseAction =
  | {
      courseId: string;
      action: "publish" | "unpublish" | "archive" | "delete";
    }
  | null;

function buildAlertClassName(type: "error" | "success") {
  return type === "error"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-[#13daec]/30 bg-[#13daec]/10 text-slate-800";
}

export function AdminDashboardCoursesPage() {
  const location = useLocation();
  const [courses, setCourses] = useState<AdminDashboardCourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<PageMessage>(null);
  const [searchValue, setSearchValue] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingCourseAction>(null);
  const [pendingDeleteCourse, setPendingDeleteCourse] =
    useState<AdminDashboardCourseSummary | null>(null);
  const deferredSearchValue = useDeferredValue(searchValue);

  useEffect(() => {
    let isMounted = true;

    async function hydrateCourses() {
      try {
        setIsLoading(true);
        const nextCourses = await loadAdminCoursesData();

        if (!isMounted) {
          return;
        }

        setCourses(nextCourses.sort(sortAdminCoursesByRecent));
        setMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage({
          type: "error",
          text: getErrorMessage(error, "Unable to load courses."),
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = deferredSearchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return courses;
    }

    return courses.filter((course) => {
      const searchableText = [
        course.id,
        course.title,
        getAdminCourseAuthorName(course),
        course.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [courses, deferredSearchValue]);

  const publishedCourses = useMemo(
    () =>
      filteredCourses.filter(
        (course) => isPublishedAdminCourse(course) && !isArchivedAdminCourse(course)
      ),
    [filteredCourses]
  );
  const draftCourses = useMemo(
    () =>
      filteredCourses.filter(
        (course) => !isPublishedAdminCourse(course) && !isArchivedAdminCourse(course)
      ),
    [filteredCourses]
  );
  const archivedCourses = useMemo(
    () => filteredCourses.filter((course) => isArchivedAdminCourse(course)),
    [filteredCourses]
  );
  const pendingActionByCourseId = useMemo(
    () =>
      pendingAction
        ? {
            [pendingAction.courseId]: pendingAction.action,
          }
        : {},
    [pendingAction]
  );

  useEffect(() => {
    if (isLoading || !location.hash) {
      return;
    }

    const targetId = location.hash.replace("#", "");
    const element = document.getElementById(targetId);

    if (!element) {
      return;
    }

    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [archivedCourses.length, draftCourses.length, isLoading, location.hash, publishedCourses.length]);

  async function handleUpdateCourseStatus(
    course: AdminDashboardCourseSummary,
    action: "publish" | "unpublish" | "archive"
  ) {
    try {
      setPendingAction({
        courseId: course.id,
        action,
      });

      const updatedCourse = await updateAdminCourseStatus(course.id, action);

      setCourses((currentCourses) =>
        currentCourses
          .map((currentCourse) =>
            currentCourse.id === course.id ? updatedCourse : currentCourse
          )
          .sort(sortAdminCoursesByRecent)
      );
      setMessage({
        type: "success",
        text:
          action === "publish"
            ? "Course published."
            : action === "unpublish"
              ? "Course unpublished."
              : "Course archived.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to update course status."),
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleConfirmDeleteCourse() {
    if (!pendingDeleteCourse) {
      return;
    }

    const courseId = pendingDeleteCourse.id;

    try {
      setPendingAction({
        courseId,
        action: "delete",
      });

      await deleteAdminCourse(courseId);
      setCourses((currentCourses) =>
        currentCourses.filter((course) => course.id !== courseId)
      );
      setPendingDeleteCourse(null);
      setMessage({
        type: "success",
        text: "Course deleted.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to delete course."),
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Course Management
            </h1>
          </div>

          <div className="rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800">
            Total courses: {courses.length}
          </div>
        </section>

        {message ? (
          <Card className={`p-4 shadow-none ${buildAlertClassName(message.type)}`}>
            <p className="text-sm font-medium">{message.text}</p>
          </Card>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search courses or authors..."
            className="h-12 w-full rounded-[1.15rem] border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-[#14213d] outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12"
          />
        </div>

        {isLoading ? (
          <LoadingState variant="section" />
        ) : filteredCourses.length === 0 ? (
          <Card className="rounded-[1.5rem] border-slate-200/80 p-8 text-sm text-slate-500 shadow-sm">
            {deferredSearchValue.trim()
              ? "No courses match your search."
              : "No courses found."}
          </Card>
        ) : (
          <div className="space-y-5">
            {publishedCourses.length > 0 ? (
              <AdminCourseCatalog
                sectionId="published-courses"
                title="Published Courses"
                courses={publishedCourses}
                emptyMessage="No published courses found."
                tone="published"
                pendingActionByCourseId={pendingActionByCourseId}
                onDelete={setPendingDeleteCourse}
                onUpdateStatus={handleUpdateCourseStatus}
              />
            ) : null}
            {draftCourses.length > 0 ? (
              <AdminCourseCatalog
                sectionId="draft-courses"
                title="Draft Courses"
                courses={draftCourses}
                emptyMessage="No draft courses found."
                tone="draft"
                pendingActionByCourseId={pendingActionByCourseId}
                onDelete={setPendingDeleteCourse}
                onUpdateStatus={handleUpdateCourseStatus}
              />
            ) : null}
            {archivedCourses.length > 0 ? (
              <AdminCourseCatalog
                sectionId="archived-courses"
                title="Archived Courses"
                courses={archivedCourses}
                emptyMessage="No archived courses found."
                tone="archived"
                pendingActionByCourseId={pendingActionByCourseId}
                onDelete={setPendingDeleteCourse}
                onUpdateStatus={handleUpdateCourseStatus}
              />
            ) : null}
          </div>
        )}
      </div>

      <AdminDeleteWarningModal
        isOpen={Boolean(pendingDeleteCourse)}
        entityLabel="course"
        entityName={pendingDeleteCourse?.title ?? ""}
        entityEmail={
          pendingDeleteCourse
            ? `Author: ${getAdminCourseAuthorName(pendingDeleteCourse)}`
            : ""
        }
        impactItems={[
          "The course will disappear from the admin course catalog.",
          "Students and teachers will lose access to this course in the dashboard.",
          "This action soft-deletes the course and should be treated as destructive.",
        ]}
        confirmLabel="Delete course"
        isSubmitting={pendingAction?.action === "delete"}
        onClose={() => {
          if (pendingAction?.action === "delete") {
            return;
          }

          setPendingDeleteCourse(null);
        }}
        onConfirm={() => {
          void handleConfirmDeleteCourse();
        }}
      />
    </>
  );
}
