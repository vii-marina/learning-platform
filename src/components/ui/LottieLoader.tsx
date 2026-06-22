import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type {
  DotLottie,
  LoadErrorEvent,
  RenderErrorEvent,
} from "@lottiefiles/dotlottie-web";
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
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const [hasAnimationError, setHasAnimationError] = useState(false);

  useEffect(() => {
    if (!dotLottie) {
      return;
    }

    const handleAnimationError = (_event: LoadErrorEvent | RenderErrorEvent) => {
      setHasAnimationError(true);
    };
    const handleAnimationLoad = () => {
      setHasAnimationError(false);
    };

    dotLottie.addEventListener("load", handleAnimationLoad);
    dotLottie.addEventListener("loadError", handleAnimationError);
    dotLottie.addEventListener("renderError", handleAnimationError);

    return () => {
      dotLottie.removeEventListener("load", handleAnimationLoad);
      dotLottie.removeEventListener("loadError", handleAnimationError);
      dotLottie.removeEventListener("renderError", handleAnimationError);
    };
  }, [dotLottie]);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      {hasAnimationError ? (
        <div
          aria-hidden="true"
          className="rounded-full border-4 border-slate-200 border-t-orange-400 animate-spin"
          style={{ width: size * 0.42, height: size * 0.42 }}
        />
      ) : (
        <DotLottieReact
          src={loaderCatAnimation}
          autoplay
          loop
          dotLottieRefCallback={setDotLottie}
          style={{ width: size, height: size, backgroundColor: "transparent" }}
        />
      )}
      {label ? (
        <p className={`text-sm font-medium text-slate-500 ${textClassName}`}>
          {label}
        </p>
      ) : null}
    </div>
  );
}
