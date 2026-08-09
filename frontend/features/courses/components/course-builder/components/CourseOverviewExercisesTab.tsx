/** The "exercises" tab of the course-overview modal. */

import { Button } from "../../../../../components/ui/button";
import { ExercisePreview } from "./ExercisePreview";
import { CourseOverviewPath } from "./coursePreviewOverviewParts";
import { getExerciseTypeLabel, getOpenButtonClassName } from "./coursePreviewOverviewStyles";
import { isGeneratedCoursePreviewItem } from "../lib/coursePreviewUtils";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise } from "../types/courseBuilderUiTypes";

export type OverviewExerciseItem = {
  module: Module;
  lesson: Lesson | null;
  exercise: CourseExercise;
};

export function CourseOverviewExercisesTab({
  exerciseItems,
  onSelectExercise,
}: {
  exerciseItems: OverviewExerciseItem[];
  onSelectExercise: (moduleId: string, lessonId: string, exerciseId: string) => void;
}) {
  return (
              exerciseItems.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
                  Поки немає доступних вправ.
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
                            Відкрити вправу
                          </Button>
                        </div>

                        <div className="mt-5 rounded-2xl border border-orange-300 bg-orange-50/40 p-4 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.18)]">
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-orange-600">
                              {`${index + 1}.`}
                            </span>

                            <div className="min-w-0 flex-1 rounded-xl border border-orange-200 bg-white px-4 py-3 text-base font-semibold leading-6 text-[#14213d]">
                              {exercise.content.question.trim() || exercise.title || "Вправа"}
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
  );
}
