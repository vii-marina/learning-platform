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

let loaderCatAnimationData: ArrayBuffer | null = null;
let loaderCatAnimationDataPromise: Promise<ArrayBuffer> | null = null;
const LOADER_ANIMATION_CACHE_NAME = "learning-platform-static-v1";

async function getCachedLoaderAnimationResponse() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return null;
  }

  const cache = await window.caches.open(LOADER_ANIMATION_CACHE_NAME);
  return cache.match(loaderCatAnimation);
}

async function persistLoaderAnimationResponse(response: Response) {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }

  const cache = await window.caches.open(LOADER_ANIMATION_CACHE_NAME);
  await cache.put(loaderCatAnimation, response);
}

async function getLoaderCatAnimationData() {
  if (loaderCatAnimationData) {
    return loaderCatAnimationData;
  }

  if (!loaderCatAnimationDataPromise) {
    loaderCatAnimationDataPromise = (async () => {
      const cachedResponse = await getCachedLoaderAnimationResponse();

      if (cachedResponse) {
        const cachedData = await cachedResponse.arrayBuffer();
        loaderCatAnimationData = cachedData;
        return cachedData;
      }

      const response = await fetch(loaderCatAnimation);

      if (!response.ok) {
        throw new Error(`Failed to load loader animation: ${response.status}`);
      }

      await persistLoaderAnimationResponse(response.clone());
      const data = await response.arrayBuffer();
      loaderCatAnimationData = data;
      return data;
    })()
      .catch((error) => {
        loaderCatAnimationDataPromise = null;
        throw error;
      });
  }

  return loaderCatAnimationDataPromise;
}

export function LottieLoader({
  label = "Loading . . .",
  size = 160,
  className = "",
  textClassName = "",
}: LottieLoaderProps) {
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const [animationData, setAnimationData] = useState<ArrayBuffer | null>(
    () => loaderCatAnimationData
  );
  const [hasAnimationError, setHasAnimationError] = useState(false);

  useEffect(() => {
    if (animationData) {
      return;
    }

    let isActive = true;

    void getLoaderCatAnimationData()
      .then((data) => {
        if (!isActive) {
          return;
        }

        setAnimationData(data);
        setHasAnimationError(false);
      })
      .catch(() => {
        if (isActive) {
          setHasAnimationError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [animationData]);

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
