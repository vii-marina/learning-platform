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
  embedded?: boolean;
};

export function CourseBuilderHeader({
  steps,
  activeStep,
  canRunPrimaryAction,
  primaryActionLabel,
  canNavigateToStep,
  onStepChange,
  onPrimaryAction,
  embedded = false,
}: CourseBuilderHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div
        className={`flex w-full items-center justify-between gap-4 px-6 py-4 ${
          embedded ? "xl:px-8" : "mx-auto max-w-[92rem] lg:px-10"
        }`}
      >
        

        <nav className="hidden flex-1 items-center justify-center xl:flex">
          <ol className="flex items-center gap-3">
            {steps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isEnabled = canNavigateToStep(step.id);
              const isComplete = step.id < activeStep && isEnabled;
              const stepStateClass = isActive
                ? "border-[#13daec]/70 bg-[#edfafd] shadow-[0_14px_28px_rgba(19,218,236,0.14)]"
                : isComplete
                  ? "border-slate-200 bg-white hover:border-slate-300"
                  : isEnabled
                    ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    : "border-slate-200/70 bg-slate-50/90";
              const badgeClass = isActive
                ? "bg-[#13daec] text-[#0f172a] shadow-[0_8px_18px_rgba(19,218,236,0.2)]"
                : isComplete
                  ? "bg-[#14213d] text-white"
                  : isEnabled
                    ? "bg-slate-100 text-slate-500"
                    : "bg-slate-100 text-slate-300";
              const labelClass = isActive || isComplete ? "text-[#14213d]" : "text-slate-500";
              const connectorClass =
                step.id < activeStep
                  ? "bg-[#13daec]/65"
                  : "bg-slate-200";

              return (
                <li key={step.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!isEnabled}
                    aria-current={isActive ? "step" : undefined}
                    onClick={() => onStepChange(step.id)}
                    className={`flex items-center gap-3 rounded-[1.35rem] border px-4 py-3 text-left transition ${
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
                      className={`h-[2px] w-20 rounded-full ${connectorClass}`}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:block xl:hidden">
            {steps.find((step) => step.id === activeStep)?.label}
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
