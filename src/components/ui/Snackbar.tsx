import React, { useEffect } from 'react';
import { useAppStore, SnackbarData } from '../../store/appStore';
import {
  Warning,
  CheckCircle,
  Info,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

export const Snackbar: React.FC<{
  snackbar: SnackbarData;
  onDismiss: () => void;
}> = ({ snackbar, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const IconComponent =
    snackbar.icon ||
    (snackbar.type === 'error'
      ? Warning
      : snackbar.type === 'success'
        ? CheckCircle
        : Info);

  const iconColor =
    snackbar.type === 'error'
      ? 'text-(--att-danger)'
      : snackbar.type === 'success'
        ? 'text-(--att-safe)'
        : 'text-(--accent-base)';

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 bg-[#313033] dark:bg-[#e6e1e5] border-none rounded-full shadow-[0_3px_5px_-1px_rgba(0,0,0,0.25),0_6px_10px_0_rgba(0,0,0,0.18),0_1px_18px_0_rgba(0,0,0,0.15)] text-xs md:text-sm font-semibold text-[#f4eff4] dark:text-[#1c1b1f] pointer-events-auto min-w-[18rem] sm:min-w-104 max-w-lg w-full animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200">
      <IconComponent className={`w-5 h-5 shrink-0 ${iconColor}`} />

      <span className="flex-1 text-left leading-snug">{snackbar.message}</span>

      {snackbar.action && (
        <button
          onClick={() => {
            snackbar.action?.onClick();
            onDismiss();
          }}
          className="uppercase text-xs font-black text-(--accent-base) hover:text-(--accent-hover) active:scale-95 transition-all ml-2 shrink-0"
        >
          {snackbar.action.label}
        </button>
      )}
    </div>
  );
};

export const SnackbarManager: React.FC = () => {
  const { snackbars, removeSnackbar } = useAppStore();

  useEffect(() => {
    const handleToast = (e: any) => {
      const toastData = e.detail;
      useAppStore.getState().addSnackbar({
        message: toastData.message || toastData.title || 'Something went wrong',
        type:
          toastData.type === 'error'
            ? 'error'
            : toastData.type === 'success'
              ? 'success'
              : 'default',
      });
      // NOTE: Never force redirect or shut back to legacy VTOP!
    };

    window.addEventListener('retop-toast', handleToast);
    return () => window.removeEventListener('retop-toast', handleToast);
  }, []);

  return (
    <div className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-10000 flex flex-col-reverse gap-2.5 pointer-events-none items-start max-w-[calc(100vw-3rem)]">
      <>
        {snackbars.slice(0, 3).map((sb) => (
          <Snackbar
            key={sb.id}
            snackbar={sb}
            onDismiss={() => removeSnackbar(sb.id)}
          />
        ))}
      </>
    </div>
  );
};
