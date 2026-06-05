import { BookOpen, CheckCircle2, Link as LinkIcon, Play, Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { getTeacherAvatarPublicUrl } from "../../teacher-dashboard/api/teacherProfileStorage";
import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";

type StudentDashboardTeachersProps = {
  courses: StudentDashboardCourseCatalogItem[];
  availableCourses: StudentDashboardCourseCatalogItem[];
  isLoading: boolean;
  message: string | null;
  onStartCourse: (course: StudentDashboardCourseCatalogItem) => void;
  onContinueCourse: (courseId: string) => void;
  startingCourseId: string | null;
};

type TeacherDirectoryItem = {
  id: string;
  name: string;
  headline: string | null;
  bio: string | null;
  specialization: string | null;
  experienceYears: number | null;
  education: string | null;
  gender: string | null;
  birthDate: string | null;
  avatarPath: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  courses: Array<{
    course: StudentDashboardCourseCatalogItem;
    isEnrolled: boolean;
  }>;
};

function normalizeText(value: string | null) {
  return value?.trim() || null;
}

function getTeacherInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "В"
  );
}

function formatBirthDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("uk", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildTeacherDirectory(
  courses: StudentDashboardCourseCatalogItem[],
  availableCourses: StudentDashboardCourseCatalogItem[]
) {
  const enrolledCourseIds = new Set(courses.map((course) => course.id));
  const courseById = new Map<string, StudentDashboardCourseCatalogItem>();

  for (const course of [...availableCourses, ...courses]) {
    courseById.set(course.id, course);
  }

  const teachersById = new Map<string, TeacherDirectoryItem>();

  for (const course of [...courseById.values()]) {
    const teacherId = course.teacher_id ?? `teacher:${course.teacher_name}`;
    const existingTeacher = teachersById.get(teacherId);

    if (existingTeacher) {
      existingTeacher.courses.push({
        course,
        isEnrolled: enrolledCourseIds.has(course.id),
      });
      continue;
    }

    teachersById.set(teacherId, {
      id: teacherId,
      name: course.teacher_name || "Викладач платформи",
      headline: normalizeText(course.teacher_headline),
      bio: normalizeText(course.teacher_bio),
      specialization: normalizeText(course.teacher_specialization),
      experienceYears: course.teacher_experience_years,
      education: normalizeText(course.teacher_education),
      gender: normalizeText(course.teacher_gender),
      birthDate: course.teacher_birth_date,
      avatarPath: course.teacher_avatar_path,
      linkedinUrl: normalizeText(course.teacher_linkedin_url),
      githubUrl: normalizeText(course.teacher_github_url),
      courses: [
        {
          course,
          isEnrolled: enrolledCourseIds.has(course.id),
        },
      ],
    });
  }

  return [...teachersById.values()]
    .map((teacher) => ({
      ...teacher,
      courses: teacher.courses.sort((left, right) => {
        if (left.isEnrolled !== right.isEnrolled) {
          return left.isEnrolled ? -1 : 1;
        }

        return right.course.updated_at.localeCompare(left.course.updated_at);
      }),
    }))
    .sort((left, right) => right.courses.length - left.courses.length);
}

function TeacherAvatar({ teacher }: { teacher: TeacherDirectoryItem }) {
  const avatarUrl = getTeacherAvatarPublicUrl(teacher.avatarPath);

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#13daec]/20 text-lg font-black text-cyan-800">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        getTeacherInitials(teacher.name)
      )}
    </div>
  );
}

function CourseStatusBadge({ isEnrolled }: { isEnrolled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        isEnrolled
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {isEnrolled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      {isEnrolled ? "Ви записані" : "Ще не записані"}
    </span>
  );
}

export function StudentDashboardTeachers({
  courses,
  availableCourses,
  isLoading,
  message,
  onStartCourse,
  onContinueCourse,
  startingCourseId,
}: StudentDashboardTeachersProps) {
  const teachers = buildTeacherDirectory(courses, availableCourses);

  return (
    <div className="space-y-6">
      <section className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          Мої викладачі
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-500">
          Викладачі з опублікованими курсами та ваш статус запису на їхні курси.
        </p>
      </section>

      {message ? (
        <Card className="rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <LoadingState variant="section" />
      ) : teachers.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-[0_24px_50px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl font-semibold text-slate-950">
            Викладачів з публічними курсами поки немає
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Вони зʼявляться тут після публікації курсів.
          </p>
        </section>
      ) : (
        <section className="space-y-5">
          {teachers.map((teacher) => {
            const birthDate = formatBirthDate(teacher.birthDate);
            const profileFacts = [
              teacher.specialization ? `Спеціалізація: ${teacher.specialization}` : null,
              teacher.experienceYears !== null
                ? `Досвід: ${teacher.experienceYears} років`
                : null,
              teacher.education ? `Освіта: ${teacher.education}` : null,
              teacher.gender ? `Стать: ${teacher.gender}` : null,
              birthDate ? `Дата народження: ${birthDate}` : null,
            ].filter((item): item is string => Boolean(item));

            return (
              <article
                key={teacher.id}
                className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.06)]"
              >
                <div className="grid gap-5 border-b border-slate-100 bg-[#f8fafc] p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="flex min-w-0 gap-4">
                    <TeacherAvatar teacher={teacher} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                          {teacher.name}
                        </h2>
                        <span className="rounded-full bg-[#13daec]/15 px-3 py-1 text-xs font-semibold text-cyan-800">
                          {teacher.courses.length} курсів
                        </span>
                      </div>

                      {teacher.headline ? (
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          {teacher.headline}
                        </p>
                      ) : null}

                      {teacher.bio ? (
                        <p className="mt-2 max-h-24 max-w-4xl overflow-y-auto pr-2 text-sm leading-6 text-slate-500">
                          {teacher.bio}
                        </p>
                      ) : null}

                      {profileFacts.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {profileFacts.map((fact) => (
                            <span
                              key={fact}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                              {fact}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {teacher.linkedinUrl || teacher.githubUrl ? (
                    <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                      {teacher.linkedinUrl ? (
                        <a
                          href={teacher.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700"
                        >
                          <LinkIcon className="h-4 w-4" />
                          LinkedIn
                        </a>
                      ) : null}
                      {teacher.githubUrl ? (
                        <a
                          href={teacher.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
                        >
                          <LinkIcon className="h-4 w-4" />
                          GitHub
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {teacher.courses.map(({ course, isEnrolled }) => (
                    <div
                      key={course.id}
                      className="flex min-h-[13rem] flex-col rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <CourseStatusBadge isEnrolled={isEnrolled} />
                        <span className="text-xs font-semibold text-slate-400">
                          {course.lesson_count} уроків
                        </span>
                      </div>

                      <h3 className="mt-3 line-clamp-2 text-base font-semibold text-slate-950">
                        {course.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                        {course.description?.trim() || "Опис курсу поки не додано."}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {course.module_count} модулів
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {course.test_count} тестів
                        </span>
                      </div>

                      <div className="mt-auto pt-4">
                        {isEnrolled ? (
                          <Button
                            type="button"
                            size="sm"
                            className="w-full bg-[#4f46e5] text-white hover:bg-[#4338ca]"
                            onClick={() => onContinueCourse(course.id)}
                          >
                            <Play className="h-4 w-4" />
                            Продовжити
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="accent"
                            className="w-full"
                            disabled={startingCourseId === course.id}
                            onClick={() => onStartCourse(course)}
                          >
                            <Plus className="h-4 w-4" />
                            {startingCourseId === course.id ? "Запис..." : "Почати курс"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
