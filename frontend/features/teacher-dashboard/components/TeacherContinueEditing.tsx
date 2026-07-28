import { BookOpen, Eye, Layers3, Play } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  getCourseMediaKind,
  getCourseMediaPublicUrl,
} from "../../courses/api/courseMediaStorage";
import type { TeacherCourseSummary } from "./teacherCourseDashboard.types";
import {
  formatCourseRelativeTime,
} from "./teacherCourseDashboard.utils";

type TeacherContinueEditingProps = {
  course: TeacherCourseSummary | null;
  isPreviewBusy?: boolean;
  onContinue: (course: TeacherCourseSummary) => void;
  onPreview: (course: TeacherCourseSummary) => void;
  onCreateCourse: () => void;
};

function CourseHeroThumbnail({
  course,
}: {
  course: TeacherCourseSummary;
}) {
  const thumbnailUrl = getCourseMediaPublicUrl(course.thumbnail_path);
  const thumbnailKind = getCourseMediaKind(course.thumbnail_path);

  if (thumbnailUrl && thumbnailKind === "image") {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <img src={thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <BookOpen className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-slate-500">Робоча область курсу</p>
      </div>
    </div>
  );
}

export function TeacherContinueEditing({
  course,
  isPreviewBusy = false,
  onContinue,
  onPreview,
  onCreateCourse,
}: TeacherContinueEditingProps) {
  if (!course) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-[#13daec]/10p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-s font-semibold  text-slate-100">
              Продовжити редагування
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Немає курсу в роботі
            </h2>
            <p className="text-sm text-slate-500">Створіть новий курс, щоб почати редагування.</p>
          </div>

          <Button type="button" size="lg" onClick={onCreateCourse}>
            + Новий курс
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[#13daec] bg-[#13daec]/10 shadow-sm">
      <div className="grid gap-6 p-6 md:p-7 xl:grid-cols-[minmax(0,1.15fr)_18rem] xl:items-center">
        <div className="space-y-5">


          <div className="space-y-2">
            <h2 className="max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              {course.title}
            </h2>
            <p className="text-sm text-slate-500">
              Останнє редагування: {formatCourseRelativeTime(course.updated_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Layers3 className="h-4 w-4 text-slate-500" />
              <span>{course.modulesCount} модулів</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <BookOpen className="h-4 w-4 text-slate-500" />
              <span>{course.lessonsCount} уроків</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" onClick={() => onContinue(course)}>
              <Play className="h-4 w-4" />
              <span>Продовжити редагування</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => onPreview(course)}
              disabled={isPreviewBusy}
            >
              <Eye className="h-4 w-4" />
              <span>{isPreviewBusy ? "Відкриття..." : "Перегляд"}</span>
            </Button>
          </div>
        </div>

        <CourseHeroThumbnail course={course} />
      </div>
    </section>
  );
}
