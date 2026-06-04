import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Code2, ClipboardList, Layers3, Play } from "lucide-react";
import type { Lesson, Module } from "../../../api/index";
import { createLocalEntityId } from "../lib/courseBuilderPageUtils";
import {
  CoursePreviewAskTeacherModal,
  type CoursePreviewChatContext,
  type CoursePreviewChatMessage,
} from "./CoursePreviewAskTeacherModal";
import { CoursePreviewLessonContent } from "./CoursePreviewLessonContent";
import {
  CoursePreviewOverviewModal,
  type CoursePreviewOverviewTab,
} from "./CoursePreviewOverviewModal";
import { CoursePreviewSidebarNavigation } from "./CoursePreviewSidebarNavigation";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import {
  buildCoursePreviewLessonSequence,
  buildCoursePreviewSidebarItems,
  getLessonExercises,
  getLessonTests,
  getPreviewProgressStorageKey,
  type CoursePreviewLessonRef,
} from "../lib/coursePreviewUtils";

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
  onCompleteLesson?: (lessonId: string) => Promise<string[] | void>;
  showCourseOverviewActions?: boolean;
};

type StoredPreviewProgress = {
  moduleId?: string | null;
  lessonId?: string | null;
  completedLessonIds?: string[];
  completedExerciseIds?: string[];
  completedTestIds?: string[];
};

type ActiveContentType = "lesson" | "exercise" | "test";
type NavigationTone = "lesson" | "exercise" | "test" | null;
type CoursePreviewSequenceItem =
  | {
      type: "lesson";
      module: Module;
      lesson: Lesson;
    }
  | {
      type: "exercise";
      module: Module;
      lesson: Lesson;
      exercise: CourseExercise;
    }
  | {
      type: "test";
      module: Module;
      lesson: Lesson;
      test: CourseTest;
    };

function toRecord(ids: string[] | undefined) {
  return Object.fromEntries((ids ?? []).map((id) => [id, true])) as Record<string, boolean>;
}

function getNavigationButtonTone(item: CoursePreviewSequenceItem | null): NavigationTone {
  return item?.type ?? null;
}

