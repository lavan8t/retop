import { Component, ErrorInfo, ReactNode, useEffect } from "react";
import {
  Warning,
  Autorenew,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store/appStore";
import { SPRING_SNAPPY } from "../utils/motion";

const ToastOverlay = () => {
  const { toasts, removeToast } = useAppStore();

  useEffect(() => {
    const handleToast = (e: any) => {
      const toastData = e.detail;
      useAppStore.getState().addToast(toastData);
      setTimeout(() => {
        useAppStore.getState().removeToast(toastData.id);
        if (toastData.type === "error") {
          useAppStore.getState().setIsPeeking(false);
          useAppStore.getState().setIsModernUI(false);
        }
      }, 5000);
    };
    
    window.addEventListener("retop-toast", handleToast);
    return () => window.removeEventListener("retop-toast", handleToast);
  }, []);

  return (
    <div className="fixed inset-0 z-9999999 pointer-events-none flex flex-col justify-end">
      <AnimatePresence>
        {toasts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none bg-linear-to-t from-(--bg-main) via-(--bg-main)/80 to-transparent z-0"
          />
        )}
      </AnimatePresence>

      <div className="w-full flex flex-col gap-4 relative z-10 p-6 md:px-12 md:py-8 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={SPRING_SNAPPY}
              className="w-full flex flex-row items-center justify-between gap-4 pointer-events-auto"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`material-symbols-rounded shrink-0 flex items-center justify-center text-4xl ${
                    toast.type === "warning" ? "text-yellow-500" :
                    toast.type === "info" ? "text-(--text-main)" :
                    toast.type === "success" ? "text-green-500" : "text-red-500"
                  }`}
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}
                >
                  {toast.type === "warning" ? "warning" : toast.type === "info" ? "info" : toast.type === "success" ? "check_circle" : "error"}
                </span>
                
                <div className="flex flex-col text-left">
                  <h1 className={`text-xl md:text-2xl font-black font-expanded uppercase leading-none ${
                    toast.type === "warning" ? "text-yellow-500" :
                    toast.type === "info" ? "text-(--text-main)" :
                    toast.type === "success" ? "text-green-500" : "text-red-500"
                  }`}>
                    {toast.type === "warning" ? "Warning" :
                     toast.type === "info" ? "Notice" :
                     toast.type === "success" ? "Success" : "Something went wrong"}
                  </h1>
                  <p 
                    className={`text-xs md:text-sm font-mono mt-1 max-w-xl truncate cursor-pointer ${
                      toast.type === "warning" ? "text-yellow-400 hover:text-yellow-300" :
                      toast.type === "info" ? "text-(--text-muted) hover:text-(--text-main)" :
                      toast.type === "success" ? "text-green-400 hover:text-green-300" : "text-red-400 hover:text-red-300"
                    }`}
                    onClick={() => navigator.clipboard.writeText(toast.message)}
                    title="Click to copy message"
                  >
                    {toast.message}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  removeToast(toast.id);
                  if (toast.type === "error") {
                    useAppStore.getState().setIsPeeking(false);
                    useAppStore.getState().setIsModernUI(false);
                  }
                }}
                className="flex items-center gap-2 bg-(--accent-base) text-(--text-inverse) px-6 py-3 rounded-full font-bold uppercase tracking-wider hover:bg-(--accent-hover) transition-colors shrink-0 shadow-lg"
              >
                Dismiss
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

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
    
    window.dispatchEvent(new CustomEvent("retop-toast", {
      detail: {
        id: Date.now().toString(),
        type: "error",
        message: error.toString()
      }
    }));

    const currentView = useAppStore.getState().currentView;
    if (currentView !== "home") {
      useAppStore.getState().setCurrentView("home");
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
        });
      }, 0);
    } else {
      this.setState({
        error,
        errorInfo,
      });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col min-h-screen relative overflow-hidden">
          {/* Background fade */}
          <div className="absolute inset-0 bg-linear-to-t from-(--bg-main) via-(--bg-main)/80 to-transparent pointer-events-none z-0" />
          
          {/* Gradient red bottom */}
          <div className="absolute inset-0 bg-linear-to-t from-red-500/20 via-transparent to-transparent pointer-events-none z-0" />

          {/* Error content at the bottom */}
          <div className="mt-auto w-full flex flex-row items-center justify-between p-6 md:px-12 md:py-8 relative z-10">
            <div className="flex items-center gap-4">
              <Warning className="w-10 h-10 text-red-500 shrink-0" />
              <div className="flex flex-col text-left">
                <h1 className="text-xl md:text-2xl font-black font-expanded text-(--text-main) uppercase leading-none">
                  Something went wrong
                </h1>
                <p 
                  className="text-xs md:text-sm font-mono text-red-400 mt-1 max-w-xl truncate cursor-pointer hover:text-red-300 transition-colors"
                  onClick={() => navigator.clipboard.writeText(this.state.error?.toString() || "An unexpected error occurred.")}
                  title="Click to copy error"
                >
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
              <Autorenew className="w-4 h-4" />
              Reload
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {this.props.children}
        <ToastOverlay />
      </>
    );
  }
}
