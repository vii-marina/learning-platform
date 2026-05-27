import type { Lesson } from "../../../api/index";
import { ChevronDown, ChevronRight, Pencil, Play, Trash2 } from "lucide-react";
import { getYouTubeEmbedUrl } from "../lib/youtube";

const hasLessonContent = (content: string | null) =>
  Boolean(content?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim());

type ModuleLessonsSectionProps = {
  moduleId: string;
  moduleOrder: number;
  lessons: Lesson[];
  expandedLessonIds: Record<string, boolean>;
  onToggleLesson: (lessonId: string) => void;
  onEditLesson: (moduleId: string, lesson: Lesson) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
};

export function ModuleLessonsSection({
  moduleId,
  moduleOrder,
  lessons,
  expandedLessonIds,
  onToggleLesson,
  onEditLesson,
  onDeleteLesson,
}: ModuleLessonsSectionProps) {
  if (lessons.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      {lessons.map((lesson) => {
        const isExpanded = Boolean(expandedLessonIds[lesson.id]);
        const embedUrl = getYouTubeEmbedUrl(lesson.video_url);

        return (
          <article
            key={lesson.id}
            className="group overflow-hidden rounded-[1rem] border border-slate-100 bg-[#f8fbfd]"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <button
                type="button"
                onClick={() => onToggleLesson(lesson.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#13daec] text-white">
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                </div>
                <span className="truncate text-[1rem] font-semibold text-[#14213d]">
                  {`${moduleOrder}.${lesson.order} ${lesson.title}`}
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
                  onClick={() => onEditLesson(moduleId, lesson)}
                  aria-label={`Edit ${lesson.title}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-[#08bfd4]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteLesson(moduleId, lesson.id)}
                  aria-label={`Delete ${lesson.title}`}
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
                      className="prose prose-sm max-w-none text-slate-600"
                      dangerouslySetInnerHTML={{ __html: lesson.content ?? "" }}
                    />
                  ) : (
                    <p className="text-sm leading-6 text-slate-600">Контент уроку поки відсутній.</p>
                  )}

                  {embedUrl ? <div className="clear-both" /> : null}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
