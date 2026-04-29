import { useState } from "react";
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import { AdminTeacherAvatar } from "../../admin-dashboard/components/AdminTeacherAvatar";
import type { CurrentUser } from "../../auth/types";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";
import { StudentDashboardCourseQuickViewModal } from "./StudentDashboardCourseQuickViewModal";
import {
  buildStudentDashboardCatalogCards,
  buildStudentDashboardTeacherDirectory,
  type StudentDashboardCatalogCard,
} from "./studentDashboardViewModels";

type StudentDashboardOverviewProps = {
  currentUser: CurrentUser | null;
  courses: StudentDashboardCourseCatalogItem[];
  isLoadingCourses: boolean;
  coursesMessage: string | null;
  onOpenCourses: () => void;
};

function getStudentDisplayName(user: CurrentUser | null) {
  return user?.fullName?.trim() || user?.email?.split("@")[0] || "Student";
}

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
    <div className="flex h-52 items-center justify-center rounded-[1.35rem] bg-[radial-gradient(circle_at_top_left,_rgba(19,218,236,0.24),_transparent_28%),linear-gradient(135deg,_#1f2937_0%,_#111827_55%,_#0f172a_100%)]">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 text-white">
          <BookOpen className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-white/80">Course cover</p>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-[#f8fafc] px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function StudentDashboardOverview({
  currentUser,
  courses,
  isLoadingCourses,
  coursesMessage,
  onOpenCourses,
}: StudentDashboardOverviewProps) {
  const [selectedCourse, setSelectedCourse] =
    useState<StudentDashboardCatalogCard | null>(null);
  const catalogCards = buildStudentDashboardCatalogCards(courses);
  const teacherDirectory = buildStudentDashboardTeacherDirectory(courses);
  const previewCourses = catalogCards.slice(0, 3);

  return (
    <>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(19,218,236,0.24),_transparent_24%),linear-gradient(135deg,_#1f2937_0%,_#111827_45%,_#0f172a_100%)] px-6 py-8 md:px-8 md:py-10">
            <div className="absolute right-[-2rem] top-8 h-40 w-40 rounded-[2rem] border border-white/10 bg-white/5" />
            <div className="absolute bottom-[-3rem] left-10 h-28 w-28 rounded-full bg-[#13daec]/15 blur-3xl" />

            <div className="relative max-w-3xl">
              
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-[2.75rem]">
                Welcome back, {getStudentDisplayName(currentUser)}
              </h1>

            </div>
          </div>
        </section>

        {coursesMessage ? (
          <Card className="rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-none">
            <p className="text-sm font-medium">{coursesMessage}</p>
          </Card>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Courses
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Available now
              </h2>
            </div>

            <Button type="button" size="lg" onClick={onOpenCourses}>
              View all
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-6">
            {isLoadingCourses && courses.length === 0 ? (
              <LoadingState variant="section" />
            ) : previewCourses.length === 0 ? (
              <EmptyState
                title="No courses yet"
                description="Published courses will appear here as soon as they are available."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {previewCourses.map((course) => (
                  <article
                    key={course.id}
                    className="flex min-h-full flex-col rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-4 shadow-[0_18px_36px_rgba(15,23,42,0.04)]"
                  >
                    <CourseThumbnail course={course} />

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {course.releaseLabel}
                      </span>
                      <span className="text-xs text-slate-400">{course.updatedLabel}</span>
                    </div>

                    <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                      {course.title}
                    </h3>
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
                          className="rounded-full border border-slate-200 bg-white px-3 py-1"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto pt-5">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setSelectedCourse(course)}
                        className="w-full"
                      >
                        Quick view
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] md:p-8">
          <div className="flex items-end gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Teachers
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Available instructors
              </h2>
            </div>
          </div>

          <div className="mt-6">
            {teacherDirectory.length === 0 ? (
              <EmptyState
                title="No teachers yet"
                description="Teachers will appear here when published courses are available."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {teacherDirectory.map((teacher) => (
                  <article
                    key={teacher.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-5 shadow-[0_18px_32px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex items-start gap-3">
                      <AdminTeacherAvatar name={teacher.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-[#08bfd4]" />
                          <h3 className="text-lg font-semibold text-slate-950">{teacher.name}</h3>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {teacher.courseCount} {teacher.courseCount === 1 ? "course" : "courses"}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {teacher.courseTitles.map((courseTitle) => (
                            <span
                              key={courseTitle}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                            >
                              {courseTitle}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <StudentDashboardCourseQuickViewModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </>
  );
}
