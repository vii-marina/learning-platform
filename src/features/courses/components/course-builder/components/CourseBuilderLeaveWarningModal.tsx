import { AlertTriangle, Save, X } from "lucide-react";

type CourseBuilderLeaveWarningModalProps = {
  isOpen: boolean;
  onClose: () => void;
  canSaveDraft: boolean;
  isSavingDraft?: boolean;
  errorMessage?: string | null;
  onSaveDraft: () => void;
  onLeaveWithoutSaving: () => void;
};

export function CourseBuilderLeaveWarningModal({
  isOpen,
  onClose,
  canSaveDraft,
  isSavingDraft = false,
  errorMessage = null,
  onSaveDraft,
  onLeaveWithoutSaving,
}: CourseBuilderLeaveWarningModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-[1.75rem] border border-amber-100 bg-white p-6 shadow-[0_28px_60px_rgba(15,23,42,0.22)] md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[#14213d]">
                  Незбережені зміни
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSavingDraft}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Закрити попередження про вихід"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            У вас є незбережені зміни у вашій чернетці курсу. Ви можете зберегти їх, щоб повернутися до них пізніше, або покинути без збереження, втративши ці зміни.
          </p>

          {errorMessage ? (
            <div className="mt-4 rounded-[1.1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onLeaveWithoutSaving}
              disabled={isSavingDraft}
              className="inline-flex h-11 items-center justify-center rounded-[1rem] border border-rose-200 bg-white px-5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Покинути без збереження
            </button>
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={!canSaveDraft || isSavingDraft}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] border border-cyan-200 bg-[#13daec] px-5 text-sm font-semibold text-[#0f172a] transition hover:bg-[#10c6d7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{isSavingDraft ? "Збереження чернетки..." : "Зберегти чернетку"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
