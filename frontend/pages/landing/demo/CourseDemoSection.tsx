import { useEffect, useState } from "react";
import { publicBackendRequest } from "../../../features/auth/api/backendClient";
import { dedupeRequest } from "../../../lib/requestDedup";
import type { PreviewMode, PublicLandingPreview, LandingPreviewStatus } from "../types";
import { CoursePreviewPlaceholder } from "./CoursePreviewPlaceholder";
import { CoursePreviewFrame, LandingCourseSummary } from "./CoursePreviewFrame";

// Self-contained landing demo: owns the preview fetch + the selected mode. Lazy-loaded
// by LandingPage so it (and its backend/storage imports) stay out of the initial chunk.
export default function CourseDemoSection() {
  const [landingPreview, setLandingPreview] = useState<PublicLandingPreview | null>(null);
  const [landingPreviewStatus, setLandingPreviewStatus] =
    useState<LandingPreviewStatus>("loading");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("lesson");

  useEffect(() => {
    let isMounted = true;

    async function loadLandingPreview() {
      try {
        setLandingPreviewStatus("loading");
        const loadedPreview = await dedupeRequest("public:landing-preview", () =>
          publicBackendRequest<PublicLandingPreview>("/public/landing-preview")
        );

        if (isMounted) {
          setLandingPreview(loadedPreview);
          setLandingPreviewStatus("ready");
        }
      } catch {
        if (isMounted) {
          setLandingPreview(null);
          setLandingPreviewStatus("error");
        }
      }
    }

    void loadLandingPreview();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!landingPreview) {
    return (
      <section id="course-preview" className="bg-[#f8f7ff] px-5 pb-16 pt-4 text-center">
        <CoursePreviewPlaceholder status={landingPreviewStatus} />
      </section>
    );
  }

  const resolvedPreviewMode =
    (previewMode === "test" && !landingPreview.test) ||
    (previewMode === "exercise" && !landingPreview.exercise)
      ? "lesson"
      : previewMode;

  return (
    <section id="course-preview" className="bg-[#f8f7ff] px-5 pb-16 pt-4 text-center">
      <LandingCourseSummary preview={landingPreview} />
      <CoursePreviewFrame
        mode={resolvedPreviewMode}
        preview={landingPreview}
        onModeChange={setPreviewMode}
      />
    </section>
  );
}
