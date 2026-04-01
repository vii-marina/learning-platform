import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  createModule,
  deleteExercise,
  deleteModule,
  deleteTestEntity,
  listExercisesByModule,
  listLessonsByModule,
  listModulesByCourse,
  listTestsByModule,
  updateModule,
} from "../../api";
import type { Exercise, Lesson, Module, TestEntity } from "../../api";
import type { CourseExercise, CourseTest } from "./courseBuilderUiTypes";
import { createLocalEntityId } from "./courseBuilderPageUtils";

type ModuleDeletedPayload = {
  moduleId: string;
  lessonIds: string[];
  testIds: string[];
  exerciseIds: string[];
};

type UseCourseBuilderContentDataArgs = {
  currentCourseId: string | null;
  draftCourseSessionId: string;
  setMessage: Dispatch<SetStateAction<string>>;
  hydrateCourseTest: (testEntity: TestEntity) => Promise<CourseTest>;
  onModuleDeleted?: (payload: ModuleDeletedPayload) => void;
};

function mapExerciseToCourseExercise(exercise: Exercise): CourseExercise {
  return {
    id: exercise.id,
    title: exercise.title,
    description: exercise.description,
    afterLessonId: exercise.after_lesson_id,
    type: exercise.type,
    content: exercise.content,
    createdAt: exercise.created_at,
    updatedAt: exercise.updated_at,
  };
}

