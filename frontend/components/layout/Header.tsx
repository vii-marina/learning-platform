import { BrandMark } from "../ui";

type HeaderProps = {
  showAuthLinks?: boolean;
  alignLeft?: boolean;
};

export function Header({ showAuthLinks = false, alignLeft = false }: HeaderProps) {
  return (
    <header className="border-b border-slate-200">
      <div
        className={`flex items-center justify-between px-4 py-4 ${
          alignLeft ? "mx-0 max-w-none" : "mx-auto max-w-5xl"
        }`}
      >
        <a href="/" className="flex items-center gap-2 text-lg font-semibold">
          <BrandMark className="h-8 w-8" />
          EduCat
        </a>
        {showAuthLinks ? (
          <nav className="flex gap-4 text-sm">
            <a href="/login" className="text-slate-600">
              Увійти
            </a>
            <a href="/register" className="text-slate-600">
              Створити акаунт
            </a>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
