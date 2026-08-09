/**
 * The desktop course-navigation rail, with its drag-to-resize grip.
 *
 * Hidden below `lg` — on narrow screens the same navigation appears in a drawer instead, so
 * this renders nothing rather than competing for width.
 */

import type { PointerEvent as ReactPointerEvent } from "react";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import { CoursePreviewSidebarNavigation } from "./CoursePreviewSidebarNavigation";
import type { ActiveContentType } from "./coursePreviewSequence";

export function CoursePreviewSidebar({
  sidebarWidth,
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
  onContentTypeChange: handleChangeContentType,
  // Toggles rather than selects: clicking an already-open module collapses it, which is not
  // what the page's `handleSelectModule` does.
  onModuleToggle,
  onSelectLesson: handleSelectLesson,
  onSelectExercise: handleSelectExercise,
  onSelectTest: handleSelectTest,
  onResizeStart: handleSidebarResizeStart,
}: {
  sidebarWidth: number;
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
  onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
          <div
            className="relative hidden min-h-0 shrink-0 lg:block"
            style={{ width: `${sidebarWidth}px` }}
          >
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
              onContentTypeChange={handleChangeContentType}
              onModuleToggle={onModuleToggle}
              onSelectLesson={handleSelectLesson}
              onSelectExercise={handleSelectExercise}
              onSelectTest={handleSelectTest}
            />
            <button
              type="button"
              aria-label="Змінити ширину меню курсу"
              onPointerDown={handleSidebarResizeStart}
              className="absolute right-0 top-0 z-10 hidden h-full w-2 translate-x-1/2 cursor-col-resize bg-transparent transition hover:bg-[#5549f1]/20 lg:block"
            />
          </div>
  );
}