export function useCourseBuilderContentData({
  currentCourseId,
  draftCourseSessionId,
  setMessage,
  hydrateCourseTest,
  onModuleDeleted,
}: UseCourseBuilderContentDataArgs) {
  const [modules, setModules] = useState<Module[]>([]);
  const [hasFetchedModules, setHasFetchedModules] = useState(false);
  const [modulesLoadState, setModulesLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [isNewModuleComposerOpen, setIsNewModuleComposerOpen] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [testsByModule, setTestsByModule] = useState<Record<string, CourseTest[]>>({});
  const [exercisesByModule, setExercisesByModule] = useState<Record<string, CourseExercise[]>>(
    {}
  );
  const [moduleContentLoadStateByModule, setModuleContentLoadStateByModule] = useState<
    Record<string, "idle" | "loading" | "ready" | "error">
  >({});

  const hasShownExercisesPermissionWarningRef = useRef(false);
  const exercisesPermissionWarningMessage =
    "Exercises could not be loaded because the database permissions for the exercises table are misconfigured. The rest of the course content is still loaded.";

  const nextModuleOrder = useMemo(
    () => modules.reduce((maxOrder, module) => Math.max(maxOrder, module.order), 0) + 1,
    [modules]
  );

  const fetchModules = async (courseId: string) => {
    setModulesLoadState("loading");

    try {
      const data = await listModulesByCourse(courseId);
      setModules(data);
      setMessage("");
      setModulesLoadState("ready");
      return data;
    } catch {
      setMessage("Unable to load modules.");
      setModulesLoadState("error");
      return null;
    } finally {
      setHasFetchedModules(true);
    }
  };

  const fetchLessons = async (moduleId: string) => {
    try {
      const data = await listLessonsByModule(moduleId);
      setLessonsByModule((prev) => ({ ...prev, [moduleId]: data }));
      setMessage("");
      return data;
    } catch {
      setMessage("Unable to load lessons.");
      return null;
    }
  };

  const fetchTests = async (moduleId: string) => {
    try {
      const entities = await listTestsByModule(moduleId);
      const tests = await Promise.all(entities.map(hydrateCourseTest));
      setTestsByModule((prev) => ({ ...prev, [moduleId]: tests }));
      setMessage("");
      return tests;
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Unable to load tests.");
      }
      return null;
    }
  };

  const fetchExercises = async (moduleId: string) => {
    try {
      const exercises = await listExercisesByModule(moduleId);
      const mappedExercises = exercises.map(mapExerciseToCourseExercise);
      setExercisesByModule((prev) => ({ ...prev, [moduleId]: mappedExercises }));
      setMessage((currentMessage) =>
        currentMessage === exercisesPermissionWarningMessage ? currentMessage : ""
      );
      return mappedExercises;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("permission denied for table exercises")
      ) {
        const mappedExercises: CourseExercise[] = [];
        setExercisesByModule((prev) => ({ ...prev, [moduleId]: mappedExercises }));
        if (!hasShownExercisesPermissionWarningRef.current) {
          setMessage(exercisesPermissionWarningMessage);
          hasShownExercisesPermissionWarningRef.current = true;
        }
        return mappedExercises;
      }

      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Unable to load exercises.");
      }
      return null;
    }
  };

  const createLocalModuleDraft = (title: string): Module => {
    const timestamp = new Date().toISOString();

    return {
      id: createLocalEntityId("module"),
      course_id: draftCourseSessionId,
      title,
      order: nextModuleOrder,
      created_at: timestamp,
      updated_at: timestamp,
    };
  };

  const openNewModuleComposer = () => {
    if (isNewModuleComposerOpen) {
      return;
    }

    setNewModuleTitle("");
    setIsNewModuleComposerOpen(true);
  };

  const closeNewModuleComposer = () => {
    setIsNewModuleComposerOpen(false);
    setNewModuleTitle("");
  };

  const handleSaveNewModule = async () => {
    if (!newModuleTitle.trim()) {
      return;
    }

    if (!currentCourseId) {
      const module = createLocalModuleDraft(newModuleTitle.trim());
      setModules((prev) => [...prev, module]);
      setLessonsByModule((prev) => ({ ...prev, [module.id]: [] }));
      setTestsByModule((prev) => ({ ...prev, [module.id]: [] }));
      setExercisesByModule((prev) => ({ ...prev, [module.id]: [] }));
      setModuleContentLoadStateByModule((prev) => ({ ...prev, [module.id]: "ready" }));
      setExpandedModuleId(module.id);
      closeNewModuleComposer();
      setMessage("");
      return;
    }

    try {
      setIsCreatingModule(true);
      const module = await createModule({
        course_id: currentCourseId,
        title: newModuleTitle.trim(),
      });
      setHasFetchedModules(false);
      await fetchModules(currentCourseId);
      setExpandedModuleId(module.id);
      closeNewModuleComposer();
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return;
      }

      setMessage("Unable to create module.");
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!editModuleId || !editModuleTitle.trim()) {
      return;
    }

    if (!currentCourseId) {
      setModules((prev) =>
        prev.map((module) =>
          module.id === editModuleId
            ? {
                ...module,
                title: editModuleTitle.trim(),
                updated_at: new Date().toISOString(),
              }
            : module
        )
      );
      setEditModuleId(null);
      setEditModuleTitle("");
      setMessage("");
      return;
    }

    try {
      await updateModule(editModuleId, { title: editModuleTitle.trim() });
      setEditModuleId(null);
      setEditModuleTitle("");
      setHasFetchedModules(false);
      await fetchModules(currentCourseId);
      setMessage("");
    } catch {
      setMessage("Unable to update module.");
    }
  };

  const buildDeletedModulePayload = (moduleId: string): ModuleDeletedPayload => ({
    moduleId,
    lessonIds: (lessonsByModule[moduleId] || []).map((lesson) => lesson.id),
    testIds: (testsByModule[moduleId] || []).map((test) => test.id),
    exerciseIds: (exercisesByModule[moduleId] || []).map((exercise) => exercise.id),
  });

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm("Delete this module?")) {
      return;
    }

    const deletedPayload = buildDeletedModulePayload(moduleId);

    if (!currentCourseId) {
      setModules((prev) => prev.filter((module) => module.id !== moduleId));
      setLessonsByModule((prev) => {
        const next = { ...prev };
        delete next[moduleId];
        return next;
      });
      setTestsByModule((prev) => {
        const next = { ...prev };
        delete next[moduleId];
        return next;
      });
      setExercisesByModule((prev) => {
        const next = { ...prev };
        delete next[moduleId];
        return next;
      });
      setModuleContentLoadStateByModule((prev) => {
        const next = { ...prev };
        delete next[moduleId];
        return next;
      });
      if (expandedModuleId === moduleId) {
        setExpandedModuleId(null);
      }
      onModuleDeleted?.(deletedPayload);
      setMessage("");
      return;
    }

    try {
      const moduleExercises =
        exercisesByModule[moduleId] ?? (await fetchExercises(moduleId)) ?? [];
      for (const exercise of moduleExercises) {
        await deleteExercise(exercise.id);
      }

      const moduleTests = testsByModule[moduleId] ?? (await fetchTests(moduleId)) ?? [];
      for (const test of moduleTests) {
        await deleteTestEntity(test.id);
      }

      await deleteModule(moduleId);
    } catch {
      setMessage("Unable to delete module.");
      return;
    }

    setLessonsByModule((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    setTestsByModule((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    setExercisesByModule((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    setModuleContentLoadStateByModule((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    if (expandedModuleId === moduleId) {
      setExpandedModuleId(null);
    }
    onModuleDeleted?.(deletedPayload);
    setHasFetchedModules(false);
    await fetchModules(currentCourseId);
    setMessage("");
  };

  const hasLoadedModuleContent = (moduleId: string) =>
    lessonsByModule[moduleId] !== undefined &&
    testsByModule[moduleId] !== undefined &&
    exercisesByModule[moduleId] !== undefined;

  const fetchModuleContent = async (moduleId: string) => {
    if (!currentCourseId) {
      setModuleContentLoadStateByModule((prev) => ({ ...prev, [moduleId]: "ready" }));
      return true;
    }

    if (moduleContentLoadStateByModule[moduleId] === "loading") {
      return false;
    }

    if (hasLoadedModuleContent(moduleId)) {
      setModuleContentLoadStateByModule((prev) => ({ ...prev, [moduleId]: "ready" }));
      return true;
    }

    setModuleContentLoadStateByModule((prev) => ({ ...prev, [moduleId]: "loading" }));

    const [lessons, tests, exercises] = await Promise.all([
      lessonsByModule[moduleId] ? Promise.resolve(lessonsByModule[moduleId]) : fetchLessons(moduleId),
      testsByModule[moduleId] ? Promise.resolve(testsByModule[moduleId]) : fetchTests(moduleId),
      exercisesByModule[moduleId]
        ? Promise.resolve(exercisesByModule[moduleId])
        : fetchExercises(moduleId),
    ]);

    const didLoadAllContent =
      lessons !== null && tests !== null && exercises !== null;

    setModuleContentLoadStateByModule((prev) => ({
      ...prev,
      [moduleId]: didLoadAllContent ? "ready" : "error",
    }));

    return didLoadAllContent;
  };

  const toggleModule = async (moduleId: string) => {
    const nextId = expandedModuleId === moduleId ? null : moduleId;
    setExpandedModuleId(nextId);

    if (currentCourseId && nextId && !hasLoadedModuleContent(nextId)) {
      await fetchModuleContent(nextId);
    }
  };

  return {
    modules,
    hasFetchedModules,
    modulesLoadState,
    expandedModuleId,
    isNewModuleComposerOpen,
    isCreatingModule,
    newModuleTitle,
    editModuleId,
    editModuleTitle,
    lessonsByModule,
    testsByModule,
    exercisesByModule,
    moduleContentLoadStateByModule,
    nextModuleOrder,
    setModules,
    setHasFetchedModules,
    setModulesLoadState,
    setExpandedModuleId,
    setNewModuleTitle,
    setEditModuleId,
    setEditModuleTitle,
    setLessonsByModule,
    setTestsByModule,
    setExercisesByModule,
    setModuleContentLoadStateByModule,
    fetchModules,
    fetchLessons,
    fetchTests,
    fetchExercises,
    fetchModuleContent,
    openNewModuleComposer,
    closeNewModuleComposer,
    handleSaveNewModule,
    handleUpdateModule,
    handleDeleteModule,
    toggleModule,
  };
}
