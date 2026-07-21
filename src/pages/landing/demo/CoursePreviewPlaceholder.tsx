import { RefreshCw, XCircle } from "lucide-react";
import type { LandingPreviewStatus } from "../types";

export function CoursePreviewPlaceholder({ status }: { status: LandingPreviewStatus }) {
  const isError = status === "error";

  return (
    <div className="mx-auto mt-12 max-w-6xl overflow-hidden rounded-[1.5rem] border border-[#dedcff] bg-white text-left shadow-[0_24px_70px_rgba(31,27,77,0.08)]">
      <div className="border-b border-[#dedcff] p-3 sm:p-5 md:p-6">
        <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-5 md:items-center">
          <div className="aspect-video rounded-[1rem] border border-[#dedcff] bg-[#f1f0ff]" />
          <div className="min-w-0 space-y-3">
            <div className="h-6 max-w-xs rounded-full bg-[#e6e1ff]" />
            <div className="h-4 max-w-2xl rounded-full bg-[#f1f0ff]" />
            <div className="h-4 max-w-xl rounded-full bg-[#f1f0ff]" />
          </div>
        </div>
      </div>
      <div className="grid h-[38rem] md:h-[34rem] md:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden border-r border-[#5549f1]/15 p-5 md:block">
          <div className="h-16 rounded-[1.4rem] bg-[#e6e1ff]" />
          <div className="mt-8 space-y-3">
            <div className="h-5 rounded-full bg-[#f1f0ff]" />
            <div className="h-5 max-w-[85%] rounded-full bg-[#f1f0ff]" />
            <div className="mt-8 h-12 rounded-2xl bg-[#e7e2ff]" />
            <div className="h-12 rounded-2xl bg-[#f1f0ff]" />
            <div className="h-12 rounded-2xl bg-[#f1f0ff]" />
          </div>
        </div>
        <div className="flex min-h-0 flex-col bg-[#f1f0ff]">
          <div className="flex flex-1 items-center justify-center px-5 text-center">
            <div className="max-w-md">
              {isError ? (
                <XCircle className="mx-auto h-10 w-10 text-rose-500" />
              ) : (
                <RefreshCw className="mx-auto h-10 w-10 animate-spin text-[#5549f1]" />
              )}
              <h2 className="mt-5 text-ml font-extrabold text-[#1f1b4d]">
                {isError ? "Не вдалося завантажити превʼю курсу" : "Завантажуємо превʼю курсу"}
              </h2>

            </div>
          </div>
          <div className="h-[4.5rem] border-t border-[#dedcff] bg-white" />
        </div>
      </div>
    </div>
  );
}
