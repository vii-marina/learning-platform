import type { TestQuestionType } from "../../api";
import { BadgeCheck, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { SpoilerText } from "../../../../components/ui/SpoilerText";
import type { Lesson } from "../../api";
import type { CourseTest } from "./courseBuilderUiTypes";
import { getGeneratedCourseTestTitle } from "./courseBuilderPageUtils";

type ModuleTestsSectionProps = {
  moduleId: string;
  moduleOrder: number;
  lessons: Lesson[];
  tests: CourseTest[];
  expandedTestIds: Record<string, boolean>;
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
  moduleOrder,
  lessons,
  tests,
  expandedTestIds,
  onToggleTest,
  onEditTest,
  onDeleteTest,
}: ModuleTestsSectionProps) {
  if (tests.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      {tests.map((test) => {
        const isExpanded = Boolean(expandedTestIds[test.id]);
        const displayTitle = getGeneratedCourseTestTitle({
          moduleOrder,
          lessons,
          afterLessonId: test.afterLessonId,
          fallbackTitle: test.title,
        });

        return (
          <article
            key={test.id}
            className="group overflow-hidden rounded-[1rem] border border-[#c9eef5] bg-[#edfafd]"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <button
                type="button"
                onClick={() => onToggleTest(test.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.6rem] bg-white text-[#08bfd4]">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <span className="truncate text-[1rem] font-semibold text-[#14213d]">
                  {displayTitle}
                </span>
                {isExpanded ? (
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                ) : (
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                )}
              </button>

              <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onEditTest(moduleId, test)}
                  aria-label={`Edit ${displayTitle}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-[#08bfd4]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTest(moduleId, test.id)}
                  aria-label={`Delete ${displayTitle}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isExpanded ? (
              <div className="border-t border-[#d7eff4] bg-white px-4 py-4">
                <div className="space-y-4">
                  {test.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-[1rem] border border-slate-100 bg-[#f9fbfd] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#14213d]">{index + 1}</p>
                        <span className="text-xs font-medium text-slate-500">
                          {questionTypeLabels[question.type]}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {question.questionText}
                      </p>

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
                              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
                            >
                              <span
                                className={`flex h-4 w-4 items-center justify-center border border-slate-300 ${
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
      })}
    </section>
  );
}
