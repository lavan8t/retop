import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

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
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col min-h-screen bg-(--bg-main) relative overflow-hidden">
          {/* Gradient red bottom to transparent up */}
          <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 via-transparent to-transparent pointer-events-none" />

          {/* Error content at the bottom */}
          <div className="mt-auto w-full flex flex-row items-center justify-between p-6 md:px-12 md:py-8 relative z-10">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-10 h-10 text-red-500 shrink-0" />
              <div className="flex flex-col text-left">
                <h1 className="text-xl md:text-2xl font-black font-expanded text-(--text-main) uppercase leading-none">
                  Something went wrong
                </h1>
                <p className="text-xs md:text-sm font-mono text-red-400 mt-1 max-w-xl truncate">
                  {this.state.error
                    ? this.state.error.toString()
                    : "An unexpected error occurred."}
                </p>
              </div>
            </div>

            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 bg-(--accent-base) text-(--text-inverse) px-6 py-3 rounded-full font-bold uppercase tracking-wider hover:bg-(--accent-hover) transition-colors shrink-0 shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
