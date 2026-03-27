import { ArrowRight, BookOpen, CheckCircle2, MessageSquareText, Sparkles } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import {
  studentDashboardCompletedCourses,
  studentDashboardCourseUpdate,
  studentDashboardMessages,
  studentDashboardOngoingCourses,
} from "../mock/studentDashboardMock";

const allStudentCourses = [
  ...studentDashboardOngoingCourses,
  ...studentDashboardCompletedCourses,
];

function CourseProgressBadge({
  status,
  progressLabel,
}: {
  status: "In progress" | "Completed";
  progressLabel: string;
}) {
  if (status === "Completed") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
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

type StudentDashboardOverviewProps = {
  onOpenCourses: () => void;
};

export function StudentDashboardOverview({
  onOpenCourses,
}: StudentDashboardOverviewProps) {
  const hasEnrolledCourses = allStudentCourses.length > 0;
  const highlightTitle = hasEnrolledCourses
    ? "Continue your learning"
    : "Start your learning";
  const highlightDescription = hasEnrolledCourses
    ? "Pick up where you left off and keep moving through your active courses."
    : "Browse available courses and start learning with newly released content.";
  const highlightButtonLabel = hasEnrolledCourses
    ? "Resume courses"
    : "Browse courses";

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
                {studentDashboardOngoingCourses.length} courses are currently in progress.
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/18 bg-white/12 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/16 p-3">
                <Sparkles className="h-5 w-5" />
              </div>
              
            </div>
          </div>
        </div>
      </section>

      <Card className="rounded-[1.75rem] border-cyan-100 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)] md:p-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-[#14213d]">
            Course updates
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            The latest release is available now and can be opened directly from
            your course catalog.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 md:flex-row md:items-start md:p-5">
          <div
            className="overflow-hidden rounded-[1.25rem] bg-slate-200 md:flex-shrink-0"
            style={{ width: "272px", maxWidth: "100%" }}
          >
            <img
              src={studentDashboardCourseUpdate.thumbnailUrl}
              alt={studentDashboardCourseUpdate.title}
              className="h-44 w-full object-cover"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  Free access
                </span>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
                  Newly added
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tight text-[#14213d]">
                  {studentDashboardCourseUpdate.title}
                </h3>
                <p className="text-sm leading-7 text-slate-600">
                  {studentDashboardCourseUpdate.description}
                </p>
                <p className="text-sm leading-7 text-slate-600">
                  {studentDashboardCourseUpdate.availability}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {studentDashboardCourseUpdate.details.map((detail) => (
                  <span
                    key={detail}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600"
                  >
                    {detail}
                  </span>
                ))}
              </div>

              <Button
                type="button"
                className="rounded-2xl bg-[#14213d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0f1a30]"
              >
                <span className="inline-flex items-center gap-2">
                  Explore course
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border-cyan-100 p-0 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-6 py-6 md:px-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-[#14213d]">
              Your courses
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              In-progress courses come first. Scroll to the right to see the
              courses you have already completed.
            </p>
          </div>
        </div>

        <div className="snap-x snap-mandatory overflow-x-auto px-6 py-6 pb-7 [scrollbar-width:thin] md:px-8">
          <div className="grid min-w-full grid-flow-col auto-cols-[88%] gap-4 md:auto-cols-[calc((100%-1rem)/2.15)] xl:auto-cols-[calc((100%-2rem)/3.2)]">
            {allStudentCourses.map((course) => (
              <article
                key={course.id}
                className="snap-start overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.06)]"
              >
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="h-48 w-full object-cover"
                />

                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <CourseProgressBadge
                      status={course.status}
                      progressLabel={course.progressLabel}
                    />
                    <h3 className="text-2xl font-black tracking-tight text-[#14213d]">
                      {course.title}
                    </h3>
                    <p className="text-sm leading-7 text-slate-600">
                      {course.instructor}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          course.status === "Completed"
                            ? "bg-emerald-500"
                            : "bg-[#17338f]"
                        }`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <p className="text-sm leading-7 text-slate-600">
                      {course.status === "Completed"
                        ? "You have completed this course."
                        : "Continue where you stopped."}
                    </p>
                  </div>
                </div>
              </article>
            ))}
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
