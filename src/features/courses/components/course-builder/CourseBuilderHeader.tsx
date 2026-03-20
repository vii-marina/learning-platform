import { Sparkles } from "lucide-react";
import type { BuilderStep } from "./courseBuilderPageUtils";

type CourseBuilderHeaderProps = {
  steps: readonly { id: BuilderStep; label: string }[];
  activeStep: BuilderStep;
  currentCourseName: string;
  canRunPrimaryAction: boolean;
  primaryActionLabel: string;
  canNavigateToStep: (step: BuilderStep) => boolean;
  onStepChange: (step: BuilderStep) => void;
  onPrimaryAction: () => void;
};

export function CourseBuilderHeader({
  steps,
  activeStep,
  currentCourseName,
  canRunPrimaryAction,
  primaryActionLabel,
  canNavigateToStep,
  onStepChange,
  onPrimaryAction,
}: CourseBuilderHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[92rem] items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#13daec]/15 text-[#08bfd4]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-[#14213d]">
              Course Builder
            </p>
            <p className="text-xs text-slate-400">Instructor workflow</p>
          </div>
        </div>

        <nav className="hidden items-center gap-3 lg:flex">
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            const isEnabled = canNavigateToStep(step.id);

            return (
              <button
                key={step.id}
                type="button"
                disabled={!isEnabled}
                onClick={() => onStepChange(step.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#13daec] text-[#0f172a] shadow-[0_12px_22px_rgba(19,218,236,0.2)]"
                    : isEnabled
                      ? "text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                      : "cursor-not-allowed text-slate-300"
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 md:block">
            {currentCourseName}
          </div>
          <button
            type="button"
            disabled={!canRunPrimaryAction}
            onClick={onPrimaryAction}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#13daec] px-5 text-sm font-bold text-[#0f172a] shadow-[0_14px_28px_rgba(19,218,236,0.22)] transition hover:bg-[#10c6d7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
