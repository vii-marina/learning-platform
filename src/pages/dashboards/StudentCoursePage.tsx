import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  completeStudentExercise,
  completeStudentLesson,
  completeStudentTest,
  loadStudentCourse,
  type StudentCourseDetailsResponse,
} from "../../features/student-dashboard/api/studentDashboardApi";
import { getErrorMessage } from "../../features/auth/api/backendClient";
import type { Exercise } from "../../features/courses/api";
import { getCourseMediaPublicUrl } from "../../features/courses/api/courseMediaStorage";
import { CoursePreviewPage } from "../../features/courses/components/course-builder/components/CoursePreviewPage";
import { mapQuestionToCourseTestQuestion } from "../../features/courses/components/course-builder/lib/courseBuilderPageUtils";
import type {
  CourseExercise,
  CourseTest,
} from "../../features/courses/components/course-builder/types/courseBuilderUiTypes";

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

function mapStudentCourseData(courseData: StudentCourseDetailsResponse) {
  return {
    testsByModule: Object.fromEntries(
      Object.entries(courseData.tests_by_module).map(([moduleId, tests]) => [
        moduleId,
        tests.map((test): CourseTest => ({
          id: test.id,
          title: test.title,
          afterLessonId: test.after_lesson_id,
          order: test.order,
          questions: test.questions.map((question) =>
            mapQuestionToCourseTestQuestion(question, question.answers)
          ),
        })),
      ])
    ) as Record<string, CourseTest[]>,
    exercisesByModule: Object.fromEntries(
      Object.entries(courseData.exercises_by_module).map(([moduleId, exercises]) => [
        moduleId,
        exercises.map(mapExerciseToCourseExercise),
      ])
    ) as Record<string, CourseExercise[]>,
  };
}

export function StudentCoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [courseData, setCourseData] = useState<StudentCourseDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setMessage("Не вказано ідентифікатор курсу.");
      setIsLoading(false);
      return;
    }

    const resolvedCourseId = courseId;
    let isMounted = true;

    async function loadCourse() {
      try {
        setIsLoading(true);
        setMessage(null);
        const loadedCourse = await loadStudentCourse(resolvedCourseId);

        if (isMounted) {
          setCourseData(loadedCourse);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(getErrorMessage(error, "Не вдалося завантажити цей курс."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCourse();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const previewData = useMemo(
    () => (courseData ? mapStudentCourseData(courseData) : null),
    [courseData]
  );
  const completedLessonIds = useMemo(
    () => courseData?.completed_lesson_ids ?? [],
    [courseData?.completed_lesson_ids]
  );
  const completedExerciseIds = useMemo(
    () => courseData?.completed_exercise_ids ?? [],
    [courseData?.completed_exercise_ids]
  );

  async function handleCompleteLesson(lessonId: string) {
    if (!courseId) {
      return completedLessonIds;
    }

    try {
      setMessage(null);
      const result = await completeStudentLesson(courseId, lessonId);
      setCourseData((currentCourseData) =>
        currentCourseData
          ? {
              ...currentCourseData,
              course: result.course,
              completed_lesson_ids: result.completed_lesson_ids,
            }
          : currentCourseData
      );

      return result.completed_lesson_ids;
    } catch (error) {
      setMessage(getErrorMessage(error, "Не вдалося завершити цей урок."));
      return completedLessonIds;
    }
  }

  async function handleCompleteTest(testId: string, scorePercent: number) {
    if (!courseId) {
      return;
    }

    try {
      setMessage(null);
      await completeStudentTest(courseId, testId, scorePercent);
    } catch (error) {
      setMessage(getErrorMessage(error, "Не вдалося зберегти результат тесту."));
    }
  }

  async function handleCompleteExercise(exerciseId: string) {
    if (!courseId) {
      return completedExerciseIds;
    }

    try {
      setMessage(null);
      const result = await completeStudentExercise(courseId, exerciseId);
      setCourseData((currentCourseData) =>
        currentCourseData
          ? {
              ...currentCourseData,
              course: result.course,
              completed_exercise_ids: result.completed_exercise_ids,
            }
          : currentCourseData
      );

      return result.completed_exercise_ids;
    } catch (error) {
      setMessage(getErrorMessage(error, "Не вдалося зберегти результат вправи."));
      return completedExerciseIds;
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-4 py-4 text-slate-900 md:px-8">
      <div className="mx-auto max-w-[1540px] space-y-4">
        <header className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/student/dashboard")}
            className="justify-self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            Мої курси
          </Button>

          {courseData ? (
            <h1 className="min-w-0 truncate text-center text-2xl font-extrabold tracking-tight text-[#1f1b4d]">
              {courseData.course.title}
            </h1>
          ) : (
            <div />
          )}

          {courseData ? (
            <p className="justify-self-end text-sm font-bold text-[#6d6a9f]">
              {courseData.course.progress_percent}% завершено
            </p>
          ) : null}
        </header>

        {message ? (
          <Card className="rounded-[1.5rem] border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-none">
            <p className="text-sm font-medium">{message}</p>
          </Card>
        ) : null}

        {isLoading ? (
          <LoadingState variant="page" />
        ) : courseData && previewData ? (
          <CoursePreviewPage
            courseId={courseData.course.id}
            courseTitle={courseData.course.title}
            courseDescription={courseData.course.description}
            courseThumbnailPath={courseData.course.thumbnail_path}
            courseThumbnailUrl={getCourseMediaPublicUrl(courseData.course.thumbnail_path)}
            modules={courseData.modules}
            lessonsByModule={courseData.lessons_by_module}
            testsByModule={previewData.testsByModule}
            exercisesByModule={previewData.exercisesByModule}
            initialCompletedLessonIds={completedLessonIds}
            initialCompletedExerciseIds={completedExerciseIds}
            onCompleteLesson={handleCompleteLesson}
            onCompleteExercise={handleCompleteExercise}
            onCompleteTest={handleCompleteTest}
            showCourseOverviewActions={false}
          />
        ) : null}
      </div>
    </div>
  );
}
