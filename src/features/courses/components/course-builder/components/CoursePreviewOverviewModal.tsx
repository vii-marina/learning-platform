import { BadgeCheck, Code2, Layers3, Play, X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { Lesson, Module } from "../../../api/index";
import { studentQuestionTypeLabels } from "../lib/courseBuilderPageUtils";
import { ExercisePreview } from "./ExercisePreview";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import {
  getCoursePreviewTestTitle,
  getLessonExercises,
  getLessonTests,
  getSortedLessons,
  getSortedExercises,
  getSortedTests,
} from "../lib/coursePreviewUtils";

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

function getOverviewTabButtonClassName(
  tab: CoursePreviewOverviewTab,
  isActive: boolean
) {
  const baseClassName =
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition";

  if (tab === "modules") {
    return isActive
      ? `${baseClassName} border-[#13daec] bg-[#13daec] text-[#0f172a]`
      : `${baseClassName} border-[#13daec]/30 bg-[#13daec]/10 text-[#0f8ea0] hover:border-[#13daec]/45 hover:bg-[#13daec]/15`;
  }

  if (tab === "lessons") {
    return isActive
      ? `${baseClassName} border-emerald-500 bg-emerald-500 text-white`
      : `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100`;
  }

  if (tab === "exercises") {
    return isActive
      ? `${baseClassName} border-amber-500 bg-amber-500 text-white`
      : `${baseClassName} border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100`;
  }

  return isActive
    ? `${baseClassName} border-violet-500 bg-violet-500 text-white`
    : `${baseClassName} border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 hover:bg-violet-100`;
}

function getOpenButtonClassName(tab: CoursePreviewOverviewTab) {
  if (tab === "modules") {
    return "border-[#13daec]/30 text-[#0f8ea0] hover:border-[#13daec]/45 hover:bg-[#13daec]/10";
  }

  if (tab === "lessons") {
    return "border-emerald-200 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50";
  }

  if (tab === "exercises") {
    return "border-amber-200 text-amber-800 hover:border-amber-300 hover:bg-amber-50";
  }

  return "border-violet-200 text-violet-800 hover:border-violet-300 hover:bg-violet-50";
}

function stripHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
      className="fixed inset-0 z-[135] bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_22px_80px_rgba(15,23,42,0.22)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 md:px-6">
            <div>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Course Overview
              </h2>

            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-111 px-0"
              aria-label="Close course overview modal"
            >
              <X className="h-4 w-4" />
            </Button>
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

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
            {activeTab === "modules" ? (
              sortedModules.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  Add modules and lessons to review the course structure here.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
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
                        className="rounded-[1.25rem] border border-[#13daec]/25 bg-[#13daec]/8 p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#0f8ea0]">
                              {`Module ${module.order}`}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
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

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                            {`${lessons.length} Lessons`}
                          </span>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
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
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  No lessons available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {lessonItems.map(({ module, lesson }) => {
                    const lessonExcerpt = stripHtml(lesson.content);

                    return (
                      <section
                        key={lesson.id}
                        className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50/40 p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
                                {`Module ${module.order}`}
                              </span>
                              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
                                {`Lesson ${module.order}.${lesson.order}`}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                              {lesson.title}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {lessonExcerpt || "This lesson does not have published content yet."}
                            </p>
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
                      </section>
                    );
                  })}
                </div>
              )
            ) : null}

            {activeTab === "exercises" ? (
              exerciseItems.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  No exercises available yet.
                </div>
              ) : (
                <div className="space-y-5">
                  {exerciseItems.map(({ module, lesson, exercise }) => (
                    <section
                      key={exercise.id}
                      className="rounded-[1.25rem] border border-amber-200 bg-amber-50/35 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                              {`Module ${module.order}`}
                            </span>
                            {lesson ? (
                              <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                                {`Lesson ${module.order}.${lesson.order}`}
                              </span>
                            ) : null}
                            <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                              Exercise
                            </span>
                          </div>
                          <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                            {exercise.title}
                          </h3>
                          {exercise.description?.trim() ? (
                            <p className="mt-2 text-sm leading-6 text-slate-600">
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

                      <div className="mt-5">
                        <ExercisePreview
                          content={exercise.content}
                          compact
                          showAnswerKey
                        />
                      </div>
                    </section>
                  ))}
                </div>
              )
            ) : null}

            {activeTab === "tests" ? (
              testItems.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  No tests available yet.
                </div>
              ) : (
                <div className="space-y-5">
                  {testItems.map(({ module, lesson, test, displayTitle }) => (
                    <section
                      key={test.id}
                      className="rounded-[1.25rem] border border-violet-200 bg-violet-50/35 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-800">
                              {`Module ${module.order}`}
                            </span>
                            {lesson ? (
                              <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-800">
                                {`Lesson ${module.order}.${lesson.order}`}
                              </span>
                            ) : null}
                            <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-800">
                              Test
                            </span>
                          </div>
                          <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
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

                      <div className="mt-5 space-y-3">
                        {test.questions.map((question, index) => (
                          <div
                            key={question.id}
                            className="rounded-[1rem] border border-violet-200/80 bg-white px-4 py-4"
                          >
                            <div className="flex flex-wrap items-start gap-3">
                              <p className="flex-1 text-sm font-semibold leading-6 text-slate-800">
                                {`${index + 1}. ${question.questionText}`}
                              </p>
                              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700">
                                {studentQuestionTypeLabels[question.type]}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {question.options.map((option, optionIndex) => {
                                const isCorrect = question.correctOptionIndexes.includes(
                                  optionIndex
                                );

                                return (
                                  <span
                                    key={`${question.id}-${optionIndex}`}
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                      isCorrect
                                        ? "border-violet-300 bg-violet-100 text-violet-900"
                                        : "border-slate-200 bg-slate-50 text-slate-500"
                                    }`}
                                  >
                                    {option}
                                  </span>
                                );
                              })}
                            </div>

                            {question.hint?.trim() ? (
                              <p className="mt-3 text-sm leading-6 text-slate-500">
                                <span className="font-semibold text-slate-700">Hint:</span>{" "}
                                {question.hint.trim()}
                              </p>
                            ) : null}
                          </div>
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
