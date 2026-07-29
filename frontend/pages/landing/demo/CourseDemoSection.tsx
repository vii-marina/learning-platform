import { useEffect, useState } from "react";
import { dedupeRequest } from "../../../lib/requestDedup";
import {
  landingContainer,
  SectionHead,
  stickerLiftSm,
  stickerOutline,
} from "../components/primitives";
import { loadLandingPreview } from "./landingPreviewSource";
import type { PreviewMode, PublicLandingPreview, LandingPreviewStatus } from "../types";
import { CoursePreviewPlaceholder } from "./CoursePreviewPlaceholder";
import { CoursePreviewFrame, LandingCourseSummary } from "./CoursePreviewFrame";

export default function CourseDemoSection() {
  const [landingPreview, setLandingPreview] = useState<PublicLandingPreview | null>(null);
  const [landingPreviewStatus, setLandingPreviewStatus] =
    useState<LandingPreviewStatus>("loading");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("lesson");

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      try {
        setLandingPreviewStatus("loading");
        const loadedPreview = await dedupeRequest(
          "public:landing-preview",
          loadLandingPreview
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

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!landingPreview) {
    return (
      <section
        id="course-preview"
        className="scroll-mt-20 border-b-2 border-[#1f1b4d] bg-[#f8f7ff] pb-16 pt-16 text-center"
      >
        <div className={landingContainer}>
          <CoursePreviewPlaceholder status={landingPreviewStatus} />
        </div>
      </section>
    );
  }

  const resolvedPreviewMode =
    (previewMode === "test" && !landingPreview.test) ||
    (previewMode === "exercise" && !landingPreview.exercise)
      ? "lesson"
      : previewMode;

  return (
    <section
      id="course-preview"
      className="scroll-mt-20 border-b-2 border-[#1f1b4d] bg-[#f8f7ff] pb-16 pt-16 md:pt-20"
    >
      <div className={landingContainer}>
        <SectionHead
          title="Демонстрація курсу"
          action={
            <button
              type="button"
              onClick={() => setPreviewMode(landingPreview.test ? "test" : "exercise")}
              className={`sticker-press sticker-cursor relative rounded-2xl rounded-br-sm bg-[#5549f1] px-4 py-2.5 text-sm font-bold text-white ${stickerOutline} ${stickerLiftSm}`}
            >
              Спробуйте натиснути, тут усе працює
              <span
                aria-hidden
                className={`absolute -bottom-2 right-5 h-3 w-3 rotate-45 border-l-0 border-t-0 bg-[#5549f1] ${stickerOutline}`}
              />
            </button>
          }
        />
      </div>

      <div className={landingContainer}>
        <LandingCourseSummary preview={landingPreview} />
        <CoursePreviewFrame
          mode={resolvedPreviewMode}
          preview={landingPreview}
          onModeChange={setPreviewMode}
        />
      </div>
    </section>
  );
}
