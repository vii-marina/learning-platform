import { createContext, useContext } from "react";

export type AppToastContextValue = {
  dismissToast: () => void;
  showSuccessToast: (message: string) => void;
};

export const AppToastContext = createContext<AppToastContextValue | null>(null);

export function useAppToast() {
  const context = useContext(AppToastContext);

  if (!context) {
    throw new Error("useAppToast must be used within an AppToastProvider.");
  }

  return context;
}
