import { ArrowLeft } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { BuilderStep } from "../lib/courseBuilderPageUtils";

type CourseBuilderHeaderProps = {
  steps: readonly { id: BuilderStep; label: string }[];
  activeStep: BuilderStep;
  currentCourseName: string;
  canRunPrimaryAction: boolean;
  primaryActionLabel: string;
  canNavigateToStep: (step: BuilderStep) => boolean;
  onBackToCourses: () => void;
  onStepChange: (step: BuilderStep) => void;
  onPrimaryAction: () => void;
  embedded?: boolean;
};

export function CourseBuilderHeader({
  steps,
  activeStep,
  canRunPrimaryAction,
  primaryActionLabel,
  canNavigateToStep,
  onBackToCourses,
  onStepChange,
  onPrimaryAction,
  embedded = false,
}: CourseBuilderHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div
        className={`grid w-full grid-cols-1 gap-3 px-4 py-4 md:px-6 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center ${
          embedded ? "xl:px-8" : "mx-auto max-w-[92rem] lg:px-10"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onBackToCourses}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Мої курси</span>
            <span className="sm:hidden">Курси</span>
          </Button>

          
        </div>

        <nav className="hidden min-w-0 items-center justify-center overflow-x-auto xl:flex">
          <ol className="flex min-w-max items-center gap-2 px-2 2xl:gap-3">
            {steps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isEnabled = canNavigateToStep(step.id);
              const isComplete = step.id < activeStep && isEnabled;
              const stepStateClass = isActive
                ? "border-[#13daec]/45 bg-[#13daec]/10 shadow-sm"
                : isComplete
                  ? "border-slate-200 bg-white shadow-sm hover:border-slate-300"
                  : isEnabled
                    ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    : "border-slate-200 bg-slate-50";
              const badgeClass = isActive
                ? "bg-[#13daec] text-[#0f172a]"
                : isComplete
                  ? "bg-[#0f172a] text-white"
                  : isEnabled
                    ? "bg-slate-100 text-slate-500"
                    : "bg-slate-100 text-slate-300";
              const labelClass = isActive || isComplete ? "text-slate-950" : "text-slate-500";
              const connectorClass =
                step.id < activeStep
                  ? "bg-[#13daec]/55"
                  : "bg-slate-200";

              return (
                <li key={step.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!isEnabled}
                    aria-current={isActive ? "step" : undefined}
                    onClick={() => onStepChange(step.id)}
                    className={`flex h-14 items-center gap-3 rounded-xl border px-3 text-left transition 2xl:px-4 ${
                      isEnabled ? stepStateClass : `${stepStateClass} cursor-not-allowed`
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition ${badgeClass}`}
                    >
                      {step.id}
                    </span>
                    <span className="whitespace-nowrap">
                      <span className={`block text-sm font-bold ${labelClass}`}>
                        {step.label}
                      </span>
                    </span>
                  </button>

                  {index < steps.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={`h-[2px] w-8 rounded-full 2xl:w-16 ${connectorClass}`}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex min-w-0 items-center gap-3 xl:justify-end">
          <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-400 lg:block xl:hidden">
            {steps.find((step) => step.id === activeStep)?.label}
          </div>
          <Button
            type="button"
            size="lg"
            disabled={!canRunPrimaryAction}
            onClick={onPrimaryAction}
          >
            {primaryActionLabel}
          </Button>
        </div>
      </div>
    </header>
  );
}
