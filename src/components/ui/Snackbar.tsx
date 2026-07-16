import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, SnackbarData } from "../../store/appStore";

export const Snackbar: React.FC<{ snackbar: SnackbarData; onDismiss: () => void }> = ({ snackbar, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const Icon = snackbar.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        transition: { ease: "easeOut", duration: 0.225 } 
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.95, 
        y: 20, 
        transition: { ease: "easeIn", duration: 0.195 } 
      }}
      className="flex items-center gap-3 px-4 py-3 bg-(--bg-surface) border-2 border-(--border-dim) rounded-[24px] shadow-lg popup-shadow text-sm font-bold text-(--text-main) pointer-events-auto"
    >
      {Icon && <Icon className="w-5 h-5 shrink-0 text-(--text-muted)" />}
      
      <span className="flex-1 text-left">{snackbar.message}</span>
      
      {snackbar.action && (
        <button
          onClick={() => {
            snackbar.action?.onClick();
            onDismiss();
          }}
          className="uppercase text-xs font-black text-(--accent-base) hover:text-(--accent-hover) active:scale-95 transition-all ml-2"
        >
          {snackbar.action.label}
        </button>
      )}
    </motion.div>
  );
};

export const SnackbarManager: React.FC = () => {
  const { snackbars, removeSnackbar } = useAppStore();

  useEffect(() => {
    const handleToast = (e: any) => {
      const toastData = e.detail;
      useAppStore.getState().addSnackbar({
        message: toastData.message || toastData.title || "Something went wrong",
        type: toastData.type === "error" ? "error" : "default"
      });
      if (toastData.type === "error") {
        useAppStore.getState().setIsPeeking(false);
        useAppStore.getState().setIsModernUI(false);
      }
    };
    
    window.addEventListener("retop-toast", handleToast);
    return () => window.removeEventListener("retop-toast", handleToast);
  }, []);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] flex flex-col-reverse gap-2 pointer-events-none items-center">
      <AnimatePresence mode="popLayout">
        {snackbars.map((sb) => (
          <Snackbar key={sb.id} snackbar={sb} onDismiss={() => removeSnackbar(sb.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};
