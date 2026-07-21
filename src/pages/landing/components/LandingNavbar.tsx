import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Menu, X } from "lucide-react";
import { PrimaryLink, SecondaryLink } from "./primitives";

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Превʼю курсу", href: "#course-preview" },
    { label: "Для викладачів", href: "#teachers" },
    { label: "Для студентів", href: "#students" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#5549f1]/10 bg-[#f8f7ff]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5549f1] text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-base font-extrabold text-[#1f1b4d]">EduCat</span>
        </Link>

        <nav className="hidden flex-1 justify-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#6d6a9f] transition hover:bg-[#eceaff] hover:text-[#1f1b4d]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2 text-sm font-bold text-[#1f1b4d] transition hover:bg-[#eceaff]"
          >
            Увійти
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-[#5549f1] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#473ed4]"
          >
            Створити акаунт
          </Link>
        </div>

        <button
          type="button"
          className="ml-auto rounded-xl p-2 text-[#1f1b4d] transition hover:bg-[#eceaff] md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Відкрити меню"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#5549f1]/10 bg-[#f8f7ff] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#6d6a9f] hover:bg-[#eceaff]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            <SecondaryLink to="/login">Увійти</SecondaryLink>
            <PrimaryLink to="/register">Створити акаунт</PrimaryLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}
