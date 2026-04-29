import { useState } from "react";
import { BookOpen, Layers3, Users } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";
import { StudentDashboardCourseQuickViewModal } from "./StudentDashboardCourseQuickViewModal";
import {
  buildStudentDashboardCatalogCards,
  buildStudentDashboardTeacherDirectory,
  type StudentDashboardAccentTone,
  type StudentDashboardCatalogCard,
} from "./studentDashboardViewModels";

type StudentDashboardCoursesProps = {
  courses: StudentDashboardCourseCatalogItem[];
  isLoadingCourses: boolean;
  coursesMessage: string | null;
};

const toneBadgeClassNames: Record<StudentDashboardAccentTone, string> = {
  cyan: "border-[#13daec]/30 bg-[#13daec]/12 text-[#0f8ea0]",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
};

function CourseThumbnail({
  course,
}: {
  course: StudentDashboardCatalogCard;
}) {
  if (course.thumbnailUrl) {
    return (
      <div className="overflow-hidden rounded-[1.35rem] bg-slate-100">
        <img src={course.thumbnailUrl} alt={course.title} className="h-52 w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-52 items-center justify-center rounded-[1.35rem] bg-[radial-gradient(circle_at_top_left,_rgba(19,218,236,0.28),_transparent_28%),linear-gradient(135deg,_#1f2937_0%,_#111827_55%,_#0f172a_100%)]">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 text-white">
          <BookOpen className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-white/80">Course cover</p>
      </div>
    </div>
  );
}

export function StudentDashboardCourses({
  courses,
  isLoadingCourses,
  coursesMessage,
}: StudentDashboardCoursesProps) {
  const [selectedCourse, setSelectedCourse] =
    useState<StudentDashboardCatalogCard | null>(null);
  const catalogCards = buildStudentDashboardCatalogCards(courses);
  const teacherDirectory = buildStudentDashboardTeacherDirectory(courses);
  const openAccessCount = catalogCards.filter(
    (course) => course.accessLabel === "Open access"
  ).length;

  return (
    <>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(19,218,236,0.22),_transparent_24%),linear-gradient(135deg,_#1f2937_0%,_#111827_45%,_#0f172a_100%)] px-6 py-8 md:px-8 md:py-10">
              <div className="absolute right-[-1rem] top-8 h-40 w-40 rounded-[2rem] border border-white/10 bg-white/5" />
              <div className="absolute bottom-[-3rem] left-10 h-28 w-28 rounded-full bg-[#13daec]/15 blur-3xl" />

              <div className="relative max-w-3xl">
                <span className="inline-flex items-center rounded-full bg-[#13daec] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#0f172a]">
                  My Courses
                </span>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-[2.75rem]">
                  Published courses ready for students
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 md:text-base">
                  This space mirrors the teacher panel style while giving the student a cleaner
                  catalog for browsing course covers, short descriptions, teachers, and quick
                  summary actions.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                      <BookOpen className="h-4 w-4 text-[#13daec]" />
                      <span>Catalog total</span>
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{catalogCards.length}</p>
                    <p className="mt-1 text-sm text-white/65">Courses visible on this page</p>
                  </div>

                  <div className="rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                      <Users className="h-4 w-4 text-[#13daec]" />
                      <span>Teachers</span>
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {teacherDirectory.length}
                    </p>
                    <p className="mt-1 text-sm text-white/65">Distinct instructors represented</p>
                  </div>

                  <div className="rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                      <Layers3 className="h-4 w-4 text-[#13daec]" />
                      <span>Open access</span>
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{openAccessCount}</p>
                    <p className="mt-1 text-sm text-white/65">Immediately available learning paths</p>
                  </div>
                </div>
              </div>
            </div>

            
          </div>
        </section>

        {coursesMessage ? (
          <Card className="rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-none">
            <p className="text-sm font-medium">{coursesMessage}</p>
          </Card>
        ) : null}

        {isLoadingCourses && courses.length === 0 ? (
          <LoadingState variant="section" />
        ) : catalogCards.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-[0_24px_50px_rgba(15,23,42,0.04)]">
            <h2 className="text-xl font-semibold text-slate-950">No courses available yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Published courses will appear here when teachers add them.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {catalogCards.map((course) => (
              <article
                key={course.id}
                className="flex min-h-full flex-col rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_24px_50px_rgba(15,23,42,0.06)]"
              >
                <CourseThumbnail course={course} />

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneBadgeClassNames[course.accentTone]}`}
                  >
                    {course.accessLabel}
                  </span>
                  <span className="text-xs text-slate-400">{course.updatedLabel}</span>
                </div>

                <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                  {course.title}
                </h2>
                <p className="mt-2 text-sm font-medium text-slate-500">{course.teacherName}</p>
                {course.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                    {course.description}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  {course.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.15rem] border border-slate-200 bg-[#f8fafc] px-3 py-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Modules
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {course.moduleCount}
                    </p>
                  </div>

                  <div className="rounded-[1.15rem] border border-slate-200 bg-[#f8fafc] px-3 py-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Lessons
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {course.lessonCount}
                    </p>
                  </div>

                  <div className="rounded-[1.15rem] border border-slate-200 bg-[#f8fafc] px-3 py-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Release
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {course.releaseLabel}
                    </p>
                  </div>
                </div>

                <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedCourse(course)}
                    className="w-full"
                  >
                    Quick Summary
                  </Button>
                  <Button
                    type="button"
                    variant="accent"
                    onClick={() => setSelectedCourse(course)}
                    className="w-full"
                  >
                    Preview Course
                  </Button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      <StudentDashboardCourseQuickViewModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </>
  );
}
