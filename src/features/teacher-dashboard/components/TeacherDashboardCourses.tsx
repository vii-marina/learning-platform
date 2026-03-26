import { ArrowRight, BookOpen, CheckCircle2, Clock3, Layers3 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import type { TeacherDashboardCourse } from "../mock/teacherDashboardMock";
import {
  teacherDashboardActiveCourses,
  teacherDashboardArchivedCourses,
} from "../mock/teacherDashboardMock";

function CourseStatusBadge({
  status,
  progressLabel,
}: Pick<TeacherDashboardCourse, "status" | "progressLabel">) {
  if (status === "Archived") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
        <CheckCircle2 className="h-4 w-4" />
        {progressLabel}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
      <BookOpen className="h-4 w-4" />
      {progressLabel}
    </span>
  );
}

function CourseListCard({
  course,
  actionLabel,
}: {
  course: TeacherDashboardCourse;
  actionLabel: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 shadow-[0_16px_32px_rgba(15,23,42,0.05)] md:p-5">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div
          className="overflow-hidden rounded-[1.25rem] bg-slate-200 md:flex-shrink-0"
          style={{ width: "272px", maxWidth: "100%" }}
        >
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-44 w-full object-cover"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <CourseStatusBadge
                status={course.status}
                progressLabel={course.progressLabel}
              />
              <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600">
                {course.category}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-3xl font-black tracking-tight text-[#14213d]">
                {course.title}
              </h3>
              <p className="text-sm leading-7 text-slate-600">
                {course.description}
              </p>
              <p className="text-sm font-medium leading-7 text-slate-600">
                {course.statusDetail}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
                <Layers3 className="h-4 w-4" />
                {course.lessonsCount} lessons
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
                <Clock3 className="h-4 w-4" />
                {course.estimatedTime}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
                {course.instructor}
              </span>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      course.status === "Archived"
                        ? "bg-slate-500"
                        : "bg-[#17338f]"
                    }`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <p className="text-sm leading-7 text-slate-600">
                  {course.status === "Archived"
                    ? "This course is archived but still available for reference and reuse."
                    : "Keep managing lessons, materials, and student activity from here."}
                </p>
              </div>

              <Button
                type="button"
                className="rounded-2xl bg-[#14213d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0f1a30]"
              >
                <span className="inline-flex items-center gap-2">
                  {actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function CourseSection({
  title,
  description,
  courses,
  actionLabel,
}: {
  title: string;
  description: string;
  courses: TeacherDashboardCourse[];
  actionLabel: string;
}) {
  return (
    <Card className="rounded-[1.75rem] border-cyan-100 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)] md:p-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-tight text-[#14213d]">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          {description}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {courses.map((course) => (
          <CourseListCard
            key={course.id}
            course={course}
            actionLabel={actionLabel}
          />
        ))}
      </div>
    </Card>
  );
}

export function TeacherDashboardCourses() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[1.75rem] border-cyan-100 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)] md:p-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-[#14213d]">
            My courses
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            Here are your mocked teaching records. Active courses appear first,
            and archived courses are listed below in a separate block.
          </p>
        </div>
      </Card>

      <CourseSection
        title="Active"
        description="These are the courses you are currently teaching."
        courses={teacherDashboardActiveCourses}
        actionLabel="Manage course"
      />

      <CourseSection
        title="Archived"
        description="These courses are closed and remain available for review or reuse."
        courses={teacherDashboardArchivedCourses}
        actionLabel="Review course"
      />
    </div>
  );
}
