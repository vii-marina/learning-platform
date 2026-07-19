import { authorizedBackendRequest } from "../../auth/api/backendClient";
import { dedupeRequest } from "../../../lib/requestDedup";
import type {
  CourseAccessType,
  CourseStatus,
  Exercise,
  Lesson,
  LessonBlock,
  Module,
} from "../../courses/api";
import type { HydratedTestEntityResponse } from "../../courses/api/courseBuilderApi";

export type StudentDashboardCourseCatalogItem = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string | null;
  teacher_name: string;
  slug: string;
  thumbnail_path: string | null;
  access_type: CourseAccessType;
  status: CourseStatus;
  is_published: boolean;
  module_count: number;
  lesson_count: number;
  test_count: number;
  exercise_count: number;
  completed_tests_count: number;
  test_progress_percent: number;
  completed_exercises_count: number;
  exercise_progress_percent: number;
  completed_lessons_count: number;
  total_lessons_count: number;
  progress_percent: number;
  started_at: string | null;
  finished_at: string | null;
  teacher_headline: string | null;
  teacher_bio: string | null;
  teacher_specialization: string | null;
  teacher_experience_years: number | null;
  teacher_education: string | null;
  teacher_gender: string | null;
  teacher_birth_date: string | null;
  teacher_avatar_path: string | null;
  teacher_linkedin_url: string | null;
  teacher_github_url: string | null;
  created_at: string;
  updated_at: string;
};

type StudentDashboardCoursesResponse = {
  courses: StudentDashboardCourseCatalogItem[];
};

type StudentDashboardCourseResponse = {
  course: StudentDashboardCourseCatalogItem;
};

export type StudentCourseDetailsResponse = {
  course: StudentDashboardCourseCatalogItem;
  modules: Module[];
  lessons_by_module: Record<string, Lesson[]>;
  lesson_blocks_by_lesson: Record<string, LessonBlock[]>;
  tests_by_module: Record<string, HydratedTestEntityResponse[]>;
  exercises_by_module: Record<string, Exercise[]>;
  completed_lesson_ids: string[];
  completed_exercise_ids: string[];
};

export type StudentLessonCompletionResponse = {
  course: StudentDashboardCourseCatalogItem;
  completed_lesson_ids: string[];
};

export type StudentTestCompletionResponse = {
  test_result: {
    test_id: string;
    score: number;
    passed: boolean;
    updated_at: string;
  };
};

export type StudentExerciseCompletionResponse = {
  course: StudentDashboardCourseCatalogItem;
  completed_exercise_ids: string[];
};

export async function loadStudentDashboardCourses() {
  return dedupeRequest("student:dashboard:courses", async () => {
    const response = await authorizedBackendRequest<StudentDashboardCoursesResponse>(
      "/auth/student/dashboard/courses"
    );

    return response.courses;
  });
}

export async function loadStudentDashboardPublicCourses() {
  return dedupeRequest("student:dashboard:public-courses", async () => {
    const response = await authorizedBackendRequest<StudentDashboardCoursesResponse>(
      "/auth/student/dashboard/public-courses"
    );

    return response.courses;
  });
}

export async function startStudentCourse(courseId: string) {
  const response = await authorizedBackendRequest<StudentDashboardCourseResponse>(
    `/auth/student/courses/${courseId}/start`,
    {
      method: "POST",
    }
  );

  return response.course;
}

export async function loadStudentCourse(courseId: string) {
  return dedupeRequest(`student:course:${courseId}`, () =>
    authorizedBackendRequest<StudentCourseDetailsResponse>(
      `/auth/student/courses/${courseId}`
    )
  );
}

export async function completeStudentLesson(courseId: string, lessonId: string) {
  return authorizedBackendRequest<StudentLessonCompletionResponse>(
    `/auth/student/courses/${courseId}/lessons/${lessonId}/complete`,
    {
      method: "POST",
    }
  );
}

export async function completeStudentTest(
  courseId: string,
  testId: string,
  selectedAnswers: Record<string, number[]>
) {
  // Backend grades server-side from these selections; no client-computed score.
  return authorizedBackendRequest<StudentTestCompletionResponse>(
    `/auth/student/courses/${courseId}/tests/${testId}/complete`,
    {
      method: "POST",
      body: { answers: selectedAnswers },
    }
  );
}

export async function completeStudentExercise(courseId: string, exerciseId: string) {
  return authorizedBackendRequest<StudentExerciseCompletionResponse>(
    `/auth/student/courses/${courseId}/exercises/${exerciseId}/complete`,
    {
      method: "POST",
    }
  );
}
