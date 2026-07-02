import { create } from "zustand";
import { ViewType } from "../types/vtop";

type AppState = {
  isModernUI: boolean;
  isPeeking: boolean;
  currentView: ViewType;
  setIsModernUI: (val: boolean) => void;
  setIsPeeking: (val: boolean) => void;
  setCurrentView: (val: ViewType) => void;
};

export const useAppStore = create<AppState>((set) => ({
  isModernUI: sessionStorage.getItem("vtop-legacy-mode") !== "true",
  isPeeking: false,
  currentView: (sessionStorage.getItem("vtop-retop-view") as ViewType) || "dashboard",
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
}));
