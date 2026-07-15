import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_SNAPPY } from "../utils/motion";
import { useAppStore } from "../store/appStore";

export const Toaster = () => {
  const { toasts, removeToast } = useAppStore();

  useEffect(() => {
    const handleToast = (e: any) => {
      useAppStore.getState().addToast(e.detail);
      setTimeout(() => {
        // Find latest toast since addToast generates id internally
        const latest = useAppStore.getState().toasts.slice(-1)[0];
        if (latest) useAppStore.getState().removeToast(latest.id);
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
            className="absolute inset-0 pointer-events-none bg-linear-to-t from-(--bg-main) via-(--bg-main)/80 to-transparent"
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
                  <p className={`text-xs md:text-sm font-mono mt-1 max-w-xl truncate ${
                    toast.type === "warning" ? "text-yellow-400" :
                    toast.type === "info" ? "text-(--text-muted)" :
                    toast.type === "success" ? "text-green-400" : "text-red-400"
                  }`}>
                    {toast.message}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => removeToast(toast.id)}
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
