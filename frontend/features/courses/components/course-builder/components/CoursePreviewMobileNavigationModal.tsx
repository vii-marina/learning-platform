/**
 * The course contents, as a drawer, for viewports below `lg` where the desktop sidebar is
 * hidden. Same navigation tree — the select handlers close the drawer afterwards, while
 * toggling a module open or shut leaves it up.
 */

import { useId } from "react";
import { X } from "lucide-react";
import type { Lesson, Module } from "../../../api/index";
import { Modal } from "../../../../../components/ui/Modal";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import { CoursePreviewSidebarNavigation } from "./CoursePreviewSidebarNavigation";
import type { ActiveContentType } from "./coursePreviewSequence";

export function CoursePreviewMobileNavigationModal({
  isOpen,
  onClose,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  expandedModuleId,
  activeLessonId,
  activeExerciseId,
  activeTestId,
  activeContentType,
  completedLessonIds,
  completedExerciseIds,
  completedTestIds,
  onContentTypeChange,
  onModuleToggle,
  onSelectLesson,
  onSelectExercise,
  onSelectTest,
}: {
  isOpen: boolean;
  onClose: () => void;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  expandedModuleId: string | null;
  activeLessonId: string | null;
  activeExerciseId: string | null;
  activeTestId: string | null;
  activeContentType: ActiveContentType;
  completedLessonIds: Record<string, boolean>;
  completedExerciseIds: Record<string, boolean>;
  completedTestIds: Record<string, boolean>;
  onContentTypeChange: (contentType: ActiveContentType) => void;
  onModuleToggle: (moduleId: string) => void;
  onSelectLesson: (moduleId: string, lessonId: string) => void;
  onSelectExercise: (moduleId: string, lessonId: string, exerciseId: string) => void;
  onSelectTest: (moduleId: string, lessonId: string | null, testId: string) => void;
}) {
  const headingId = useId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledById={headingId}
      closeOnOverlayClick
      overlayClassName="z-[130] lg:hidden"
      panelClassName="flex h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] border border-[#dedcff] bg-white shadow-2xl"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#dedcff] px-4 py-3">
        <div>
          <h3 id={headingId} className="text-lg font-extrabold text-[#1f1b4d]">
            Зміст курсу
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
          aria-label="Закрити зміст курсу"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <CoursePreviewSidebarNavigation
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          exercisesByModule={exercisesByModule}
          expandedModuleId={expandedModuleId}
          activeLessonId={activeLessonId}
          activeExerciseId={activeContentType === "exercise" ? activeExerciseId : null}
          activeTestId={activeContentType === "test" ? activeTestId : null}
          activeContentType={activeContentType}
          completedLessonIds={completedLessonIds}
          completedExerciseIds={completedExerciseIds}
          completedTestIds={completedTestIds}
          onContentTypeChange={onContentTypeChange}
          onModuleToggle={onModuleToggle}
          onSelectLesson={onSelectLesson}
          onSelectExercise={onSelectExercise}
          onSelectTest={onSelectTest}
        />
      </div>
    </Modal>
  );
}
