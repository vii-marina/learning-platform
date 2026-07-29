import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { BrandMark } from "../../../components/ui";
import { PrimaryLink, SecondaryLink, stickerOutline } from "./primitives";

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Приклад курсу", href: "#course-preview" },
    { label: "Для викладачів", href: "#teachers" },
    { label: "Для студентів", href: "#students" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#1f1b4d] bg-[#f8f7ff]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark className="h-9 w-9" />
          <span className="text-base font-extrabold text-[#1f1b4d]">EduCat</span>
        </Link>

        <nav className="hidden flex-1 justify-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#6d6a9f] transition hover:bg-[#eceaff] hover:text-[#5549f1]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-xl px-3 py-2 text-sm font-bold text-[#1f1b4d] transition hover:bg-[#eceaff]"
          >
            Увійти
          </Link>
          <PrimaryLink to="/register" compact>
            Створити акаунт
          </PrimaryLink>
        </div>

        <button
          type="button"
          className={`sticker-cursor ml-auto rounded-xl bg-white p-2 text-[#1f1b4d] transition hover:bg-[#eceaff] md:hidden ${stickerOutline}`}
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
