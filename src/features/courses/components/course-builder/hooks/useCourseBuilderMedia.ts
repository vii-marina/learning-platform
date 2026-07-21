import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { updateCourse } from "../../../api/index";
import {
  deleteCourseMedia,
  getCourseMediaPublicUrl,
  isAllowedCourseThumbnailFile,
  uploadCourseMedia,
} from "../../../api/courseMediaStorage";
import type { SavedCourseSnapshot } from "../lib/courseBuilderPageUtils";

type UseCourseBuilderMediaArgs = {
  currentCourseId: string | null;
  draftCourseSessionId: string;
  courseTitle: string;
  courseDescription: string;
  setMessage: Dispatch<SetStateAction<string>>;
  setSavedCourseSnapshot: Dispatch<SetStateAction<SavedCourseSnapshot | null>>;
};

export function useCourseBuilderMedia({
  currentCourseId,
  draftCourseSessionId,
  courseTitle,
  courseDescription,
  setMessage,
  setSavedCourseSnapshot,
}: UseCourseBuilderMediaArgs) {
  const [courseThumbnailPath, setCourseThumbnailPath] = useState<string | null>(null);
  const [pendingThumbnailCropFile, setPendingThumbnailCropFile] = useState<File | null>(null);
  const [isUploadingCourseMedia, setIsUploadingCourseMedia] = useState(false);

  const courseThumbnailUrl = useMemo(
    () => getCourseMediaPublicUrl(courseThumbnailPath),
    [courseThumbnailPath]
  );

  // Fallback when no snapshot was saved yet — mirrors the page's currentCourseSnapshot shape.
  const buildSnapshotFallback = (thumbnailPath: string | null): SavedCourseSnapshot => ({
    title: courseTitle.trim(),
    description: courseDescription.trim(),
    thumbnailPath,
  });

  const uploadCourseMediaFile = async (file: File) => {
    const mediaScopeId = currentCourseId ?? draftCourseSessionId;

    try {
      setIsUploadingCourseMedia(true);
      const uploadedPath = await uploadCourseMedia(mediaScopeId, file);
      setCourseThumbnailPath(uploadedPath);

      if (currentCourseId) {
        await updateCourse(currentCourseId, {
          thumbnail_path: uploadedPath,
        });
        setSavedCourseSnapshot((previousSnapshot) =>
          previousSnapshot
            ? {
                ...previousSnapshot,
                thumbnailPath: uploadedPath,
              }
            : buildSnapshotFallback(uploadedPath)
        );
      }

      setMessage("");
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Не вдалося завантажити медіа курсів.");
      }

      return false;
    } finally {
      setIsUploadingCourseMedia(false);
    }
  };

  const handleCourseMediaSelect = (file: File) => {
    if (!isAllowedCourseThumbnailFile(file)) {
      setMessage("Головне фото курсу повинно бути зображенням у форматі PNG, JPG або JPEG.");
      return;
    }

    setPendingThumbnailCropFile(file);
  };

  const handleCourseThumbnailCropClose = () => {
    if (isUploadingCourseMedia) {
      return;
    }

    setPendingThumbnailCropFile(null);
  };

  const handleCourseThumbnailCropConfirm = async (file: File) => {
    const didUploadSucceed = await uploadCourseMediaFile(file);

    if (didUploadSucceed) {
      setPendingThumbnailCropFile(null);
    }
  };

  const handleCourseMediaRemove = async () => {
    if (!courseThumbnailPath || isUploadingCourseMedia) {
      return;
    }

    const mediaPathToRemove = courseThumbnailPath;

    try {
      setIsUploadingCourseMedia(true);

      if (currentCourseId) {
        await updateCourse(currentCourseId, {
          thumbnail_path: null,
        });
      }

      let storageCleanupMessage = "";

      try {
        await deleteCourseMedia(mediaPathToRemove);
      } catch (error) {
        storageCleanupMessage =
          error instanceof Error && error.message.trim()
            ? `${error.message} Головне фото курсу було видалено, але старий файл не вдалося видалити.`
            : "Головне фото курсу було видалено, але старий файл не вдалося видалити.";
      }

      setCourseThumbnailPath(null);

      if (currentCourseId) {
        setSavedCourseSnapshot((previousSnapshot) =>
          previousSnapshot
            ? {
                ...previousSnapshot,
                thumbnailPath: null,
              }
            : buildSnapshotFallback(null)
        );
      }

      setMessage(storageCleanupMessage);
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Не вдалося видалити медіа курсу.");
      }
    } finally {
      setIsUploadingCourseMedia(false);
    }
  };

  return {
    courseThumbnailPath,
    setCourseThumbnailPath,
    courseThumbnailUrl,
    pendingThumbnailCropFile,
    isUploadingCourseMedia,
    handleCourseMediaSelect,
    handleCourseThumbnailCropClose,
    handleCourseThumbnailCropConfirm,
    handleCourseMediaRemove,
  };
}
