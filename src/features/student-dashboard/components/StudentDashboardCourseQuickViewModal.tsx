import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Code2,
  FileImage,
  Layers3,
  Play,
  X,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { getErrorMessage } from "../../auth/api/backendClient";
import type { Lesson, Module } from "../../courses/api";
import type { HydratedTestEntityResponse } from "../../courses/api/courseBuilderApi";
import {
  hasLessonContent,
} from "../../courses/components/course-builder/lib/courseBuilderPageUtils";
import {
  buildCoursePreviewSidebarItems,
  getCoursePreviewTestTitle,
} from "../../courses/components/course-builder/lib/coursePreviewUtils";
import type {
  CourseExercise,
  CourseTest,
} from "../../courses/components/course-builder/types/courseBuilderUiTypes";
import {
  loadStudentCourse,
  type StudentDashboardCourseCatalogItem,
  type StudentCourseDetailsResponse,
} from "../api/studentDashboardApi";
import { getTeacherAvatarPublicUrl } from "../../teacher-dashboard/api/teacherProfileStorage";
import type { StudentDashboardCatalogCard } from "./studentDashboardViewModels";

type StudentDashboardCourseQuickViewModalProps = {
  course: StudentDashboardCatalogCard | null;
  onClose: () => void;
  onStartCourse?: (course: StudentDashboardCourseCatalogItem) => void;
  onContinueCourse?: (courseId: string) => void;
  isPrimaryActionLoading?: boolean;
};

const metricButtonBaseClassName =
  "flex min-w-[10.5rem] cursor-default items-center gap-3 rounded-[1.25rem] border bg-white px-4 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.06)]";

const metricButtonToneClassNames = {
  modules: "border-cyan-200 text-cyan-700",
  lessons: "border-emerald-200 text-emerald-700",
  exercises: "border-amber-200 text-amber-800",
  tests: "border-violet-200 text-violet-700",
};

const metricIconToneClassNames = {
  modules: "bg-cyan-50 text-cyan-600",
  lessons: "bg-emerald-50 text-emerald-600",
  exercises: "bg-amber-50 text-amber-700",
  tests: "bg-violet-50 text-violet-700",
};

function normalizeDescription(value: string | null) {
  return (
    value
      ?.split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ") ?? ""
  );
}

function getCollapsedDescription(value: string | null) {
  const normalizedValue = normalizeDescription(value);

  if (!normalizedValue) {
    return "Опис курсу зʼявиться тут.";
  }

  if (normalizedValue.length <= 190) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 190).trim()}...`;
}

function getAuthorInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "IN";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function mapHydratedTestToCourseTest(test: HydratedTestEntityResponse): CourseTest {
  return {
    id: test.id,
    title: test.title,
    afterLessonId: test.after_lesson_id,
    order: test.order,
    questions: [...test.questions]
      .sort((left, right) => left.order - right.order)
      .map((question) => ({
        id: question.id,
        type: question.type,
        questionText: question.question_text,
        options: question.answers.map((answer) => answer.answer_text),
        correctOptionIndexes: question.answers.reduce<number[]>(
          (indexes, answer, answerIndex) => {
            if (answer.is_correct) {
              indexes.push(answerIndex);
            }

            return indexes;
          },
          []
        ),
        hint: question.hint,
      })),
  };
}
function mapExerciseToCourseExercise(
  exercise: StudentCourseDetailsResponse["exercises_by_module"][string][number]
): CourseExercise {
  return {
    id: exercise.id,
    title: exercise.title,
    description: exercise.description,
    afterLessonId: exercise.after_lesson_id,
    type: exercise.type,
    content: exercise.content,
    createdAt: exercise.created_at,
    updatedAt: exercise.updated_at,
  };
}
function getSortedModules(courseData: StudentCourseDetailsResponse | null) {
  return [...(courseData?.modules ?? [])].sort((left, right) => left.order - right.order);
}

function getSortedLessons(courseData: StudentCourseDetailsResponse | null, moduleId: string) {
  return [...(courseData?.lessons_by_module[moduleId] ?? [])].sort(
    (left, right) => left.order - right.order
  );
}

function getSortedTests(courseData: StudentCourseDetailsResponse | null, moduleId: string) {
  return [...(courseData?.tests_by_module[moduleId] ?? [])]
    .sort((left, right) => left.order - right.order)
    .map(mapHydratedTestToCourseTest);
}
function getSortedExercises(courseData: StudentCourseDetailsResponse | null, moduleId: string) {
  return [...(courseData?.exercises_by_module[moduleId] ?? [])]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .map(mapExerciseToCourseExercise);
}

function getFirstLesson(courseData: StudentCourseDetailsResponse | null) {
  for (const module of getSortedModules(courseData)) {
    const lesson = getSortedLessons(courseData, module.id)[0] ?? null;

    if (lesson) {
      return {
        module,
        lesson,
        lessons: getSortedLessons(courseData, module.id),
        tests: getSortedTests(courseData, module.id),
      };
    }
  }

  return null;
}

function CourseThumbnail({
  course,
}: {
  course: StudentDashboardCatalogCard;
}) {
  return (
    <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border border-slate-200 bg-[#f8fafc]">
      {course.thumbnailUrl ? (
        <img
          src={course.thumbnailUrl}
              alt={`Обкладинка курсу ${course.title}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-5 text-center">
          <FileImage className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-400">
            Обкладинка курсу зʼявиться тут.
          </p>
        </div>
      )}
    </div>
  );
}

