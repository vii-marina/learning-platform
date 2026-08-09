import { useEffect, useMemo } from "react";
import { ListTree } from "lucide-react";
import type { Lesson, Module } from "../../../api/index";
import { CoursePreviewAskTeacherModal } from "./CoursePreviewAskTeacherModal";
import {
  CoursePreviewLessonContent,
  type TestCompletionSummary,
} from "./CoursePreviewLessonContent";
import { CoursePreviewOverviewModal } from "./CoursePreviewOverviewModal";
import { CoursePreviewCourseHeader } from "./CoursePreviewCourseHeader";
import { CoursePreviewMobileNavigationModal } from "./CoursePreviewMobileNavigationModal";
import { CoursePreviewSidebar } from "./CoursePreviewSidebar";
import { useCoursePreviewChat } from "../hooks/useCoursePreviewChat";
import { useCoursePreviewProgress } from "../hooks/useCoursePreviewProgress";
import { useCoursePreviewSelection } from "../hooks/useCoursePreviewSelection";
import { useCoursePreviewSidebarResize } from "../hooks/useCoursePreviewSidebarResize";
import { writeStoredProgress } from "./coursePreviewProgressStorage";
import {
  getNavigationButtonLabel,
  getNavigationButtonTone,
  type StoredPreviewProgress,
} from "./coursePreviewSequence";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import { getPreviewProgressStorageKey } from "../lib/coursePreviewUtils";

type CoursePreviewPageProps = {
  courseId?: string | null;
  courseTitle: string;
  courseDescription?: string | null;
  courseThumbnailPath?: string | null;
  courseThumbnailUrl?: string | null;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  initialCompletedLessonIds?: string[];
  initialCompletedExerciseIds?: string[];
  onCompleteLesson?: (lessonId: string) => Promise<string[] | void>;
  onCompleteExercise?: (exerciseId: string) => Promise<string[] | void>;
  onCompleteTest?: (
    testId: string,
    selectedAnswers: Record<string, number[]>
  ) => Promise<TestCompletionSummary | void> | TestCompletionSummary | void;
  showCourseOverviewActions?: boolean;
};

