import { BadgeCheck, Code2, FileImage, Layers3, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCourseMediaKind, getCourseMediaLabel } from "../../../api/courseMediaStorage";
import { getErrorMessage } from "../../../../auth/api/backendClient";
import {
  generateExerciseWithAi,
  generateTestQuestionsWithAi,
  type Lesson,
  type Module,
} from "../../../api/index";
import {
  createLocalEntityId,
  mapGeneratedQuestionsToCourseTestQuestions,
} from "../lib/courseBuilderPageUtils";
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
import { CoursePreviewTestModal } from "./CoursePreviewTestModal";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import {
  buildCoursePreviewLessonSequence,
  getCoursePreviewTestTitle,
  getLessonExercises,
  getLessonTests,
  getPreviewProgressStorageKey,
  isGeneratedCoursePreviewItem,
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
  revealedTestIds?: string[];
  completedLessonIds?: string[];
  completedExerciseIds?: string[];
  completedTestIds?: string[];
};

type OpenTestState = {
  moduleId: string;
  lessonId: string | null;
  testId: string;
};

const EMPTY_DESCRIPTION =
  "Review the learning flow and validate generated practice before publishing.";

function mergeCoursePreviewContent<T>(
  base: Record<string, T[]>,
  additions: Record<string, T[]>
) {
  const nextMap: Record<string, T[]> = {
    ...base,
  };

  Object.entries(additions).forEach(([moduleId, items]) => {
    nextMap[moduleId] = [...(nextMap[moduleId] ?? []), ...items];
  });

  return nextMap;
}

function toRecord(ids: string[] | undefined) {
  return Object.fromEntries((ids ?? []).map((id) => [id, true])) as Record<string, boolean>;
}

