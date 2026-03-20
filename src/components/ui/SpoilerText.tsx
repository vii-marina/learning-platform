import { useState } from "react";

type SpoilerTextProps = {
  text: string;
  label?: string;
  revealLabel?: string;
};

export function SpoilerText({
  text,
  label = "Hint",
  revealLabel = "Tap to reveal",
}: SpoilerTextProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setIsRevealed(true)}
      data-revealed={isRevealed}
      aria-expanded={isRevealed}
      className={`spoiler-reveal relative w-full overflow-hidden rounded-[1.125rem] border px-4 py-3 text-left transition ${
        isRevealed
          ? "cursor-default border-sky-200 bg-sky-50 text-sky-900"
          : "cursor-pointer border-sky-200/80 bg-sky-50/90 text-sky-900 hover:border-sky-300"
      }`}
    >
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700/80">
        {label}
      </span>
      <span className="spoiler-reveal__body block text-sm leading-6">{text}</span>
      {!isRevealed ? (
        <span className="spoiler-reveal__meta absolute inset-x-4 bottom-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700/70">
          {revealLabel}
        </span>
      ) : null}
    </button>
  );
}
