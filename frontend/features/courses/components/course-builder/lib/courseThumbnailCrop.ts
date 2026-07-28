export const COURSE_THUMBNAIL_ASPECT_RATIO = 16 / 9;

export type CourseThumbnailCrop = {
  centerX: number;
  centerY: number;
  cropWidth: number;
  cropHeight: number;
};

type CropBoundsInput = {
  imageWidth: number;
  imageHeight: number;
  aspectRatio?: number;
};

type CropForZoomInput = CropBoundsInput & {
  zoom: number;
  centerX: number;
  centerY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getOutputMimeType(sourceFile: File) {
  if (sourceFile.type === "image/png" || sourceFile.type === "image/webp") {
    return sourceFile.type;
  }

  return "image/jpeg";
}

function getOutputExtension(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function getOutputFileName(sourceFile: File, mimeType: string) {
  const baseName = sourceFile.name.replace(/\.[^./\\]+$/, "") || "course-thumbnail";
  return `${baseName}.${getOutputExtension(mimeType)}`;
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string) {
  const quality = mimeType === "image/jpeg" ? 0.92 : undefined;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to generate the cropped thumbnail."));
        return;
      }

      resolve(blob);
    }, mimeType, quality);
  });
}

export function getMaxThumbnailCrop({
  imageWidth,
  imageHeight,
  aspectRatio = COURSE_THUMBNAIL_ASPECT_RATIO,
}: CropBoundsInput) {
  const imageAspectRatio = imageWidth / imageHeight;

  if (imageAspectRatio >= aspectRatio) {
    const cropHeight = imageHeight;
    const cropWidth = cropHeight * aspectRatio;
    return { cropWidth, cropHeight };
  }

  const cropWidth = imageWidth;
  const cropHeight = cropWidth / aspectRatio;
  return { cropWidth, cropHeight };
}

export function createThumbnailCropForZoom({
  imageWidth,
  imageHeight,
  aspectRatio = COURSE_THUMBNAIL_ASPECT_RATIO,
  zoom,
  centerX,
  centerY,
}: CropForZoomInput): CourseThumbnailCrop | null {
  if (imageWidth <= 0 || imageHeight <= 0 || zoom <= 0) {
    return null;
  }

  const { cropWidth: maxCropWidth, cropHeight: maxCropHeight } = getMaxThumbnailCrop({
    imageWidth,
    imageHeight,
    aspectRatio,
  });
  const cropWidth = maxCropWidth / zoom;
  const cropHeight = maxCropHeight / zoom;
  const clampedCenterX = clamp(centerX, cropWidth / 2, imageWidth - cropWidth / 2);
  const clampedCenterY = clamp(centerY, cropHeight / 2, imageHeight - cropHeight / 2);

  return {
    centerX: clampedCenterX,
    centerY: clampedCenterY,
    cropWidth,
    cropHeight,
  };
}

export function createInitialThumbnailCrop({
  imageWidth,
  imageHeight,
  aspectRatio = COURSE_THUMBNAIL_ASPECT_RATIO,
}: CropBoundsInput): CourseThumbnailCrop | null {
  return createThumbnailCropForZoom({
    imageWidth,
    imageHeight,
    aspectRatio,
    zoom: 1,
    centerX: imageWidth / 2,
    centerY: imageHeight / 2,
  });
}

export function moveThumbnailCrop(
  crop: CourseThumbnailCrop,
  {
    imageWidth,
    imageHeight,
    deltaX,
    deltaY,
  }: {
    imageWidth: number;
    imageHeight: number;
    deltaX: number;
    deltaY: number;
  }
): CourseThumbnailCrop {
  return {
    ...crop,
    centerX: clamp(
      crop.centerX + deltaX,
      crop.cropWidth / 2,
      imageWidth - crop.cropWidth / 2
    ),
    centerY: clamp(
      crop.centerY + deltaY,
      crop.cropHeight / 2,
      imageHeight - crop.cropHeight / 2
    ),
  };
}

export function drawThumbnailCropPreview(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
  crop: CourseThumbnailCrop
) {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to access the thumbnail preview canvas.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const sourceX = crop.centerX - crop.cropWidth / 2;
  const sourceY = crop.centerY - crop.cropHeight / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    crop.cropWidth,
    crop.cropHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
}

export async function exportThumbnailCropFile({
  image,
  sourceFile,
  crop,
  outputWidth = 1600,
  outputHeight = 900,
}: {
  image: CanvasImageSource;
  sourceFile: File;
  crop: CourseThumbnailCrop;
  outputWidth?: number;
  outputHeight?: number;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  drawThumbnailCropPreview(canvas, image, crop);

  const mimeType = getOutputMimeType(sourceFile);
  const blob = await canvasToBlob(canvas, mimeType);

  return new File([blob], getOutputFileName(sourceFile, mimeType), {
    type: mimeType,
    lastModified: Date.now(),
  });
}
