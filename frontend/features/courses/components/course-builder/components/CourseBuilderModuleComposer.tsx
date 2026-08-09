/**
 * The inline module composer.
 *
 * Two shapes in one conditional, and the distinction matters: on a course with no modules
 * yet this replaces the (empty) list and doubles as the empty state, so the teacher's first
 * action is naming a module. On a course that already has modules it appends below them.
 */

import {
  BadgeCheck,
  ChevronDown,
  Code2,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { ModuleContentList } from "./ModuleContentList";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import {
  exerciseActionButtonClassName,
  lessonActionButtonClassName,
  moduleCardClassName,
  moduleHeaderClassName,
  moduleHeaderDividerClassName,
  moduleSectionDividerClassName,
  testActionButtonClassName,
} from "./courseBuilderContentStepStyles";

export type CourseBuilderModuleComposerProps = {
  isFirstModuleComposerOpen: boolean;
  isNewModuleComposerOpen: boolean;
  nextModuleOrder: number;
  newModuleTitle: string;
  isCreatingModule: boolean;
  canSaveFirstModule: boolean;
  onNewModuleTitleChange: (value: string) => void;
  onSaveNewModule: () => void;
  ensureNewModuleExists: () => Promise<string | null>;
  onCreateLesson: (moduleId: string) => void;
  onCreateTest: (moduleId: string) => void;
  onCreateExercise: (moduleId: string) => void;
};

export function CourseBuilderModuleComposer({
  isFirstModuleComposerOpen,
  isNewModuleComposerOpen,
  nextModuleOrder,
  newModuleTitle,
  isCreatingModule,
  canSaveFirstModule,
  onNewModuleTitleChange,
  onSaveNewModule,
  ensureNewModuleExists,
  onCreateLesson,
  onCreateTest,
  onCreateExercise,
}: CourseBuilderModuleComposerProps) {
  return (
    <>
          {isFirstModuleComposerOpen ? (
            <article className={moduleCardClassName}>
              <div className={`${moduleHeaderClassName} ${moduleHeaderDividerClassName}`}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <GripVertical className="h-5 w-5 shrink-0 text-[#90a0b7]" />
                  <span className="shrink-0 text-xl font-semibold tracking-tight text-slate-950">
                    {`Module ${nextModuleOrder}:`}
                  </span>
                  <Input
                    value={newModuleTitle}
                    onChange={(event) => onNewModuleTitleChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void onSaveNewModule();
                      }
                    }}
                    autoFocus
                    disabled={isCreatingModule}
                    className="h-12 flex-1 border-slate-200 bg-white text-base font-medium"
                  />
                </div>

                <div className="flex items-center gap-1 text-[#bdd1e1]">
                  <span className="rounded-lg p-2">
                    <ChevronDown className="h-4 w-4" />
                  </span>
                  <span className="rounded-lg p-2">
                    <Pencil className="h-4 w-4" />
                  </span>
                  <span className="rounded-lg p-2">
                    <Trash2 className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="max-h-[16rem] overflow-y-auto px-4 py-4 md:px-5 md:py-5">
                  <ModuleContentList
                    moduleId=""
                    moduleOrder={nextModuleOrder}
                    lessons={[]}
                    tests={[]}
                    exercises={[]}
                    expandedLessonIds={{}}
                    expandedTestIds={{}}
                    expandedExerciseIds={{}}
                    onToggleLesson={() => {}}
                    onEditLesson={() => {}}
                    onDeleteLesson={() => {}}
                    onToggleTest={() => {}}
                    onEditTest={() => {}}
                    onDeleteTest={() => {}}
                    onToggleExercise={() => {}}
                    onEditExercise={() => {}}
                    onDeleteExercise={() => {}}
                  />
                </div>

                <div className={moduleSectionDividerClassName}>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={() => {
                        void (async () => {
                          const moduleId = await ensureNewModuleExists();
                          if (!moduleId) {
                            return;
                          }

                          onCreateLesson(moduleId);
                        })();
                      }}
                      disabled={!canSaveFirstModule}
                      className={lessonActionButtonClassName}
                    >
                      <Plus className="h-4 w-4 text-emerald-600" />
                      Додати урок
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={() => {
                        void (async () => {
                          const moduleId = await ensureNewModuleExists();
                          if (!moduleId) {
                            return;
                          }

                          onCreateTest(moduleId);
                        })();
                      }}
                      disabled={!canSaveFirstModule}
                      className={testActionButtonClassName}
                    >
                      <BadgeCheck className="h-4 w-4 text-[#8b5cf6]" />
                      Додати тест
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={() => {
                        void (async () => {
                          const moduleId = await ensureNewModuleExists();
                          if (!moduleId) {
                            return;
                          }

                          onCreateExercise(moduleId);
                        })();
                      }}
                      disabled={!canSaveFirstModule}
                      className={exerciseActionButtonClassName}
                    >
                      <Code2 className="h-4 w-4 text-[#f97316]" />
                      Додати вправу
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ) : isNewModuleComposerOpen ? (
            <article className={moduleCardClassName}>
              <div className={moduleHeaderClassName}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <GripVertical className="h-5 w-5 shrink-0 text-[#90a0b7]" />
                  <span className="shrink-0 text-xl font-semibold tracking-tight text-slate-950">
                    {`Module ${nextModuleOrder}:`}
                  </span>
                  <Input
                    value={newModuleTitle}
                    onChange={(event) => onNewModuleTitleChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void onSaveNewModule();
                      }
                    }}
                    autoFocus
                    disabled={isCreatingModule}
                    className="h-12 flex-1 border-slate-200 bg-white text-base font-medium"
                  />
                </div>
              </div>
            </article>
          ) : null}
    </>
  );
}
