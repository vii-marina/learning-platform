import { useEffect, useId } from "react";
import { BadgeCheck, Code2, Layers3, Play, X } from "lucide-react";
import { Modal } from "../../../../../components/ui/Modal";
import { Button } from "../../../../../components/ui/button";
import type { Lesson, Module } from "../../../api/index";
import { hasLessonContent } from "../lib/courseBuilderPageUtils";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import {
  getCoursePreviewTestTitle,
  getLessonExercises,
  getLessonTests,
  getSortedExercises,
  getSortedLessons,
  getSortedTests,
  isGeneratedCoursePreviewItem,
} from "../lib/coursePreviewUtils";
import { getYouTubeEmbedUrl } from "../lib/youtube";
import { CourseOverviewExercisesTab } from "./CourseOverviewExercisesTab";
import {
  CourseOverviewPath,
  TestQuestionPreviewCard,
} from "./coursePreviewOverviewParts";
import {
  getOpenButtonClassName,
  getOverviewTabButtonClassName,
} from "./coursePreviewOverviewStyles";

export type CoursePreviewOverviewTab = "modules" | "lessons" | "exercises" | "tests";

type CoursePreviewOverviewModalProps = {
  isOpen: boolean;
  activeTab: CoursePreviewOverviewTab;
  onTabChange: (tab: CoursePreviewOverviewTab) => void;
  onClose: () => void;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  onSelectModule: (moduleId: string) => void;
  onSelectLesson: (moduleId: string, lessonId: string) => void;
  onSelectExercise: (moduleId: string, lessonId: string, exerciseId: string) => void;
  onSelectTest: (moduleId: string, lessonId: string | null, testId: string) => void;
};

type OverviewLessonItem = {
  module: Module;
  lesson: Lesson;
};

type OverviewExerciseItem = {
  module: Module;
  lesson: Lesson | null;
  exercise: CourseExercise;
};

type OverviewTestItem = {
  module: Module;
  lesson: Lesson | null;
  test: CourseTest;
  displayTitle: string;
};


