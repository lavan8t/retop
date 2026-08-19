import React, { Component, ErrorInfo, ReactNode } from "react";
import { Warning, Refresh } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

interface ErrorBoundaryProps {
  children: ReactNode;
  name?: string;
  variant?: "card" | "fullscreen" | "inline";
  resetKey?: any;
  onReset?: () => void;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[retop] Error in ${this.props.name || "Component"}:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKey !== undefined && prevProps.resetKey !== this.props.resetKey) {
      this.handleReset();
    }
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  private handleHardReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReload = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        await chrome.storage.local.clear();
      }
    } catch (e) {
      console.warn("Failed to clear local storage", e);
    }
    window.location.reload();
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { name = "Component", variant = "card", fallback } = this.props;
    const errorMsg = this.state.error?.message || "An unexpected error occurred.";
    const errorStack = this.state.error?.stack || this.state.errorInfo?.componentStack || "";

    if (fallback) {
      return typeof fallback === "function" && this.state.error
        ? fallback(this.state.error, this.handleReset)
        : (fallback as ReactNode);
    }

    if (variant === "fullscreen") {
      return (
        <div className="fixed inset-0 z-[2147483647] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 text-(--text-main) select-text pointer-events-auto">
          <div className="w-full max-w-lg bg-(--bg-surface) border-2 border-(--border-main) rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <Warning className="w-6 h-6" />
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-xs font-bold text-(--text-muted) uppercase tracking-wider">
                  Critical Exception
                </span>
                <h2 className="text-lg font-bold font-expanded text-(--text-main) truncate">
                  {name} crashed
                </h2>
              </div>
            </div>

            <div className="bg-(--bg-highlight) border border-(--border-main)/40 rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-xs font-bold text-red-500 break-words leading-relaxed">
                {errorMsg}
              </p>
              {errorStack && (
                <details className="text-[11px] text-(--text-muted) cursor-pointer">
                  <summary className="font-bold opacity-75 hover:opacity-100 transition-opacity">
                    Stack trace
                  </summary>
                  <pre className="mt-2 text-[10px] leading-tight text-(--text-muted) bg-black/20 p-2.5 rounded-xl overflow-x-auto max-h-36 custom-scrollbar whitespace-pre-wrap select-all">
                    {errorStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="px-4 py-2.5 rounded-full bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) text-xs font-bold transition-all cursor-pointer border-none outline-none active:scale-95"
              >
                Clear Cache & Reload
              </button>
              <button
                type="button"
                onClick={this.handleHardReload}
                className="px-5 py-2.5 rounded-full bg-(--accent-base) text-(--text-inverse) text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none outline-none inline-flex items-center gap-1.5"
              >
                <Refresh className="w-4 h-4" />
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (variant === "inline") {
      return (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-500">
          <span className="truncate font-bold">{errorMsg}</span>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-2.5 py-1 rounded-full bg-red-500 text-white font-bold text-[10px] hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0 border-none outline-none"
          >
            Retry
          </button>
        </div>
      );
    }

    // Default "card" variant
    return (
      <div className="w-full bg-(--bg-surface) border-2 border-(--border-main) rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center text-center gap-4 my-4 shadow-none">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
          <Warning className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1 max-w-md">
          <h3 className="text-base font-bold font-expanded text-(--text-main)">
            Failed to render {name}
          </h3>
          <p className="text-xs text-(--text-muted) break-words leading-relaxed">
            {errorMsg}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={this.handleReset}
            className="px-5 py-2 rounded-full bg-(--bg-highlight) text-(--text-main) hover:bg-(--accent-base) hover:text-(--text-inverse) text-xs font-bold transition-all duration-75 cursor-pointer shadow-none active:scale-95 border-none outline-none inline-flex items-center gap-1.5"
          >
            <Refresh className="w-3.5 h-3.5" />
            Retry View
          </button>
        </div>
      </div>
    );
  }
}
