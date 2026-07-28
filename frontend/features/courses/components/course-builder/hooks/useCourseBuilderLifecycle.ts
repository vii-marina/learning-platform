import { useEffect, type Dispatch, type SetStateAction } from "react";
import { getCourseById, listModuleContent } from "../../../api/index";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import {
  mapExerciseToCourseExercise,
  mapHydratedTestsToCourseTests,
  type BuilderStep,
  type SavedCourseSnapshot,
} from "../lib/courseBuilderPageUtils";

type ModuleLoadState = "idle" | "loading" | "ready" | "error";

type UseCourseBuilderLifecycleArgs = {
  initialCourseId: string | null;
  activeStep: BuilderStep;
  currentCourseId: string | null;
  hasFetchedModules: boolean;
  modulesLoadState: ModuleLoadState;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  isNewModuleComposerOpen: boolean;
  hasUnsavedChanges: boolean;
  setActiveStep: Dispatch<SetStateAction<BuilderStep>>;
  setIsHydratingCourse: Dispatch<SetStateAction<boolean>>;
  setCurrentCourseId: Dispatch<SetStateAction<string | null>>;
  setSavedCourseSnapshot: Dispatch<SetStateAction<SavedCourseSnapshot | null>>;
  setCourseTitle: Dispatch<SetStateAction<string>>;
  setCourseDescription: Dispatch<SetStateAction<string>>;
  setCourseThumbnailPath: Dispatch<SetStateAction<string | null>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setModules: Dispatch<SetStateAction<Module[]>>;
  setLessonsByModule: Dispatch<SetStateAction<Record<string, Lesson[]>>>;
  setTestsByModule: Dispatch<SetStateAction<Record<string, CourseTest[]>>>;
  setExercisesByModule: Dispatch<SetStateAction<Record<string, CourseExercise[]>>>;
  setHasFetchedModules: Dispatch<SetStateAction<boolean>>;
  setModulesLoadState: Dispatch<SetStateAction<ModuleLoadState>>;
  setModuleContentLoadStateByModule: Dispatch<
    SetStateAction<Record<string, ModuleLoadState>>
  >;
  setExpandedModuleId: Dispatch<SetStateAction<string | null>>;
  fetchModules: (courseId: string) => Promise<unknown>;
  openNewModuleComposer: () => void;
};