export function CoursePreviewOverviewModal({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  onSelectModule,
  onSelectLesson,
  onSelectExercise,
  onSelectTest,
}: CoursePreviewOverviewModalProps) {
  const headingId = useId();
  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen]);

  const sortedModules = [...modules].sort((left, right) => left.order - right.order);
  const lessonItems: OverviewLessonItem[] = sortedModules.flatMap((module) =>
    getSortedLessons(lessonsByModule[module.id] ?? []).map((lesson) => ({
      module,
      lesson,
    }))
  );
  const exerciseItems: OverviewExerciseItem[] = sortedModules.flatMap((module) => {
    const lessons = getSortedLessons(lessonsByModule[module.id] ?? []);
    const exercises = getSortedExercises(lessons, exercisesByModule[module.id] ?? []);
    const items: OverviewExerciseItem[] = [];
    const linkedExerciseIds = new Set<string>();

    lessons.forEach((lesson) => {
      getLessonExercises(lessons, exercises, lesson.id).forEach((exercise) => {
        linkedExerciseIds.add(exercise.id);
        items.push({
          module,
          lesson,
          exercise,
        });
      });
    });

    exercises.forEach((exercise) => {
      if (linkedExerciseIds.has(exercise.id)) {
        return;
      }

      items.push({
        module,
        lesson: null,
        exercise,
      });
    });

    return items;
  });
  const testItems: OverviewTestItem[] = sortedModules.flatMap((module) => {
    const lessons = getSortedLessons(lessonsByModule[module.id] ?? []);
    const tests = getSortedTests(testsByModule[module.id] ?? []);
    const items: OverviewTestItem[] = [];
    const linkedTestIds = new Set<string>();

    lessons.forEach((lesson) => {
      getLessonTests(lessons, tests, lesson.id).forEach((test) => {
        linkedTestIds.add(test.id);
        items.push({
          module,
          lesson,
          test,
          displayTitle: getCoursePreviewTestTitle(module.order, lessons, test),
        });
      });
    });

    tests.forEach((test) => {
      if (linkedTestIds.has(test.id)) {
        return;
      }

      items.push({
        module,
        lesson: null,
        test,
        displayTitle: getCoursePreviewTestTitle(module.order, lessons, test),
      });
    });

    return items;
  });

  if (!isOpen) {
    return null;
  }

  const tabOptions: Array<{
    id: CoursePreviewOverviewTab;
    label: string;
    count: number;
    icon: typeof Layers3;
  }> = [
    {
      id: "modules",
      label: "Модулі",
      count: sortedModules.length,
      icon: Layers3,
    },
    {
      id: "lessons",
      label: "Уроки",
      count: lessonItems.length,
      icon: Play,
    },
    {
      id: "exercises",
      label: "Вправи",
      count: exerciseItems.length,
      icon: Code2,
    },
    {
      id: "tests",
      label: "Тести",
      count: testItems.length,
      icon: BadgeCheck,
    },
  ];

  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledById={headingId}
      closeOnOverlayClick
      overlayClassName="z-[120]"
      panelClassName="flex h-[84vh] max-h-[46rem] w-full max-w-6xl flex-col overflow-hidden rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]"
    >
          <div className="flex min-h-[92px] items-center justify-between border-b border-slate-200 px-5 py-4 md:px-6">
            <div>
              <h2 id={headingId} className="text-2xl font-extrabold tracking-tight text-[#14213d]">
                Огляд курсу
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити модальне вікно огляду курсу"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-slate-200 bg-[#f8fafc] px-5 py-4 md:px-6">
            <div className="flex flex-wrap gap-3">
              {tabOptions.map((tabOption) => {
                const Icon = tabOption.icon;
                const isActive = tabOption.id === activeTab;

                return (
                  <button
                    key={tabOption.id}
                    type="button"
                    onClick={() => onTabChange(tabOption.id)}
                    className={getOverviewTabButtonClassName(tabOption.id, isActive)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{`${tabOption.count} ${tabOption.label}`}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#fcfdff] px-5 py-5 md:px-6 md:py-6">
            {activeTab === "modules" ? (
              sortedModules.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
                  Add modules and lessons to review the course structure here.
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                  {sortedModules.map((module) => {
                    const lessons = getSortedLessons(lessonsByModule[module.id] ?? []);
                    const tests = getSortedTests(testsByModule[module.id] ?? []);
                    const exercises = getSortedExercises(
                      lessons,
                      exercisesByModule[module.id] ?? []
                    );

                    return (
                      <section
                        key={module.id}
                        className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#ecfeff] px-3 py-1 text-xs font-semibold text-[#0f8ea0]">
                                <Layers3 className="h-3.5 w-3.5 text-[#08bfd4]" />
                                <span>{`Модуль ${module.order}`}</span>
                              </span>
                            </div>
                            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-[#14213d]">
                              {module.title}
                            </h3>
                          </div>

                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => onSelectModule(module.id)}
                            disabled={lessons.length === 0}
                            className={getOpenButtonClassName("modules")}
                          >
                            Open Module
                          </Button>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                            {`${lessons.length} Lessons`}
                          </span>
                          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                            {`${exercises.length} Exercises`}
                          </span>
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
                            {`${tests.length} Tests`}
                          </span>
                        </div>
                      </section>
                    );
                  })}
                </div>
              )
            ) : null}

            {activeTab === "lessons" ? (
              lessonItems.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
                  Уроків поки що немає.
                </div>
              ) : (
                <div className="space-y-5">
                  {lessonItems.map(({ module, lesson }) => {
                    const lessonEmbedUrl = getYouTubeEmbedUrl(lesson.video_url);

                    return (
                      <section
                        key={lesson.id}
                        className="rounded-[1.5rem] border border-emerald-200 bg-white p-5 shadow-[0_14px_32px_rgba(16,185,129,0.08)]"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <CourseOverviewPath module={module} lesson={lesson} />
                            <h3 className="mt-4 text-[1.65rem] font-extrabold tracking-tight text-[#14213d]">
                              {lesson.title}
                            </h3>
                          </div>

                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => onSelectLesson(module.id, lesson.id)}
                            className={getOpenButtonClassName("lessons")}
                          >
                            Відкрити урок
                          </Button>
                        </div>

                        <div className="mt-5 space-y-5 rounded-[1.5rem] border border-emerald-100 bg-[#fcfffd] p-5">
                          {lessonEmbedUrl ? (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                              <div className="aspect-video">
                                <iframe
                                  src={lessonEmbedUrl}
                                  title={`${lesson.title} video`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="h-full w-full"
                                />
                              </div>
                            </div>
                          ) : null}

                          {hasLessonContent(lesson.content) ? (
                            <div className="max-h-[24rem] overflow-y-auto pr-2">
                              <div
                                className="prose prose-slate max-w-none text-slate-700 [&_blockquote]:border-emerald-200 [&_blockquote]:text-slate-600 [&_code]:rounded-md [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:text-slate-100"
                                dangerouslySetInnerHTML={{ __html: lesson.content ?? "" }}
                              />
                            </div>
                          ) : (
                            <p className="text-sm leading-7 text-slate-500">
                              Цей урок поки що не містить опублікованого контенту.
                            </p>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )
            ) : null}

            {activeTab === "exercises" ? (
              <CourseOverviewExercisesTab
                exerciseItems={exerciseItems}
                onSelectExercise={onSelectExercise}
              />
            ) : null}

            {activeTab === "tests" ? (
              testItems.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
                  Немає тестів.
                </div>
              ) : (
                <div className="space-y-5">
                  {testItems.map(({ module, lesson, test, displayTitle }) => (
                    <section
                      key={test.id}
                      className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-[0_14px_32px_rgba(139,92,246,0.08)]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <CourseOverviewPath module={module} lesson={lesson} />

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {isGeneratedCoursePreviewItem(test.id) ? (
                              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                AI Practice
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-[#14213d]">
                            {displayTitle}
                          </h3>
                        </div>

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onSelectTest(module.id, lesson?.id ?? null, test.id)}
                          className={getOpenButtonClassName("tests")}
                        >
                          Open Test
                        </Button>
                      </div>

                      <div className="mt-5 space-y-4">
                        {test.questions.map((question, index) => (
                          <TestQuestionPreviewCard
                            key={question.id}
                            question={question}
                            index={index}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )
            ) : null}
          </div>
    </Modal>
  );
}
