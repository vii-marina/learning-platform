import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import loaderCatAnimation from "../../assets/animations/loader-cat.lottie";

type LottieLoaderProps = {
  label?: string;
  size?: number;
  className?: string;
  textClassName?: string;
};

export function LottieLoader({
  label = "Loading . . .",
  size = 160,
  className = "",
  textClassName = "",
}: LottieLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <DotLottieReact
        src={loaderCatAnimation}
        autoplay
        loop
        style={{ width: size, height: size, backgroundColor: "transparent" }}
      />
      {label ? (
        <p className={`text-sm font-medium text-slate-500 ${textClassName}`}>
          {label}
        </p>
      ) : null}
    </div>
  );
}
