import { Card } from "./Card";
import { LottieLoader } from "./LottieLoader";

type LoadingStateVariant = "page" | "section" | "card" | "inline" | "modal";

type LoadingStateProps = {
  label?: string | null;
  variant?: LoadingStateVariant;
  size?: number;
  className?: string;
  loaderClassName?: string;
  textClassName?: string;
};

type LoadingVariantConfig = {
  size: number;
  surface: "card" | "plain";
  className: string;
  loaderClassName: string;
  textClassName: string;
};

const loadingVariantConfig: Record<LoadingStateVariant, LoadingVariantConfig> = {
  page: {
    size: 176,
    surface: "card",
    className:
      "flex min-h-[22rem] w-full items-center justify-center rounded-[1.75rem] border-cyan-100 bg-white/90 p-8 shadow-[0_20px_40px_rgba(15,23,42,0.06)] md:min-h-[26rem] md:p-10",
    loaderClassName: "gap-4",
    textClassName: "text-sm font-semibold   text-slate-500",
  },
  section: {
    size: 160,
    surface: "card",
    className:
      "flex min-h-[18rem] w-full items-center justify-center  bg-white/90 p-8 shadow-[0_20px_40px_rgba(15,23,42,0.06)] md:min-h-[20rem]",
    loaderClassName: "gap-4",
    textClassName: "text-sm font-semibold   text-slate-500",
  },
  card: {
    size: 144,
    surface: "card",
    className:
      "flex min-h-[14rem] w-full items-center justify-center  bg-slate-50/70 p-6 shadow-none",
    loaderClassName: "gap-3.5",
    textClassName: "text-sm font-semibold  text-slate-500",
  },
  inline: {
    size: 104,
    surface: "plain",
    className: "flex min-h-[10rem] w-full items-center justify-center bg-transparent px-4 py-5",
    loaderClassName: "gap-3",
    textClassName: "text-xs font-semibold text-slate-500",
  },
  modal: {
    size: 128,
    surface: "plain",
    className: "flex min-h-[15rem] w-full items-center justify-center bg-transparent px-6 py-8",
    loaderClassName: "gap-3.5",
    textClassName: "text-sm font-semibold text-slate-500",
  },
};

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function LoadingState({
  label = "Завантаження . . .",
  variant = "section",
  size,
  className = "",
  loaderClassName = "",
  textClassName = "",
}: LoadingStateProps) {
  const config = loadingVariantConfig[variant];
  const content = (
    <LottieLoader
      label={label ?? undefined}
      size={size ?? config.size}
      className={joinClassNames("mx-auto", config.loaderClassName, loaderClassName)}
      textClassName={joinClassNames(config.textClassName, textClassName)}
    />
  );

  if (config.surface === "card") {
    return <Card className={joinClassNames(config.className, className)}>{content}</Card>;
  }

  return <div className={joinClassNames(config.className, className)}>{content}</div>;
}
