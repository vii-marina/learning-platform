import { BadgeCheck, ChevronDown, ChevronRight } from "lucide-react";
import type { Lesson, Module } from "../../../../api/index";
import type { CourseTest } from "../../types/courseBuilderUiTypes";
import { getGeneratedCourseTestTitle } from "../../lib/courseBuilderPageUtils";
import { testSidebarIconClassNames } from "./constants";

type TestRowProps = {
  module: Module;
  test: CourseTest;
  lessons: Lesson[];
  activeTestId: string | null;
  previewTestId: string | null;
  showTestSourcePreview: boolean;
  registerRef: (node: HTMLElement | null) => void;
  onSelectTest?: (moduleId: string, test: CourseTest) => void;
  // Prepared by the orchestrator: sets the manual preview selection + collapses the module.
  onSelectPreviewTest: (moduleId: string, testId: string) => void;
};

export function TestRow({
  module,
  test,
  lessons,
  activeTestId,
  previewTestId,
  showTestSourcePreview,
  registerRef,
  onSelectTest,
  onSelectPreviewTest,
}: TestRowProps) {
  const isActiveTest = test.id === activeTestId;
  const isPreviewTest = showTestSourcePreview && previewTestId === test.id;
  const isSelectedTest = isActiveTest || isPreviewTest;
  const isNestedTest = Boolean(
    test.afterLessonId && lessons.some((lesson) => lesson.id === test.afterLessonId)
  );
  const displayTitle = getGeneratedCourseTestTitle({
    moduleOrder: module.order,
    lessons,
    afterLessonId: test.afterLessonId,
    fallbackTitle: test.title,
  });
  const testIconClassName = isSelectedTest
    ? testSidebarIconClassNames.active
    : testSidebarIconClassNames.inactive;
  const testRowContent = (
    <>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] ${testIconClassName}`}
      >
        <BadgeCheck className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {displayTitle}
      </span>
      {showTestSourcePreview ? (
        isSelectedTest ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-[#c4b5fd]" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[#c4b5fd]" />
        )
      ) : null}
    </>
  );

  const previewTestContent = showTestSourcePreview ? (
    <button
      type="button"
      onClick={() => onSelectPreviewTest(module.id, test.id)}
      className={`flex w-full items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition ${
        isSelectedTest
          ? "border-[#c4b5fd] bg-[#f5f3ff] text-[#14213d]"
          : "border-transparent bg-transparent text-slate-500 hover:border-[#ddd6fe] hover:bg-[#f5f3ff] hover:text-[#14213d]"
      }`}
    >
      {testRowContent}
    </button>
  ) : null;

  const testContent = onSelectTest ? (
    <button
      type="button"
      onClick={() => onSelectTest(module.id, test)}
      className={`flex w-full items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition ${
        isSelectedTest
          ? "border-[#c4b5fd] bg-[#f5f3ff] text-[#14213d]"
          : "border-transparent bg-transparent text-slate-500 hover:border-[#ddd6fe] hover:bg-[#f5f3ff] hover:text-[#14213d]"
      }`}
    >
      {testRowContent}
    </button>
  ) : (
    <div
      className={`flex items-center gap-3 rounded-[1rem] border px-3 py-2.5 ${
        isSelectedTest
          ? "border-[#c4b5fd] bg-[#f5f3ff] text-[#14213d]"
          : "border-transparent bg-transparent text-slate-500"
      }`}
    >
      {testRowContent}
    </div>
  );

  return (
    <div ref={registerRef} className={isNestedTest ? "pl-11" : ""}>
      {previewTestContent ?? testContent}
    </div>
  );
}
