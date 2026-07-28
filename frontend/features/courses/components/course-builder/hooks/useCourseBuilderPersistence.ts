import type { Dispatch, SetStateAction } from "react";
import {
  createCourse,
  createLesson,
  createModule,
  createTestEntity,
  getCurrentTeacherId,
  listLessonsByModule,
  listModuleContent,
  listModulesByCourse,
  publishCourse,
  saveTestQuestions,
  upsertLessonPrimaryRichTextBlock,
  updateCourse,
} from "../../../api/index";
import type { Lesson, Module } from "../../../api/index";
import type {
  CourseExercise,
  CourseTest,
  CourseTestQuestion,
} from "../types/courseBuilderUiTypes";
import {
  buildAnswerPayloads,
  getGeneratedCourseTestTitle,
  mapExerciseToCourseExercise,
  mapHydratedTestsToCourseTests,
  type SavedCourseSnapshot,
} from "../lib/courseBuilderPageUtils";

type ModuleLoadState = "idle" | "loading" | "ready" | "error";

type UseCourseBuilderPersistenceArgs = {
  currentCourseId: string | null;
  setCurrentCourseId: Dispatch<SetStateAction<string | null>>;
  isPersistingCourse: boolean;
  setIsPersistingCourse: Dispatch<SetStateAction<boolean>>;
  courseTitle: string;
  courseDescription: string;
  courseThumbnailPath: string | null;
  currentCourseSnapshot: SavedCourseSnapshot;
  setSavedCourseSnapshot: Dispatch<SetStateAction<SavedCourseSnapshot | null>>;
  isBasicsComplete: boolean;
  canSaveDraft: boolean;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  setModules: Dispatch<SetStateAction<Module[]>>;
  setLessonsByModule: Dispatch<SetStateAction<Record<string, Lesson[]>>>;
  setTestsByModule: Dispatch<SetStateAction<Record<string, CourseTest[]>>>;
  setExercisesByModule: Dispatch<SetStateAction<Record<string, CourseExercise[]>>>;
  setHasFetchedModules: Dispatch<SetStateAction<boolean>>;
  setModulesLoadState: Dispatch<SetStateAction<ModuleLoadState>>;
  setModuleContentLoadStateByModule: Dispatch<
    SetStateAction<Record<string, ModuleLoadState>>
  >;
  setMessage: Dispatch<SetStateAction<string>>;
  showSuccessToast: (message: string) => void;
};

