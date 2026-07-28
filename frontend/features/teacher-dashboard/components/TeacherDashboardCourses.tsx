import { BookOpen, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import {
  listModuleContent,
  listModulesByCourse,
  publishCourse,
  softDeleteCourse,
  unpublishCourse,
  type Lesson,
  type Module,
} from "../../courses/api";
import { getCourseMediaPublicUrl } from "../../courses/api/courseMediaStorage";
import { CoursePreviewPage } from "../../courses/components/course-builder/components/CoursePreviewPage";
import {
  mapExerciseToCourseExercise,
  mapHydratedTestsToCourseTests,
} from "../../courses/components/course-builder/lib/courseBuilderPageUtils";
import type { CourseExercise, CourseTest } from "../../courses/components/course-builder/types/courseBuilderUiTypes";
import { getErrorMessage } from "../../auth/api/backendClient";
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
  formatCourseRelativeTime,
  getCourseStatusClassName,
  getCourseStatusLabel,
  isArchivedCourse,
  isPublishedCourse,
  matchesCourseFilter,
  sortCoursesByRecent,
} from "./teacherCourseDashboard.utils";

type TeacherDashboardCoursesProps = {
  teacherId: string | null;
  onCreateCourse: () => void;
  onContinueCourse: (courseId: string) => void;
  onOpenPublishCourse: (courseId: string) => void;
};

type TeacherCoursePreviewData = {
  course: TeacherCourseSummary;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
};

type PendingCourseAction = {
  courseId: string;
  action: "delete" | "publish" | "unpublish";
} | null;

function buildAlertClassName(type: "error" | "success") {
  return type === "error"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-[#13daec]/30 bg-[#13daec]/10 text-slate-800";
}

async function loadTeacherCoursePreview(
  course: TeacherCourseSummary
): Promise<TeacherCoursePreviewData> {
  const modules = await listModulesByCourse(course.id);
  const moduleContent = await Promise.all(
    modules.map(async (module) => {
      const content = await listModuleContent(module.id);

      return {
        moduleId: module.id,
        lessons: content.lessons,
        tests: mapHydratedTestsToCourseTests(content.tests),
        exercises: content.exercises.map(mapExerciseToCourseExercise),
      };
    })
  );

  return {
    course,
    modules,
    lessonsByModule: Object.fromEntries(
      moduleContent.map(({ moduleId, lessons }) => [moduleId, lessons])
    ) as Record<string, Lesson[]>,
    testsByModule: Object.fromEntries(
      moduleContent.map(({ moduleId, tests }) => [moduleId, tests])
    ) as Record<string, CourseTest[]>,
    exercisesByModule: Object.fromEntries(
      moduleContent.map(({ moduleId, exercises }) => [moduleId, exercises])
    ) as Record<string, CourseExercise[]>,
  };
}

function TeacherCourseDeleteModal({
  course,
  isDeleting,
  onClose,
  onConfirm,
}: {
  course: TeacherCourseSummary | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!course) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-md items-center justify-center">
        <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="space-y-3">
            <p className="text-sm font-semibold  text-rose-600">
              Видалити курс
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Видалити {course.title}?
            </h2>
            <p className="text-sm leading-6 text-slate-500">
              Курс буде прибрано з вашого дашборду.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isDeleting}>
              Скасувати
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={onConfirm}
              disabled={isDeleting}
              className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
            >
              Видалити
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherCourseDetailsModal({
  course,
  previewData,
  isLoading,
  message,
  onClose,
  onContinue,
}: {
  course: TeacherCourseSummary | null;
  previewData: TeacherCoursePreviewData | null;
  isLoading: boolean;
  message: string;
  onClose: () => void;
  onContinue: (course: TeacherCourseSummary) => void;
}) {
  if (!course) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-slate-950/55 p-4 backdrop-blur-sm lg:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex h-full max-w-[1540px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 bg-white px-5 py-5 md:px-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getCourseStatusClassName(course)}`}
              >
                {getCourseStatusLabel(course)}
              </span>
              <span className="text-sm text-slate-500">
                Останнє редагування: {formatCourseRelativeTime(course.updated_at)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {course.modulesCount} модулів
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {course.lessonsCount} уроків
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" size="lg" onClick={() => onContinue(course)}>
              Продовжити редагування
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onClose}
              className="w-15 px-0"
              aria-label="Закрити деталі курсу"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
          {message ? (
            <Card className="border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
              <p className="text-sm font-medium">{message}</p>
            </Card>
          ) : isLoading ? (
            <LoadingState variant="modal" />
          ) : previewData ? (
            <CoursePreviewPage
              courseId={course.id}
              courseTitle={course.title}
              courseDescription={course.description}
              courseThumbnailPath={course.thumbnail_path}
              courseThumbnailUrl={getCourseMediaPublicUrl(course.thumbnail_path)}
              modules={previewData.modules}
              lessonsByModule={previewData.lessonsByModule}
              testsByModule={previewData.testsByModule}
              exercisesByModule={previewData.exercisesByModule}
            />
          ) : (
            <Card className="p-10 text-sm text-slate-500">
              Перегляд недоступний.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

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
