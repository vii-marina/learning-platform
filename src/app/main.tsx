import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/index.css";
import { AppToastProvider } from "../components/ui/AppToastProvider";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppToastProvider>
      <App />
    </AppToastProvider>
  </StrictMode>,
);
