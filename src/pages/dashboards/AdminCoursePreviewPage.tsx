import { ArrowLeft, BookOpen, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  loadAdminCourseDetailData,
  primeAdminCourseDetailCache,
} from "../../features/admin-dashboard/api/adminDashboardApi";
import {
  getAdminCourseAuthorName,
  mapAdminDashboardCourseToPreview,
} from "../../features/admin-dashboard/lib/adminCoursePreview";
import type {
  AdminDashboardCourse,
  AdminDashboardCourseSummary,
} from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";
import { listExercisesByModule, type Exercise } from "../../features/courses/api";
import { getCourseMediaPublicUrl } from "../../features/courses/api/courseMediaStorage";
import { CoursePreviewPage } from "../../features/courses/components/course-builder/components/CoursePreviewPage";
import type { CourseExercise } from "../../features/courses/components/course-builder/types/courseBuilderUiTypes";

type CoursePreviewLocationState = {
  course?: AdminDashboardCourseSummary;
};

function getStatusLabel(course: AdminDashboardCourseSummary) {
  if (course.status === "archived") {
    return "Archived";
  }

  if (course.status === "published" || course.is_published) {
    return "Published";
  }

  return "Draft";
}

function getStatusTone(course: AdminDashboardCourseSummary) {
  if (course.status === "archived") {
    return "bg-slate-900 text-white";
  }

  if (course.status === "published" || course.is_published) {
    return "bg-emerald-500 text-white";
  }

  return "bg-amber-100 text-amber-800";
}

function mapExerciseToCourseExercise(exercise: Exercise): CourseExercise {
  return {
    id: exercise.id,
    title: exercise.title,
    description: exercise.description,
    afterLessonId: exercise.after_lesson_id,
    type: exercise.type,
    content: exercise.content,
    createdAt: exercise.created_at,
    updatedAt: exercise.updated_at,
  };
}

export function AdminCoursePreviewPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const locationState = location.state as CoursePreviewLocationState | null;
  const stateCourse = locationState?.course ?? null;
  const initialCourseSummary = stateCourse && stateCourse.id === courseId ? stateCourse : null;

  const [course, setCourse] = useState<AdminDashboardCourse | null>(null);
  const [exercisesByModule, setExercisesByModule] = useState<Record<string, CourseExercise[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    if (!courseId) {
      return;
    }

    const resolvedCourseId = courseId;

    async function hydrateCourse() {
      try {
        const nextCourse = await loadAdminCourseDetailData(resolvedCourseId);

        if (!isMounted) {
          return;
        }

        primeAdminCourseDetailCache(nextCourse);
        setCourse(nextCourse);
        setMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(getErrorMessage(error, "Unable to load course preview."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateCourse();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const previewData = useMemo(
    () => (course ? mapAdminDashboardCourseToPreview(course) : null),
    [course]
  );

  useEffect(() => {
    let isMounted = true;

    if (!previewData) {
      setExercisesByModule({});
      setIsLoadingExercises(false);
      return;
    }

    const previewModules = previewData.modules;

    async function hydrateExercises() {
      try {
        setIsLoadingExercises(true);
        const resolvedExercises = await Promise.all(
          previewModules.map(async (module) => ({
            moduleId: module.id,
            exercises: await listExercisesByModule(module.id),
          }))
        );

        if (!isMounted) {
          return;
        }

        setExercisesByModule(
          Object.fromEntries(
            resolvedExercises.map(({ moduleId, exercises }) => [
              moduleId,
              exercises.map(mapExerciseToCourseExercise),
            ])
          ) as Record<string, CourseExercise[]>
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setExercisesByModule({});
        setMessage(getErrorMessage(error, "Some exercises could not be loaded."));
      } finally {
        if (isMounted) {
          setIsLoadingExercises(false);
        }
      }
    }

    void hydrateExercises();

    return () => {
      isMounted = false;
    };
  }, [previewData]);

  if (!courseId) {
    return <Navigate to="/admin/dashboard/courses" replace />;
  }

  const resolvedCourseSummary = course ?? initialCourseSummary;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          to="/admin/dashboard/courses"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#14213d] transition hover:text-[#08bfd4]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Courses</span>
        </Link>
        
      </div>

      {message ? (
        <Card className="rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {resolvedCourseSummary ? (
        <Card className="rounded-[1.75rem] border-cyan-100 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusTone(resolvedCourseSummary)}`}
            >
              {getStatusLabel(resolvedCourseSummary)}
            </span>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              <UserRound className="h-4 w-4 text-slate-400" />
              <span>{getAdminCourseAuthorName(resolvedCourseSummary)}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span>{resolvedCourseSummary.moduleCount} modules</span>
            </div>
          </div>

          <h1 className="mt-4 text-[2rem] font-black tracking-tight text-[#14213d]">
            {resolvedCourseSummary.title}
          </h1>
          {resolvedCourseSummary.description?.trim() ? (
            <p className="mt-2 max-w-4xl whitespace-pre-line break-words text-sm leading-6 text-slate-500">
              {resolvedCourseSummary.description}
            </p>
          ) : null}
        </Card>
      ) : null}

      {isLoading || isLoadingExercises ? (
        <LoadingState variant="card" className="rounded-[1.5rem] shadow-[0_18px_36px_rgba(15,23,42,0.06)]" />
      ) : !course || !previewData ? (
        <Card className="rounded-[1.5rem] border-cyan-100 p-8 text-sm text-slate-500 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
          Course not found.
        </Card>
      ) : (
        <CoursePreviewPage
          courseId={course.id}
          courseTitle={course.title}
          courseDescription={course.description}
          courseThumbnailPath={course.thumbnail_path}
          courseThumbnailUrl={getCourseMediaPublicUrl(course.thumbnail_path)}
          modules={previewData.modules}
          lessonsByModule={previewData.lessonsByModule}
          testsByModule={previewData.testsByModule}
          exercisesByModule={exercisesByModule}
        />
      )}
    </div>
  );
}