// Owns the save/publish pipeline: hydrate a persisted course, replay a local
// draft into the backend, and resolve local ids to persisted ones for the
// AI/exercise flows. `savedCourseSnapshot` stays owned by the page shell.
export function useCourseBuilderPersistence({
  currentCourseId,
  setCurrentCourseId,
  isPersistingCourse,
  setIsPersistingCourse,
  courseTitle,
  courseDescription,
  courseThumbnailPath,
  currentCourseSnapshot,
  setSavedCourseSnapshot,
  isBasicsComplete,
  canSaveDraft,
  modules,
  lessonsByModule,
  testsByModule,
  setModules,
  setLessonsByModule,
  setTestsByModule,
  setExercisesByModule,
  setHasFetchedModules,
  setModulesLoadState,
  setModuleContentLoadStateByModule,
  setMessage,
  showSuccessToast,
}: UseCourseBuilderPersistenceArgs) {
  const hydratePersistedCourse = async (
    courseId: string,
    courseSnapshot?: SavedCourseSnapshot
  ) => {
    setHasFetchedModules(false);
    setModulesLoadState("loading");

    try {
      const persistedModules = await listModulesByCourse(courseId);
      const moduleContent = await Promise.all(
        persistedModules.map(async (module) => {
          const content = await listModuleContent(module.id);

          return {
            moduleId: module.id,
            lessons: content.lessons,
            tests: mapHydratedTestsToCourseTests(content.tests),
            exercises: content.exercises.map(mapExerciseToCourseExercise),
          };
        })
      );

      setModules(persistedModules);
      setLessonsByModule(
        Object.fromEntries(
          moduleContent.map(({ moduleId, lessons }) => [moduleId, lessons])
        )
      );
      setTestsByModule(
        Object.fromEntries(moduleContent.map(({ moduleId, tests }) => [moduleId, tests]))
      );
      setExercisesByModule(
        Object.fromEntries(moduleContent.map(({ moduleId, exercises }) => [moduleId, exercises]))
      );
      setHasFetchedModules(true);
      setModulesLoadState("ready");
      setModuleContentLoadStateByModule(
        Object.fromEntries(
          persistedModules.map((module) => [module.id, "ready" as const])
        )
      );
      setCurrentCourseId(courseId);
      setSavedCourseSnapshot(courseSnapshot ?? currentCourseSnapshot);
      setMessage("");
    } catch (error) {
      setModulesLoadState("error");

      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return;
      }

      setMessage("Не вдалося перезавантажити збережений курс.");
    }
  };

  const persistTestQuestions = async (testId: string, questions: CourseTestQuestion[]) => {
    // Single bulk request (replace-all); backend clears + recreates in order.
    await saveTestQuestions(
      testId,
      questions.map((question, questionIndex) => ({
        type: question.type,
        question_text: question.questionText.trim(),
        order: questionIndex + 1,
        hint: question.hint ?? null,
        answers: buildAnswerPayloads(question),
      }))
    );
  };

  const persistLocalCourseContent = async (courseId: string) => {
    const sortedModules = [...modules].sort((left, right) => left.order - right.order);
    const lessonIdMap = new Map<string, string>();

    for (const module of sortedModules) {
      const createdModule = await createModule({
        course_id: courseId,
        title: module.title,
        order: module.order,
      });
      const moduleLessons = [...(lessonsByModule[module.id] || [])].sort(
        (left, right) => left.order - right.order
      );

      for (const lesson of moduleLessons) {
        const createdLesson = await createLesson({
          module_id: createdModule.id,
          title: lesson.title,
          content: lesson.content,
          video_url: lesson.video_url,
          content_type: lesson.content_type ?? "rich_text",
          order: lesson.order,
        });

        lessonIdMap.set(lesson.id, createdLesson.id);
        await upsertLessonPrimaryRichTextBlock(createdLesson.id, lesson.content ?? "");
      }

      const moduleTests = [...(testsByModule[module.id] || [])].sort(
        (left, right) => left.order - right.order
      );

      for (const test of moduleTests) {
        const persistedTest = await createTestEntity({
          module_id: createdModule.id,
          title: getGeneratedCourseTestTitle({
            moduleOrder: module.order,
            lessons: moduleLessons,
            afterLessonId: test.afterLessonId,
            fallbackTitle: test.title,
          }),
          after_lesson_id: test.afterLessonId
            ? lessonIdMap.get(test.afterLessonId) ?? null
            : null,
          order: test.order,
        });

        await persistTestQuestions(persistedTest.id, test.questions);
      }
    }
  };

  const persistCourseAtFinalStep = async (action: "draft" | "publish") => {
    if (isPersistingCourse) {
      return null;
    }

    if (action === "publish" && !isBasicsComplete) {
      return null;
    }

    if (action === "draft" && !canSaveDraft) {
      return null;
    }

    setIsPersistingCourse(true);

    try {
      const normalizedDraftTitle = courseTitle.trim() || "Курс без назви";
      const normalizedDescription = courseDescription.trim() || null;

      if (currentCourseId) {
        await updateCourse(currentCourseId, {
          title: action === "draft" ? normalizedDraftTitle : courseTitle.trim(),
          description: normalizedDescription,
          thumbnail_path: courseThumbnailPath,
        });

        if (action === "publish") {
          await publishCourse(currentCourseId);
        }

        setSavedCourseSnapshot(currentCourseSnapshot);
        setMessage("");
        showSuccessToast(action === "publish" ? "Курс опубліковано." : "Чернетка збережена.");
        return currentCourseId;
      }

      const teacherId = await getCurrentTeacherId();
      const createdCourse = await createCourse({
        teacher_id: teacherId,
        title: action === "draft" ? normalizedDraftTitle : courseTitle.trim(),
        description: normalizedDescription,
        thumbnail_path: courseThumbnailPath,
        is_published: false,
      });

      await persistLocalCourseContent(createdCourse.id);

      if (action === "publish") {
        await publishCourse(createdCourse.id);
      }

      await hydratePersistedCourse(createdCourse.id);
      setSavedCourseSnapshot(currentCourseSnapshot);
      setMessage("");
      showSuccessToast(action === "publish" ? "Курс опубліковано." : "Чернетка збережена.");
      return createdCourse.id;
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return null;
      }

      setMessage(
        action === "publish" ? "Не вдалося опублікувати курс." : "Не вдалося зберегти чернетку."
      );
      return null;
    } finally {
      setIsPersistingCourse(false);
    }
  };

  // Shared persisted-target resolution for the AI and exercise flows: a local
  // draft is saved first, then local module/lesson ids map to persisted ones
  // by `order` (stable across the replay above).
  const resolveAiGenerationTarget = async ({
    moduleId,
    afterLessonId,
  }: {
    moduleId: string;
    afterLessonId: string | null;
  }) => {
    const activeModule = modules.find((module) => module.id === moduleId);

    if (!activeModule) {
      throw new Error("Не вдалося знайти вибраний модуль.");
    }

    const selectedLesson = afterLessonId
      ? (lessonsByModule[moduleId] || []).find((lesson) => lesson.id === afterLessonId) ?? null
      : null;

    if (afterLessonId && !selectedLesson) {
      throw new Error("Не вдалося знайти вибраний урок.");
    }

    if (currentCourseId) {
      return {
        moduleId,
        afterLessonId,
      };
    }

    const persistedCourseId = await persistCourseAtFinalStep("draft");

    if (!persistedCourseId) {
      throw new Error("Не вдалося зберегти чернетку перед створенням AI контенту.");
    }

    const persistedModules = await listModulesByCourse(persistedCourseId);
    const persistedModule =
      persistedModules.find((module) => module.order === activeModule.order) ?? null;

    if (!persistedModule) {
      throw new Error("Не вдалося знайти збережений модуль.");
    }

    if (!selectedLesson) {
      return {
        moduleId: persistedModule.id,
        afterLessonId: null,
      };
    }

    const persistedLessons = await listLessonsByModule(persistedModule.id);
    const persistedLesson =
      persistedLessons.find((lesson) => lesson.order === selectedLesson.order) ?? null;

    if (!persistedLesson) {
      throw new Error("Не вдалося знайти збережений урок.");
    }

    return {
      moduleId: persistedModule.id,
      afterLessonId: persistedLesson.id,
    };
  };

  const resolveExerciseEditorModuleId = async (moduleId: string) => {
    const activeModule = modules.find((module) => module.id === moduleId);

    if (!activeModule) {
      throw new Error("Не вдалося знайти вибраний модуль.");
    }

    if (currentCourseId) {
      return moduleId;
    }

    const persistedCourseId = await persistCourseAtFinalStep("draft");

    if (!persistedCourseId) {
      throw new Error("Не вдалося зберегти чернетку перед створенням вправи.");
    }

    const persistedModules = await listModulesByCourse(persistedCourseId);
    const persistedModule =
      persistedModules.find((module) => module.order === activeModule.order) ?? null;

    if (!persistedModule) {
      throw new Error("Не вдалося знайти збережений модуль.");
    }

    return persistedModule.id;
  };

  return {
    hydratePersistedCourse,
    persistTestQuestions,
    persistCourseAtFinalStep,
    resolveAiGenerationTarget,
    resolveExerciseEditorModuleId,
  };
}
