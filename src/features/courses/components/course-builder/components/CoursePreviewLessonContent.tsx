import { useEffect } from "react";
import { BadgeCheck, MessageSquareText, Sparkles } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { Lesson, Module } from "../../../api/index";
import { hasLessonContent } from "../lib/courseBuilderPageUtils";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import { getYouTubeEmbedUrl } from "../lib/youtube";
import type { CoursePreviewChatContext } from "./CoursePreviewAskTeacherModal";
import { CoursePreviewExerciseBlock } from "./CoursePreviewExerciseBlock";
import {
  getCoursePreviewTestTitle,
  isGeneratedCoursePreviewItem,
} from "../lib/coursePreviewUtils";

type CoursePreviewLessonContentProps = {
  module: Module | null;
  lesson: Lesson | null;
  lessons: Lesson[];
  exercises: CourseExercise[];
  tests: CourseTest[];
  focusedExerciseId: string | null;
  completedTestIds: Record<string, boolean>;
  generatingLessonId: string | null;
  onGeneratePractice: (module: Module, lesson: Lesson) => void;
  onOpenTest: (module: Module, lesson: Lesson, test: CourseTest) => void;
  onAskTeacher: (context: CoursePreviewChatContext) => void;
  onResolveExercise: (exerciseId: string) => void;
};

export function CoursePreviewLessonContent({
  module,
  lesson,
  lessons,
  exercises,
  tests,
  focusedExerciseId,
  completedTestIds,
  generatingLessonId,
  onGeneratePractice,
  onOpenTest,
  onAskTeacher,
  onResolveExercise,
}: CoursePreviewLessonContentProps) {
  useEffect(() => {
    if (!focusedExerciseId) {
      return;
    }

    const target = document.getElementById(`course-preview-exercise-${focusedExerciseId}`);

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [focusedExerciseId]);

  if (!module || !lesson) {
    return (
      <div className="mx-auto flex min-h-[24rem] w-full max-w-[44rem] items-center justify-center px-6 py-8">
        <div className="w-full rounded-xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
          Select a lesson from the sidebar to open the reading view.
        </div>
      </div>
    );
  }

  const lessonEmbedUrl = getYouTubeEmbedUrl(lesson.video_url);
  const hasGeneratedPractice =
    exercises.some((exercise) => isGeneratedCoursePreviewItem(exercise.id)) ||
    tests.some((test) => isGeneratedCoursePreviewItem(test.id));

  const askTeacherContext: CoursePreviewChatContext = {
    reference: `Module ${module.order} • Lesson ${module.order}.${lesson.order}`,
    title: lesson.title,
    description: "Your teacher will receive the current lesson reference with this message.",
  };

  return (
    <div id="course-preview-main" className="min-w-0 flex-1 bg-white">
      <div className="mx-auto w-full max-w-[58rem] px-6 py-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
              {`Module ${module.order}`}
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
              {`Lesson ${module.order}.${lesson.order}`}
            </span>
          </div>

          <div>
            <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
              {lesson.title}
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="accent"
              onClick={() => onGeneratePractice(module, lesson)}
              disabled={generatingLessonId === lesson.id}
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {generatingLessonId === lesson.id
                  ? "Generating practice..."
                  : "Generate more practice"}
              </span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => onAskTeacher(askTeacherContext)}
            >
              <MessageSquareText className="h-4 w-4" />
              <span>Ask Teacher</span>
            </Button>
          </div>
        </div>

        {lessonEmbedUrl ? (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
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
          <div
            className="prose prose-slate mt-8 max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: lesson.content ?? "" }}
          />
        ) : (
          <p className="mt-8 text-sm leading-7 text-slate-500">
            This lesson does not have published content yet.
          </p>
        )}

        {hasGeneratedPractice ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            These questions were generated by AI. Verify correctness with your teacher.
          </div>
        ) : null}

        {exercises.length > 0 ? (
          <div className="mt-8 space-y-4 border-t border-slate-200 pt-8">
            {exercises.map((exercise) => (
              <CoursePreviewExerciseBlock
                key={exercise.id}
                module={module}
                lesson={lesson}
                exercise={exercise}
                isGenerated={isGeneratedCoursePreviewItem(exercise.id)}
                isHighlighted={exercise.id === focusedExerciseId}
                onAskTeacher={onAskTeacher}
                onResolved={onResolveExercise}
              />
            ))}
          </div>
        ) : null}

        {tests.length > 0 ? (
          <div className="mt-8 border-t border-slate-200 pt-8">
            <div className="mb-4 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-[#13daec]" />
              <h3 className="text-lg font-semibold text-slate-950">Practice Checks</h3>
            </div>

            <div className="space-y-3">
              {tests.map((test) => {
                const title = getCoursePreviewTestTitle(module.order, lessons, test);

                return (
                  <div
                    key={test.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {`${test.questions.length} question${test.questions.length === 1 ? "" : "s"}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {completedTestIds[test.id] ? (
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                          Completed
                        </span>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenTest(module, lesson, test)}
                      >
                        Open Test
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
