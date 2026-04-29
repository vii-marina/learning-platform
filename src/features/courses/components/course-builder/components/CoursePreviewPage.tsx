import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Code2,
  FileImage,
  Layers3,
  Play,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCourseMediaKind, getCourseMediaLabel } from "../../../api/courseMediaStorage";
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

const EMPTY_DESCRIPTION =
  "Review the learning flow and validate generated practice before publishing.";

function toRecord(ids: string[] | undefined) {
  return Object.fromEntries((ids ?? []).map((id) => [id, true])) as Record<string, boolean>;
}

function normalizeCourseDescription(value: string) {
  return value
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

function getCollapsedCourseDescription(value: string) {
  const normalizedValue = normalizeCourseDescription(value);

  if (normalizedValue.length <= 180) {
    return normalizedValue;
  }

  const clippedValue = normalizedValue.slice(0, 180);
  const lastWhitespaceIndex = clippedValue.lastIndexOf(" ");

  if (lastWhitespaceIndex <= 0) {
    return `${clippedValue}…`;
  }

  return `${clippedValue.slice(0, lastWhitespaceIndex)}…`;
}

function getOverviewButtonClassName(tab: CoursePreviewOverviewTab, isActive: boolean) {
  const baseClassName =
    "group flex min-w-[12rem] items-center justify-between gap-4 rounded-[1.25rem] border px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13daec]/35 focus-visible:ring-offset-2";

  if (tab === "modules") {
    return isActive
      ? `${baseClassName} border-[#13daec] bg-[#13daec] text-[#0f172a]`
      : `${baseClassName} border-[#13daec]/30 bg-white text-[#0f8ea0] hover:border-[#13daec]/45 hover:bg-[#ecfeff]`;
  }

  if (tab === "lessons") {
    return isActive
      ? `${baseClassName} border-emerald-500 bg-emerald-500 text-white`
      : `${baseClassName} border-emerald-200 bg-white text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50`;
  }

  if (tab === "exercises") {
    return isActive
      ? `${baseClassName} border-amber-500 bg-amber-500 text-white`
      : `${baseClassName} border-amber-200 bg-white text-amber-800 hover:border-amber-300 hover:bg-amber-50`;
  }

  return isActive
    ? `${baseClassName} border-violet-500 bg-violet-500 text-white`
    : `${baseClassName} border-violet-200 bg-white text-violet-800 hover:border-violet-300 hover:bg-violet-50`;
}

function getOverviewButtonIconClassName(tab: CoursePreviewOverviewTab, isActive: boolean) {
  if (tab === "modules") {
    return isActive ? "bg-white/85 text-[#0f8ea0]" : "bg-[#13daec]/12 text-[#08bfd4]";
  }

  if (tab === "lessons") {
    return isActive ? "bg-white/85 text-emerald-600" : "bg-emerald-50 text-emerald-600";
  }

  if (tab === "exercises") {
    return isActive ? "bg-white/85 text-amber-600" : "bg-amber-50 text-amber-600";
  }

  return isActive ? "bg-white/85 text-violet-600" : "bg-violet-50 text-violet-600";
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
    return direction === "previous" ? "Previous" : "Next";
  }

  if (item.type === "lesson") {
    if (direction === "previous") {
      return currentType === "lesson" ? "Previous Lesson" : "Back to Lesson";
    }

    return "Next Lesson";
  }

  if (item.type === "exercise") {
    if (direction === "previous") {
      return currentType === "exercise" ? "Previous Exercise" : "Back to Exercises";
    }

    return currentType === "exercise" ? "Next Exercise" : "Open Exercises";
  }

  if (direction === "previous") {
    return currentType === "test" ? "Previous Test" : "Back to Test";
  }

  return currentType === "test" ? "Next Test" : "Open Test";
}