export function CoursePreviewPage({
  courseId = null,
  courseTitle,
  courseDescription,
  courseThumbnailUrl,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  initialCompletedLessonIds,
  initialCompletedExerciseIds,
  onCompleteLesson,
  onCompleteExercise,
  onCompleteTest,
  showCourseOverviewActions = true,
}: CoursePreviewPageProps) {
  const {
    chatContext,
    chatMessages,
    openChat: handleOpenChat,
    closeChat,
    resetChat,
    sendMessage: handleSendChatMessage,
  } = useCoursePreviewChat();
  const { sidebarWidth, handleSidebarResizeStart } = useCoursePreviewSidebarResize();

  const progressStorageKey = useMemo(
    () => getPreviewProgressStorageKey(courseId, courseTitle),
    [courseId, courseTitle]
  );

  const progress = useCoursePreviewProgress({
    onCompleteLesson,
    onCompleteExercise,
    onCompleteTest,
  });
  const selection = useCoursePreviewSelection({
    modules,
    lessonsByModule,
    testsByModule,
    exercisesByModule,
    progressStorageKey,
    initialCompletedLessonIds,
    initialCompletedExerciseIds,
    onCourseChange: () => {
      resetChat();
      progress.handleCourseChange();
    },
    onHydrateProgress: progress.hydrateFromStoredProgress,
  });

  const {
    expandedModuleId,
    activeContentType,
    activeExerciseId,
    activeTestId,
    overviewModalTab,
    isMobileNavigationOpen,
    setOverviewModalTab,
    setIsMobileNavigationOpen,
    activeModule,
    activeLesson,
    activeModuleLessons,
    activeLessonExercises,
    activeLessonTests,
    previousSequenceItem,
    nextSequenceItem,
    totalLessons,
    totalExercises,
    totalTests,
  } = selection;
  const { completedLessonIds, completedExerciseIds, completedTestIds } = progress;

  // Both hooks feed this, so it stays at page level rather than living inside either one.
  useEffect(() => {
    const payload: StoredPreviewProgress = {
      moduleId: activeModule?.id ?? expandedModuleId ?? null,
      lessonId: activeLesson?.id ?? null,
      completedLessonIds: Object.keys(completedLessonIds),
      completedExerciseIds: Object.keys(completedExerciseIds),
      completedTestIds: Object.keys(completedTestIds),
    };

    writeStoredProgress(progressStorageKey, payload);
  }, [
    activeLesson,
    activeModule,
    completedExerciseIds,
    completedLessonIds,
    completedTestIds,
    expandedModuleId,
    progressStorageKey,
  ]);

  async function handleGoToNextItem() {
    if (!nextSequenceItem) {
      return;
    }

    if (activeContentType === "lesson" && activeLesson) {
      await progress.completeLesson(activeLesson.id);
    }

    selection.activateSequenceItem(nextSequenceItem);
  }

  return (
    <>
      <CoursePreviewCourseHeader
        courseTitle={courseTitle}
        courseDescription={courseDescription}
        courseThumbnailUrl={courseThumbnailUrl}
        totalModules={modules.length}
        totalLessons={totalLessons}
        totalExercises={totalExercises}
        totalTests={totalTests}
        showCourseOverviewActions={showCourseOverviewActions}
        onOpenOverviewTab={setOverviewModalTab}
      />

      <section className="flex flex-col overflow-visible rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] lg:h-[calc(100vh-6.5rem)] lg:min-h-[40rem] lg:overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#dedcff] bg-white px-4 py-3 lg:hidden">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-[#6d6a9f]">
              Поточний матеріал
            </p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-[#1f1b4d]">
              {activeModule && activeLesson
                ? `${activeModule.order}.${activeLesson.order} ${activeLesson.title}`
                : "Оберіть урок"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileNavigationOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#dedcff] bg-[#f1f0ff] px-3 py-2 text-sm font-extrabold text-[#5549f1]"
          >
            <ListTree className="h-4 w-4" />
            Зміст
          </button>
        </div>

        <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
          <CoursePreviewSidebar
            sidebarWidth={sidebarWidth}
            modules={modules}
            lessonsByModule={lessonsByModule}
            testsByModule={testsByModule}
            exercisesByModule={exercisesByModule}
            expandedModuleId={expandedModuleId}
            activeLessonId={activeLesson?.id ?? null}
            activeExerciseId={activeExerciseId}
            activeTestId={activeTestId}
            activeContentType={activeContentType}
            completedLessonIds={completedLessonIds}
            completedExerciseIds={completedExerciseIds}
            completedTestIds={completedTestIds}
            onContentTypeChange={selection.handleChangeContentType}
            onModuleToggle={selection.handleToggleModule}
            onSelectLesson={selection.handleSelectLesson}
            onSelectExercise={selection.handleSelectExercise}
            onSelectTest={selection.handleSelectTest}
            onResizeStart={handleSidebarResizeStart}
          />

          <CoursePreviewLessonContent
            module={activeModule}
            lesson={activeLesson}
            lessons={activeModuleLessons}
            exercises={activeLessonExercises}
            tests={activeLessonTests}
            activeContentType={activeContentType}
            activeExerciseId={activeExerciseId}
            activeTestId={activeTestId}
            canGoToPreviousItem={previousSequenceItem !== null}
            canGoToNextItem={nextSequenceItem !== null}
            previousButtonLabel={getNavigationButtonLabel(
              previousSequenceItem,
              "previous",
              activeContentType
            )}
            nextButtonLabel={getNavigationButtonLabel(
              nextSequenceItem,
              "next",
              activeContentType
            )}
            previousButtonTone={getNavigationButtonTone(previousSequenceItem)}
            nextButtonTone={getNavigationButtonTone(nextSequenceItem)}
            onGoToPreviousItem={() => selection.handleNavigateToItem(previousSequenceItem)}
            onGoToNextItem={() => {
              void handleGoToNextItem();
            }}
            onAskTeacher={handleOpenChat}
            onSelectExercise={(exerciseId) => {
              if (!activeModule || !activeLesson) {
                return;
              }

              selection.handleSelectExercise(activeModule.id, activeLesson.id, exerciseId);
            }}
            isCurrentLessonCompleted={
              activeLesson ? Boolean(completedLessonIds[activeLesson.id]) : false
            }
            isCompletingLesson={progress.isCompletingLesson}
            onCompleteLesson={undefined}
            onResolveExercise={(exerciseId) => {
              void progress.completeExercise(exerciseId);
            }}
            onCompleteTest={progress.completeTest}
            gradeLocally={!onCompleteTest}
          />
        </div>
      </section>

      <CoursePreviewMobileNavigationModal
        isOpen={isMobileNavigationOpen}
        onClose={() => setIsMobileNavigationOpen(false)}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
        exercisesByModule={exercisesByModule}
        expandedModuleId={expandedModuleId}
        activeLessonId={activeLesson?.id ?? null}
        activeExerciseId={activeExerciseId}
        activeTestId={activeTestId}
        activeContentType={activeContentType}
        completedLessonIds={completedLessonIds}
        completedExerciseIds={completedExerciseIds}
        completedTestIds={completedTestIds}
        onContentTypeChange={selection.handleChangeContentType}
        onModuleToggle={selection.handleToggleModule}
        onSelectLesson={selection.handleMobileSelectLesson}
        onSelectExercise={selection.handleMobileSelectExercise}
        onSelectTest={selection.handleMobileSelectTest}
      />

      <CoursePreviewOverviewModal
        isOpen={overviewModalTab !== null}
        activeTab={overviewModalTab ?? "modules"}
        onTabChange={setOverviewModalTab}
        onClose={() => setOverviewModalTab(null)}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
        exercisesByModule={exercisesByModule}
        onSelectModule={selection.handleSelectModule}
        onSelectLesson={selection.handleSelectLesson}
        onSelectExercise={selection.handleSelectExercise}
        onSelectTest={selection.handleSelectTest}
      />

      <CoursePreviewAskTeacherModal
        isOpen={chatContext !== null}
        context={chatContext}
        messages={chatMessages}
        onClose={closeChat}
        onSend={handleSendChatMessage}
      />
    </>
  );
}
