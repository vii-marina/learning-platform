import { Award, BookOpen, CheckCircle2, ClipboardCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { getErrorMessage } from "../../auth/api/backendClient";
import {
  listTeacherDashboardStudents,
  type TeacherDashboardStudentsSummary,
} from "../api/teacherDashboardApi";

type TeacherDashboardStudentsProps = {
  teacherId: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Немає активності";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Немає активності";
  }

  return new Intl.DateTimeFormat("uk", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStudentDisplayName(fullName: string | null, email: string) {
  return fullName?.trim() || email;
}

function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  className: string;
}) {
  return (
    <Card className="rounded-[1.25rem] border-slate-200 bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${className}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-semibold text-slate-950">{value}</p>
          <p className="text-xs font-medium text-slate-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

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

export function TeacherDashboardStudents({ teacherId }: TeacherDashboardStudentsProps) {
  const [summary, setSummary] = useState<TeacherDashboardStudentsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateStudents() {
      if (!teacherId) {
        if (isMounted) {
          setSummary(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const nextSummary = await listTeacherDashboardStudents();

        if (!isMounted) {
          return;
        }

        setSummary(nextSummary);
        setMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(getErrorMessage(error, "Не вдалося завантажити студентів."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateStudents();

    return () => {
      isMounted = false;
    };
  }, [teacherId]);

  const stats = useMemo(
    () => [
      {
        label: "Студентів",
        value: summary?.total_students_count ?? 0,
        icon: Users,
        className: "bg-cyan-100 text-cyan-700",
      },
      {
        label: "Переглядів курсів",
        value: summary?.total_course_views_count ?? 0,
        icon: BookOpen,
        className: "bg-violet-100 text-violet-700",
      },
      {
        label: "Завершень",
        value: summary?.completed_course_views_count ?? 0,
        icon: CheckCircle2,
        className: "bg-emerald-100 text-emerald-700",
      },
    ],
    [summary]
  );

  return (
    <div className="space-y-6">
      <section className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          Мої студенти
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          Студенти, які почали або відкрили ваші курси, з прогресом по уроках.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            className={stat.className}
          />
        ))}
      </section>

      {message ? (
        <Card className="rounded-[1.5rem] border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <LoadingState variant="section" />
      ) : !summary || summary.courses.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-200 bg-white p-8">
          <div className="flex max-w-xl flex-col gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Студентів поки немає
            </h2>
            <p className="text-sm leading-6 text-slate-500">
              Коли студенти почнуть ваші опубліковані курси, вони зʼявляться тут.
            </p>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          {summary.courses.map((course) => (
            <article
              key={course.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-4 border-b border-slate-200 bg-[#f8fafc] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                      {course.students_count} студентів
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                      {course.test_count} тестів
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                      {course.exercise_count} вправ
                    </span>
                  </div>
                  <h2 className="mt-3 truncate text-xl font-semibold tracking-tight text-slate-950">
                    {course.title}
                  </h2>
                </div>

                <div className="w-full max-w-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Середній прогрес</span>
                    <span>{course.average_progress_percent}%</span>
                  </div>
                  <ProgressBar value={course.average_progress_percent} />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {course.students.map((student) => {
                  const displayName = getStudentDisplayName(
                    student.full_name,
                    student.email
                  );

                  return (
                    <div
                      key={student.id}
                      className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {displayName}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {student.email}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span>
                            {student.completed_lessons_count}/
                            {student.total_lessons_count} уроків
                          </span>
                          <span>{student.progress_percent}%</span>
                        </div>
                        <ProgressBar value={student.progress_percent} />
                      </div>

                      <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-violet-500" />
                          <span>
                            Тести: {student.test_results_count}
                            {student.best_test_score !== null
                              ? `, кращий ${student.best_test_score}%`
                              : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-amber-500" />
                          <span>{formatDate(student.last_activity_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
