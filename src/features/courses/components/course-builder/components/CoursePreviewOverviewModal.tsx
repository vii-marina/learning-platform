import { useEffect } from "react";
import { BadgeCheck, Code2, Layers3, Play, X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { Lesson, Module } from "../../../api/index";
import { hasLessonContent, studentQuestionTypeLabels } from "../lib/courseBuilderPageUtils";
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
import { ExercisePreview } from "./ExercisePreview";

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

type CourseOverviewPathProps = {
  module: Module;
  lesson?: Lesson | null;
};

type TestQuestionPreviewCardProps = {
  question: CourseTest["questions"][number];
  index: number;
};

function getOverviewTabButtonClassName(
  tab: CoursePreviewOverviewTab,
  isActive: boolean
) {
  const baseClassName =
    "inline-flex items-center gap-2.5 rounded-[1.1rem] border px-4 py-2.5 text-sm font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5";

  if (tab === "modules") {
    return isActive
      ? `${baseClassName} border-[#13daec] bg-[#13daec] text-[#0f172a]`
      : `${baseClassName} border-[#13daec]/30 bg-white text-[#0f8ea0] hover:border-[#13daec]/45 hover:bg-[#ecfeff]`;
  }

  if (tab === "lessons") {
    return isActive
      ? `${baseClassName} border-emerald-500 bg-emerald-500 text-white`
      : `${baseClassName} border-emerald-200 bg-white text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50`;
  }

  if (tab === "exercises") {
    return isActive
      ? `${baseClassName} border-amber-500 bg-amber-500 text-white`
      : `${baseClassName} border-amber-200 bg-white text-amber-800 hover:border-amber-300 hover:bg-amber-50`;
  }

  return isActive
    ? `${baseClassName} border-violet-500 bg-violet-500 text-white`
    : `${baseClassName} border-violet-200 bg-white text-violet-800 hover:border-violet-300 hover:bg-violet-50`;
}

function getOpenButtonClassName(tab: CoursePreviewOverviewTab) {
  const baseClassName =
    "h-11 rounded-xl border bg-white px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  if (tab === "modules") {
    return `${baseClassName} border-[#13daec]/30 text-[#0f8ea0] hover:border-[#13daec]/45 hover:bg-[#ecfeff]`;
  }

  if (tab === "lessons") {
    return `${baseClassName} border-emerald-200 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50`;
  }

  if (tab === "exercises") {
    return `${baseClassName} border-orange-200 text-orange-800 hover:border-orange-300 hover:bg-orange-50`;
  }

  return `${baseClassName} border-violet-200 text-violet-800 hover:border-violet-300 hover:bg-violet-50`;
}

function getExerciseTypeLabel(exercise: CourseExercise) {
  return exercise.type === "drag_drop_code" ? "Fill Missing Code" : "Write Code";
}

function CourseOverviewPath({ module, lesson = null }: CourseOverviewPathProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
        <Layers3 className="h-3.5 w-3.5 text-[#08bfd4]" />
        <span>{`Module ${module.order}`}</span>
      </span>

      {lesson ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
          <Play className="ml-0.5 h-3.5 w-3.5 text-emerald-600" />
          <span>{`Lesson ${module.order}.${lesson.order}`}</span>
        </span>
      ) : null}
    </div>
  );
}

