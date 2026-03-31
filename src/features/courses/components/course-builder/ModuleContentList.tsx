import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Code2,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { SpoilerText } from "../../../../components/ui/SpoilerText";
import type { Lesson, TestQuestionType } from "../../api";
import type { CourseExercise, CourseTest } from "./courseBuilderUiTypes";
import { ExercisePreview } from "./ExercisePreview";
import { getGeneratedCourseTestTitle, hasLessonContent } from "./courseBuilderPageUtils";
import { getYouTubeEmbedUrl } from "./youtube";

type OrderedModuleContentItem =
  | { type: "lesson"; lesson: Lesson; nested: false }
  | { type: "test"; test: CourseTest; nested: boolean }
  | { type: "exercise"; exercise: CourseExercise; nested: boolean };

type ModuleContentListProps = {
  moduleId: string;
  moduleOrder: number;
  lessons: Lesson[];
  tests: CourseTest[];
  exercises: CourseExercise[];
  expandedLessonIds: Record<string, boolean>;
  expandedTestIds: Record<string, boolean>;
  expandedExerciseIds: Record<string, boolean>;
  onToggleLesson: (lessonId: string) => void;
  onEditLesson: (moduleId: string, lesson: Lesson) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
  onToggleTest: (testId: string) => void;
  onEditTest: (moduleId: string, test: CourseTest) => void;
  onDeleteTest: (moduleId: string, testId: string) => void;
  onToggleExercise: (exerciseId: string) => void;
  onEditExercise: (moduleId: string, exercise: CourseExercise) => void;
  onDeleteExercise: (moduleId: string, exerciseId: string) => void;
};

const questionTypeLabels: Record<TestQuestionType, string> = {
  true_false: "True/False",
  single_choice: "Multiple Choice (Single)",
  multiple_choice: "Multiple Choice (Multiple)",
};

function buildOrderedModuleContentItems(
  lessons: Lesson[],
  tests: CourseTest[],
  exercises: CourseExercise[]
): OrderedModuleContentItem[] {
  const sortedLessons = [...lessons].sort((left, right) => left.order - right.order);
  const sortedTests = [...tests].sort((left, right) => left.order - right.order);
  const sortedExercises = [...exercises].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
  const items: OrderedModuleContentItem[] = [];

  sortedLessons.forEach((lesson) => {
    items.push({ type: "lesson", lesson, nested: false });

    sortedTests
      .filter((test) => test.afterLessonId === lesson.id)
      .forEach((test) => {
        items.push({ type: "test", test, nested: true });
      });

    sortedExercises
      .filter((exercise) => exercise.afterLessonId === lesson.id)
      .forEach((exercise) => {
        items.push({ type: "exercise", exercise, nested: true });
      });
  });

  sortedTests
    .filter(
      (test) =>
        !test.afterLessonId || !sortedLessons.some((lesson) => lesson.id === test.afterLessonId)
    )
    .forEach((test) => {
      items.push({ type: "test", test, nested: false });
    });

  sortedExercises
    .filter(
      (exercise) =>
        !exercise.afterLessonId ||
        !sortedLessons.some((lesson) => lesson.id === exercise.afterLessonId)
    )
    .forEach((exercise) => {
      items.push({ type: "exercise", exercise, nested: false });
    });

  return items;
}

function getNestedTestTitle(test: CourseTest, lessons: Lesson[], moduleOrder: number) {
  const linkedLesson = lessons.find((lesson) => lesson.id === test.afterLessonId);
  if (linkedLesson) {
    const linkedLessonTitle = linkedLesson.title.trim() || `Lesson ${moduleOrder}.${linkedLesson.order}`;
    return `Test - ${linkedLessonTitle}`;
  }

  return getGeneratedCourseTestTitle({
    moduleOrder,
    lessons,
    afterLessonId: test.afterLessonId,
    fallbackTitle: test.title,
  });
}

