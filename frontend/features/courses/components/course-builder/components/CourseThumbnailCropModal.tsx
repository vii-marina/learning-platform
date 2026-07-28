import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {   X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import {
  createInitialThumbnailCrop,
  createThumbnailCropForZoom,
  drawThumbnailCropPreview,
  exportThumbnailCropFile,
  moveThumbnailCrop,
  type CourseThumbnailCrop,
} from "../lib/courseThumbnailCrop";

type CourseThumbnailCropModalProps = {
  isOpen: boolean;
  sourceFile: File | null;
  isUploading?: boolean;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void> | void;
};

type ImageState = {
  dataUrl: string;
  image: HTMLImageElement;
  width: number;
  height: number;
};

type PreviewStatus = "idle" | "loading" | "ready" | "error";

type CanvasSize = {
  width: number;
  height: number;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Не вдалося прочитати вибране зображення."));
    };

    reader.onerror = () => {
      reject(new Error("Не вдалося прочитати вибране зображення."));
    };

    reader.readAsDataURL(file);
  });
}

async function loadImageFromFile(file: File): Promise<ImageState> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = new window.Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Не вдалося відкрити вибране зображення."));
    image.src = dataUrl;
  });

  return {
    dataUrl,
    image,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

export function CourseThumbnailCropModal({
  isOpen,
  sourceFile,
  isUploading = false,
  onClose,
  onConfirm,
}: CourseThumbnailCropModalProps) {
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [previewError, setPreviewError] = useState("");
  const [imageState, setImageState] = useState<ImageState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState<CourseThumbnailCrop | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: CourseThumbnailCrop;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isUploading && !isExporting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExporting, isOpen, isUploading, onClose]);

  useEffect(() => {
    if (!isOpen || !sourceFile) {
      setPreviewStatus("idle");
      setPreviewError("");
      setImageState(null);
      setCrop(null);
      return;
    }

    let isCancelled = false;

    setPreviewStatus("loading");
    setPreviewError("");
    setImageState(null);
    setCrop(null);
    setZoom(1);

    void loadImageFromFile(sourceFile)
      .then((nextImageState) => {
        if (isCancelled) {
          return;
        }

        setImageState(nextImageState);
        setCrop(
          createInitialThumbnailCrop({
            imageWidth: nextImageState.width,
            imageHeight: nextImageState.height,
          })
        );
        setPreviewStatus("ready");
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        setPreviewStatus("error");
        setPreviewError(
          error instanceof Error && error.message.trim()
            ? error.message
            : "Не вдалося завантажити вибране зображення."
        );
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, sourceFile]);

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;

    if (!isOpen || !wrapper) {
      return;
    }

    const updateCanvasSize = () => {
      setCanvasSize({
        width: wrapper.clientWidth,
        height: wrapper.clientHeight,
      });
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(wrapper);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!imageState || !crop) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas || canvasSize.width <= 0 || canvasSize.height <= 0) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    const renderWidth = Math.max(1, Math.round(canvasSize.width * pixelRatio));
    const renderHeight = Math.max(1, Math.round(canvasSize.height * pixelRatio));

    if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
      canvas.width = renderWidth;
      canvas.height = renderHeight;
    }

    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    drawThumbnailCropPreview(canvas, imageState.image, crop);
  }, [canvasSize.height, canvasSize.width, crop, imageState]);

  const isBusy = isUploading || isExporting;
  const isReady = previewStatus === "ready" && imageState !== null && crop !== null;

  const currentZoomLabel = useMemo(() => `${zoom.toFixed(2)}x`, [zoom]);

  if (!isOpen || !sourceFile) {
    return null;
  }

  const handleZoomChange = (nextZoom: number) => {
    if (!imageState || !crop) {
      setZoom(nextZoom);
      return;
    }

    setZoom(nextZoom);
    setCrop(
      createThumbnailCropForZoom({
        imageWidth: imageState.width,
        imageHeight: imageState.height,
        zoom: nextZoom,
        centerX: crop.centerX,
        centerY: crop.centerY,
      })
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!imageState || !crop || isBusy) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: crop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;

    if (
      !dragState ||
      dragState.pointerId !== event.pointerId ||
      !imageState ||
      !crop ||
      canvasSize.width <= 0 ||
      canvasSize.height <= 0
    ) {
      return;
    }

    const deltaScreenX = event.clientX - dragState.startX;
    const deltaScreenY = event.clientY - dragState.startY;
    const deltaImageX = -(deltaScreenX * dragState.origin.cropWidth) / canvasSize.width;
    const deltaImageY = -(deltaScreenY * dragState.origin.cropHeight) / canvasSize.height;

    setCrop(
      moveThumbnailCrop(dragState.origin, {
        imageWidth: imageState.width,
        imageHeight: imageState.height,
        deltaX: deltaImageX,
        deltaY: deltaImageY,
      })
    );
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;

    if (dragState?.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleConfirm = async () => {
    if (!imageState || !crop) {
      return;
    }

    try {
      setIsExporting(true);
      const croppedFile = await exportThumbnailCropFile({
        image: imageState.image,
        sourceFile,
        crop,
      });
      await onConfirm(croppedFile);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/70 px-4 py-5 backdrop-blur-sm">
      <div className="flex w-full max-w-[56rem] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <div className="relative border-b border-slate-200 px-6 py-5 pr-20">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Закрити модальне вікно обрізання обкладинки"
            className="absolute right-5 top-5 rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="space-y-2">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight text-[#14213d]">
                Adjust the course thumbnail
              </h3>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch">
          <div className="space-y-3">
            <div
              ref={canvasWrapperRef}
              className="relative aspect-video w-full touch-none overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(19,218,236,0.14),_transparent_28%),linear-gradient(135deg,#e2e8f0_0%,#f8fafc_100%)]"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
            >
              <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

              {previewStatus === "loading" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/65">
                  <div className="space-y-2 text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#13daec]" />
                    <p className="text-sm font-medium text-slate-600">Завантаження перегляду зображення...</p>
                  </div>
                </div>
              ) : null}

              {previewStatus === "error" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 px-6">
                  <div className="max-w-md space-y-3 text-center">
                    <p className="text-base font-semibold text-slate-900">
                      Thumbnail preview unavailable
                    </p>
                    <p className="text-sm leading-6 text-slate-500">
                      {previewError || "Не вдалося завантажити вибране зображення."}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 border-[10px] border-white/40" />
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/70" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/70" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/70" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/70" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
            </div>
          </div>

          <div className="flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-950">Масштаб</p>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                disabled={!isReady || isBusy}
                onChange={(event) => {
                  handleZoomChange(Number(event.target.value));
                }}
                className="w-full accent-[#13daec]"
              />
              <p className="text-xs leading-5 text-slate-500">
                {isReady
                  ? `Поточний масштаб: ${currentZoomLabel}`
                  : previewStatus === "error"
                    ? "Оберіть зображення JPG, PNG, WebP, GIF або SVG."
                    : "Очікування перегляду зображення..."}
              </p>
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button
                type="button"
                variant="accent"
                size="lg"
                disabled={!isReady || isBusy}
                onClick={() => {
                  void handleConfirm();
                }}
                className="w-full rounded-2xl shadow-[0_12px_28px_rgba(19,218,236,0.22)]"
              >
                {isBusy ? "Збереження обкладинки..." : "Готово"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={isBusy}
                onClick={onClose}
                className="w-full rounded-2xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
