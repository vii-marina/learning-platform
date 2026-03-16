import type { Lesson } from "../../api";
import { BadgeCheck, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import type { CourseTest, TestQuestionType } from "./courseBuilderUiTypes";

type ModuleTestsSectionProps = {
  moduleId: string;
  lessons: Lesson[];
  tests: CourseTest[];
  expandedTestIds: Record<string, boolean>;
  onOpenCreateTest: (moduleId: string) => void;
  onToggleTest: (testId: string) => void;
  onEditTest: (moduleId: string, test: CourseTest) => void;
  onDeleteTest: (moduleId: string, testId: string) => void;
};

const questionTypeLabels: Record<TestQuestionType, string> = {
  true_false: "True/False",
  single_choice: "Multiple Choice (Single)",
  multiple_choice: "Multiple Choice (Multiple)",
};

export function ModuleTestsSection({
  moduleId,
  lessons,
  tests,
  expandedTestIds,
  onOpenCreateTest,
  onToggleTest,
  onEditTest,
  onDeleteTest,
}: ModuleTestsSectionProps) {
  const getPlacementLabel = (afterLessonId: string | null) => {
    if (!afterLessonId) {
      return "After: This Module";
    }

    const lessonIndex = lessons.findIndex((item) => item.id === afterLessonId);
    return lessonIndex >= 0 ? `After: Lesson ${lessonIndex + 1}` : "After: Lesson";
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900">Tests & Quizzes</h3>
        </div>
        <Button variant="secondary" onClick={() => onOpenCreateTest(moduleId)}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Test
          </span>
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6">
        {tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
            <BadgeCheck className="h-10 w-10 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">No tests in this module yet</p>
            <Button variant="secondary" onClick={() => onOpenCreateTest(moduleId)}>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Test
              </span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => {
              const isExpanded = Boolean(expandedTestIds[test.id]);
              const passingScore = test.minScore || "70";

              return (
                <article key={test.id} className="rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <button
                      type="button"
                      onClick={() => onToggleTest(test.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-500" />
                      )}
                      <span className="text-base font-semibold text-slate-900">{test.title}</span>
                      <span className="text-sm text-slate-500">
                        {test.questions.length} question{test.questions.length === 1 ? "" : "s"}
                      </span>
                      <span className="text-sm text-slate-500">Pass: {passingScore}%</span>
                      <span className="text-sm text-slate-500">
                        {getPlacementLabel(test.afterLessonId)}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditTest(moduleId, test)}
                        aria-label={`Edit ${test.title}`}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTest(moduleId, test.id)}
                        aria-label={`Delete ${test.title}`}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-slate-200 px-5 py-5">
                      <div className="space-y-4 rounded-2xl bg-slate-50 p-5">
                        {test.questions.map((question, index) => (
                          <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900">
                                Question {index + 1}
                              </p>
                              <span className="text-xs font-medium text-slate-500">
                                {questionTypeLabels[question.type]}
                              </span>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {question.questionText}
                            </p>

                            <div className="mt-4 space-y-2">
                              {question.options.map((option, optionIndex) => {
                                const isCorrect = question.correctOptionIndexes.includes(optionIndex);

                                return (
                                  <div
                                    key={`${question.id}-${optionIndex}`}
                                    className={`rounded-xl border px-4 py-3 text-sm ${
                                      isCorrect
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-slate-50 text-slate-600"
                                    }`}
                                  >
                                    {option}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
