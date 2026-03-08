import type { Lesson } from "../../api";
import { BookOpen, Play, Plus } from "lucide-react";
import { Button } from "../../../../components/ui/Button";

type ModuleLessonsSectionProps = {
  moduleId: string;
  lessons: Lesson[];
  onOpenCreateLesson: (moduleId: string) => void;
};

export function ModuleLessonsSection({
  moduleId,
  lessons,
  onOpenCreateLesson,
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

      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10">
        {lessons.length === 0 ? (
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
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{lesson.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