function getOverviewButtonClassName(tab: CoursePreviewOverviewTab) {
  const baseClassName =
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition";

  if (tab === "modules") {
    return `${baseClassName} border-[#13daec]/30 bg-[#13daec]/10 text-[#0f8ea0] hover:border-[#13daec]/45 hover:bg-[#13daec]/15`;
  }

  if (tab === "lessons") {
    return `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100`;
  }

  if (tab === "exercises") {
    return `${baseClassName} border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100`;
  }

  return `${baseClassName} border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 hover:bg-violet-100`;
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
  const [openTest, setOpenTest] = useState<OpenTestState | null>(null);
  const [generatedTestsByModule, setGeneratedTestsByModule] = useState<
    Record<string, CourseTest[]>
  >({});
  const [generatedExercisesByModule, setGeneratedExercisesByModule] = useState<
    Record<string, CourseExercise[]>
  >({});
  const [revealedTestIds, setRevealedTestIds] = useState<Record<string, boolean>>({});
  const [completedLessonIds, setCompletedLessonIds] = useState<Record<string, boolean>>({});
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Record<string, boolean>>({});
  const [completedTestIds, setCompletedTestIds] = useState<Record<string, boolean>>({});
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [chatContext, setChatContext] = useState<CoursePreviewChatContext | null>(null);
  const [chatMessagesByReference, setChatMessagesByReference] = useState<
    Record<string, CoursePreviewChatMessage[]>
  >({});
  const [overviewModalTab, setOverviewModalTab] =
    useState<CoursePreviewOverviewTab | null>(null);
  const initializedProgressKeyRef = useRef<string | null>(null);

  const progressStorageKey = useMemo(
    () => getPreviewProgressStorageKey(courseId, courseTitle),
    [courseId, courseTitle]
  );
  const mergedTestsByModule = useMemo(
    () => mergeCoursePreviewContent(testsByModule, generatedTestsByModule),
    [generatedTestsByModule, testsByModule]
  );
  const mergedExercisesByModule = useMemo(
    () => mergeCoursePreviewContent(exercisesByModule, generatedExercisesByModule),
    [exercisesByModule, generatedExercisesByModule]
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
  const totalExercises = useMemo(
    () =>
      Object.values(mergedExercisesByModule).reduce(
        (total, exercises) => total + exercises.length,
        0
      ),
    [mergedExercisesByModule]
  );
  const totalTests = useMemo(
    () =>
      Object.values(mergedTestsByModule).reduce((total, tests) => total + tests.length, 0),
    [mergedTestsByModule]
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
  const activeModuleTests = activeModule ? mergedTestsByModule[activeModule.id] ?? [] : [];
  const activeModuleExercises = activeModule
    ? mergedExercisesByModule[activeModule.id] ?? []
    : [];
  const activeLessonExercises =
    activeLesson && activeModule
      ? getLessonExercises(activeModuleLessons, activeModuleExercises, activeLesson.id)
      : [];
  const activeLessonTests =
    activeLesson && activeModule
      ? getLessonTests(activeModuleLessons, activeModuleTests, activeLesson.id)
      : [];
  const currentOpenTest = openTest
    ? (mergedTestsByModule[openTest.moduleId] ?? []).find((test) => test.id === openTest.testId) ??
      null
    : null;
  const currentOpenTestModule =
    openTest && activeModule?.id === openTest.moduleId
      ? activeModule
      : modules.find((module) => module.id === openTest?.moduleId) ?? null;
  const currentOpenTestLesson =
    openTest?.lessonId ? lessonRefById.get(openTest.lessonId)?.lesson ?? null : null;
  const currentOpenTestLessons =
    currentOpenTestModule ? lessonsByModule[currentOpenTestModule.id] ?? [] : [];
  const chatMessages = chatContext ? chatMessagesByReference[chatContext.reference] ?? [] : [];

  useEffect(() => {
    setGeneratedExercisesByModule({});
    setGeneratedTestsByModule({});
    setOpenTest(null);
    setChatContext(null);
    setChatMessagesByReference({});
    setOverviewModalTab(null);
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
    setRevealedTestIds(toRecord(storedProgress?.revealedTestIds));
    setCompletedLessonIds(toRecord(storedProgress?.completedLessonIds));
    setCompletedExerciseIds(toRecord(storedProgress?.completedExerciseIds));
    setCompletedTestIds(toRecord(storedProgress?.completedTestIds));
  }, [activeLessonId, lessonRefById, lessonSequence, modules, progressStorageKey]);

  useEffect(() => {
    const payload: StoredPreviewProgress = {
      moduleId: activeModule?.id ?? expandedModuleId ?? null,
      lessonId: activeLesson?.id ?? null,
      revealedTestIds: Object.keys(revealedTestIds),
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
    revealedTestIds,
  ]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStatusMessage("");
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  useEffect(() => {
    if (!openTest) {
      return;
    }

    const testStillExists = (mergedTestsByModule[openTest.moduleId] ?? []).some(
      (test) => test.id === openTest.testId
    );

    if (!testStillExists) {
      setOpenTest(null);
    }
  }, [mergedTestsByModule, openTest]);

  async function handleGeneratePractice(module: Module, lesson: Lesson) {
    if (generatingLessonId) {
      return;
    }

    setGeneratingLessonId(lesson.id);

    try {
      const exerciseType =
        lesson.content?.includes("<pre") || lesson.content?.includes("<code")
          ? "write_code"
          : "drag_drop_code";
      const [generatedExerciseContent, generatedQuestions] = await Promise.all([
        generateExerciseWithAi({
          moduleId: module.id,
          afterLessonId: lesson.id,
          type: exerciseType,
        }),
        generateTestQuestionsWithAi({
          moduleId: module.id,
          afterLessonId: lesson.id,
          questionCount: 3,
          generationMode: "mixed",
        }),
      ]);

      setGeneratedExercisesByModule((currentMap) => ({
        ...currentMap,
        [module.id]: [
          ...(currentMap[module.id] ?? []),
          {
            id: createLocalEntityId("generated-exercise"),
            title: "AI Practice Exercise",
            description: "Generated from the current lesson.",
            afterLessonId: lesson.id,
            type: generatedExerciseContent.type,
            content: generatedExerciseContent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }));
      setGeneratedTestsByModule((currentMap) => ({
        ...currentMap,
        [module.id]: [
          ...(currentMap[module.id] ?? []),
          {
            id: createLocalEntityId("generated-test"),
            title: "AI Practice Test",
            afterLessonId: lesson.id,
            order:
              (mergedTestsByModule[module.id] ?? []).length +
              (currentMap[module.id] ?? []).length +
              1,
            questions: mapGeneratedQuestionsToCourseTestQuestions(generatedQuestions),
          },
        ],
      }));
      setExpandedModuleId(module.id);
      setActiveLessonId(lesson.id);
      setStatusMessage("AI practice generated for this lesson.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Unable to generate more practice."));
    } finally {
      setGeneratingLessonId(null);
    }
  }

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

  function handleSelectModule(moduleId: string) {
    setExpandedModuleId(moduleId);
    setOverviewModalTab(null);

    const nextLesson = (lessonsByModule[moduleId] ?? [])[0] ?? null;

    if (!nextLesson) {
      return;
    }

    setActiveLessonId(nextLesson.id);
    setActiveExerciseId(null);
    setOpenTest(null);
  }

  function handleSelectLesson(moduleId: string, lessonId: string) {
    setExpandedModuleId(moduleId);
    setActiveLessonId(lessonId);
    setActiveExerciseId(null);
    setOpenTest(null);
    setOverviewModalTab(null);
  }

  function handleSelectExercise(moduleId: string, lessonId: string, exerciseId: string) {
    setExpandedModuleId(moduleId);
    setActiveLessonId(lessonId);
    setActiveExerciseId(exerciseId);
    setOpenTest(null);
    setOverviewModalTab(null);
  }

  function handleOpenTest(module: Module, lesson: Lesson | null, test: CourseTest) {
    setExpandedModuleId(module.id);

    if (lesson) {
      setActiveLessonId(lesson.id);
    }

    setActiveExerciseId(null);
    setRevealedTestIds((currentMap) => ({
      ...currentMap,
      [test.id]: true,
    }));
    setOpenTest({
      moduleId: module.id,
      lessonId: lesson?.id ?? null,
      testId: test.id,
    });
  }

  function handleSelectTest(moduleId: string, lessonId: string | null, testId: string) {
    const module = modules.find((currentModule) => currentModule.id === moduleId);
    const lesson = lessonId ? lessonRefById.get(lessonId)?.lesson ?? null : null;
    const test = (mergedTestsByModule[moduleId] ?? []).find(
      (currentTest) => currentTest.id === testId
    );

    if (!module || !test) {
      return;
    }

    handleOpenTest(module, lesson, test);
    setOverviewModalTab(null);
  }

  const openTestGenerated =
    currentOpenTest !== null ? isGeneratedCoursePreviewItem(currentOpenTest.id) : false;
  const previewDescription = courseDescription?.trim() || EMPTY_DESCRIPTION;

  return (
    <>
      <section className="overflow-hidden rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200 bg-white px-4 py-5 md:px-6 md:py-6">
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-[2rem]">
              {courseTitle}
            </h1>

            <div className="grid gap-6 md:grid-cols-[272px_minmax(0,1fr)] md:items-start">
              <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-[#f8fafc]">
                {courseThumbnailUrl ? (
                  thumbnailKind === "image" ? (
                    <img
                      src={courseThumbnailUrl}
                      alt={`${courseTitle} thumbnail`}
                      className="aspect-[16/9] h-full w-full object-cover"
                    />
                  ) : thumbnailKind === "video" ? (
                    <div className="flex aspect-[16/9] items-center justify-center bg-slate-950">
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
                    <div className="flex aspect-[16/9] flex-col items-center justify-center gap-3 px-5 text-center">
                      <FileImage className="h-10 w-10 text-slate-400" />
                      <p className="text-sm font-medium text-slate-500">{thumbnailLabel}</p>
                    </div>
                  )
                ) : (
                  <div className="flex aspect-[16/9] flex-col items-center justify-center gap-3 px-5 text-center">
                    <FileImage className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-400">
                      Course thumbnail will appear here.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-600 md:text-base">
                  {previewDescription}
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setOverviewModalTab("modules")}
                    className={getOverviewButtonClassName("modules")}
                  >
                    <Layers3 className="h-4 w-4" />
                    <span>{`${modules.length} Modules`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverviewModalTab("lessons")}
                    className={getOverviewButtonClassName("lessons")}
                  >
                    <Play className="h-4 w-4" />
                    <span>{`${lessonSequence.length} Lessons`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverviewModalTab("exercises")}
                    className={getOverviewButtonClassName("exercises")}
                  >
                    <Code2 className="h-4 w-4" />
                    <span>{`${totalExercises} Exercises`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverviewModalTab("tests")}
                    className={getOverviewButtonClassName("tests")}
                  >
                    <BadgeCheck className="h-4 w-4" />
                    <span>{`${totalTests} Tests`}</span>
                  </button>
                </div>

                {statusMessage ? (
                  <p className="text-sm font-medium text-slate-500">{statusMessage}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          <CoursePreviewSidebarNavigation
            modules={modules}
            lessonsByModule={lessonsByModule}
            testsByModule={mergedTestsByModule}
            exercisesByModule={mergedExercisesByModule}
            expandedModuleId={expandedModuleId}
            activeLessonId={activeLesson?.id ?? null}
            activeExerciseId={activeExerciseId}
            activeTestId={openTest?.testId ?? null}
            revealedTestIds={revealedTestIds}
            completedLessonIds={completedLessonIds}
            completedExerciseIds={completedExerciseIds}
            completedTestIds={completedTestIds}
            onModuleToggle={(moduleId) => {
              setExpandedModuleId((currentModuleId) =>
                currentModuleId === moduleId ? null : moduleId
              );

              const nextLesson = (lessonsByModule[moduleId] ?? [])[0] ?? null;

              if (nextLesson) {
                setActiveLessonId(nextLesson.id);
                setActiveExerciseId(null);
                setOpenTest(null);
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
            focusedExerciseId={activeExerciseId}
            completedTestIds={completedTestIds}
            generatingLessonId={generatingLessonId}
            onGeneratePractice={handleGeneratePractice}
            onOpenTest={handleOpenTest}
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
        testsByModule={mergedTestsByModule}
        exercisesByModule={mergedExercisesByModule}
        onSelectModule={handleSelectModule}
        onSelectLesson={handleSelectLesson}
        onSelectExercise={handleSelectExercise}
        onSelectTest={handleSelectTest}
      />

      <CoursePreviewTestModal
        isOpen={openTest !== null}
        module={currentOpenTestModule}
        lesson={currentOpenTestLesson}
        lessons={currentOpenTestLessons}
        test={currentOpenTest}
        isGenerated={openTestGenerated}
        onClose={() => setOpenTest(null)}
        onAskTeacher={handleOpenChat}
        onComplete={(testId) => {
          setCompletedTestIds((currentMap) => ({
            ...currentMap,
            [testId]: true,
          }));

          if (currentOpenTestModule && currentOpenTest) {
            setStatusMessage(
              `${getCoursePreviewTestTitle(
                currentOpenTestModule.order,
                currentOpenTestLessons,
                currentOpenTest
              )} completed.`
            );
          }
        }}
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
