import { BookOpen, GraduationCap, Layers3, LoaderCircle, Sparkles } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { getCourseMediaPublicUrl } from "../../courses/api/courseMediaStorage";
import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";

function CourseListCard({
  course,
}: {
  course: StudentDashboardCourseCatalogItem;
}) {
  const thumbnailUrl = getCourseMediaPublicUrl(course.thumbnail_path);
  const publishedLabel = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(course.updated_at));

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 shadow-[0_16px_32px_rgba(15,23,42,0.05)] md:p-5">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="overflow-hidden rounded-[1.25rem] bg-slate-200 md:flex-shrink-0 md:w-[272px]">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={course.title}
              className="h-44 w-full object-cover"
            />
          ) : (
            <div className="flex h-44 items-center justify-center bg-[linear-gradient(135deg,#14213d_0%,#17338f_100%)] text-white">
              <BookOpen className="h-10 w-10" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                <Sparkles className="h-4 w-4" />
                Published
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600">
                Public access
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-3xl font-black tracking-tight text-[#14213d]">
                {course.title}
              </h3>
              <p className="text-sm leading-7 text-slate-600">
                {course.description?.trim() || "This course is now available to students on the platform."}
              </p>
              <p className="inline-flex items-center gap-2 text-sm font-medium leading-7 text-slate-600">
                <GraduationCap className="h-4 w-4" />
                {course.teacher_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
              <Layers3 className="h-4 w-4" />
              {course.module_count} modules
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
              <BookOpen className="h-4 w-4" />
              {course.lesson_count} lessons
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
              Updated {publishedLabel}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

type StudentDashboardCoursesProps = {
  courses: StudentDashboardCourseCatalogItem[];
  isLoadingCourses: boolean;
  coursesMessage: string | null;
};

export function StudentDashboardCourses({
  courses,
  isLoadingCourses,
  coursesMessage,
}: StudentDashboardCoursesProps) {
  return (
    <div className="space-y-6">
      <Card className="rounded-[1.75rem] border-cyan-100 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)] md:p-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-[#14213d]">
            Platform courses
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            Every course published by teachers for student access appears here.
            New releases become visible as soon as the course is published.
          </p>
        </div>
      </Card>

      {coursesMessage ? (
        <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{coursesMessage}</p>
        </Card>
      ) : null}

      {isLoadingCourses ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-8 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            <span>Loading published courses...</span>
          </div>
        </Card>
      ) : courses.length === 0 ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-8 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[#14213d]">
              No published courses yet
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              When a teacher publishes a public course, it will appear here for students.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="rounded-[1.75rem] border-cyan-100 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)] md:p-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-[#14213d]">
              Available now
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              {courses.length} published {courses.length === 1 ? "course is" : "courses are"} currently
              visible to students.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {courses.map((course) => (
              <CourseListCard key={course.id} course={course} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
