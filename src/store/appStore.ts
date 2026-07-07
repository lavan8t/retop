import { create } from "zustand";
import { ViewType } from "../types/vtop";

export type Toast = { id: string; message: string; type: 'error' | 'warning' | 'info' | 'success' };
export type NetworkLog = { url: string; timestamp: number; key?: string };

type AppState = {
  isModernUI: boolean;
  isPeeking: boolean;
  currentView: ViewType;
  toasts: Toast[];
  networkLogs: NetworkLog[];
  setIsModernUI: (val: boolean) => void;
  setIsPeeking: (val: boolean) => void;
  setCurrentView: (val: ViewType) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  logNetworkRequest: (url: string, key?: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  isModernUI: sessionStorage.getItem("vtop-legacy-mode") !== "true",
  isPeeking: false,
  currentView: (sessionStorage.getItem("vtop-retop-view") as ViewType) || "dashboard",
  toasts: [],
  networkLogs: [],
  setIsModernUI: (val) => set({ isModernUI: val }),
  setIsPeeking: (val) => set({ isPeeking: val }),
  setCurrentView: (val) => {
    set({ currentView: val });
    sessionStorage.setItem("vtop-retop-view", val);
    if (window.history.state?.view !== val) {
      window.history.pushState(
        { view: val },
        "",
        window.location.pathname + window.location.search,
      );
    }
  },
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Math.random().toString(36).substr(2, 9) }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  logNetworkRequest: (url, key) =>
    set((state) => ({
      networkLogs: [{ url, timestamp: Date.now(), key }, ...state.networkLogs].slice(0, 50),
    })),
}));
