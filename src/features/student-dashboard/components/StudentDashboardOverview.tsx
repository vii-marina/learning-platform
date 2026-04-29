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
import { StudentDashboardCourseCard } from "./StudentDashboardCourseCard";

type StudentDashboardOverviewProps = {
  currentUser: CurrentUser | null;
  courses: StudentDashboardCourseCatalogItem[];
  isLoadingCourses: boolean;
  coursesMessage: string | null;
  availableCourses: StudentDashboardCourseCatalogItem[];
  isLoadingAvailableCourses: boolean;
  availableCoursesMessage: string | null;
  onOpenCourses: () => void;
};

function getStudentDisplayName(user: CurrentUser | null) {
  return user?.fullName?.trim() || user?.email?.split("@")[0] || "Student";
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
  availableCourses,
  isLoadingAvailableCourses,
  availableCoursesMessage,
  onOpenCourses,
}: StudentDashboardOverviewProps) {
  const [selectedCourse, setSelectedCourse] =
    useState<StudentDashboardCatalogCard | null>(null);
  const catalogCards = buildStudentDashboardCatalogCards(courses);
  const availableCatalogCards = buildStudentDashboardCatalogCards(availableCourses);
  const teacherDirectory = buildStudentDashboardTeacherDirectory(
    courses.length > 0 ? courses : availableCourses
  );
  const previewCourses = catalogCards.slice(0, 3);
  const availablePreviewCourses = availableCatalogCards.slice(0, 3);

  return (
    <>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(19,218,236,0.24),_transparent_24%),linear-gradient(135deg,_#1f2937_0%,_#111827_45%,_#0f172a_100%)] px-6 py-8 md:px-8 md:py-10">
            <div className="absolute right-[-2rem] top-8 h-40 w-40 rounded-[2rem] border border-white/10 bg-white/5" />
            <div className="absolute bottom-[-3rem] left-10 h-28 w-28 rounded-full bg-[#13daec]/15 blur-3xl" />

            <div className="relative ">
              
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white ">
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
                My learning
              </h2>
            </div>

            {previewCourses.length > 0 ? (
              <Button type="button" size="lg" onClick={onOpenCourses}>
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="mt-6">
            {isLoadingCourses && courses.length === 0 ? (
              <LoadingState variant="section" />
            ) : previewCourses.length === 0 ? (
              <div className="space-y-5">
                <Card className="rounded-[1.75rem] border-[#13daec]/25 bg-[linear-gradient(135deg,rgba(19,218,236,0.12),rgba(255,255,255,0.96))] p-6 shadow-none">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#13daec]/18 text-[#0f172a]">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                        You do not have any assigned courses yet
                      </h3>
                      <p className="max-w-3xl text-sm leading-7 text-slate-600">
                        Browse the available public courses below and start interacting with them.
                        As soon as you join a course, it will appear in your personal learning
                        space.
                      </p>
                    </div>
                  </div>
                </Card>

                {availableCoursesMessage ? (
                  <Card className="rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-none">
                    <p className="text-sm font-medium">{availableCoursesMessage}</p>
                  </Card>
                ) : null}

                {isLoadingAvailableCourses ? (
                  <LoadingState variant="section" />
                ) : availablePreviewCourses.length === 0 ? (
                  <EmptyState
                    title="No public courses yet"
                    description="Public courses will appear here when teachers publish them."
                  />
                ) : (
                  <div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Public Courses
                      </p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                        Start with these courses
                      </h3>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {availablePreviewCourses.map((course) => (
                        <StudentDashboardCourseCard
                          key={course.id}
                          course={course}
                          onQuickView={setSelectedCourse}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {previewCourses.map((course) => (
                  <StudentDashboardCourseCard
                    key={course.id}
                    course={course}
                    onQuickView={setSelectedCourse}
                  />
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
