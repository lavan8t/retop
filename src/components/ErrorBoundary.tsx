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
        <div className="flex flex-col items-center justify-center min-h-screen bg-(--bg-main) p-6 text-center">
          <div className="bg-red-500/10 border-2 border-red-500/20 rounded-3xl p-8 max-w-lg w-full flex flex-col items-center shadow-lg">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
            <h1 className="text-2xl font-black font-expanded text-(--text-main) uppercase mb-2">
              Something went wrong
            </h1>
            <p className="text-sm font-mono text-(--text-muted) mb-8">
              An unexpected error occurred in the application.
            </p>

            <div className="w-full bg-black/40 rounded-xl p-4 text-left overflow-auto max-h-48 mb-8 border border-red-500/20">
              <code className="text-xs text-red-400 font-mono whitespace-pre-wrap">
                {this.state.error && this.state.error.toString()}
                {"\n"}
                {this.state.errorInfo?.componentStack}
              </code>
            </div>

            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 bg-(--accent-base) text-(--text-inverse) px-6 py-3 rounded-full font-bold uppercase tracking-wider hover:bg-(--accent-hover) transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
