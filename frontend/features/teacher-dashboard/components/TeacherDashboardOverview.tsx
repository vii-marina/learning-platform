import { BookOpen, CheckCircle2, Plus, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Button } from "../../../components/ui/button";
import { getCourseMediaPublicUrl } from "../../courses/api/courseMediaStorage";
import { getErrorMessage } from "../../auth/api/backendClient";
import {
  listTeacherDashboardCourses,
  listTeacherDashboardStudents,
  type TeacherDashboardStudentsSummary,
} from "../api/teacherDashboardApi";
import type { TeacherCourseSummary } from "./teacherCourseDashboard.types";
import {
  isPublishedCourse,
  sortCoursesByRecent,
} from "./teacherCourseDashboard.utils";

type TeacherDashboardOverviewProps = {
  teacherId: string | null;
  onOpenCourseBuilder: () => void;
  onContinueCourse: (courseId: string) => void;
};

function ProgressBar({ value }: { value: number }) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-[#13daec]"
        style={{ width: `${normalizedValue}%` }}
      />
    </div>
  );
}

function StudentAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "С";

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#13daec]/20 text-xs font-bold text-cyan-800">
      {initials}
    </div>
  );
}

function getStudentName(fullName: string | null, email: string) {
  return fullName?.trim() || email;
}

export function TeacherDashboardOverview({
  teacherId,
  onOpenCourseBuilder,
  onContinueCourse,
}: TeacherDashboardOverviewProps) {
  const [courses, setCourses] = useState<TeacherCourseSummary[]>([]);
  const [studentsSummary, setStudentsSummary] =
    useState<TeacherDashboardStudentsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateOverview() {
      if (!teacherId) {
        if (isMounted) {
          setCourses([]);
          setStudentsSummary(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const [nextCourses, nextStudentsSummary] = await Promise.all([
          listTeacherDashboardCourses(),
          listTeacherDashboardStudents(),
        ]);

        if (!isMounted) {
          return;
        }

        setCourses(nextCourses.sort(sortCoursesByRecent));
        setStudentsSummary(nextStudentsSummary);
        setMessage(null);
      } catch (error) {
        if (isMounted) {
          setMessage(getErrorMessage(error, "Не вдалося завантажити огляд викладача."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateOverview();

    return () => {
      isMounted = false;
    };
  }, [teacherId]);

  const publishedCourses = useMemo(
    () => courses.filter((course) => isPublishedCourse(course)),
    [courses]
  );
  const averageProgress = useMemo(() => {
    const courseProgressValues = studentsSummary?.courses.map(
      (course) => course.average_progress_percent
    ) ?? [];

    if (courseProgressValues.length === 0) {
      return 0;
    }

    return Math.round(
      courseProgressValues.reduce((sum, progress) => sum + progress, 0) /
        courseProgressValues.length
    );
  }, [studentsSummary?.courses]);

  // `hint` turns a tile into a hover/focus target that reveals the detail which does not fit on the
  // tile itself. Only the progress tile uses it, but any tile can.
  const stats: Array<{
    label: string;
    value: string | number;
    icon: LucideIcon;
    className: string;
    hint?: { value: string; description: string };
  }> = [
    {
      label: "Опублікованих курсів",
      value: publishedCourses.length,
      icon: BookOpen,
      className: "bg-violet-100 text-violet-700",
    },
    {
      label: "Активних студентів",
      value: studentsSummary?.total_students_count ?? 0,
      icon: Users,
      className: "bg-cyan-100 text-cyan-700",
    },
    {
      label: "Завершень курсів",
      value: studentsSummary?.completed_course_views_count ?? 0,
      icon: CheckCircle2,
      className: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Загальний прогрес",
      value: `${averageProgress}%`,
      icon: TrendingUp,
      className: "bg-orange-100 text-orange-700",
      hint: {
        value: `${studentsSummary?.total_course_views_count ?? 0} проходжень`,
        description: "Середній прогрес серед курсів, які вже проходять студенти.",
      },
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
            Головна
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Короткий стан курсів, студентів і прогресу навчання.
          </p>
        </div>

        <Button type="button" size="lg" onClick={onOpenCourseBuilder}>
          <Plus className="h-4 w-4" />
          <span>Новий курс</span>
        </Button>
      </section>

      {message ? (
        <Card className="rounded-[1.5rem] border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <LoadingState variant="section" />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <Card
                  key={stat.label}
                  tabIndex={stat.hint ? 0 : undefined}
                  className={`group relative rounded-[1.25rem] border-slate-200 bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)] ${
                    stat.hint
                      ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.className}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-slate-950">{stat.value}</p>
                      <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                    </div>
                  </div>

                  {stat.hint ? (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-60 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
                    >
                      <p className="text-sm font-semibold text-slate-950">{stat.hint.value}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {stat.hint.description}
                      </p>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </section>

          <section>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Опубліковані курси
              </h2>

              {publishedCourses.length === 0 ? (
                <Card className="rounded-xl border-dashed border-slate-200 bg-white p-6 shadow-none">
                  <p className="text-sm text-slate-500">
                    Опублікуйте курс, щоб бачити тут студентів і прогрес.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {publishedCourses.map((course) => {
                    const thumbnailUrl = getCourseMediaPublicUrl(course.thumbnail_path);
                    const courseProgress = studentsSummary?.courses.find(
                      (item) => item.id === course.id
                    );
                    const students = courseProgress?.students.slice(0, 4) ?? [];

                    return (
                      <article
                        key={course.id}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => onContinueCourse(course.id)}
                          className="block w-full text-left"
                        >
                          <div className="aspect-video bg-slate-100">
                            {thumbnailUrl ? (
                              <img
                                src={thumbnailUrl}
                                alt={course.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-950 text-white">
                                <BookOpen className="h-9 w-9" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-4 p-4">
                            <div>
                              <h3 className="line-clamp-2 text-base font-semibold text-slate-950">
                                {course.title}
                              </h3>
                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {course.modulesCount} модулів · {course.lessonsCount} уроків
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                <span>Середній прогрес</span>
                                <span>{courseProgress?.average_progress_percent ?? 0}%</span>
                              </div>
                              <ProgressBar value={courseProgress?.average_progress_percent ?? 0} />
                            </div>
                          </div>
                        </button>

                        <div className="border-t border-slate-100 px-4 py-3">
                          {students.length > 0 ? (
                            <div className="space-y-2">
                              {students.map((student) => {
                                const name = getStudentName(student.full_name, student.email);

                                return (
                                  <div key={student.id} className="flex items-center gap-2">
                                    <StudentAvatar name={name} />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-800">
                                        {name}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {student.progress_percent}% пройдено
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              Студенти ще не почали цей курс.
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
