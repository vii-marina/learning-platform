import { BookOpen, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { publishCourse, softDeleteCourse, unpublishCourse } from "../../courses/api";
import { getErrorMessage } from "../../auth/api/backendClient";
import { TeacherCourseDeleteModal } from "./TeacherCourseDeleteModal";
import { TeacherCourseDetailsModal } from "./TeacherCourseDetailsModal";
import { loadTeacherCoursePreview, type TeacherCoursePreviewData } from "./teacherCoursePreview";
import { listTeacherDashboardCourses } from "../api/teacherDashboardApi";
import { TeacherContinueEditing } from "./TeacherContinueEditing";
import { TeacherCourseCard } from "./TeacherCourseCard";
import { TeacherCourseTabs } from "./TeacherCourseTabs";
import {
  getTeacherDraftCourseHistory,
  rememberTeacherDraftCourse,
  removeTeacherDraftCourseFromHistory,
} from "../lib/draftCourseHistory";
import type {
  TeacherCourseFilterId,
  TeacherCourseSummary,
} from "./teacherCourseDashboard.types";
import {
  isArchivedCourse,
  isPublishedCourse,
  matchesCourseFilter,
  sortCoursesByRecent,
} from "./teacherCourseDashboard.utils";

type PendingCourseAction = {
  courseId: string;
  action: "delete" | "publish" | "unpublish";
} | null;

function buildAlertClassName(type: "error" | "success") {
  return type === "error"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-[#13daec]/30 bg-[#13daec]/10 text-slate-800";
}

type TeacherDashboardCoursesProps = {
  teacherId: string | null;
  onCreateCourse: () => void;
  onContinueCourse: (courseId: string) => void;
  onOpenPublishCourse: (courseId: string) => void;
};


export function TeacherDashboardCourses({
  teacherId,
  onCreateCourse,
  onContinueCourse,
  onOpenPublishCourse,
}: TeacherDashboardCoursesProps) {
  const [courses, setCourses] = useState<TeacherCourseSummary[]>([]);
  const [activeTab, setActiveTab] = useState<TeacherCourseFilterId>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<TeacherCoursePreviewData | null>(null);
  const [previewMessage, setPreviewMessage] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [pendingDeleteCourse, setPendingDeleteCourse] =
    useState<TeacherCourseSummary | null>(null);
  const [pendingCourseAction, setPendingCourseAction] =
    useState<PendingCourseAction>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [draftCourseHistory, setDraftCourseHistory] = useState<string[]>([]);
  const previewRequestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function hydrateCourses() {
      if (!teacherId) {
        if (isMounted) {
          setCourses([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const nextCourseSummaries = await listTeacherDashboardCourses();

        if (!isMounted) {
          return;
        }

        setCourses(nextCourseSummaries.sort(sortCoursesByRecent));
        setMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage({
          type: "error",
          text: getErrorMessage(error, "Не вдалося завантажити ваші курси."),
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
  }, [teacherId]);

  useEffect(() => {
    setDraftCourseHistory(getTeacherDraftCourseHistory(teacherId));
  }, [teacherId]);

  const sortedCourses = useMemo(() => [...courses].sort(sortCoursesByRecent), [courses]);
  const draftCourses = useMemo(
    () => sortedCourses.filter((course) => matchesCourseFilter(course, "drafts")),
    [sortedCourses]
  );
  const filteredCourses = useMemo(
    () => sortedCourses.filter((course) => matchesCourseFilter(course, activeTab)),
    [activeTab, sortedCourses]
  );
  const selectedCourse = useMemo(
    () => sortedCourses.find((course) => course.id === openCourseId) ?? null,
    [openCourseId, sortedCourses]
  );
  const continueEditingCourse = useMemo(
    () =>
      draftCourseHistory
        .map((courseId) => draftCourses.find((course) => course.id === courseId) ?? null)
        .find((course) => course !== null) ??
      draftCourses[0] ??
      null,
    [draftCourseHistory, draftCourses]
  );

  const tabCounts = useMemo(
    () => ({
      all: sortedCourses.length,
      drafts: sortedCourses.filter((course) => matchesCourseFilter(course, "drafts")).length,
      published: sortedCourses.filter((course) => matchesCourseFilter(course, "published"))
        .length,
      archived: sortedCourses.filter((course) => matchesCourseFilter(course, "archived")).length,
    }),
    [sortedCourses]
  );

  async function handleOpenCourseDetails(course: TeacherCourseSummary) {
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    setOpenCourseId(course.id);
    setPreviewData(null);
    setPreviewMessage("");
    setIsPreviewLoading(true);

    try {
      const resolvedPreviewData = await loadTeacherCoursePreview(course);

      if (previewRequestIdRef.current !== requestId) {
        return;
      }

      setPreviewData(resolvedPreviewData);
    } catch (error) {
      if (previewRequestIdRef.current !== requestId) {
        return;
      }

      setPreviewMessage(getErrorMessage(error, "Не вдалося завантажити перегляд курсу."));
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setIsPreviewLoading(false);
      }
    }
  }

  function handleCloseCourseDetails() {
    previewRequestIdRef.current += 1;
    setOpenCourseId(null);
    setPreviewData(null);
    setPreviewMessage("");
    setIsPreviewLoading(false);
  }

  function rememberDraftCourseSelection(course: TeacherCourseSummary) {
    if (!teacherId || isArchivedCourse(course) || isPublishedCourse(course)) {
      return;
    }

    setDraftCourseHistory(rememberTeacherDraftCourse(teacherId, course.id));
  }

  function removeDraftCourseSelection(courseId: string) {
    if (!teacherId) {
      return;
    }

    setDraftCourseHistory(removeTeacherDraftCourseFromHistory(teacherId, courseId));
  }

  function handleContinueCourse(course: TeacherCourseSummary) {
    rememberDraftCourseSelection(course);
    onContinueCourse(course.id);
  }

  function handleOpenPublishCourse(course: TeacherCourseSummary) {
    rememberDraftCourseSelection(course);
    onOpenPublishCourse(course.id);
  }

  async function handleTogglePublish(course: TeacherCourseSummary) {
    const nextAction = isPublishedCourse(course) ? "unpublish" : "publish";

    try {
      setPendingCourseAction({
        courseId: course.id,
        action: nextAction,
      });

      const updatedCourse = isPublishedCourse(course)
        ? await unpublishCourse(course.id)
        : await publishCourse(course.id);

      setCourses((currentCourses) =>
        currentCourses
          .map((currentCourse) =>
            currentCourse.id === course.id
              ? {
                  ...currentCourse,
                  ...updatedCourse,
                }
              : currentCourse
          )
          .sort(sortCoursesByRecent)
      );
      if (nextAction === "publish") {
        removeDraftCourseSelection(course.id);
      }
      setMessage({
        type: "success",
        text: isPublishedCourse(course) ? "Курс знято з публікації." : "Курс опубліковано.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Не вдалося оновити статус курсу."),
      });
    } finally {
      setPendingCourseAction(null);
    }
  }

  async function handleConfirmDeleteCourse() {
    if (!pendingDeleteCourse) {
      return;
    }

    const courseId = pendingDeleteCourse.id;

    try {
      setPendingCourseAction({
        courseId,
        action: "delete",
      });
      setIsDeletingCourse(true);
      await softDeleteCourse(courseId);

      setCourses((currentCourses) =>
        currentCourses.filter((course) => course.id !== courseId)
      );
      removeDraftCourseSelection(courseId);

      if (openCourseId === courseId) {
        handleCloseCourseDetails();
      }

      setPendingDeleteCourse(null);
      setMessage({
        type: "success",
        text: "Курс видалено.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Не вдалося видалити курс."),
      });
    } finally {
      setPendingCourseAction(null);
      setIsDeletingCourse(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Мої курси
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">


            <Button type="button" size="lg" onClick={onCreateCourse}>
              <Plus className="h-4 w-4" />
              <span>Новий курс</span>
            </Button>
          </div>
        </section>

        <TeacherContinueEditing
          course={continueEditingCourse}
          isPreviewBusy={
            isPreviewLoading && continueEditingCourse?.id === selectedCourse?.id
          }
          onCreateCourse={onCreateCourse}
          onContinue={handleContinueCourse}
          onPreview={(course) => {
            void handleOpenCourseDetails(course);
          }}
        />

        <TeacherCourseTabs
          activeTab={activeTab}
          counts={tabCounts}
          onChange={setActiveTab}
        />

        {message ? (
          <Card className={`p-4 shadow-none ${buildAlertClassName(message.type)}`}>
            <p className="text-sm font-medium">{message.text}</p>
          </Card>
        ) : null}

        {isLoading ? (
          <LoadingState variant="section" />
        ) : filteredCourses.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {sortedCourses.length === 0 ? "Курсів поки немає" : "Немає курсів у цьому розділі"}
              </h2>
              <p className="text-sm text-slate-500">
                {sortedCourses.length === 0
                  ? "Створіть перший курс, щоб почати викладати."
                  : "Перемкніть вкладку або створіть новий курс."}
              </p>
              <Button type="button" size="lg" onClick={onCreateCourse}>
                + Новий курс
              </Button>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <TeacherCourseCard
                key={course.id}
                course={course}
                actionInFlight={
                  pendingCourseAction?.courseId === course.id
                    ? pendingCourseAction.action
                    : null
                }
                onOpenDetails={(nextCourse) => {
                  void handleOpenCourseDetails(nextCourse);
                }}
                onOpenPublish={handleOpenPublishCourse}
                onContinue={handleContinueCourse}
                onDelete={setPendingDeleteCourse}
                onTogglePublish={(nextCourse) => {
                  void handleTogglePublish(nextCourse);
                }}
              />
            ))}
          </section>
        )}
      </div>

      <TeacherCourseDetailsModal
        course={selectedCourse}
        previewData={previewData}
        isLoading={isPreviewLoading}
        message={previewMessage}
        onClose={handleCloseCourseDetails}
        onContinue={handleContinueCourse}
      />

      <TeacherCourseDeleteModal
        course={pendingDeleteCourse}
        isDeleting={isDeletingCourse}
        onClose={() => {
          if (!isDeletingCourse) {
            setPendingDeleteCourse(null);
          }
        }}
        onConfirm={() => {
          void handleConfirmDeleteCourse();
        }}
      />
    </>
  );
}
