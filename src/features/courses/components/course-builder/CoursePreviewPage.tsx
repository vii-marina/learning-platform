import { useEffect, useMemo, useRef, useState } from "react";
import { getErrorMessage } from "../../../auth/api/backendClient";
import {
  generateExerciseWithAi,
  generateTestQuestionsWithAi,
  type Lesson,
  type Module,
} from "../../api";
import {
  createLocalEntityId,
  mapGeneratedQuestionsToCourseTestQuestions,
} from "./courseBuilderPageUtils";
import { CoursePreviewAskTeacherModal, type CoursePreviewChatContext, type CoursePreviewChatMessage } from "./CoursePreviewAskTeacherModal";
import { CoursePreviewLessonContent } from "./CoursePreviewLessonContent";
import { CoursePreviewModeSwitch } from "./CoursePreviewModeSwitch";
import { CoursePreviewSidebarNavigation } from "./CoursePreviewSidebarNavigation";
import { CoursePreviewTestModal } from "./CoursePreviewTestModal";
import type { CourseExercise, CourseTest } from "./courseBuilderUiTypes";
import {
  buildCoursePreviewLessonSequence,
  getCoursePreviewTestTitle,
  getLessonExercises,
  getLessonTests,
  getPreviewProgressStorageKey,
  isGeneratedCoursePreviewItem,
  type CoursePreviewLessonRef,
  type CoursePreviewMode,
} from "./coursePreviewUtils";

type CoursePreviewPageProps = {
  courseId?: string | null;
  courseTitle: string;
  courseDescription?: string | null;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  initialMode?: CoursePreviewMode;
  allowModeSelection?: boolean;
};

type StoredPreviewProgress = {
  mode?: string;
  viewAsStudent?: boolean;
  moduleId?: string | null;
  lessonId?: string | null;
  revealedTestIds?: string[];
  completedLessonIds?: string[];
  completedExerciseIds?: string[];
  completedTestIds?: string[];
};

type OpenTestState = {
  moduleId: string;
  lessonId: string;
  testId: string;
};

const previewModeMeta: Record<
  CoursePreviewMode,
  {
    label: string;
    description: string;
  }
> = {
  student: {
    label: "Student Mode",
    description: "Read lessons, answer practice, and resume where you left off.",
  },
  teacher: {
    label: "Teacher Preview",
    description: "Review the learning flow and validate generated practice before publishing.",
  },
};

function resolveStoredPreviewMode(mode: string | undefined): CoursePreviewMode | null {
  if (mode === "student" || mode === "teacher") {
    return mode;
  }

  if (mode === "admin") {
    return "teacher";
  }

  return null;
}

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

export function CoursePreviewPage({
  courseId = null,
  courseTitle,
  courseDescription = null,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  initialMode = "student",
  allowModeSelection = false,
}: CoursePreviewPageProps) {
  const [baseMode, setBaseMode] = useState<CoursePreviewMode>(initialMode);
  const [viewAsStudent, setViewAsStudent] = useState(false);
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
        lessonSequence.map((lessonRef) => [lessonRef.lesson.id, lessonRef] satisfies [string, CoursePreviewLessonRef])
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
  const resolvedMode = viewAsStudent ? "student" : baseMode;
  const modeMeta = previewModeMeta[resolvedMode];
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
    if (baseMode === "student" && viewAsStudent) {
      setViewAsStudent(false);
    }
  }, [baseMode, viewAsStudent]);

  useEffect(() => {
    setGeneratedExercisesByModule({});
    setGeneratedTestsByModule({});
    setOpenTest(null);
    setChatContext(null);
    setChatMessagesByReference({});
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

    const storedMode = resolveStoredPreviewMode(storedProgress?.mode);

    if (allowModeSelection && storedMode) {
      setBaseMode(storedMode);
    } else {
      setBaseMode(initialMode);
    }

    setViewAsStudent(Boolean(storedProgress?.viewAsStudent));
    setExpandedModuleId(resolvedModuleId);
    setActiveLessonId(resolvedLessonId);
    setActiveExerciseId(null);
    setRevealedTestIds(toRecord(storedProgress?.revealedTestIds));
    setCompletedLessonIds(toRecord(storedProgress?.completedLessonIds));
    setCompletedExerciseIds(toRecord(storedProgress?.completedExerciseIds));
    setCompletedTestIds(toRecord(storedProgress?.completedTestIds));
  }, [
    activeLessonId,
    allowModeSelection,
    initialMode,
    lessonRefById,
    lessonSequence,
    modules,
    progressStorageKey,
  ]);

  useEffect(() => {
    const payload: StoredPreviewProgress = {
      mode: baseMode,
      viewAsStudent,
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
    baseMode,
    completedExerciseIds,
    completedLessonIds,
    completedTestIds,
    expandedModuleId,
    progressStorageKey,
    revealedTestIds,
    viewAsStudent,
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
            order: (mergedTestsByModule[module.id] ?? []).length + (currentMap[module.id] ?? []).length + 1,
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

  function handleOpenTest(module: Module, lesson: Lesson, test: CourseTest) {
    setExpandedModuleId(module.id);
    setActiveLessonId(lesson.id);
    setActiveExerciseId(null);
    setRevealedTestIds((currentMap) => ({
      ...currentMap,
      [test.id]: true,
    }));
    setOpenTest({
      moduleId: module.id,
      lessonId: lesson.id,
      testId: test.id,
    });
  }

  const openTestGenerated =
    currentOpenTest !== null ? isGeneratedCoursePreviewItem(currentOpenTest.id) : false;

  return (
    <>
      <section className="overflow-hidden rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                  {modeMeta.label}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                  {`${lessonSequence.length} lessons`}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                  {`${totalExercises} exercises`}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                  {`${totalTests} tests`}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {courseTitle}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {courseDescription?.trim() || modeMeta.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap items-center gap-3">
                {allowModeSelection ? (
                  <CoursePreviewModeSwitch
                    value={baseMode}
                    onChange={(mode) => {
                      setBaseMode(mode);
                      setViewAsStudent(false);
                    }}
                  />
                ) : null}

                {baseMode !== "student" ? (
                  <button
                    type="button"
                    onClick={() => setViewAsStudent((currentValue) => !currentValue)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                      viewAsStudent
                        ? "border-[#13daec] bg-[#13daec]/10 text-[#0f172a]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-[#0f172a]"
                    }`}
                  >
                    View as Student
                  </button>
                ) : null}
              </div>

              {statusMessage ? (
                <p className="text-sm font-medium text-slate-500">{statusMessage}</p>
              ) : null}
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
            onSelectLesson={(moduleId, lessonId) => {
              setExpandedModuleId(moduleId);
              setActiveLessonId(lessonId);
              setActiveExerciseId(null);
              setOpenTest(null);
            }}
            onSelectExercise={(moduleId, lessonId, exerciseId) => {
              setExpandedModuleId(moduleId);
              setActiveLessonId(lessonId);
              setActiveExerciseId(exerciseId);
              setOpenTest(null);
            }}
            onSelectTest={(moduleId, lessonId, testId) => {
              const module = modules.find((currentModule) => currentModule.id === moduleId);
              const lesson = lessonRefById.get(lessonId)?.lesson ?? null;
              const test = (mergedTestsByModule[moduleId] ?? []).find(
                (currentTest) => currentTest.id === testId
              );

              if (!module || !lesson || !test) {
                return;
              }

              handleOpenTest(module, lesson, test);
            }}
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
