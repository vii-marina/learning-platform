type CourseBuilderStepHeadingProps = {
  title: string;
  description?: string;
};

export function CourseBuilderStepHeading({
  title,
  description,
}: CourseBuilderStepHeadingProps) {
  return (
    <>
      <div className="mt-4">
        <h1 className="text-[0.75rem] font-extrabold tracking-tight text-[#14213d] md:text-[2.0rem]">
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
