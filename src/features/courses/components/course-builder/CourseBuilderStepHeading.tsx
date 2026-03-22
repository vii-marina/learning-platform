import { Sparkles } from "lucide-react";

type CourseBuilderStepHeadingProps = {
  stepLabel: string;
  title: string;
  description?: string;
};

export function CourseBuilderStepHeading({
  stepLabel,
  title,
  description,
}: CourseBuilderStepHeadingProps) {
  return (
    <>
      <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-400">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#13daec] text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <span>{stepLabel}</span>
      </div>

      <div className="mt-4">
        <h1 className="text-[2.25rem] font-extrabold tracking-tight text-[#14213d] md:text-[2.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-4xl text-base leading-7 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
    </>
  );
}
