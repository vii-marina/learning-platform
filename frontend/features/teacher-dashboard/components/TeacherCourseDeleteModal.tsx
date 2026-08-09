/** Confirms deleting a course from the teacher dashboard. */

import { useId } from "react";
import { Button } from "../../../components/ui/button";
import { Modal } from "../../../components/ui/Modal";
import type { TeacherCourseSummary } from "./teacherCourseDashboard.types";

export function TeacherCourseDeleteModal({
  course,
  isDeleting,
  onClose,
  onConfirm,
}: {
  course: TeacherCourseSummary | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const headingId = useId();

  if (!course) {
    return null;
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledById={headingId}
      closeOnOverlayClick
      dismissDisabled={isDeleting}
      overlayClassName="z-[120]"
      panelClassName="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
    >
          <div className="space-y-3">
            <p className="text-sm font-semibold  text-rose-600">
              Видалити курс
            </p>
            <h2 id={headingId} className="text-2xl font-semibold tracking-tight text-slate-950">
              Видалити {course.title}?
            </h2>
            <p className="text-sm leading-6 text-slate-500">
              Курс буде прибрано з вашого дашборду.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isDeleting}>
              Скасувати
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={onConfirm}
              disabled={isDeleting}
              className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
            >
              Видалити
            </Button>
          </div>
    </Modal>
  );
}
