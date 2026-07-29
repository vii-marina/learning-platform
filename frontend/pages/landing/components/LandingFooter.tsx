import { Link } from "react-router-dom";
import { BrandMark } from "../../../components/ui";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#5549f1]/10 bg-white px-5 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark className="h-8 w-8" />
          <span className="font-extrabold text-[#1f1b4d]">EduCat</span>
        </Link>
        <p className="text-xs text-[#6d6a9f]">
          Платформа для створення курсів, проходження уроків і виконання практичних завдань.
        </p>
        <div className="flex gap-4 text-xs font-semibold text-[#6d6a9f]">
          <a href="#course-preview" className="hover:text-[#5549f1]">
            Превʼю курсу
          </a>
          <a href="#faq" className="hover:text-[#5549f1]">
            FAQ
          </a>
        </div>
      </div>
    </footer>
  );
}
