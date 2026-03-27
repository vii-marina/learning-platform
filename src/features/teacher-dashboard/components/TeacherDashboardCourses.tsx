import { BookOpen, FileText, FileVideo, Layers3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../../components/ui/Card";
import {
  listCourses,
  listModulesByCourse,
  type Course,
} from "../../courses/api";
import {
  getCourseMediaKind,
  getCourseMediaPublicUrl,
} from "../../courses/api/courseMediaStorage";
import { getErrorMessage } from "../../auth/api/backendClient";

type TeacherDashboardCoursesProps = {
  teacherId: string | null;
  onContinueCourse: (courseId: string) => void;
};

type TeacherCourseSummary = Course & {
  moduleCount: number;
};

function isPublishedCourse(course: TeacherCourseSummary) {
  return course.status === "published" || course.is_published;
}

function isArchivedCourse(course: TeacherCourseSummary) {
  return course.status === "archived";
}

function formatCourseDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function TeacherCourseThumbnail({
  title,
  thumbnailPath,
}: {
  title: string;
  thumbnailPath: string | null;
}) {
  const thumbnailUrl = getCourseMediaPublicUrl(thumbnailPath);
  const thumbnailKind = getCourseMediaKind(thumbnailPath);
  const Icon =
    thumbnailKind === "video"
      ? FileVideo
      : thumbnailKind === "file"
        ? FileText
        : BookOpen;

  return (
    <div className="aspect-[16/10] overflow-hidden bg-slate-100">
      {thumbnailUrl && thumbnailKind === "image" ? (
        <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#0f172a_0%,#14213d_55%,#13daec_130%)] text-white">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-white/12 p-4">
              <Icon className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-white/80">
              {thumbnailKind === "video" ? "Video thumbnail" : "Course preview"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherCourseStatusBadge({ course }: { course: TeacherCourseSummary }) {
  if (isArchivedCourse(course)) {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
        Archived
      </span>
    );
  }

  if (isPublishedCourse(course)) {
    return (
      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Published
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      Draft
    </span>
  );
}

function TeacherCourseCard({
  course,
  onContinueCourse,
}: {
  course: TeacherCourseSummary;
  onContinueCourse: (courseId: string) => void;
}) {
  const courseDescription = course.description?.trim()
    ? course.description
    : isPublishedCourse(course)
      ? "This course is already created and available in your teaching workspace."
      : "This draft is not finished yet. Continue building the course structure and content.";
  const isDraftCourse = !isPublishedCourse(course) && !isArchivedCourse(course);
  const cardClassName =
    "group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-left shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition";

  const cardContent = (
    <>
      <div className="flex h-full flex-col transition duration-200 group-hover:opacity-45">
        <TeacherCourseThumbnail title={course.title} thumbnailPath={course.thumbnail_path} />

        <div className="flex min-h-[15rem] flex-1 flex-col px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <TeacherCourseStatusBadge course={course} />
            <span className="text-xs font-medium text-slate-400">
              Updated {formatCourseDate(course.updated_at)}
            </span>
          </div>

          <div className="flex flex-1 flex-col">
            <h3 className="mt-3 line-clamp-2 min-h-[3.5rem] text-xl font-black leading-tight tracking-tight text-[#14213d]">
              {course.title}
            </h3>

            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
              {courseDescription}
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <Layers3 className="h-4 w-4" />
              Modules
            </span>
            <span className="text-sm font-bold text-[#14213d]">{course.moduleCount}</span>
          </div>
        </div>
      </div>

      {isDraftCourse ? (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] bg-white/0 transition duration-200 group-hover:bg-white/18" />
          <div className="pointer-events-none absolute inset-x-5 bottom-5 z-10 translate-y-3 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="inline-flex h-11 w-full items-center justify-center rounded-[1rem] bg-[#13daec] px-4 text-sm font-semibold text-[#0f172a] shadow-[0_14px_26px_rgba(15,23,42,0.16)]">
              Continue creating course
            </div>
          </div>
        </>
      ) : null}
    </>
  );

  if (isDraftCourse) {
    return (
      <button
        type="button"
        onClick={() => onContinueCourse(course.id)}
        className={`${cardClassName} cursor-pointer hover:-translate-y-[2px] hover:border-cyan-200 hover:shadow-[0_22px_46px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#13daec]/18`}
      >
        {cardContent}
      </button>
    );
  }

  return <article className={cardClassName}>{cardContent}</article>;
}

function TeacherCourseCatalog({
  title,
  courses,
  countToneClassName,
  onContinueCourse,
}: {
  title: string;
  courses: TeacherCourseSummary[];
  countToneClassName: string;
  onContinueCourse: (courseId: string) => void;
}) {
  return (
    <section className="scroll-mt-6">
      <Card className="rounded-[1.5rem] border-cyan-100 p-0 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black tracking-tight text-[#14213d]">
              {title}
            </h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${countToneClassName}`}>
              {courses.length}
            </span>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <TeacherCourseCard
              key={course.id}
              course={course}
              onContinueCourse={onContinueCourse}
            />
          ))}
        </div>
      </Card>
    </section>
  );
}

export function TeacherDashboardCourses({
  teacherId,
  onContinueCourse,
}: TeacherDashboardCoursesProps) {
  const [courses, setCourses] = useState<TeacherCourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function hydrateCourses() {
      if (!teacherId) {
        if (isMounted) {
          setCourses([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextCourses = await listCourses(teacherId);
        const moduleCounts = await Promise.all(
          nextCourses.map(async (course) => ({
            courseId: course.id,
            moduleCount: (await listModulesByCourse(course.id)).length,
          }))
        );
        const moduleCountByCourseId = Object.fromEntries(
          moduleCounts.map(({ courseId, moduleCount }) => [courseId, moduleCount])
        );

        if (!isMounted) {
          return;
        }

        setCourses(
          nextCourses.map((course) => ({
            ...course,
            moduleCount: moduleCountByCourseId[course.id] ?? 0,
          }))
        );
        setMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(getErrorMessage(error, "Unable to load your courses."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateCourses();

    return () => {
      isMounted = false;
    };
  }, [teacherId]);

  const publishedCourses = useMemo(
    () =>
      courses.filter((course) => isPublishedCourse(course) && !isArchivedCourse(course)),
    [courses]
  );
  const draftCourses = useMemo(
    () =>
      courses.filter((course) => !isPublishedCourse(course) && !isArchivedCourse(course)),
    [courses]
  );
  const archivedCourses = useMemo(
    () => courses.filter((course) => isArchivedCourse(course)),
    [courses]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 px-1 py-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#14213d]">
            My Courses
          </h1>
        </div>
        <div className="rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800">
          Total courses: {courses.length}
        </div>
      </div>

      {message ? (
        <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          Loading courses...
        </Card>
      ) : courses.length === 0 ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          No courses found yet.
        </Card>
      ) : (
        <div className="space-y-5">
          {draftCourses.length > 0 ? (
            <TeacherCourseCatalog
              title="Draft Courses"
              courses={draftCourses}
              countToneClassName="bg-amber-50 text-amber-700"
              onContinueCourse={onContinueCourse}
            />
          ) : null}
          {publishedCourses.length > 0 ? (
            <TeacherCourseCatalog
              title="Published Courses"
              courses={publishedCourses}
              countToneClassName="bg-emerald-50 text-emerald-700"
              onContinueCourse={onContinueCourse}
            />
          ) : null}
          {archivedCourses.length > 0 ? (
            <TeacherCourseCatalog
              title="Archived Courses"
              courses={archivedCourses}
              countToneClassName="bg-slate-100 text-slate-700"
              onContinueCourse={onContinueCourse}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
