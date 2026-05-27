type AuthHeroTextProps = {
  title?: string;
  description?: string;
};

export function AuthHeroText({
  title = "Покращуйте навички з EduCat",
  description = "Освітня платформа",
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