function getNavigationButtonLabel(
  item: CoursePreviewSequenceItem | null,
  direction: "previous" | "next",
  currentType: ActiveContentType
) {
  if (!item) {
    return direction === "previous" ? "Попередній урок" : "Наступний урок";
  }

  if (item.type === "lesson") {
    if (direction === "previous") {
      return currentType === "lesson" ? "Попередній урок" : "Назад до уроку";
    }

    return "Наступний урок";
  }

  if (item.type === "exercise") {
    if (direction === "previous") {
      return currentType === "exercise" ? "Попередня вправа" : "Назад до вправ";
    }

    return currentType === "exercise" ? "Наступна вправа" : "Відкрити вправи";
  }

  if (direction === "previous") {
    return currentType === "test" ? "Попередній тест" : "Назад до тесту";
  }

  return currentType === "test" ? "Наступний тест" : "Відкрити тест";
}

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
  onCompleteLesson,
  showCourseOverviewActions = true,
}: CoursePreviewPageProps) {
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeContentType, setActiveContentType] = useState<ActiveContentType>("lesson");
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Record<string, boolean>>({});
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Record<string, boolean>>({});
  const [completedTestIds, setCompletedTestIds] = useState<Record<string, boolean>>({});
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);
  const [chatContext, setChatContext] = useState<CoursePreviewChatContext | null>(null);
  const [chatMessagesByReference, setChatMessagesByReference] = useState<
    Record<string, CoursePreviewChatMessage[]>
  >({});
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [overviewModalTab, setOverviewModalTab] =
    useState<CoursePreviewOverviewTab | null>(null);
  const initializedProgressKeyRef = useRef<string | null>(null);

  const progressStorageKey = useMemo(
    () => getPreviewProgressStorageKey(courseId, courseTitle),
    [courseId, courseTitle]
  );
  const lessonSequence = useMemo(
    () => buildCoursePreviewLessonSequence(modules, lessonsByModule),
    [lessonsByModule, modules]
  );
  const lessonRefById = useMemo(
    () =>
      new Map(
        lessonSequence.map((lessonRef) => [lessonRef.lesson.id, lessonRef] satisfies [
          string,
          CoursePreviewLessonRef,
        ])
      ),
    [lessonSequence]
  );
  const previewSequence = useMemo<CoursePreviewSequenceItem[]>(
    () =>
      [...modules]
        .sort((left, right) => left.order - right.order)
        .flatMap((module) => {
          const lessons = lessonsByModule[module.id] ?? [];
          const exercises = exercisesByModule[module.id] ?? [];
          const tests = testsByModule[module.id] ?? [];

          return buildCoursePreviewSidebarItems({
            lessons,
            exercises,
            tests,
          }).map((item): CoursePreviewSequenceItem => {
            if (item.type === "lesson") {
              return {
                type: "lesson",
                module,
                lesson: item.lesson,
              };
            }

            if (item.type === "exercise") {
              return {
                type: "exercise",
                module,
                lesson: item.lesson,
                exercise: item.exercise,
              };
            }

            return {
              type: "test",
              module,
              lesson: item.lesson,
              test: item.test,
            };
          });
        }),
    [exercisesByModule, lessonsByModule, modules, testsByModule]
  );
  const activeLessonRef =
    (activeLessonId ? lessonRefById.get(activeLessonId) : null) ?? lessonSequence[0] ?? null;
  const activeModule = activeLessonRef?.module ?? modules[0] ?? null;
  const activeLesson = activeLessonRef?.lesson ?? null;
  const activeModuleLessons = useMemo(
    () => (activeModule ? lessonsByModule[activeModule.id] ?? [] : []),
    [activeModule, lessonsByModule]
  );
  const activeModuleTests = useMemo(
    () => (activeModule ? testsByModule[activeModule.id] ?? [] : []),
    [activeModule, testsByModule]
  );
  const activeModuleExercises = useMemo(
    () => (activeModule ? exercisesByModule[activeModule.id] ?? [] : []),
    [activeModule, exercisesByModule]
  );
  const activeLessonExercises = useMemo(
    () =>
      activeLesson && activeModule
        ? getLessonExercises(activeModuleLessons, activeModuleExercises, activeLesson.id)
        : [],
    [activeLesson, activeModule, activeModuleExercises, activeModuleLessons]
  );
  const activeLessonTests = useMemo(
    () =>
      activeLesson && activeModule
        ? getLessonTests(activeModuleLessons, activeModuleTests, activeLesson.id)
        : [],
    [activeLesson, activeModule, activeModuleLessons, activeModuleTests]
  );
  const activeSequenceIndex = previewSequence.findIndex((item) => {
    if (activeContentType === "lesson") {
      return item.type === "lesson" && item.lesson.id === activeLesson?.id;
    }

    if (activeContentType === "exercise") {
      return item.type === "exercise" && item.exercise.id === activeExerciseId;
    }

    return item.type === "test" && item.test.id === activeTestId;
  });
  const previousSequenceItem = activeSequenceIndex > 0 ? previewSequence[activeSequenceIndex - 1] : null;
  const nextSequenceItem =
    activeSequenceIndex >= 0 ? previewSequence[activeSequenceIndex + 1] ?? null : null;
  const chatMessages = chatContext ? chatMessagesByReference[chatContext.reference] ?? [] : [];
  const totalLessons = useMemo(
    () => Object.values(lessonsByModule).reduce((sum, lessons) => sum + lessons.length, 0),
    [lessonsByModule]
  );
  const totalExercises = useMemo(
    () =>
      Object.values(exercisesByModule).reduce((sum, exercises) => sum + exercises.length, 0),
    [exercisesByModule]
  );
  const totalTests = useMemo(
    () => Object.values(testsByModule).reduce((sum, tests) => sum + tests.length, 0),
    [testsByModule]
  );

  useEffect(() => {
    setActiveExerciseId(null);
    setActiveTestId(null);
    setActiveContentType("lesson");
    setChatContext(null);
    setChatMessagesByReference({});
    setOverviewModalTab(null);
    setIsCompletingLesson(false);
    initializedProgressKeyRef.current = null;
  }, [progressStorageKey]);

  useEffect(() => {
    if (initializedProgressKeyRef.current === progressStorageKey) {
      if (activeLessonId && lessonRefById.has(activeLessonId)) {
        return;
      }

      const fallbackLesson = lessonSequence[0] ?? null;

      setActiveLessonId(fallbackLesson?.lesson.id ?? null);
      setExpandedModuleId(fallbackLesson?.module.id ?? modules[0]?.id ?? null);
      setActiveExerciseId(null);
      setActiveTestId(null);
      setActiveContentType("lesson");
      return;
    }

    initializedProgressKeyRef.current = progressStorageKey;

    const fallbackLesson = lessonSequence[0] ?? null;
    let storedProgress: StoredPreviewProgress | null = null;

    try {
      const storedValue = window.localStorage.getItem(progressStorageKey);
      storedProgress = storedValue ? (JSON.parse(storedValue) as StoredPreviewProgress) : null;
    } catch {
      storedProgress = null;
    }

    const storedLessonExists =
      storedProgress?.lessonId !== undefined && storedProgress.lessonId !== null
        ? lessonRefById.has(storedProgress.lessonId)
        : false;
    const resolvedLessonId = storedLessonExists
      ? storedProgress?.lessonId ?? null
      : fallbackLesson?.lesson.id ?? null;
    const resolvedModuleId =
      storedProgress?.moduleId && modules.some((module) => module.id === storedProgress?.moduleId)
        ? storedProgress.moduleId
        : resolvedLessonId
          ? lessonRefById.get(resolvedLessonId)?.module.id ?? fallbackLesson?.module.id ?? null
          : modules[0]?.id ?? null;

    setExpandedModuleId(resolvedModuleId);
    setActiveLessonId(resolvedLessonId);
    setActiveExerciseId(null);
    setActiveTestId(null);
    setActiveContentType("lesson");
    setCompletedLessonIds(toRecord(initialCompletedLessonIds ?? storedProgress?.completedLessonIds));
    setCompletedExerciseIds(toRecord(storedProgress?.completedExerciseIds));
    setCompletedTestIds(toRecord(storedProgress?.completedTestIds));
  }, [activeLessonId, initialCompletedLessonIds, lessonRefById, lessonSequence, modules, progressStorageKey]);

  async function handleCompleteActiveLesson() {
    if (!activeLesson || isCompletingLesson) {
      return;
    }

    if (!onCompleteLesson) {
      setCompletedLessonIds((currentMap) => ({
        ...currentMap,
        [activeLesson.id]: true,
      }));
      return;
    }

    try {
      setIsCompletingLesson(true);
      const completedIds = await onCompleteLesson(activeLesson.id);
      setCompletedLessonIds((currentMap) =>
        completedIds
          ? toRecord(completedIds)
          : {
              ...currentMap,
              [activeLesson.id]: true,
            }
      );
    } finally {
      setIsCompletingLesson(false);
    }
  }

  useEffect(() => {
    const payload: StoredPreviewProgress = {
      moduleId: activeModule?.id ?? expandedModuleId ?? null,
      lessonId: activeLesson?.id ?? null,
      completedLessonIds: Object.keys(completedLessonIds),
      completedExerciseIds: Object.keys(completedExerciseIds),
      completedTestIds: Object.keys(completedTestIds),
    };

    try {
      window.localStorage.setItem(progressStorageKey, JSON.stringify(payload));
    } catch {
      return;
    }
  }, [
    activeLesson,
    activeModule,
    completedExerciseIds,
    completedLessonIds,
    completedTestIds,
    expandedModuleId,
    progressStorageKey,
  ]);

  useEffect(() => {
    if (!activeExerciseId) {
      return;
    }

    const hasActiveExercise = activeLessonExercises.some(
      (exercise) => exercise.id === activeExerciseId
    );

    if (!hasActiveExercise) {
      setActiveExerciseId(null);
    }
  }, [activeExerciseId, activeLessonExercises]);

  useEffect(() => {
    if (!activeTestId) {
      return;
    }

    const hasActiveTest = activeLessonTests.some((test) => test.id === activeTestId);

    if (!hasActiveTest) {
      setActiveTestId(null);
    }
  }, [activeLessonTests, activeTestId]);

  function handleOpenChat(context: CoursePreviewChatContext) {
    setChatContext(context);
  }

  function handleSendChatMessage(message: string) {
    if (!chatContext) {
      return;
    }

    setChatMessagesByReference((currentMessages) => ({
      ...currentMessages,
      [chatContext.reference]: [
        ...(currentMessages[chatContext.reference] ?? []),
        {
          id: createLocalEntityId("teacher-message"),
          role: "user",
          text: message,
        },
        {
          id: createLocalEntityId("teacher-reply"),
          role: "assistant",
          text: "Запитання збережено з привʼязкою до поточного уроку або тесту.",
        },
      ],
    }));
  }

  function activateSequenceItem(item: CoursePreviewSequenceItem) {
    setExpandedModuleId(item.module.id);
    setActiveLessonId(item.lesson.id);
    setActiveExerciseId(null);
    setActiveTestId(null);
    setOverviewModalTab(null);

    if (item.type === "exercise") {
      setActiveContentType("exercise");
      setActiveExerciseId(item.exercise.id);
      return;
    }

    if (item.type === "test") {
      setActiveContentType("test");
      setActiveTestId(item.test.id);
      return;
    }

    setActiveContentType("lesson");
  }

  function handleSelectModule(moduleId: string) {
    const firstLessonItem =
      previewSequence.find(
        (item) => item.type === "lesson" && item.module.id === moduleId
      ) ?? null;

    if (!firstLessonItem) {
      setExpandedModuleId(moduleId);
      setActiveExerciseId(null);
      setActiveTestId(null);
      setActiveContentType("lesson");
      setOverviewModalTab(null);
      return;
    }

    activateSequenceItem(firstLessonItem);
  }

  function handleSelectLesson(moduleId: string, lessonId: string) {
    const lessonItem =
      previewSequence.find(
        (item) =>
          item.type === "lesson" &&
          item.module.id === moduleId &&
          item.lesson.id === lessonId
      ) ?? null;

    if (!lessonItem) {
      return;
    }

    activateSequenceItem(lessonItem);
  }

  function handleSelectExercise(moduleId: string, lessonId: string, exerciseId: string) {
    const exerciseItem =
      previewSequence.find(
        (item) =>
          item.type === "exercise" &&
          item.module.id === moduleId &&
          item.lesson.id === lessonId &&
          item.exercise.id === exerciseId
      ) ?? null;

    if (!exerciseItem) {
      return;
    }

    activateSequenceItem(exerciseItem);
  }

  function handleSelectTest(moduleId: string, lessonId: string | null, testId: string) {
    const testItem =
      previewSequence.find(
        (item) =>
          item.type === "test" &&
          item.module.id === moduleId &&
          item.test.id === testId &&
          (lessonId === null || item.lesson.id === lessonId)
      ) ??
      previewSequence.find(
        (item) =>
          item.type === "test" &&
          item.module.id === moduleId &&
          item.test.id === testId
      ) ??
      null;

    if (!testItem) {
      return;
    }

    activateSequenceItem(testItem);
  }

  function handleNavigateToItem(item: CoursePreviewSequenceItem | null) {
    if (!item) {
      return;
    }

    activateSequenceItem(item);
  }

  async function handleGoToNextItem() {
    if (!nextSequenceItem) {
      return;
    }

    if (activeContentType === "lesson" && activeLesson) {
      await handleCompleteActiveLesson();
    }

    activateSequenceItem(nextSequenceItem);
  }

  function handleChangeContentType(nextContentType: ActiveContentType) {
    if (!activeModule || !activeLesson) {
      return;
    }

    setActiveContentType(nextContentType);
    setExpandedModuleId(activeModule.id);

    if (nextContentType === "lesson") {
      setActiveExerciseId(null);
      setActiveTestId(null);
      return;
    }

    if (nextContentType === "exercise") {
      const firstExercise = activeLessonExercises[0] ?? null;
      setActiveExerciseId(firstExercise?.id ?? null);
      setActiveTestId(null);
      return;
    }

    const firstTest = activeLessonTests[0] ?? null;
    setActiveTestId(firstTest?.id ?? null);
    setActiveExerciseId(null);
  }

  function handleCompleteModalTest(testId: string) {
    setCompletedTestIds((currentMap) => ({
      ...currentMap,
      [testId]: true,
    }));
  }

  function handleSidebarResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidebarWidth;

    function handlePointerMove(pointerEvent: PointerEvent) {
      const nextWidth = startWidth + pointerEvent.clientX - startX;

      setSidebarWidth(Math.min(520, Math.max(240, nextWidth)));
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <>
      <section className="mb-5 rounded-[0.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <div className="aspect-video overflow-hidden rounded-[0.75rem] border border-slate-200 bg-slate-950">
            {courseThumbnailUrl ? (
              <img
                src={courseThumbnailUrl}
                alt={`${courseTitle} thumbnail`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#14213d] text-white">
                <BookOpen className="h-12 w-12" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-tight text-[#14213d] ">
              {courseTitle}
            </h2>
            {courseDescription?.trim() ? (
              <p className="mt-3 max-h-32 overflow-y-auto whitespace-pre-line pr-2 text-sm font-semibold leading-7 text-slate-600">
                {courseDescription}
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
                Опис курсу поки не додано.
              </p>
            )}

            {showCourseOverviewActions ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOverviewModalTab("modules")}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100"
                >
                  <Layers3 className="h-4 w-4" />
                  {modules.length} модулі
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewModalTab("lessons")}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  <Play className="h-4 w-4" />
                  {totalLessons} уроки
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewModalTab("exercises")}
                  className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
                >
                  <Code2 className="h-4 w-4" />
                  {totalExercises} вправи
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewModalTab("tests")}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100"
                >
                  <ClipboardList className="h-4 w-4" />
                  {totalTests} тести
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="flex h-[calc(100vh-6.5rem)] min-h-[40rem] flex-col overflow-hidden rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div
            className="relative min-h-0 shrink-0"
            style={{ width: `${sidebarWidth}px` }}
          >
            <CoursePreviewSidebarNavigation
              modules={modules}
              lessonsByModule={lessonsByModule}
              testsByModule={testsByModule}
              exercisesByModule={exercisesByModule}
              expandedModuleId={expandedModuleId}
              activeLessonId={activeLesson?.id ?? null}
              activeExerciseId={activeContentType === "exercise" ? activeExerciseId : null}
              activeTestId={activeContentType === "test" ? activeTestId : null}
              activeContentType={activeContentType}
              completedLessonIds={completedLessonIds}
              completedExerciseIds={completedExerciseIds}
              completedTestIds={completedTestIds}
              onContentTypeChange={handleChangeContentType}
              onModuleToggle={(moduleId) => {
                setExpandedModuleId((currentModuleId) =>
                  currentModuleId === moduleId ? null : moduleId
                );
                setActiveExerciseId(null);
                setActiveTestId(null);
                setActiveContentType("lesson");

                const nextLesson = (lessonsByModule[moduleId] ?? [])[0] ?? null;

                if (nextLesson) {
                  setActiveLessonId(nextLesson.id);
                }
              }}
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
            onGoToPreviousItem={() => handleNavigateToItem(previousSequenceItem)}
            onGoToNextItem={() => {
              void handleGoToNextItem();
            }}
            onAskTeacher={handleOpenChat}
            onSelectExercise={(exerciseId) => {
              if (!activeModule || !activeLesson) {
                return;
              }

              handleSelectExercise(activeModule.id, activeLesson.id, exerciseId);
            }}
            isCurrentLessonCompleted={
              activeLesson ? Boolean(completedLessonIds[activeLesson.id]) : false
            }
            isCompletingLesson={isCompletingLesson}
            onCompleteLesson={undefined}
            onResolveExercise={(exerciseId) => {
              setCompletedExerciseIds((currentMap) => ({
                ...currentMap,
                [exerciseId]: true,
              }));
            }}
            onCompleteTest={handleCompleteModalTest}
          />
        </div>
      </section>

      <CoursePreviewOverviewModal
        isOpen={overviewModalTab !== null}
        activeTab={overviewModalTab ?? "modules"}
        onTabChange={setOverviewModalTab}
        onClose={() => setOverviewModalTab(null)}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
        exercisesByModule={exercisesByModule}
        onSelectModule={handleSelectModule}
        onSelectLesson={handleSelectLesson}
        onSelectExercise={handleSelectExercise}
        onSelectTest={handleSelectTest}
      />

      <CoursePreviewAskTeacherModal
        isOpen={chatContext !== null}
        context={chatContext}
        messages={chatMessages}
        onClose={() => setChatContext(null)}
        onSend={handleSendChatMessage}
      />
    </>
  );
}
