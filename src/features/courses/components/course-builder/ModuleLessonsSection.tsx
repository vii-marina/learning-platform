import type { Lesson } from "../../api";
import { BookOpen, ChevronDown, ChevronRight, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { getYouTubeEmbedUrl } from "./youtube";

const hasLessonContent = (content: string | null) =>
  Boolean(content?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim());

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

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <BookOpen className="h-10 w-10 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">No lessons in this module yet</p>
            <Button variant="secondary" onClick={() => onOpenCreateLesson(moduleId)}>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Lesson
              </span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson, index) => {
            const isExpanded = Boolean(expandedLessonIds[lesson.id]);
            const embedUrl = getYouTubeEmbedUrl(lesson.video_url);

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
                  <div className="border-t border-slate-100 px-5 py-5">
                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Student Preview
                      </p>
                      <h4 className="text-lg font-semibold text-slate-900">{lesson.title}</h4>
                      {hasLessonContent(lesson.content) ? (
                        <div
                          className="prose prose-sm max-w-none text-slate-600"
                          dangerouslySetInnerHTML={{ __html: lesson.content ?? "" }}
                        />
                      ) : (
                        <p className="text-sm leading-6 text-slate-600">No lesson content yet.</p>
                      )}
                      {embedUrl ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                          <div className="aspect-video">
                            <iframe
                              src={embedUrl}
                              title={`${lesson.title} video`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="h-full w-full"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
