import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export const landingContainer = "mx-auto w-full max-w-6xl px-5";

export const stickerOutline = "border-2 border-[#1f1b4d]";
export const stickerLift = "shadow-[6px_6px_0_0_#1f1b4d]";
export const stickerLiftSm = "shadow-[4px_4px_0_0_#1f1b4d]";

export function StickerCard({
  children,
  className = "",
  tone = "white",
  lift = "md",
}: {
  children: ReactNode;
  className?: string;
  tone?: "white" | "tint" | "violet" | "ink";
  lift?: "sm" | "md" | "none";
}) {
  const fill = {
    white: "bg-white text-[#1f1b4d]",
    tint: "bg-[#f1f0ff] text-[#1f1b4d]",
    violet: "bg-[#5549f1] text-white",
    ink: "bg-[#1f1b4d] text-white",
  }[tone];
  const shadow = lift === "md" ? stickerLift : lift === "sm" ? stickerLiftSm : "";

  return (
    <div className={`rounded-2xl ${stickerOutline} ${fill} ${shadow} ${className}`}>
      {children}
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="text-sm font-bold text-[#5549f1]">{eyebrow}</p>
          ) : null}
          <h2 className="mt-1.5 text-2xl font-extrabold leading-[1.2] text-[#1f1b4d] sm:text-3xl">
            {title}
          </h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {lead ? (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6d6a9f]">{lead}</p>
      ) : null}
    </div>
  );
}
export function PanelCaption({ index, name }: { index: string; name: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="text-sm font-extrabold text-[#5549f1]">{index}</span>
      <span className="h-px flex-1 bg-[#c7c3ff]" />
      <span className="text-sm font-extrabold text-[#1f1b4d]">{name}</span>
    </div>
  );
}

export function FrameLabel({ children }: { children: ReactNode }) {
  return <p className="text-[0.65rem] font-bold text-slate-500">{children}</p>;
}

export function StepNumber({ children }: { children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5549f1] text-sm font-extrabold text-white ${stickerOutline}`}
    >
      {children}
    </span>
  );
}

const buttonBase =
  "sticker-press sticker-cursor inline-flex items-center justify-center gap-2 rounded-xl font-bold";

export function PrimaryLink({
  to,
  children,
  compact = false,
}: {
  to: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`${buttonBase} ${stickerOutline} ${stickerLiftSm} bg-[#5549f1] text-white ${
        compact ? "px-4 py-2 text-sm" : "px-5 py-3 text-sm"
      }`}
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({
  to,
  children,
  compact = false,
}: {
  to: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`${buttonBase} ${stickerOutline} ${stickerLiftSm} bg-white text-[#1f1b4d] ${
        compact ? "px-4 py-2 text-sm" : "px-5 py-3 text-sm"
      }`}
    >
      {children}
    </Link>
  );
}
