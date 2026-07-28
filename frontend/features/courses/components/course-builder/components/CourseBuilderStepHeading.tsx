type CourseBuilderStepHeadingProps = {
  title: string;
  description?: string;
};

export function CourseBuilderStepHeading({
  title,
  description,
}: CourseBuilderStepHeadingProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="max-w-3xl text-sm leading-6 text-slate-500 md:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