function CourseStructureSidebar({
  modules,
  courseData,
  activeLesson,
}: {
  modules: Module[];
  courseData: StudentCourseDetailsResponse | null;
  activeLesson: Lesson | null;
}) {
  return (
    <aside className="border-r border-slate-200 bg-[#f8fafc] p-4">
      <h3 className="text-base font-semibold text-[#14213d]">Зміст курсу</h3>

      <div className="mt-4 space-y-3">
        {modules.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            Структура курсу зʼявиться тут.
          </div>
        ) : (
          modules.map((module) => {
            const lessons = getSortedLessons(courseData, module.id);
            const tests = getSortedTests(courseData, module.id);
            const exercises = getSortedExercises(courseData, module.id);
            const orderedItems = buildCoursePreviewSidebarItems({
              lessons,
              exercises,
              tests,
            });

            return (
              <div
                key={module.id}
                className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white"
              >
                <div className="flex w-full items-center justify-between gap-3 bg-[#13daec]/10 px-4 py-3 text-left">
                  <div>
                    <p className="text-sm font-semibold text-[#14213d]">
                      {`Модуль ${module.order}: ${module.title}`}
                    </p>
                    
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </div>

                <div className="border-t border-slate-100 px-3 py-3">
                  {orderedItems.length === 0 ? (
                    <div className="rounded-xl bg-[#f8fafc] px-3 py-3 text-sm text-slate-500">
                      У цьому модулі поки немає уроків або тестів.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {orderedItems.map((item) => {
                        const isActive =
                          item.type === "lesson" && item.lesson.id === activeLesson?.id;

                          const rowToneClassName =
                          item.type === "lesson"
                            ? isActive
                              ? "border-emerald-200 bg-emerald-50/80 text-[#14213d] shadow-[0_8px_20px_rgba(16,185,129,0.10)]"
                              : "border-transparent bg-transparent text-slate-500"
                            : item.type === "exercise"
                              ? "border-transparent bg-transparent text-slate-500"
                              : "border-transparent bg-transparent text-slate-500";
                        const iconToneClassName =
                          item.type === "lesson"
                            ? isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-emerald-50 text-emerald-600"
                            : item.type === "exercise"
                              ? "bg-orange-50 text-orange-500"
                              : "bg-violet-50 text-violet-600";
                        const Icon =
                          item.type === "lesson"
                            ? Play
                            : item.type === "exercise"
                              ? Code2
                              : BadgeCheck;
                        const itemTitle =
                          item.type === "lesson"
                            ? `${module.order}.${item.lesson.order} ${item.lesson.title}`
                            : item.type === "exercise"
                              ? item.exercise.title
                              : getCoursePreviewTestTitle(module.order, lessons, item.test);

                        return (
                          <div
                            key={
                              item.type === "lesson"
                                ? item.lesson.id
                                : item.type === "exercise"
                                  ? item.exercise.id
                                  : item.test.id
                            }
                            aria-disabled="true"
                            className={`flex w-full cursor-default items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left ${rowToneClassName} ${
                              item.type === "lesson" ? "" : "ml-8 w-[calc(100%-2rem)]"
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] ${iconToneClassName}`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {itemTitle}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function FirstLessonPreview({

  firstLesson,
}: {

  firstLesson: ReturnType<typeof getFirstLesson>;
}) {
  if (!firstLesson) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-[#f8fafc] px-6 text-center text-sm text-slate-500">
        Перший урок зʼявиться тут, коли в курсі буде контент.
      </div>
    );
  }


  return (
    <div>
      

      

      <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#14213d]">
        {`${firstLesson.module.order}.${firstLesson.lesson.order} ${firstLesson.lesson.title}`}
      </h3>

      {hasLessonContent(firstLesson.lesson.content) ? (
        <div
          className="prose prose-slate mt-4 max-w-none text-slate-600"
          dangerouslySetInnerHTML={{
            __html: firstLesson.lesson.content ?? "",
          }}
        />
      ) : (
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          У цього уроку поки немає текстового контенту.
        </p>
      )}
    </div>
  );
}

export function StudentDashboardCourseQuickViewModal({
  course,
  onClose,
  onStartCourse,
  onContinueCourse,
  isPrimaryActionLoading = false,
}: StudentDashboardCourseQuickViewModalProps) {
  const [courseData, setCourseData] = useState<StudentCourseDetailsResponse | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);
  const [courseMessage, setCourseMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!course) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [course]);

  useEffect(() => {
    if (!course) {
      setCourseData(null);
      setCourseMessage(null);
      setIsLoadingCourse(false);
      return;
    }

    let isMounted = true;
    const courseId = course.id;

    async function loadCoursePreview() {
      try {
        setIsLoadingCourse(true);
        setCourseMessage(null);
        const loadedCourse = await loadStudentCourse(courseId);

        if (isMounted) {
          setCourseData(loadedCourse);
        }
      } catch (error) {
        if (isMounted) {
          setCourseData(null);
          setCourseMessage(getErrorMessage(error, "Не вдалося завантажити перегляд курсу."));
        }
      } finally {
        if (isMounted) {
          setIsLoadingCourse(false);
        }
      }
    }

    void loadCoursePreview();

    return () => {
      isMounted = false;
    };
  }, [course]);

  const modules = useMemo(() => getSortedModules(courseData), [courseData]);
  const firstLesson = useMemo(() => getFirstLesson(courseData), [courseData]);
  const description = getCollapsedDescription(course?.description ?? null);
  const authorAvatarUrl = getTeacherAvatarPublicUrl(course?.teacherAvatarPath ?? null);

  if (!course) {
    return null;
  }

  const metrics = [
    {
      key: "modules" as const,
      label: `${course.moduleCount} модулів`,
      icon: Layers3,
    },
    {
      key: "lessons" as const,
      label: `${course.lessonCount} уроків`,
      icon: Play,
    },
    {
      key: "exercises" as const,
      label: `${course.exerciseCount} вправ`,
      icon: Code2,
    },
    {
      key: "tests" as const,
      label: `${course.testCount} тестів`,
      icon: BadgeCheck,
    },
  ];
  const primaryActionLabel = course.isStarted ? "Продовжити курс" : "Записати мене на курс";
  const canUsePrimaryAction = course.isStarted ? Boolean(onContinueCourse) : Boolean(onStartCourse);

  return (
    <div
      className="fixed inset-0 z-[110] bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex h-full max-h-[86vh] w-full max-w-[82rem] flex-col overflow-hidden rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="border-b border-slate-200 bg-white px-5 py-5 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-xs font-bold text-white">
                    {authorAvatarUrl ? (
                      <img
                        src={authorAvatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getAuthorInitials(course.teacherName)
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    {course.teacherName}
                  </p>
                </div>

                <h2 className="max-w-[48rem] text-2xl font-semibold tracking-tight text-slate-950 md:text-[1.85rem]">
                  {course.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Закрити перегляд курсу"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-[260px_minmax(0,1fr)] md:items-start">
              <CourseThumbnail course={course} />

              <div className="flex min-h-full flex-col justify-between gap-4">
                <p className="text-sm leading-7 text-slate-600 md:text-[0.95rem]">
                  {description}
                </p>

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {metrics.map((metric) => {
                    const Icon = metric.icon;

                    return (
                      <div
                        key={metric.key}
                        role="button"
                        aria-disabled="true"
                        className={`${metricButtonBaseClassName} ${metricButtonToneClassNames[metric.key]}`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metricIconToneClassNames[metric.key]}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className="min-w-0 text-sm font-semibold">
                          {metric.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {courseMessage ? (
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 md:px-6">
              {courseMessage}
            </div>
          ) : null}

          {isLoadingCourse ? (
            <div className="flex min-h-[24rem] items-center justify-center text-sm font-medium text-slate-500">
              Завантаження перегляду курсу...
            </div>
          ) : (
            <div className="grid min-h-[24rem] lg:grid-cols-[20rem_minmax(0,1fr)]">
              <CourseStructureSidebar
                modules={modules}
                courseData={courseData}
                activeLesson={firstLesson?.lesson ?? null}
              />

              <div className="bg-white p-5 md:p-6">
                <FirstLessonPreview firstLesson={firstLesson} />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 md:px-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="h-11 rounded-xl px-6"
          >
            Продовжити перегляд
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (course.isStarted) {
                onContinueCourse?.(course.id);
                return;
              }

              onStartCourse?.(course.rawCourse);
            }}
            disabled={!canUsePrimaryAction || isPrimaryActionLoading}
            className="h-11 rounded-xl px-6"
          >
            {isPrimaryActionLoading ? "Завантаження..." : primaryActionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
