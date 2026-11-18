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

  const isError = snackbar.type === 'error';
  const IconComponent =
    snackbar.icon ||
    (isError ? Warning : snackbar.type === 'success' ? CheckCircle : Info);

  const iconColor = isError
    ? 'text-(--md-sys-color-error)'
    : snackbar.type === 'success'
      ? 'text-(--md-sys-color-success)'
      : 'text-(--md-sys-color-inverse-primary)';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className="flex items-center gap-3 px-5 py-3.5 bg-(--md-sys-color-inverse-surface) text-(--md-sys-color-inverse-on-surface) border-none rounded-full shadow-2xl text-xs md:text-sm font-semibold pointer-events-auto min-w-[18rem] sm:min-w-104 max-w-lg w-full animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200"
    >
      <IconComponent className={`w-5 h-5 shrink-0 ${iconColor}`} />

      <span className="flex-1 text-left leading-snug">{snackbar.message}</span>

      {snackbar.action && (
        <button
          type="button"
          aria-label={snackbar.action.label}
          onClick={() => {
            snackbar.action?.onClick();
            onDismiss();
          }}
          className="min-h-12 px-2 rounded-full text-xs font-bold text-(--md-sys-color-inverse-primary) outline-none focus-visible:ring-2 focus-visible:ring-(--md-sys-color-inverse-primary) transition-all ml-1 shrink-0 cursor-pointer border-0 bg-transparent"
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
      {snackbars.slice(0, 3).map((sb) => (
        <Snackbar
          key={sb.id}
          snackbar={sb}
          onDismiss={() => removeSnackbar(sb.id)}
        />
      ))}
    </div>
  );
};
