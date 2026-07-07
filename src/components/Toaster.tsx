import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999999] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl pointer-events-auto border-2 ${
              toast.type === "warning"
                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20"
            } backdrop-blur-md`}
          >
            <span
              className="material-symbols-rounded"
              style={{
                fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20",
                fontSize: "18px",
              }}
            >
              error
            </span>
            <span className="text-[0.95rem] font-bold leading-none">
              {toast.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
