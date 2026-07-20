import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Lesson, Module } from "../../../api/index";
import type { CourseTest } from "../types/courseBuilderUiTypes";
import {
  buildOrderedModuleItems,
  getFirstModuleReviewSelection,
  getFirstReviewSelection,
  type BuilderStep,
  type ReviewPreviewSelection,
} from "../lib/courseBuilderPageUtils";
import { getYouTubeEmbedUrl } from "../lib/youtube";

type UseCourseBuilderReviewStateArgs = {
  activeStep: BuilderStep;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  courseThumbnailUrl: string | null;
  courseThumbnailKind: "image" | "video" | "file";
};

export function useCourseBuilderReviewState({
  activeStep,
  modules,
  lessonsByModule,
  testsByModule,
  courseThumbnailUrl,
  courseThumbnailKind,
}: UseCourseBuilderReviewStateArgs) {
  const [reviewPreviewSelection, setReviewPreviewSelection] =
    useState<ReviewPreviewSelection | null>(null);
  const [expandedReviewModuleId, setExpandedReviewModuleId] =
    useState<string | null>(null);

  const totalModules = modules.length;
  const totalLessons = useMemo(
    () =>
      modules.reduce((sum, module) => sum + (lessonsByModule[module.id]?.length || 0), 0),
    [lessonsByModule, modules]
  );
  const totalTests = useMemo(
    () => modules.reduce((sum, module) => sum + (testsByModule[module.id]?.length || 0), 0),
    [modules, testsByModule]
  );
  const firstReviewSelection = useMemo(
    () => getFirstReviewSelection(modules, lessonsByModule, testsByModule),
    [lessonsByModule, modules, testsByModule]
  );
  const resolvedReviewSelection = useMemo(() => {
    if (!reviewPreviewSelection) {
      return firstReviewSelection;
    }

    const selectionModule = modules.find(
      (module) => module.id === reviewPreviewSelection.moduleId
    );

    if (!selectionModule) {
      return firstReviewSelection;
    }

    if (reviewPreviewSelection.itemType === "lesson") {
      const lessonExists = (lessonsByModule[reviewPreviewSelection.moduleId] || []).some(
        (lesson) => lesson.id === reviewPreviewSelection.itemId
      );
      return lessonExists ? reviewPreviewSelection : firstReviewSelection;
    }

    const testExists = (testsByModule[reviewPreviewSelection.moduleId] || []).some(
      (test) => test.id === reviewPreviewSelection.itemId
    );
    return testExists ? reviewPreviewSelection : firstReviewSelection;
  }, [firstReviewSelection, lessonsByModule, modules, reviewPreviewSelection, testsByModule]);
  const reviewPreviewData = useMemo(() => {
    if (!resolvedReviewSelection) {
      return null;
    }

    const module = modules.find((item) => item.id === resolvedReviewSelection.moduleId);

    if (!module) {
      return null;
    }

    const lessons = lessonsByModule[module.id] || [];
    const tests = testsByModule[module.id] || [];
    const orderedItems = buildOrderedModuleItems(lessons, tests);

    if (resolvedReviewSelection.itemType === "lesson") {
      const lesson = lessons.find((item) => item.id === resolvedReviewSelection.itemId);

      if (!lesson) {
        return null;
      }

      return {
        module,
        lessons,
        tests,
        orderedItems,
        itemType: "lesson" as const,
        lesson,
      };
    }

    const test = tests.find((item) => item.id === resolvedReviewSelection.itemId);

    if (!test) {
      return null;
    }

    return {
      module,
      lessons,
      tests,
      orderedItems,
      itemType: "test" as const,
      test,
    };
  }, [lessonsByModule, modules, resolvedReviewSelection, testsByModule]);
  const isReviewContentLoading = modules.some(
    (module) => lessonsByModule[module.id] === undefined || testsByModule[module.id] === undefined
  );
  const publishBlockingIssues = useMemo(() => {
    const issues: string[] = [];

    if (modules.length === 0) {
      issues.push("Add at least one module before publishing the course.");
      return issues;
    }

    if (!isReviewContentLoading && totalLessons === 0) {
      issues.push("Add at least one lesson so at least one module contains lesson content.");
    }

    return issues;
  }, [isReviewContentLoading, modules.length, totalLessons]);
  const heroBackgroundStyle: CSSProperties | undefined =
    courseThumbnailUrl && courseThumbnailKind === "image"
      ? {
          backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.16) 0%, rgba(15, 23, 42, 0.82) 100%), url("${courseThumbnailUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;
  const currentLessonEmbedUrl =
    reviewPreviewData && reviewPreviewData.itemType === "lesson"
      ? getYouTubeEmbedUrl(reviewPreviewData.lesson.video_url)
      : null;
  const currentLessonPosition =
    reviewPreviewData && reviewPreviewData.itemType === "lesson"
      ? reviewPreviewData.lessons.findIndex(
          (lesson) => lesson.id === reviewPreviewData.lesson.id
        ) + 1
      : 0;
  const currentTestLinkedLesson =
    reviewPreviewData && reviewPreviewData.itemType === "test"
      ? reviewPreviewData.lessons.find(
          (lesson) => lesson.id === reviewPreviewData.test.afterLessonId
        ) || null
      : null;

  useEffect(() => {
    if (activeStep !== 3) {
      return;
    }

    if (!resolvedReviewSelection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the review selection when there's nothing to show
      setExpandedReviewModuleId(null);
      return;
    }

    if (
      !expandedReviewModuleId ||
      !modules.some((module) => module.id === expandedReviewModuleId)
    ) {
      setExpandedReviewModuleId(resolvedReviewSelection.moduleId);
    }
  }, [activeStep, expandedReviewModuleId, modules, resolvedReviewSelection]);

  const handleReviewModuleToggle = (moduleId: string) => {
    setExpandedReviewModuleId((prev) => (prev === moduleId ? null : moduleId));

    const nextSelection = getFirstModuleReviewSelection(
      moduleId,
      lessonsByModule,
      testsByModule
    );

    if (nextSelection) {
      setReviewPreviewSelection(nextSelection);
    }
  };

  const handleReviewItemSelect = (selection: ReviewPreviewSelection) => {
    setReviewPreviewSelection(selection);
    setExpandedReviewModuleId(selection.moduleId);
  };

  return {
    totalModules,
    totalLessons,
    totalTests,
    expandedReviewModuleId,
    resolvedReviewSelection,
    reviewPreviewData,
    isReviewContentLoading,
    publishBlockingIssues,
    heroBackgroundStyle,
    currentLessonEmbedUrl,
    currentLessonPosition,
    currentTestLinkedLesson,
    handleReviewModuleToggle,
    handleReviewItemSelect,
  };
}
