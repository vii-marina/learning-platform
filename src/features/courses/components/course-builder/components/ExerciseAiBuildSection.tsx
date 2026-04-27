import type { ReactNode } from "react";
import { Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { ExerciseDifficulty } from "../../../api/index";
import {
  AI_DIFFICULTY_OPTIONS,
  getDifficultyOptionClassName,
} from "./exerciseCreateModalUtils";

type ExerciseAiBuildSectionProps = {
  selectedDifficulties: ExerciseDifficulty[];
  isDisabled: boolean;
  exerciseCountLimitError: boolean;
  exerciseCountInputValue: string;
  exerciseAiCountLimit: number;
  canAdjustExerciseCount: boolean;
  canSubmitAiGeneration: boolean;
  canGenerateAi: boolean;
  isGeneratingAi: boolean;
  isResolvingAiLimit: boolean;
  aiError: string;
  hasGeneratedExercises: boolean;
  hasUnconfirmedGeneratedExercise: boolean;
  unconfirmedGeneratedExerciseMessage: string;
  generatedExerciseEditors: ReactNode;
  onDifficultyToggle: (difficulty: ExerciseDifficulty) => void;
  onDecreaseExerciseCount: () => void;
  onExerciseCountInputChange: (value: string) => void;
  onIncreaseExerciseCount: () => void;
  onGenerateAi: () => void;
};

const aiBuildPanelClassName = "rounded-2xl bg-slate-50/70 p-5";
const aiGeneratedPanelClassName = "rounded-2xl bg-transparent";
const aiActionButtonClassName =
  "h-10 rounded-xl !border-orange-300 !bg-orange-500 px-5 text-sm font-semibold !text-white shadow-[0_0_18px_rgba(249,115,22,0.55),0_0_34px_rgba(251,146,60,0.24)] hover:!bg-orange-600 hover:shadow-[0_0_22px_rgba(249,115,22,0.7),0_0_42px_rgba(251,146,60,0.34)] disabled:shadow-none";

export function ExerciseAiBuildSection({
  selectedDifficulties,
  isDisabled,
  exerciseCountLimitError,
  exerciseCountInputValue,
  exerciseAiCountLimit,
  canAdjustExerciseCount,
  canSubmitAiGeneration,
  canGenerateAi,
  isGeneratingAi,
  isResolvingAiLimit,
  aiError,
  hasGeneratedExercises,
  hasUnconfirmedGeneratedExercise,
  unconfirmedGeneratedExerciseMessage,
  generatedExerciseEditors,
  onDifficultyToggle,
  onDecreaseExerciseCount,
  onExerciseCountInputChange,
  onIncreaseExerciseCount,
  onGenerateAi,
}: ExerciseAiBuildSectionProps) {
  return (
    <>
      <section className={aiBuildPanelClassName}>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-[#14213d]">Difficulty</p>
            <div className="mt-3 grid w-full gap-2 sm:grid-cols-3">
              {AI_DIFFICULTY_OPTIONS.map((option) => {
                const isActive = selectedDifficulties.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onDifficultyToggle(option.value)}
                    disabled={isDisabled || isGeneratingAi}
                    className={`inline-flex min-h-10 w-full items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      getDifficultyOptionClassName(option.value, isActive)
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-[16rem]">
              <p className="text-sm font-semibold text-[#14213d]">Exercise count</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div
                  className={`inline-flex h-10 items-center overflow-hidden rounded-xl border ${
                    exerciseCountLimitError
                      ? "border-rose-200 bg-rose-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={onDecreaseExerciseCount}
                    disabled={!canAdjustExerciseCount}
                    aria-label="Decrease exercise count"
                    className="inline-flex h-full w-10 items-center justify-center border-r border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={exerciseCountInputValue}
                    onChange={(event) => onExerciseCountInputChange(event.target.value)}
                    disabled={!canAdjustExerciseCount}
                    aria-label="Exercise count"
                    className="h-full w-20 bg-transparent px-3 text-center text-sm font-semibold text-[#14213d] outline-none disabled:cursor-not-allowed disabled:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={onIncreaseExerciseCount}
                    disabled={!canAdjustExerciseCount}
                    aria-label="Increase exercise count"
                    className="inline-flex h-full w-10 items-center justify-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p
                  className={`text-sm ${
                    exerciseCountLimitError ? "font-medium text-rose-600" : "text-slate-500"
                  }`}
                >
                  {`Max: ${exerciseAiCountLimit}`}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={onGenerateAi}
              disabled={!canSubmitAiGeneration}
              className={aiActionButtonClassName}
            >
              <Sparkles className="h-4 w-4" />
              {isGeneratingAi ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {isResolvingAiLimit ? (
            <p className="text-sm font-medium text-slate-600">
              Resolving maximum quantity...
            </p>
          ) : !canGenerateAi ? (
            <p className="text-sm font-medium text-amber-700">
              Source content is too short for AI exercise generation.
            </p>
          ) : null}

          {aiError ? <p className="text-sm font-medium text-rose-600">{aiError}</p> : null}
        </div>
      </section>

      {hasGeneratedExercises ? (
        <section className={aiGeneratedPanelClassName}>
          <div className="space-y-4">{generatedExerciseEditors}</div>

          {hasUnconfirmedGeneratedExercise ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {unconfirmedGeneratedExerciseMessage}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={onGenerateAi}
              disabled={!canSubmitAiGeneration}
              className={aiActionButtonClassName}
            >
              <Sparkles className="h-4 w-4" />
              {isGeneratingAi ? "Generating..." : "Generate another exercise"}
            </Button>
          </div>
        </section>
      ) : null}
    </>
  );
}
