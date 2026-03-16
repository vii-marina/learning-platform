import type { Lesson } from "../../api";
import { BookOpen, ChevronDown, ChevronRight, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/Button";

type ModuleLessonsSectionProps = {
  moduleId: string;
  lessons: Lesson[];
  expandedLessonIds: Record<string, boolean>;
  onOpenCreateLesson: (moduleId: string) => void;
  onToggleLesson: (lessonId: string) => void;
  onEditLesson: (moduleId: string, lesson: Lesson) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
};

export function ModuleLessonsSection({
  moduleId,
  lessons,
  expandedLessonIds,
  onOpenCreateLesson,
  onToggleLesson,
  onEditLesson,
  onDeleteLesson,
}: ModuleLessonsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Play className="h-4 w-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900">Lessons</h3>
        </div>
        <Button onClick={() => onOpenCreateLesson(moduleId)}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Lesson
          </span>
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6">
        {lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
            <BookOpen className="h-10 w-10 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">No lessons in this module yet</p>
            <Button variant="secondary" onClick={() => onOpenCreateLesson(moduleId)}>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Lesson
              </span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson, index) => {
              const isExpanded = Boolean(expandedLessonIds[lesson.id]);

              return (
                <article key={lesson.id} className="rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <button
                      type="button"
                      onClick={() => onToggleLesson(lesson.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-500" />
                      )}
                      <span className="text-sm text-slate-400">{index + 1}.</span>
                      <span className="text-base font-semibold text-slate-900">{lesson.title}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditLesson(moduleId, lesson)}
                        aria-label={`Edit ${lesson.title}`}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteLesson(moduleId, lesson.id)}
                        aria-label={`Delete ${lesson.title}`}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-slate-200 px-5 py-5">
                      <div className="rounded-2xl bg-slate-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Student Preview
                        </p>
                        <h4 className="mt-3 text-lg font-semibold text-slate-900">{lesson.title}</h4>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {lesson.content?.trim() || "No lesson content yet."}
                        </p>
                        {lesson.video_url ? (
                          <a
                            href={lesson.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                          >
                            Open lesson video
                          </a>
                        ) : null}
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
