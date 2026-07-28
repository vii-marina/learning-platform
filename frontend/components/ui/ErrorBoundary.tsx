import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

// Top-level safety net: a render error anywhere below shows this fallback instead of a
// blank white screen. Self-contained (no shared-component imports) so it still renders
// even if a shared component is what threw. Recovery is a hard reload or navigate home.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f0ff] px-6 py-12">
        <div className="w-full max-w-md rounded-[1.5rem] border border-[#dedcff] bg-white p-8 text-center shadow-[0_20px_48px_rgba(31,27,77,0.08)]">
          <h1 className="text-2xl font-extrabold text-[#1f1b4d]">Щось пішло не так</h1>
          <p className="mt-3 text-sm font-medium text-[#6d6a9f]">
            Сталася неочікувана помилка. Спробуйте перезавантажити сторінку — якщо це не
            допоможе, поверніться на головну або повідомте адміністратора.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#5549f1] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#4035d6]"
            >
              Перезавантажити сторінку
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="rounded-xl border-2 border-[#dedcff] px-5 py-2.5 text-sm font-bold text-[#5549f1] transition hover:bg-[#f1f0ff]"
            >
              На головну
            </button>
          </div>
        </div>
      </div>
    );
  }
}
