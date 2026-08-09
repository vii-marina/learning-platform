import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/index.css";
import { AppToastProvider } from "../components/ui/AppToastProvider";
import { ConfirmDialogProvider } from "../components/ui/ConfirmDialogProvider";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { installGlobalErrorHandlers } from "../lib/observability/errorReporter";
import App from "./App";

// Catches what the boundary cannot see: throws outside the render tree and unhandled
// promise rejections.
installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppToastProvider>
        <ConfirmDialogProvider>
          <App />
        </ConfirmDialogProvider>
      </AppToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