// The page-level effects: initial-course hydration, unsaved-changes guard,
// module fetching, empty-state composer, review-step content fill. Pure
// relocation from CourseBuilderPage — the two eslint-disable suppressions
// are intentional and preserved. (The Cmd/Ctrl+S shortcut stays in the page:
// it reads the latest-ref, which must not cross a hook boundary.)
export function useCourseBuilderLifecycle({
  initialCourseId,
  activeStep,
  currentCourseId,
  hasFetchedModules,
  modulesLoadState,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  isNewModuleComposerOpen,
  hasUnsavedChanges,
  setActiveStep,
  setIsHydratingCourse,
  setCurrentCourseId,
  setSavedCourseSnapshot,
  setCourseTitle,
  setCourseDescription,
  setCourseThumbnailPath,
  setMessage,
  setModules,
  setLessonsByModule,
  setTestsByModule,
  setExercisesByModule,
  setHasFetchedModules,
  setModulesLoadState,
  setModuleContentLoadStateByModule,
  setExpandedModuleId,
  fetchModules,
  openNewModuleComposer,
}: UseCourseBuilderLifecycleArgs) {
  useEffect(() => {
    if (!initialCourseId) {
      setIsHydratingCourse(false);
      return;
    }

    let isCancelled = false;
    const courseSnapshotFromDb = async () => {
      setIsHydratingCourse(true);
      setMessage("");
      setActiveStep(1);
      setHasFetchedModules(false);
      setModulesLoadState("idle");
      setModules([]);
      setLessonsByModule({});
      setTestsByModule({});
      setExercisesByModule({});
      setModuleContentLoadStateByModule({});
      setExpandedModuleId(null);
      setCurrentCourseId(null);

      try {
        const course = await getCourseById(initialCourseId);
        const snapshot: SavedCourseSnapshot = {
          title: course.title ?? "",
          description: course.description ?? "",
          thumbnailPath: course.thumbnail_path,
        };

        if (isCancelled) {
          return;
        }

        setCourseTitle(snapshot.title);
        setCourseDescription(snapshot.description);
        setCourseThumbnailPath(snapshot.thumbnailPath);
        setCurrentCourseId(initialCourseId);
        setSavedCourseSnapshot(snapshot);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof Error && error.message.trim()) {
          setMessage(error.message);
        } else {
          setMessage("Не вдалося завантажити вибраний курс.");
        }
      } finally {
        if (!isCancelled) {
          setIsHydratingCourse(false);
        }
      }
    };

    void courseSnapshotFromDb();

    return () => {
      isCancelled = true;
    };
  }, [
    initialCourseId,
    setActiveStep,
    setCourseDescription,
    setCourseThumbnailPath,
    setCourseTitle,
    setCurrentCourseId,
    setExercisesByModule,
    setExpandedModuleId,
    setHasFetchedModules,
    setIsHydratingCourse,
    setLessonsByModule,
    setMessage,
    setModuleContentLoadStateByModule,
    setModules,
    setModulesLoadState,
    setSavedCourseSnapshot,
    setTestsByModule,
  ]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!currentCourseId) {
      queueMicrotask(() => {
        setHasFetchedModules(false);
        setModulesLoadState("idle");
      });
      return;
    }

    if (hasFetchedModules) {
      return;
    }

    queueMicrotask(() => {
      void fetchModules(currentCourseId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch modules once per course; fetchModules is recreated each render and must not re-trigger this
  }, [currentCourseId, hasFetchedModules]);

  useEffect(() => {
    if (
      activeStep !== 2 ||
      (currentCourseId ? modulesLoadState !== "ready" : false) ||
      (currentCourseId ? !hasFetchedModules : false) ||
      modules.length > 0 ||
      isNewModuleComposerOpen
    ) {
      return;
    }

    openNewModuleComposer();
    setExpandedModuleId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openNewModuleComposer is recreated each render; this should only react to the step/module state below
  }, [
    activeStep,
    currentCourseId,
    hasFetchedModules,
    isNewModuleComposerOpen,
    modulesLoadState,
    modules.length,
  ]);

  useEffect(() => {
    if (activeStep !== 3 || !currentCourseId || !hasFetchedModules) {
      return;
    }

    const missingModuleIds = modules
      .filter(
        (module) =>
          lessonsByModule[module.id] === undefined ||
          testsByModule[module.id] === undefined ||
          exercisesByModule[module.id] === undefined
      )
      .map((module) => module.id);

    if (missingModuleIds.length === 0) {
      return;
    }

    let isCancelled = false;

    void Promise.all(
      missingModuleIds.map(async (moduleId) => ({
        moduleId,
        content: await listModuleContent(moduleId),
      }))
    )
      .then((results) => {
        if (isCancelled) {
          return;
        }

        const lessonsEntries = results.map(({ moduleId, content }) => [moduleId, content.lessons]);
        const testsEntries = results.map(({ moduleId, content }) => [
          moduleId,
          mapHydratedTestsToCourseTests(content.tests),
        ]);
        const exercisesEntries = results.map(({ moduleId, content }) => [
          moduleId,
          content.exercises.map(mapExerciseToCourseExercise),
        ]);

        setLessonsByModule((prev) => ({
          ...prev,
          ...Object.fromEntries(lessonsEntries),
        }));
        setTestsByModule((prev) => ({
          ...prev,
          ...Object.fromEntries(testsEntries),
        }));
        setExercisesByModule((prev) => ({
          ...prev,
          ...Object.fromEntries(exercisesEntries),
        }));
        setMessage("");
      })
      .catch((error) => {
        if (!isCancelled) {
          if (error instanceof Error && error.message.trim()) {
            setMessage(error.message);
          } else {
            setMessage("Не вдалося завантажити вміст модуля.");
          }
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    activeStep,
    currentCourseId,
    exercisesByModule,
    hasFetchedModules,
    lessonsByModule,
    modules,
    testsByModule,
    setExercisesByModule,
    setLessonsByModule,
    setMessage,
    setTestsByModule,
  ]);

}
