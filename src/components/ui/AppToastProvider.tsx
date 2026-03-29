import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, X } from "lucide-react";

type ToastState = {
  id: number;
  message: string;
  isClosing: boolean;
} | null;

type AppToastContextValue = {
  dismissToast: () => void;
  showSuccessToast: (message: string) => void;
};

const AppToastContext = createContext<AppToastContextValue | null>(null);

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback(() => {
    setToast((currentToast) =>
      currentToast ? { ...currentToast, isClosing: true } : null
    );
  }, []);

  const showSuccessToast = useCallback((message: string) => {
    toastIdRef.current += 1;
    setToast({
      id: toastIdRef.current,
      message,
      isClosing: false,
    });
  }, []);

  useEffect(() => {
    if (!toast || toast.isClosing) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast((currentToast) =>
        currentToast ? { ...currentToast, isClosing: true } : null
      );
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  useEffect(() => {
    if (!toast?.isClosing) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  const value = useMemo<AppToastContextValue>(
    () => ({
      dismissToast,
      showSuccessToast,
    }),
    [dismissToast, showSuccessToast]
  );

  return (
    <AppToastContext.Provider value={value}>
      {children}

      {toast ? (
        <div className="pointer-events-none fixed inset-0 z-[120] flex items-end justify-center px-4 pb-8">
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="pointer-events-auto absolute inset-0 bg-transparent"
          />

          <div
            className={`success-notice pointer-events-auto relative z-10 w-full max-w-md rounded-[1.5rem] border border-emerald-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)] ${
              toast.isClosing ? "success-notice--exit" : "success-notice--enter"
            }`}
          >
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Close notification"
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-[#14213d]">{toast.message}</p>
            </div>
          </div>
        </div>
      ) : null}
    </AppToastContext.Provider>
  );
}

export function useAppToast() {
  const context = useContext(AppToastContext);

  if (!context) {
    throw new Error("useAppToast must be used within an AppToastProvider.");
  }

  return context;
}
