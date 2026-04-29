import type { Lesson, Module } from "../../../api/index";
import { hasLessonContent } from "../lib/courseBuilderPageUtils";
import { getYouTubeEmbedUrl } from "../lib/youtube";

type CoursePreviewSourceLessonPanelProps = {
  module: Module;
  lesson: Lesson;
  tone?: "exercise" | "test";
};

const toneClassNames = {
  exercise: {
    container: "border-orange-200 bg-orange-50/35",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    heading: "text-orange-700",
  },
  test: {
    container: "border-violet-200 bg-violet-50/35",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    heading: "text-violet-700",
  },
} as const;

export function CoursePreviewSourceLessonPanel({

  lesson,
  tone = "exercise",
}: CoursePreviewSourceLessonPanelProps) {
  const lessonEmbedUrl = getYouTubeEmbedUrl(lesson.video_url);
  const toneClasses = toneClassNames[tone];

  return (
    <section className={`rounded-[1.25rem] border p-5 ${toneClasses.container}`}>
      

      <div className="mt-4">
        
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          {lesson.title}
        </h3>
      </div>

      {lessonEmbedUrl ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
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
          className="prose prose-sm mt-5 max-w-none text-slate-700"
          dangerouslySetInnerHTML={{ __html: lesson.content ?? "" }}
        />
      ) : (
        <p className="mt-5 text-sm leading-7 text-slate-500">
          This lesson does not have published content yet.
        </p>
      )}
    </section>
  );
}
