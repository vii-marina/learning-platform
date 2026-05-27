import { useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, EyeOff, Play } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";
import { StudentDashboardCourseQuickViewModal } from "./StudentDashboardCourseQuickViewModal";
import {
  buildStudentDashboardCatalogCards,
  type StudentDashboardCatalogCard,
} from "./studentDashboardViewModels";
import { StudentDashboardCourseCard } from "./StudentDashboardCourseCard";

type StudentDashboardOverviewProps = {
  courses: StudentDashboardCourseCatalogItem[];
  isLoadingCourses: boolean;
  coursesMessage: string | null;
  availableCourses: StudentDashboardCourseCatalogItem[];
  isLoadingAvailableCourses: boolean;
  availableCoursesMessage: string | null;
  onOpenCourses: () => void;
  onStartCourse: (course: StudentDashboardCourseCatalogItem) => void;
  onContinueCourse: (courseId: string) => void;
  startingCourseId: string | null;
};

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

function ContinueLearningCard({
  course,
  actionLabel = "Продовжити",
  onContinueCourse,
}: {
  course: StudentDashboardCatalogCard;
  actionLabel?: string;
  onContinueCourse: (courseId: string) => void;
}) {
  const progress = Math.min(100, Math.max(0, course.progressPercent));
  const progressDegrees = Math.round((progress / 100) * 360);

  return (
    <article className="flex items-center gap-5 rounded-[1.25rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#4f46e5 ${progressDegrees}deg, #e8e5fb ${progressDegrees}deg)`,
        }}
      >
        <div className="h-12 w-12 rounded-full bg-white" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-[#18153d]">
          {course.title}
        </h3>
        <p className="mt-1 text-sm font-semibold text-[#6f6aa0]">
          {progress}% завершено
        </p>
        <p className="mt-1 truncate text-sm text-[#6f6aa0]">
          {course.teacherName}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onContinueCourse(course.id)}
        aria-label={`${actionLabel} курс ${course.title}`}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#4f46e5] text-white transition hover:bg-[#4338ca]"
      >
        <Play className="h-5 w-5" />
      </button>
    </article>
  );
}

export function StudentDashboardOverview({
  courses,
  isLoadingCourses,
  coursesMessage,
  availableCourses,
  isLoadingAvailableCourses,
  availableCoursesMessage,
  onOpenCourses,
  onStartCourse,
  onContinueCourse,
  startingCourseId,
}: StudentDashboardOverviewProps) {
  const [selectedCourse, setSelectedCourse] =
    useState<StudentDashboardCatalogCard | null>(null);
  const catalogCards = buildStudentDashboardCatalogCards(courses);
  const availableCatalogCards = buildStudentDashboardCatalogCards(availableCourses);
  const enrolledCourseIds = new Set(courses.map((course) => course.id));
  const availablePreviewCourses = availableCatalogCards.filter(
    (course) => !enrolledCourseIds.has(course.id)
  );
  const inProgressCourses = catalogCards.filter(
    (course) => (course.isStarted || course.progressPercent > 0) && !course.isCompleted
  );
  const completedCourses = catalogCards.filter((course) => course.isCompleted);
  const completedCoursesCount = courses.filter(
    (course) => course.finished_at !== null || course.progress_percent >= 100
  ).length;
  const unseenCoursesCount = courses.filter(
    (course) =>
      course.started_at === null &&
      course.progress_percent <= 0 &&
      course.finished_at === null
  ).length;
  const stats = [
    {
      label: "Мої курси",
      description: "Курси, на які ви записані",
      value: courses.length,
      icon: BookOpen,
      className: "bg-violet-100 text-violet-700",
    },
    {
      label: "Ще не відкривали",
      description: "Очікують першого перегляду",
      value: unseenCoursesCount,
      icon: EyeOff,
      className: "bg-amber-100 text-amber-700",
    },
    {
      label: "Завершені",
      description: "Курси з прогресом 100%",
      value: completedCoursesCount,
      icon: CheckCircle2,
      className: "bg-emerald-100 text-emerald-700",
    }
  ];

  return (
    <>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Card
                key={stat.label}
                className="rounded-[1.25rem] border-slate-200 bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.className}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                      <span className="text-xl font-semibold text-slate-950">{stat.value}</span>
                      <span className="text-base font-semibold text-slate-700">
                        {stat.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {stat.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        {coursesMessage ? (
          <Card className="rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-none">
            <p className="text-sm font-medium">{coursesMessage}</p>
          </Card>
        ) : null}

        {inProgressCourses.length > 0 ? (
        <section className="py-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Продовжити навчання
              </h2>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onOpenCourses}
              className="text-[#4f46e5] hover:bg-violet-50 hover:text-[#4338ca]"
            >
              Переглянути всі
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-6">
            {isLoadingCourses && courses.length === 0 ? (
              <LoadingState variant="section" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {inProgressCourses.map((course) => (
                  <ContinueLearningCard
                    key={course.id}
                    course={course}
                    onContinueCourse={onContinueCourse}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
        ) : null}

        

        <section className="py-2">
          <div className="flex items-end gap-4">
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                Усі опубліковані курси
              </h2>
          </div>

          <div className="mt-6">
            {availableCoursesMessage ? (
              <Card className="mb-5 rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-none">
                <p className="text-sm font-medium">{availableCoursesMessage}</p>
              </Card>
            ) : null}

            {isLoadingAvailableCourses ? (
              <LoadingState variant="section" />
            ) : availablePreviewCourses.length === 0 ? (
              <EmptyState
                title="Публічних курсів поки немає"
                description="Курси зʼявляться тут після того, як викладачі їх опублікують."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {availablePreviewCourses.map((course) => (
                  <StudentDashboardCourseCard
                    key={course.id}
                    course={course}
                    actionLabel="Почати курс"
                    actionVariant="accent"
                    isActionLoading={startingCourseId === course.id}
                    onQuickView={setSelectedCourse}
                    onAction={() => onStartCourse(course.rawCourse)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      {completedCourses.length > 0 ? (
                <section className="py-2">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      Пройдені курси
                    </h2>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {completedCourses.map((course) => (
                      <ContinueLearningCard
                        key={course.id}
                        course={course}
                        actionLabel="Переглянути"
                        onContinueCourse={onContinueCourse}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
      <StudentDashboardCourseQuickViewModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        onStartCourse={onStartCourse}
        onContinueCourse={onContinueCourse}
        isPrimaryActionLoading={selectedCourse?.id === startingCourseId}
      />
    </>
  );
}
