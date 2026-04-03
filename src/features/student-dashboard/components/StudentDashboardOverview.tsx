import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers3,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { getCourseMediaPublicUrl } from "../../courses/api/courseMediaStorage";
import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";
import { studentDashboardMessages } from "../mock/studentDashboardMock";

type StudentDashboardOverviewProps = {
  courses: StudentDashboardCourseCatalogItem[];
  isLoadingCourses: boolean;
  coursesMessage: string | null;
  onOpenCourses: () => void;
};

export function StudentDashboardOverview({
  courses,
  isLoadingCourses,
  coursesMessage,
  onOpenCourses,
}: StudentDashboardOverviewProps) {
  const featuredCourse = courses[0] ?? null;
  const featuredThumbnailUrl = getCourseMediaPublicUrl(featuredCourse?.thumbnail_path ?? null);
  const highlightTitle =
    courses.length > 0 ? "Discover published courses" : "Waiting for the next release";
  const highlightDescription =
    courses.length > 0
      ? "Teachers have already published courses that are visible to every student on the platform."
      : "Once a teacher publishes a public course, it will appear here and in the platform course catalog.";
  const highlightButtonLabel = courses.length > 0 ? "Open catalog" : "Browse courses";
  const latestPublishedLabel = featuredCourse
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(featuredCourse.updated_at))
    : null;

  return (
    <div className="space-y-6">
      <section
        className="overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_24px_60px_rgba(23,51,143,0.24)] md:p-8"
        style={{
          background:
            "linear-gradient(135deg, #17338f 0%, #2f5fcd 48%, #63b2ff 100%)",
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              {highlightTitle}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/82 md:text-base">
              {highlightDescription}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={onOpenCourses}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#17338f] hover:bg-slate-100"
              >
                <span
                  className="inline-flex items-center gap-2"
                  style={{ color: "#17338f" }}
                >
                  {highlightButtonLabel}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
              <div className="rounded-2xl bg-white/12 px-4 py-3 text-sm leading-6 text-white/82 backdrop-blur-sm">
                {isLoadingCourses
                  ? "Refreshing the student catalog."
                  : `${courses.length} published ${courses.length === 1 ? "course" : "courses"} available now.`}
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/18 bg-white/12 p-5 backdrop-blur-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/16 p-3">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Student catalog</p>
                  <p className="text-xs text-white/70">Live published courses</p>
                </div>
              </div>
              <div className="grid gap-3 text-sm text-white/82">
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  {courses.length} public {courses.length === 1 ? "course" : "courses"}
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  {featuredCourse ? `Latest: ${featuredCourse.title}` : "No latest release yet"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="rounded-[1.75rem] border-cyan-100 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)] md:p-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-[#14213d]">
            Latest release
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            The newest published course appears here as soon as it becomes visible to students.
          </p>
        </div>

        {coursesMessage ? (
          <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <p className="text-sm font-medium">{coursesMessage}</p>
          </div>
        ) : isLoadingCourses ? (
          <div className="mt-6">
            <LoadingState variant="card" className="min-h-[12rem]" />
          </div>
        ) : featuredCourse ? (
          <div className="mt-6 flex flex-col gap-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 md:flex-row md:items-start md:p-5">
            <div className="overflow-hidden rounded-[1.25rem] bg-slate-200 md:w-[272px] md:flex-shrink-0">
              {featuredThumbnailUrl ? (
                <img
                  src={featuredThumbnailUrl}
                  alt={featuredCourse.title}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 items-center justify-center bg-[linear-gradient(135deg,#14213d_0%,#17338f_100%)] text-white">
                  <BookOpen className="h-10 w-10" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                    Published
                  </span>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
                    Public access
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tight text-[#14213d]">
                    {featuredCourse.title}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600">
                    {featuredCourse.description?.trim() ||
                      "This course is already visible to students across the platform."}
                  </p>
                  <p className="inline-flex items-center gap-2 text-sm leading-7 text-slate-600">
                    <GraduationCap className="h-4 w-4" />
                    {featuredCourse.teacher_name}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
                    {featuredCourse.module_count} modules
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
                    {featuredCourse.lesson_count} lessons
                  </span>
                  {latestPublishedLabel ? (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
                      Updated {latestPublishedLabel}
                    </span>
                  ) : null}
                </div>

                <Button
                  type="button"
                  onClick={onOpenCourses}
                  className="rounded-2xl bg-[#14213d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0f1a30]"
                >
                  <span className="inline-flex items-center gap-2">
                    Open catalog
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-sm leading-7 text-slate-600">
              No published public courses are visible to students yet.
            </p>
          </div>
        )}
      </Card>

      <Card className="rounded-[1.75rem] border-cyan-100 p-0 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-6 py-6 md:px-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-[#14213d]">
              Available now
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              Browse the published courses that are currently visible to every student.
            </p>
          </div>
        </div>

        <div className="snap-x snap-mandatory overflow-x-auto px-6 py-6 pb-7 [scrollbar-width:thin] md:px-8">
          <div className="grid min-w-full grid-flow-col auto-cols-[88%] gap-4 md:auto-cols-[calc((100%-1rem)/2.15)] xl:auto-cols-[calc((100%-2rem)/3.2)]">
            {isLoadingCourses ? (
              <LoadingState variant="card" className="min-h-[16rem]" />
            ) : courses.length === 0 ? (
              <div className="flex min-h-[16rem] items-center rounded-[1.5rem] border border-slate-200 bg-white px-6 text-sm leading-7 text-slate-600">
                Published courses will appear here once teachers make them public.
              </div>
            ) : (
              courses.map((course) => {
                const thumbnailUrl = getCourseMediaPublicUrl(course.thumbnail_path);

                return (
                  <article
                    key={course.id}
                    className="snap-start overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.06)]"
                  >
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={course.title}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center bg-[linear-gradient(135deg,#14213d_0%,#17338f_100%)] text-white">
                        <BookOpen className="h-10 w-10" />
                      </div>
                    )}

                    <div className="space-y-4 p-5">
                      <div className="space-y-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
                          <Sparkles className="h-4 w-4" />
                          Published
                        </span>
                        <h3 className="text-2xl font-black tracking-tight text-[#14213d]">
                          {course.title}
                        </h3>
                        <p className="inline-flex items-center gap-2 text-sm leading-7 text-slate-600">
                          <GraduationCap className="h-4 w-4" />
                          {course.teacher_name}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm leading-7 text-slate-600">
                          {course.description?.trim() ||
                            "Published and ready for students on the platform."}
                        </p>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            <Layers3 className="h-4 w-4" />
                            {course.module_count} modules
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            <BookOpen className="h-4 w-4" />
                            {course.lesson_count} lessons
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border-cyan-100 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)] md:p-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-[#14213d]">
            Messages
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            Recent updates from your teachers and from the platform.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {studentDashboardMessages.map((message) => (
            <article
              key={message.id}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-cyan-200 hover:bg-cyan-50/40"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-4">
                  <div className="rounded-2xl bg-[#14213d] p-3 text-white">
                    <MessageSquareText className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black tracking-tight text-[#14213d]">
                        {message.subject}
                      </h3>
                      {message.unread ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm leading-7 text-slate-600">
                      {message.sender}
                    </p>
                    <p className="text-sm leading-7 text-slate-600">
                      {message.preview}
                    </p>
                  </div>
                </div>

                <p className="shrink-0 text-sm leading-7 text-slate-500">
                  {message.sentAt}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
