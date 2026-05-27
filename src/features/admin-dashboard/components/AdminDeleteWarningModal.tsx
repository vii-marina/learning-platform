import { AlertTriangle, X } from "lucide-react";

type AdminDeleteWarningModalProps = {
  isOpen: boolean;
  entityLabel: string;
  entityName: string;
  entityEmail: string;
  impactItems: string[];
  confirmLabel: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function AdminDeleteWarningModal({
  isOpen,
  entityLabel,
  entityName,
  entityEmail,
  impactItems,
  confirmLabel,
  isSubmitting = false,
  onClose,
  onConfirm,
}: AdminDeleteWarningModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-[0_28px_60px_rgba(15,23,42,0.22)] md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold  text-rose-600">
                  Видалення: {entityLabel}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[#14213d]">
                  Ви впевнені?
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Закрити попередження про видалення"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Ця дія чутлива й має бути підтверджена адміністратором. Якщо видалення увімкнене,
            частина даних може бути втрачена, а дію може бути неможливо скасувати.
          </p>

          <div className="mt-5 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-bold text-[#14213d]">{entityName}</p>
            <p className="mt-1 break-all text-sm text-slate-500">{entityEmail}</p>
          </div>

          <div className="mt-5 rounded-[1.2rem] border border-rose-100 bg-rose-50 px-4 py-4">
            <p className="text-sm font-bold text-rose-700">Можлива втрата даних</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-rose-700">
              {impactItems.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-[0.38rem] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-[1rem] border border-slate-200 bg-white px-5 text-sm font-semibold text-[#14213d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-[1rem] border border-rose-200 bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Видалення..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
