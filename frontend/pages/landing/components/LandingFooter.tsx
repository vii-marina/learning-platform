import { ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../../components/ui";
import { landingContainer, stickerLiftSm, stickerOutline } from "../components/primitives";

export function LandingFooter() {
  return (
    <footer className="border-t-2 border-[#1f1b4d] bg-white py-10">
      <div
        className={`${landingContainer} flex flex-col items-center gap-6 md:grid md:grid-cols-3 md:gap-4`}
      >
        <Link to="/" className="flex items-center gap-2 md:justify-self-start">
          <BrandMark className="h-8 w-8" />
          <span className="font-extrabold text-[#1f1b4d]">EduCat</span>
        </Link>

        <p className="text-center text-sm text-[#6d6a9f]">
          made by:{" "}
          <span className="font-extrabold text-[#1f1b4d]">Vilkhovetska Marina</span>
        </p>

        <div className="flex items-center gap-3 md:justify-self-end">
          <span className="text-sm font-bold text-[#6d6a9f]">2026</span>
          <a
            href="#top"
            aria-label="Повернутися на початок сторінки"
            className={`sticker-press sticker-cursor flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#1f1b4d] ${stickerOutline} ${stickerLiftSm}`}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={3} />
          </a>
        </div>
      </div>
    </footer>
  );
}
