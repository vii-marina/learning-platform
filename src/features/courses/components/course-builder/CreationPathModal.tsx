import { Sparkles, X } from "lucide-react";

type CreationPathModalProps = {
  isOpen: boolean;
  title: string;
  aiLabel: string;
  manualLabel: string;
  accent?: "test" | "exercise";
  onClose: () => void;
  onSelectAi: () => void;
  onSelectManual: () => void;
};

export function CreationPathModal({
  isOpen,
  title,
  aiLabel,
  manualLabel,
  accent = "test",
  onClose,
  onSelectAi,
  onSelectManual,
}: CreationPathModalProps) {
  if (!isOpen) {
    return null;
  }

  const aiButtonClasses =
    accent === "exercise"
      ? "bg-gradient-to-r from-[#fdba74] via-[#fb923c] to-[#ea580c] text-white shadow-[0_12px_24px_rgba(234,88,12,0.18)] hover:translate-y-[-1px] hover:shadow-[0_16px_28px_rgba(234,88,12,0.24)]"
      : "bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9] text-white shadow-[0_12px_24px_rgba(109,40,217,0.18)] hover:translate-y-[-1px] hover:shadow-[0_16px_28px_rgba(109,40,217,0.24)]";

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <div className="flex w-full max-w-[40rem] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
        <div className="relative border-b border-slate-200 px-6 py-5 pr-20">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close creation choice modal"
            className="absolute right-5 top-5 rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>

          <h3 className="text-2xl font-extrabold tracking-tight text-[#14213d]">{title}</h3>
        </div>

        <div className="px-6 py-6">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={onSelectAi}
              className={`inline-flex h-16 items-center justify-center gap-3 rounded-[1.4rem] px-5 text-s font-bold transition ${aiButtonClasses}`}
            >
              <Sparkles className="h-5 w-5" />
              <span>{aiLabel}</span>
            </button>

            <button
              type="button"
              onClick={onSelectManual}
              className="inline-flex h-16 items-center justify-center rounded-[1.4rem] border border-slate-200 bg-white px-5 text-lg font-bold text-[#14213d] transition hover:bg-slate-50"
            >
              {manualLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