export function ModuleContentList({
  moduleId,
  moduleOrder,
  lessons,
  tests,
  exercises,
  expandedLessonIds,
  expandedTestIds,
  expandedExerciseIds,
  onToggleLesson,
  onEditLesson,
  onDeleteLesson,
  onToggleTest,
  onEditTest,
  onDeleteTest,
  onToggleExercise,
  onEditExercise,
  onDeleteExercise,
}: ModuleContentListProps) {
  const orderedItems = buildOrderedModuleContentItems(lessons, tests, exercises);

  if (orderedItems.length === 0) {
    return (
      <div className="rounded-[1.25rem] bg-[#f8fafc] px-5 py-4 text-base font-medium leading-7 text-slate-500">
        You can always add lessons, tests, or exercises to this module later.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {orderedItems.map((item) => {
        if (item.type === "lesson") {
          const isExpanded = Boolean(expandedLessonIds[item.lesson.id]);
          const embedUrl = getYouTubeEmbedUrl(item.lesson.video_url);

          return (
            <article
              key={item.lesson.id}
              className="group overflow-hidden rounded-[1rem] border border-slate-100 bg-[#f8fbfd]"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => onToggleLesson(item.lesson.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#13daec] text-white">
                    <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                  </div>
                  <span className="truncate text-[1rem] font-semibold text-[#14213d]">
                    {`${moduleOrder}.${item.lesson.order} ${item.lesson.title}`}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                  ) : (
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEditLesson(moduleId, item.lesson)}
                    aria-label={`Edit ${item.lesson.title}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-[#08bfd4]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteLesson(moduleId, item.lesson.id)}
                    aria-label={`Delete ${item.lesson.title}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="border-t border-slate-100 bg-white px-4 py-4">
                  <div className="text-slate-600">
                    {embedUrl ? (
                      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.12)] md:float-left md:mb-3 md:mr-5 md:w-[32%] md:max-w-[16rem]">
                        <div className="aspect-video">
                          <iframe
                            src={embedUrl}
                            title={`${item.lesson.title} video`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="h-full w-full"
                          />
                        </div>
                      </div>
                    ) : null}

                    {hasLessonContent(item.lesson.content) ? (
                      <div
                        className="prose prose-sm max-w-none text-slate-600"
                        dangerouslySetInnerHTML={{ __html: item.lesson.content ?? "" }}
                      />
                    ) : (
                      <p className="text-sm leading-6 text-slate-600">No lesson content yet.</p>
                    )}

                    {embedUrl ? <div className="clear-both" /> : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        }

        if (item.type === "test") {
          const isExpanded = Boolean(expandedTestIds[item.test.id]);
          const displayTitle = item.nested
            ? getNestedTestTitle(item.test, lessons, moduleOrder)
            : getGeneratedCourseTestTitle({
                moduleOrder,
                lessons,
                afterLessonId: item.test.afterLessonId,
                fallbackTitle: item.test.title,
              });

          return (
            <article
              key={item.test.id}
              className={`group overflow-hidden rounded-[1rem] border border-[#ddd6fe] bg-[#f5f3ff] ${
                item.nested ? "ml-6" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => onToggleTest(item.test.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.6rem] bg-white text-[#8b5cf6]">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[1rem] font-semibold text-[#14213d]">
                        {displayTitle}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                  ) : (
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEditTest(moduleId, item.test)}
                    aria-label={`Edit ${displayTitle}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-[#8b5cf6]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTest(moduleId, item.test.id)}
                    aria-label={`Delete ${displayTitle}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="border-t border-[#e9d5ff] bg-white px-4 py-4">
                  <div className="space-y-4">
                    {item.test.questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="rounded-[1rem] border border-[#ede9fe] bg-[#faf5ff] p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c4b5fd] bg-[#ede9fe] text-sm font-bold text-[#7c3aed]">
                              {index + 1}
                            </div>
                            <p className="min-w-0 whitespace-pre-wrap pt-1 text-sm font-semibold leading-6 text-slate-700">
                              {question.questionText}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-slate-500">
                            {questionTypeLabels[question.type]}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {question.type === "true_false" ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                True
                              </div>
                              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                                False
                              </div>
                            </div>
                          ) : (
                            question.options.map((option, optionIndex) => (
                              <div
                                key={`${question.id}-${optionIndex}`}
                                className="flex items-center gap-3 rounded-xl border border-[#ede9fe] bg-white px-4 py-3 text-sm text-slate-700"
                              >
                                <span
                                  className={`flex h-4 w-4 items-center justify-center border border-[#c4b5fd] ${
                                    question.type === "multiple_choice"
                                      ? "rounded-[4px]"
                                      : "rounded-full"
                                  }`}
                                />
                                <span>{option}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {question.hint?.trim() ? (
                          <div className="mt-4">
                            <SpoilerText text={question.hint.trim()} />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        }

        const isExpanded = Boolean(expandedExerciseIds[item.exercise.id]);

        return (
          <article
            key={item.exercise.id}
            className={`group overflow-hidden rounded-[1rem] border border-[#fed7aa] bg-[#fff7ed] ${
              item.nested ? "ml-6" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <button
                type="button"
                onClick={() => onToggleExercise(item.exercise.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.6rem] bg-white text-[#f97316]">
                  <Code2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[1rem] font-semibold text-[#14213d]">
                      {item.exercise.title}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#c2410c]">
                      Exercise
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                ) : (
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                )}
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEditExercise(moduleId, item.exercise)}
                  aria-label={`Edit ${item.exercise.title}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-[#f97316]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteExercise(moduleId, item.exercise.id)}
                  aria-label={`Delete ${item.exercise.title}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isExpanded ? (
              <div className="border-t border-[#fed7aa] bg-white px-4 py-4">
                <ExercisePreview
                  content={item.exercise.content}
                  description={item.exercise.description}
                  compact
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