function TestQuestionPreviewCard({ question, index }: TestQuestionPreviewCardProps) {
  const isSingleChoice = question.type === "single_choice";

  return (
    <div className="rounded-[1.25rem] border border-violet-200 bg-slate-50 p-4 shadow-[0_14px_30px_rgba(139,92,246,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white px-2 text-xs font-semibold text-violet-700 shadow-[0_8px_18px_rgba(139,92,246,0.08)]">
            {index + 1}
          </span>
          <label className="text-sm font-semibold text-[#14213d]">Question</label>
        </div>

        <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold text-violet-700">
          {studentQuestionTypeLabels[question.type]}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-transparent bg-white px-4 py-3 text-sm leading-6 text-slate-700">
        {question.questionText.trim() || `Question ${index + 1}`}
      </div>

      <div className="mt-4 space-y-3">
        {question.options.map((option, optionIndex) => {
          const isCorrect = question.correctOptionIndexes.includes(optionIndex);

          return (
            <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-3">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                  isSingleChoice ? "rounded-full" : "rounded-[4px]"
                } ${
                  isCorrect ? "border-violet-500 bg-violet-500" : "border-slate-300 bg-white"
                }`}
              >
                {isCorrect ? (
                  <span
                    className={`block bg-white ${
                      isSingleChoice ? "h-1.5 w-1.5 rounded-full" : "h-2 w-2 rounded-[2px]"
                    }`}
                  />
                ) : null}
              </span>

              <div
                className={`flex h-11 flex-1 items-center rounded-xl border px-4 text-sm ${
                  isCorrect
                    ? "border-violet-200 bg-violet-50 text-violet-900"
                    : "border-transparent bg-white text-[#14213d]"
                }`}
              >
                {option}
              </div>
            </div>
          );
        })}
      </div>

      {question.hint?.trim() ? (
        <div className="mt-4 rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          <span className="font-semibold text-slate-700">Hint:</span> {question.hint.trim()}
        </div>
      ) : null}
    </div>
  );
}

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
      label: "Modules",
      count: sortedModules.length,
      icon: Layers3,
    },
    {
      id: "lessons",
      label: "Lessons",
      count: lessonItems.length,
      icon: Play,
    },
    {
      id: "exercises",
      label: "Exercises",
      count: exerciseItems.length,
      icon: Code2,
    },
    {
      id: "tests",
      label: "Tests",
      count: testItems.length,
      icon: BadgeCheck,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[135] overscroll-contain bg-slate-950/55 px-4 py-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <div className="flex h-[84vh] max-h-[46rem] w-full flex-col overflow-hidden rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
          <div className="flex min-h-[92px] items-center justify-between border-b border-slate-200 px-5 py-4 md:px-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#14213d]">
                Course Overview
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close course overview modal"
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
                                <span>{`Module ${module.order}`}</span>
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
                  No lessons available yet.
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
                            Open Lesson
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
                              This lesson does not have published content yet.
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
              exerciseItems.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
                  No exercises available yet.
                </div>
              ) : (
                <div className="space-y-5">
                  {exerciseItems.map(({ module, lesson, exercise }, index) => {
                    const exerciseTypeLabel = getExerciseTypeLabel(exercise);
                    const showExerciseTitle =
                      exercise.title.trim().length > 0 &&
                      exercise.title.trim().toLowerCase() !==
                        exerciseTypeLabel.toLowerCase();

                    return (
                      <section
                        key={exercise.id}
                        className="rounded-[1.5rem] border border-orange-200 bg-white p-5 shadow-[0_14px_32px_rgba(249,115,22,0.08)]"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <CourseOverviewPath module={module} lesson={lesson} />

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              {isGeneratedCoursePreviewItem(exercise.id) ? (
                                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                                  AI Practice
                                </span>
                              ) : null}
                            </div>

                            {showExerciseTitle ? (
                              <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-[#14213d]">
                                {exercise.title}
                              </h3>
                            ) : null}

                            {exercise.description?.trim() ? (
                              <p className="mt-3 text-sm leading-6 text-slate-600">
                                {exercise.description}
                              </p>
                            ) : null}
                          </div>

                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              if (!lesson) {
                                return;
                              }

                              onSelectExercise(module.id, lesson.id, exercise.id);
                            }}
                            disabled={!lesson}
                            className={getOpenButtonClassName("exercises")}
                          >
                            Open Exercise
                          </Button>
                        </div>

                        <div className="mt-5 rounded-2xl border border-orange-300 bg-orange-50/40 p-4 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.18)]">
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-orange-600">
                              {`${index + 1}.`}
                            </span>

                            <div className="min-w-0 flex-1 rounded-xl border border-orange-200 bg-white px-4 py-3 text-base font-semibold leading-6 text-[#14213d]">
                              {exercise.content.question.trim() || exercise.title || "Exercise"}
                            </div>
                          </div>

                          <div className="mt-4">
                            <ExercisePreview
                              content={exercise.content}
                              showAnswerKey
                              showQuestion={false}
                            />
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              )
            ) : null}

            {activeTab === "tests" ? (
              testItems.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
                  No tests available yet.
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
        </div>
      </div>
    </div>
  );
}
