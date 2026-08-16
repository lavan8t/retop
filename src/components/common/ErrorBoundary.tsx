import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[retop] Uncaught error captured by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "Unknown Runtime Error";
      const errorStack = this.state.error?.stack || this.state.errorInfo?.componentStack || "";

      return (
        <div className="fixed inset-0 z-[2147483647] bg-[#000000] text-white flex flex-col justify-end p-4 sm:p-8 font-sans select-text pointer-events-auto">
          {/* Lower Third Error Panel */}
          <div className="w-full max-w-4xl mx-auto bg-[#121214] border border-[#27272a] rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-150">
            <div className="flex items-center justify-between gap-4 border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500 shrink-0 shadow-sm" />
                <span className="text-sm sm:text-base font-black tracking-tight text-white uppercase font-mono">
                  Runtime Error Captured
                </span>
              </div>
              <button
                onClick={this.handleReload}
                className="px-3.5 py-1.5 rounded-xl bg-white text-black font-mono font-bold text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                Reload
              </button>
            </div>

            {/* Error message and stack in lower-third bottom */}
            <div className="flex flex-col gap-1.5 font-mono">
              <p className="text-sm font-bold text-red-400 break-words leading-snug">
                {errorMsg}
              </p>
              {errorStack && (
                <pre className="text-[11px] leading-relaxed text-[#a1a1aa] bg-[#09090b] p-3 rounded-xl overflow-x-auto max-h-40 border border-[#1f1f23] custom-scrollbar select-all">
                  {errorStack}
                </pre>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
