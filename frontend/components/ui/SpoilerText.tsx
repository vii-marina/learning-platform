import { useState } from "react";

type SpoilerTextProps = {
  text: string;
  label?: string;
  revealLabel?: string;
};

export function SpoilerText({
  text,
  label = "Підказка",
  revealLabel = "Натисніть, щоб показати",
}: SpoilerTextProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setIsRevealed(true)}
      data-revealed={isRevealed}
      aria-expanded={isRevealed}
      className={`spoiler-reveal relative w-full overflow-hidden rounded-[1.125rem] border px-4 py-4 text-left transition ${
        isRevealed
          ? "cursor-default border-[#c9e6ef] bg-[#eef8fc] text-[#14213d]"
          : "cursor-pointer border-[#bfe6f2] bg-[#eef9ff] text-[#14213d] hover:border-[#93d9ec]"
      }`}
    >
      <span className="relative z-[1] block text-base font-bold tracking-tight text-[#14213d]">
        {label}
      </span>
      <span className="spoiler-reveal__body relative z-[1] mt-2 block text-sm leading-6 text-[#3f5168]">
        {text}
      </span>
      {!isRevealed ? (
        <span className="spoiler-reveal__meta relative z-[1] mt-2 block text-xs font-semibold text-[#5f7892]">
          {revealLabel}
        </span>
      ) : null}
    </button>
  );
}