export function CoursePreviewPage({
  courseId = null,
  courseTitle,
  courseDescription = null,
  courseThumbnailPath = null,
  courseThumbnailUrl = null,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
}: CoursePreviewPageProps) {
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Record<string, boolean>>({});
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Record<string, boolean>>({});
  const [completedTestIds, setCompletedTestIds] = useState<Record<string, boolean>>({});
  const [chatContext, setChatContext] = useState<CoursePreviewChatContext | null>(null);
  const [chatMessagesByReference, setChatMessagesByReference] = useState<
    Record<string, CoursePreviewChatMessage[]>
  >({});
  const [overviewModalTab, setOverviewModalTab] =
    useState<CoursePreviewOverviewTab | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
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
  const totalExercises = useMemo(
    () =>
      Object.values(exercisesByModule).reduce((total, exercises) => total + exercises.length, 0),
    [exercisesByModule]
  );
  const totalTests = useMemo(
    () => Object.values(testsByModule).reduce((total, tests) => total + tests.length, 0),
    [testsByModule]
  );
  const thumbnailKind = useMemo(
    () => getCourseMediaKind(courseThumbnailPath),
    [courseThumbnailPath]
  );
  const thumbnailLabel = useMemo(
    () => getCourseMediaLabel(courseThumbnailPath),
    [courseThumbnailPath]
  );
  const activeLessonRef =
    (activeLessonId ? lessonRefById.get(activeLessonId) : null) ?? lessonSequence[0] ?? null;
  const activeModule = activeLessonRef?.module ?? modules[0] ?? null;
  const activeLesson = activeLessonRef?.lesson ?? null;
  const activeModuleLessons = activeModule ? lessonsByModule[activeModule.id] ?? [] : [];
  const activeModuleTests = activeModule ? testsByModule[activeModule.id] ?? [] : [];
  const activeModuleExercises = activeModule ? exercisesByModule[activeModule.id] ?? [] : [];
  const activeLessonExercises =
    activeLesson && activeModule
      ? getLessonExercises(activeModuleLessons, activeModuleExercises, activeLesson.id)
      : [];
  const activeLessonTests =
    activeLesson && activeModule
      ? getLessonTests(activeModuleLessons, activeModuleTests, activeLesson.id)
      : [];
  const activeContentType: ActiveContentType =
    activeExerciseId !== null ? "exercise" : activeTestId !== null ? "test" : "lesson";
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

  useEffect(() => {
    setActiveExerciseId(null);
    setActiveTestId(null);
    setChatContext(null);
    setChatMessagesByReference({});
    setOverviewModalTab(null);
    setIsDescriptionExpanded(false);
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
    setCompletedLessonIds(toRecord(storedProgress?.completedLessonIds));
    setCompletedExerciseIds(toRecord(storedProgress?.completedExerciseIds));
    setCompletedTestIds(toRecord(storedProgress?.completedTestIds));
  }, [activeLessonId, lessonRefById, lessonSequence, modules, progressStorageKey]);

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
          text: "Question saved with the current lesson or test reference.",
        },
      ],
    }));
  }

  function activateSequenceItem(item: CoursePreviewSequenceItem) {
    setExpandedModuleId(item.module.id);
    setActiveLessonId(item.lesson.id);
    setActiveExerciseId(item.type === "exercise" ? item.exercise.id : null);
    setActiveTestId(item.type === "test" ? item.test.id : null);
    setOverviewModalTab(null);

    if (item.type === "test") {
      setCompletedTestIds((currentMap) =>
        currentMap[item.test.id]
          ? currentMap
          : {
              ...currentMap,
              [item.test.id]: true,
            }
      );
    }
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

  const previewDescription = courseDescription?.trim() || EMPTY_DESCRIPTION;
  const normalizedPreviewDescription = useMemo(
    () => normalizeCourseDescription(previewDescription),
    [previewDescription]
  );
  const collapsedPreviewDescription = useMemo(
    () => getCollapsedCourseDescription(previewDescription),
    [previewDescription]
  );
  const hasExpandableDescription =
    collapsedPreviewDescription !== normalizedPreviewDescription;
  const displayedPreviewDescription = isDescriptionExpanded
    ? previewDescription
    : collapsedPreviewDescription;
  const overviewButtons = [
    {
      tab: "modules" as const,
      icon: Layers3,
      countLabel: `${modules.length} Modules`,
    },
    {
      tab: "lessons" as const,
      icon: Play,
      countLabel: `${lessonSequence.length} Lessons`,
    },
    {
      tab: "exercises" as const,
      icon: Code2,
      countLabel: `${totalExercises} Exercises`,
    },
    {
      tab: "tests" as const,
      icon: BadgeCheck,
      countLabel: `${totalTests} Tests`,
    },
  ];

  return (
    <>
      <section className="overflow-hidden rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200 bg-white px-4 py-5 md:px-6 md:py-6">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h1 className="max-w-[54rem] text-[1.7rem] font-semibold tracking-tight text-slate-950 md:text-[1.85rem]">
                {courseTitle}
              </h1>

              {hasExpandableDescription ? (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded((currentValue) => !currentValue)}
                  aria-expanded={isDescriptionExpanded}
                  aria-label={
                    isDescriptionExpanded
                      ? "Collapse course description"
                      : "Expand course description"
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:text-slate-700"
                >
                  {isDescriptionExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              ) : null}
            </div>

            <div className="grid gap-5 md:grid-cols-[272px_minmax(0,1fr)] md:items-start">
              <div className="aspect-[16/9] w-full self-start overflow-hidden rounded-lg border border-slate-200 bg-[#f8fafc]">
                {courseThumbnailUrl ? (
                  thumbnailKind === "image" ? (
                    <img
                      src={courseThumbnailUrl}
                      alt={`${courseTitle} thumbnail`}
                      className="h-full w-full object-cover"
                    />
                  ) : thumbnailKind === "video" ? (
                    <div className="flex h-full w-full items-center justify-center bg-slate-950">
                      <video
                        src={courseThumbnailUrl}
                        className="h-full w-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-5 text-center">
                      <FileImage className="h-10 w-10 text-slate-400" />
                      <p className="text-sm font-medium text-slate-500">{thumbnailLabel}</p>
                    </div>
                  )
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-5 text-center">
                    <FileImage className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-400">
                      Course thumbnail will appear here.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex min-h-full flex-col justify-between gap-4 md:min-h-[152px]">
                {hasExpandableDescription ? (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded((currentValue) => !currentValue)}
                    aria-expanded={isDescriptionExpanded}
                    aria-label={
                      isDescriptionExpanded
                        ? "Collapse course description"
                        : "Expand course description"
                    }
                    className={`cursor-pointer break-words text-left text-sm leading-7 text-slate-600 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13daec]/35 focus-visible:ring-offset-2 md:text-[0.95rem] ${
                      isDescriptionExpanded ? "whitespace-pre-line" : ""
                    }`}
                  >
                    {displayedPreviewDescription}
                  </button>
                ) : (
                  <p className="break-words text-sm leading-7 text-slate-600 md:text-[0.95rem]">
                    {displayedPreviewDescription}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  {overviewButtons.map((overviewButton) => {
                    const Icon = overviewButton.icon;
                    const isActive = overviewModalTab === overviewButton.tab;

                    return (
                      <button
                        key={overviewButton.tab}
                        type="button"
                        onClick={() => setOverviewModalTab(overviewButton.tab)}
                        className={getOverviewButtonClassName(
                          overviewButton.tab,
                          isActive
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getOverviewButtonIconClassName(
                              overviewButton.tab,
                              isActive
                            )}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {overviewButton.countLabel}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-70 transition group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          <CoursePreviewSidebarNavigation
            modules={modules}
            lessonsByModule={lessonsByModule}
            testsByModule={testsByModule}
            exercisesByModule={exercisesByModule}
            expandedModuleId={expandedModuleId}
            activeLessonId={activeLesson?.id ?? null}
            activeExerciseId={activeExerciseId}
            activeTestId={activeTestId}
            completedLessonIds={completedLessonIds}
            completedExerciseIds={completedExerciseIds}
            completedTestIds={completedTestIds}
            onModuleToggle={(moduleId) => {
              setExpandedModuleId((currentModuleId) =>
                currentModuleId === moduleId ? null : moduleId
              );
              setActiveExerciseId(null);
              setActiveTestId(null);

              const nextLesson = (lessonsByModule[moduleId] ?? [])[0] ?? null;

              if (nextLesson) {
                setActiveLessonId(nextLesson.id);
              }
            }}
            onSelectLesson={handleSelectLesson}
            onSelectExercise={handleSelectExercise}
            onSelectTest={handleSelectTest}
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
            onGoToPreviousItem={() => handleNavigateToItem(previousSequenceItem)}
            onGoToNextItem={() => handleNavigateToItem(nextSequenceItem)}
            onAskTeacher={handleOpenChat}
            onResolveExercise={(exerciseId) => {
              setCompletedExerciseIds((currentMap) => ({
                ...currentMap,
                [exerciseId]: true,
              }));
            }}
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
