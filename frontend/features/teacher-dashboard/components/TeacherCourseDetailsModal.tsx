/**
 * Full-screen course preview the teacher sees before continuing to edit.
 *
 * Renders the same `CoursePreviewPage` a student gets, so what the teacher checks here is
 * what the student will actually see.
 */

import { X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Modal } from "../../../components/ui/Modal";
import { getCourseMediaPublicUrl } from "../../courses/api/courseMediaStorage";
import { CoursePreviewPage } from "../../courses/components/course-builder/components/CoursePreviewPage";
import type { TeacherCoursePreviewData } from "./teacherCoursePreview";
import type { TeacherCourseSummary } from "./teacherCourseDashboard.types";
import {
  formatCourseRelativeTime,
  getCourseStatusClassName,
  getCourseStatusLabel,
} from "./teacherCourseDashboard.utils";

export function TeacherCourseDetailsModal({
  course,
  previewData,
  isLoading,
  message,
  onClose,
  onContinue,
}: {
  course: TeacherCourseSummary | null;
  previewData: TeacherCoursePreviewData | null;
  isLoading: boolean;
  message: string;
  onClose: () => void;
  onContinue: (course: TeacherCourseSummary) => void;
}) {
  if (!course) {
    return null;
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      // No visible heading in this panel — the course name is carried by the status row —
      // so the dialog names itself rather than pointing at an element.
      ariaLabel={`Деталі курсу ${course.title}`}
      closeOnOverlayClick
      overlayClassName="z-[110]"
      panelClassName="mx-auto flex h-full max-h-[92vh] w-full max-w-[1540px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xl"
    >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 bg-white px-5 py-5 md:px-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getCourseStatusClassName(course)}`}
              >
                {getCourseStatusLabel(course)}
              </span>
              <span className="text-sm text-slate-500">
                Останнє редагування: {formatCourseRelativeTime(course.updated_at)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {course.modulesCount} модулів
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {course.lessonsCount} уроків
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" size="lg" onClick={() => onContinue(course)}>
              Продовжити редагування
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onClose}
              className="w-15 px-0"
              aria-label="Закрити деталі курсу"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
          {message ? (
            <Card className="border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
              <p className="text-sm font-medium">{message}</p>
            </Card>
          ) : isLoading ? (
            <LoadingState variant="modal" />
          ) : previewData ? (
            <CoursePreviewPage
              courseId={course.id}
              courseTitle={course.title}
              courseDescription={course.description}
              courseThumbnailPath={course.thumbnail_path}
              courseThumbnailUrl={getCourseMediaPublicUrl(course.thumbnail_path)}
              modules={previewData.modules}
              lessonsByModule={previewData.lessonsByModule}
              testsByModule={previewData.testsByModule}
              exercisesByModule={previewData.exercisesByModule}
            />
          ) : (
            <Card className="p-10 text-sm text-slate-500">
              Перегляд недоступний.
            </Card>
          )}
        </div>
    </Modal>
  );
}
