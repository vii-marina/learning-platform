type AuthHeroTextProps = {
  title?: string;
  description?: string;
};

export function AuthHeroText({
  title = "Improve your skills with EduCat",
  description = "EduCation platform",
}: AuthHeroTextProps) {
  return (
    <div className="space-y-2 text-center">
      <h2 className="text-3xl font-semibold text-slate-900 md:text-4xl">
        {title}
      </h2>
      <p className="text-xs text-slate-500 md:text-sm">{description}</p>
    </div>
  );
}
