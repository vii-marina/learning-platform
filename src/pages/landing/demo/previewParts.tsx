import { ArrowRight, BookOpen, ClipboardList, Code2, Play } from "lucide-react";
import type { IconComponent, PreviewMode, PublicLandingPreview } from "../types";

const previewTabs: Array<{ key: PreviewMode; label: string; icon: IconComponent }> = [
  { key: "lesson", label: "Урок", icon: BookOpen },
  { key: "test", label: "Тест", icon: ClipboardList },
  { key: "exercise", label: "Вправа", icon: Code2 },
];

export function PreviewTabs({
  mode,
  onModeChange,
  preview,
}: {
  mode: PreviewMode;
  onModeChange?: (mode: PreviewMode) => void;
  preview: PublicLandingPreview;
}) {
  const isModeAvailable = (nextMode: PreviewMode) =>
    nextMode === "lesson" ||
    (nextMode === "test" && Boolean(preview.test)) ||
    (nextMode === "exercise" && Boolean(preview.exercise));

  return (
    <div className="min-w-0 rounded-[1.4rem] bg-[#e6e1ff] p-1.5">
      <div className="grid min-w-0 grid-cols-3 gap-1">
        {previewTabs.map(({ key, label, icon: Icon }) => {
          const isActive = mode === key;
          const isAvailable = isModeAvailable(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (isAvailable) {
                  onModeChange?.(key);
                }
              }}
              disabled={!isAvailable}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-[1.05rem] px-2 py-2.5 text-sm font-extrabold transition ${
                isActive
                  ? "bg-white text-[#5549f1] shadow-[0_10px_24px_rgba(31,27,77,0.1)]"
                  : isAvailable
                    ? "text-[#6d6a9f] hover:bg-white/45"
                    : "cursor-not-allowed text-[#6d6a9f]/35 blur-[0.35px]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PreviewSidebar({
  mode,
  onModeChange,
  preview,
  className = "hidden min-h-0 overflow-hidden border-r border-[#5549f1]/15 bg-white md:block",
  onSelect,
}: {
  mode: PreviewMode;
  onModeChange?: (mode: PreviewMode) => void;
  preview: PublicLandingPreview;
  className?: string;
  onSelect?: () => void;
}) {
  const sidebarItems = preview.module_lessons.flatMap((lesson) => {
    const lessonItems: Array<{
      id: string;
      label: string;
      type: PreviewMode;
      tone?: "exercise" | "test";
      available: boolean;
    }> = [
      {
        id: lesson.id,
        label: `${preview.module.order}.${lesson.order} ${lesson.title}`,
        type: "lesson",
        available: lesson.id === preview.lesson.id,
      },
    ];

    if (lesson.id === preview.lesson.id && preview.test) {
      lessonItems.push({
        id: preview.test.id,
        label: preview.test.title || preview.lesson.title,
        type: "test",
        tone: "test",
        available: true,
      });
    }

    if (lesson.id === preview.lesson.id && preview.exercise) {
      lessonItems.push({
        id: preview.exercise.id,
        label: preview.exercise.title || "Написати код",
        type: "exercise",
        tone: "exercise",
        available: true,
      });
    }

    return lessonItems;
  });

  return (
    <aside className={className}>
      <div className="border-b border-[#5549f1]/15 p-5">
        <PreviewTabs mode={mode} onModeChange={onModeChange} preview={preview} />
      </div>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="mt-1 text-[#6d6a9f]">⌄</span>
          <div>
            <h3 className="text-lg font-extrabold leading-7 text-[#1f1b4d]">
              {`Модуль ${preview.module.order}: ${preview.module.title}`}
            </h3>
            <p className="mt-2 text-sm font-extrabold text-[#6d6a9f]">
              {`0/${preview.module_lessons.length} виконано`}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-1">
          {sidebarItems.map((item) => {
            const isActive =
              (mode === "lesson" && item.type === "lesson" && item.id === preview.lesson.id) ||
              (mode === "exercise" && item.type === "exercise") ||
              (mode === "test" && item.type === "test");
            const Icon = item.type === "exercise" ? Code2 : item.type === "test" ? ClipboardList : Play;

            return (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                disabled={!item.available}
                onClick={() => {
                  if (item.available) {
                    onModeChange?.(item.type);
                    onSelect?.();
                  }
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-extrabold transition ${
                  isActive
                    ? item.tone === "exercise" && mode === "exercise"
                      ? "rounded-2xl bg-orange-50 text-orange-700"
                      : item.type === "lesson"
                        ? "bg-[#e7e2ff] text-[#5549f1]"
                        : "rounded-2xl bg-[#e7e2ff] text-[#5549f1]"
                    : !item.available
                      ? "cursor-not-allowed text-[#5b5686]/35 blur-[0.45px]"
                    : item.tone === "exercise"
                      ? "text-orange-600"
                      : item.tone === "test"
                        ? "text-[#5549f1]"
                        : "text-[#5b5686] hover:bg-[#f1f0ff]"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export function LessonPreviewContent({ preview }: { preview: PublicLandingPreview }) {
  return (
    <div className="min-w-0 overflow-hidden">
      <p className="flex items-center gap-2 text-sm font-semibold text-[#6d6a9f]">
        <span>{`Модуль ${preview.module.order}`}</span>
        <ArrowRight className="h-3.5 w-3.5" />
        <span>{`Урок ${preview.module.order}.${preview.lesson.order}`}</span>
      </p>
      <h3 className="mt-1.5 text-xl font-bold tracking-tight text-[#1f1b4d] md:text-2xl">
        {preview.lesson.title}
      </h3>
      {preview.lesson.content ? (
        <div
          className="prose prose-slate mt-3 max-w-none overflow-hidden text-slate-700 prose-headings:text-[#1f1b4d] prose-pre:max-w-full prose-pre:overflow-x-auto prose-code:whitespace-pre prose-a:text-[#5549f1]"
          dangerouslySetInnerHTML={{ __html: preview.lesson.content }}
        />
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#dedcff] bg-white px-5 py-8 text-center text-sm font-semibold text-[#6d6a9f]">
          У цього уроку поки немає контенту для перегляду.
        </div>
      )}
    </div>
  );
}
