import type { Course } from "./types";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

type CourseListProps = {
  courses: Course[];
  selectedCourseId: string | null;
  onSelect: (courseId: string) => void;
  onDelete: (courseId: string) => void;
};

export function CourseList({
  courses,
  selectedCourseId,
  onSelect,
  onDelete,
}: CourseListProps) {
  return (
    <div className="flex flex-col gap-2">
      {courses.map((course) => (
        <div
          key={course.id}
          className={`rounded border px-3 py-2 text-sm ${
            selectedCourseId === course.id
              ? "border-slate-900 text-slate-900"
              : "border-slate-200 text-slate-600"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onSelect(course.id)}
              className="text-left font-medium"
            >
              {course.title}
            </button>
            <div className="flex gap-2">
              <ConfirmDeleteButton
                className="text-xs text-slate-500"
                confirmText="Delete this course?"
                onConfirm={() => onDelete(course.id)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
