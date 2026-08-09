/**
 * Folds the several rows that describe a student into the single record the admin UI renders.
 *
 * Enrollment is the interesting part: when real `course_progress` rows exist they win, and the
 * denormalised course lists kept on the profile are used only as a fallback for students who
 * predate that table being populated.
 */

import { groupByToMap as groupBy } from "../../lib/collections";
import {
  normalizeCourseList,
  pickArrayValue,
  pickStringValue,
  pickStudentAge,
} from "./profileFields";
import {
  listCompletedLessonProgress,
  listCourseProgressByStudentIds,
  listCoursesByIds,
  listLessonsByModuleIds,
  listModulesByCourseIds,
} from "./repository";
import type {
  AdminDashboardStudent,
  AdminStudentCourseEnrollment,
  StudentExtraProfileRow,
  StudentProfileRow,
} from "./types";

export function buildStudentRecord(
  profile: StudentProfileRow,
  extraProfile: StudentExtraProfileRow | null,
  courseTitlesById: Map<string, string>,
  enrollmentDetails: AdminStudentCourseEnrollment[] = []
): AdminDashboardStudent {
  const records = [extraProfile, profile];
  const enrolledCoursesFromProfile = normalizeCourseList(
    pickArrayValue(records, [
      "enrolled_course_titles",
      "enrolledCourseTitles",
      "enrolled_courses",
      "enrolledCourses",
      "active_courses",
      "activeCourses",
      "current_courses",
      "currentCourses",
      "course_titles",
      "courseTitles",
      "course_ids",
      "courseIds",
      "enrolled_course_ids",
      "enrolledCourseIds",
    ]),
    courseTitlesById
  );
  const completedCoursesFromProfile = normalizeCourseList(
    pickArrayValue(records, [
      "completed_course_titles",
      "completedCourseTitles",
      "completed_courses",
      "completedCourses",
      "finished_courses",
      "finishedCourses",
      "passed_courses",
      "passedCourses",
      "completed_course_ids",
      "completedCourseIds",
      "passed_course_ids",
      "passedCourseIds",
    ]),
    courseTitlesById
  );
  const enrolledCourses =
    enrollmentDetails.length > 0
      ? enrollmentDetails.map((course) => course.title)
      : enrolledCoursesFromProfile;
  const completedCourses =
    enrollmentDetails.length > 0
      ? enrollmentDetails
          .filter((course) => course.finishedAt !== null)
          .map((course) => course.title)
      : completedCoursesFromProfile;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: "student",
    isAdmin: false,
    isSuperAdmin: false,
    createdAt: profile.created_at,
    avatarPath: pickStringValue(records, ["avatar_path", "avatarPath"]),
    githubUrl: pickStringValue(records, ["github_url", "githubUrl"]),
    linkedinUrl: pickStringValue(records, ["linkedin_url", "linkedinUrl"]),
    educationPlace: pickStringValue(records, [
      "education_place",
      "educationPlace",
    ]),
    bio: pickStringValue(records, ["bio"]),
    birthDate: pickStringValue(records, ["birth_date", "birthDate"]),
    avatarUrl: pickStringValue(records, [
      "avatar_url",
      "avatarUrl",
      "photo_url",
      "photoUrl",
      "profile_image_url",
      "profileImageUrl",
      "image_url",
      "imageUrl",
      "avatar",
      "photo",
    ]),
    age: pickStudentAge(records),
    enrolledCourses,
    completedCourses,
    enrolledCourseDetails: enrollmentDetails,
  };
}

export async function buildEnrollmentDetailsByStudentId(studentIds: string[]) {
  const progressRows = await listCourseProgressByStudentIds(studentIds);
  const courseIds = [...new Set(progressRows.map((row) => row.course_id))];
  const coursesById = await listCoursesByIds(courseIds);
  const modules = await listModulesByCourseIds(courseIds);
  const lessons = await listLessonsByModuleIds(modules.map((module) => module.id));
  const courseIdByModuleId = new Map(modules.map((module) => [module.id, module.course_id]));
  const lessonCourseEntries = lessons
    .map((lesson) => {
      const courseId = courseIdByModuleId.get(lesson.module_id);
      return courseId ? { lessonId: lesson.id, courseId } : null;
    })
    .filter((entry): entry is { lessonId: string; courseId: string } => entry !== null);
  const totalLessonsByCourseId = lessonCourseEntries.reduce((counts, entry) => {
    counts.set(entry.courseId, (counts.get(entry.courseId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const courseIdByLessonId = new Map(
    lessonCourseEntries.map((entry) => [entry.lessonId, entry.courseId])
  );
  const completedLessonRows = await listCompletedLessonProgress(
    studentIds,
    lessonCourseEntries.map((entry) => entry.lessonId)
  );
  const completedLessonsByStudentCourse = completedLessonRows.reduce((counts, row) => {
    const courseId = courseIdByLessonId.get(row.lesson_id);

    if (!courseId) {
      return counts;
    }

    const key = `${row.user_id}:${courseId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const progressByStudentId = groupBy(progressRows, (row) => row.user_id);

  return new Map(
    studentIds.map((studentId) => {
      const enrollments = (progressByStudentId.get(studentId) ?? [])
        .map((progress): AdminStudentCourseEnrollment | null => {
          const course = coursesById.get(progress.course_id);

          if (!course || course.deleted_at) {
            return null;
          }

          const totalLessonsCount = totalLessonsByCourseId.get(course.id) ?? 0;
          const completedLessonsCount =
            completedLessonsByStudentCourse.get(`${studentId}:${course.id}`) ?? 0;
          const progressPercent =
            totalLessonsCount > 0
              ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
              : progress.finished_at
                ? 100
                : 0;

          return {
            progressId: progress.id,
            courseId: course.id,
            title: course.title?.trim() || "Untitled course",
            status: course.status,
            thumbnailPath: course.thumbnail_path,
            isPublished: course.is_published,
            startedAt: progress.started_at,
            finishedAt: progress.finished_at,
            completedLessonsCount,
            totalLessonsCount,
            progressPercent,
          };
        })
        .filter((enrollment): enrollment is AdminStudentCourseEnrollment => enrollment !== null);

      return [studentId, enrollments];
    })
  );
}
