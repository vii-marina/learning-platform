export function Header() {
  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <a href="/" className="text-lg font-semibold">
          EduCat
        </a>
        <nav className="flex gap-4 text-sm">
          <a href="/login" className="text-slate-600">
            Login
          </a>
          <a href="/register" className="text-slate-600">
            Create Account
          </a>
        </nav>
      </div>
    </header>
  );
}
