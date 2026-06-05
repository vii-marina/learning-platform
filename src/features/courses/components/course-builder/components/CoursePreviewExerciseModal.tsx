import { useEffect, useState } from "react";
import {  X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise } from "../types/courseBuilderUiTypes";
import type { CoursePreviewChatContext } from "./CoursePreviewAskTeacherModal";
import { CoursePreviewExerciseBlock } from "./CoursePreviewExerciseBlock";
import { isGeneratedCoursePreviewItem } from "../lib/coursePreviewUtils";
import { CoursePreviewSourceLessonPanel } from "./CoursePreviewSourceLessonPanel";

type CoursePreviewExerciseModalProps = {
  isOpen: boolean;
  module: Module | null;
  lesson: Lesson | null;
  exercises: CourseExercise[];
  selectedExerciseId: string | null;
  onClose: () => void;
  onAskTeacher: (context: CoursePreviewChatContext) => void;
  onResolveExercise: (exerciseId: string) => Promise<void> | void;
};

export function CoursePreviewExerciseModal({
  isOpen,
  module,
  lesson,
  exercises,
  selectedExerciseId,
  onClose,
  onAskTeacher,
  onResolveExercise,
}: CoursePreviewExerciseModalProps) {
  const [showSourceLesson, setShowSourceLesson] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setShowSourceLesson(false);
  }, [isOpen, lesson?.id]);

  useEffect(() => {
    if (!isOpen || !selectedExerciseId) {
      return;
    }

    const target = document.getElementById(`course-preview-exercise-${selectedExerciseId}`);

    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [exercises.length, isOpen, selectedExerciseId, showSourceLesson]);

  if (!isOpen || !module || !lesson || exercises.length === 0) {
    return null;
  }

  const title =
    exercises.length === 1 ? exercises[0].title : `Вправи після ${module.order}.${lesson.order}`;

  return (
    <div
      className="fixed inset-0 z-[130] bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
        <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_22px_80px_rgba(15,23,42,0.22)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 md:px-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  {`${exercises.length} вправ`}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  {`${module.order}.${lesson.order} ${lesson.title}`}
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-15 px-0"
              aria-label="Закрити модальне вікно вправи"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
            <div className="space-y-5">
              

              {showSourceLesson ? (
                <CoursePreviewSourceLessonPanel
                  module={module}
                  lesson={lesson}
                  tone="exercise"
                />
              ) : null}

              {exercises.map((exercise) => (
                <CoursePreviewExerciseBlock
                  key={exercise.id}
                  module={module}
                  lesson={lesson}
                  exercise={exercise}
                  isGenerated={isGeneratedCoursePreviewItem(exercise.id)}
                  isHighlighted={exercise.id === selectedExerciseId}
                  onAskTeacher={onAskTeacher}
                  onResolved={onResolveExercise}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
