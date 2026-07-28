const STORAGE_KEY_PREFIX = "learning-platform.teacher-draft-course-history";
const HISTORY_LIMIT = 20;

function getStorageKey(teacherId: string) {
  return `${STORAGE_KEY_PREFIX}:${teacherId}`;
}

function normalizeCourseHistory(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((courseId): courseId is string => typeof courseId === "string");
}

function saveTeacherDraftCourseHistory(teacherId: string, courseIds: string[]) {
  const storageKey = getStorageKey(teacherId);

  if (courseIds.length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(courseIds));
}

export function getTeacherDraftCourseHistory(teacherId: string | null | undefined) {
  if (!teacherId) {
    return [];
  }

  const storageKey = getStorageKey(teacherId);
  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return [];
  }

  try {
    const courseHistory = normalizeCourseHistory(JSON.parse(rawValue));
    saveTeacherDraftCourseHistory(teacherId, courseHistory);
    return courseHistory;
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

export function rememberTeacherDraftCourse(
  teacherId: string | null | undefined,
  courseId: string
) {
  if (!teacherId) {
    return [];
  }

  const nextCourseHistory = [
    courseId,
    ...getTeacherDraftCourseHistory(teacherId).filter(
      (savedCourseId) => savedCourseId !== courseId
    ),
  ].slice(0, HISTORY_LIMIT);

  saveTeacherDraftCourseHistory(teacherId, nextCourseHistory);
  return nextCourseHistory;
}

export function removeTeacherDraftCourseFromHistory(
  teacherId: string | null | undefined,
  courseId: string
) {
  if (!teacherId) {
    return [];
  }

  const nextCourseHistory = getTeacherDraftCourseHistory(teacherId).filter(
    (savedCourseId) => savedCourseId !== courseId
  );

  saveTeacherDraftCourseHistory(teacherId, nextCourseHistory);
  return nextCourseHistory;
}
