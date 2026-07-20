import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type {
  DotLottie,
  LoadErrorEvent,
  RenderErrorEvent,
} from "@lottiefiles/dotlottie-web";
import loaderCatAnimationUrl from "../../assets/animations/loader-cat.lottie";

// Fetch the animation once and share it via `data`, so N on-screen loaders
// don't each re-fetch the same asset (StrictMode would double that again).
let loaderAnimationBufferPromise: Promise<ArrayBuffer> | null = null;

function getLoaderAnimationBuffer(): Promise<ArrayBuffer> {
  if (!loaderAnimationBufferPromise) {
    loaderAnimationBufferPromise = fetch(loaderCatAnimationUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load loader animation (${response.status}).`);
        }

        return response.arrayBuffer();
      })
      .catch((error) => {
        loaderAnimationBufferPromise = null; // allow retry
        throw error;
      });
  }

  return loaderAnimationBufferPromise;
}

void getLoaderAnimationBuffer().catch(() => {});

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
  const [animationData, setAnimationData] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    let isMounted = true;

    getLoaderAnimationBuffer()
      .then((buffer) => {
        if (isMounted) {
          // own copy — the renderer may detach the buffer it's given
          setAnimationData(buffer.slice(0));
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasAnimationError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
      {hasAnimationError || !animationData ? (
        <div
          aria-hidden="true"
          className="rounded-full border-4 border-slate-200 border-t-orange-400 animate-spin"
          style={{ width: size * 0.42, height: size * 0.42 }}
        />
      ) : (
        <DotLottieReact
          data={animationData}
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
