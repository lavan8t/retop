import { create } from "zustand";
import { ViewType, CoursePageOption } from "../types/vtop";

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

  ttViewMode: "grid" | "list" | "week";
  setTtViewMode: (val: "grid" | "list" | "week") => void;

  cpOptions: CoursePageOption[];
  setCpOptions: (val: CoursePageOption[]) => void;
  cpSearchTerm: string;
  setCpSearchTerm: (val: string) => void;
  cpSelectedCourseId: string;
  setCpSelectedCourseId: (val: string) => void;

  marksSemesters: { id: string; label: string }[];
  setMarksSemesters: (val: { id: string; label: string }[]) => void;
  marksSelectedSem: string;
  setMarksSelectedSem: (val: string) => void;
  marksSearchQuery: string;
  setMarksSearchQuery: (val: string) => void;
  isMarksModernView: boolean;
  setIsMarksModernView: (val: boolean) => void;

  gradesSemesters: { id: string; label: string }[];
  setGradesSemesters: (val: { id: string; label: string }[]) => void;
  gradesSelectedSem: string;
  setGradesSelectedSem: (val: string) => void;
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

  ttViewMode: "grid",
  setTtViewMode: (val) => set({ ttViewMode: val }),

  cpOptions: [],
  setCpOptions: (val) => set({ cpOptions: val }),
  cpSearchTerm: "",
  setCpSearchTerm: (val) => set({ cpSearchTerm: val }),
  cpSelectedCourseId: "",
  setCpSelectedCourseId: (val) => set({ cpSelectedCourseId: val }),

  marksSemesters: [],
  setMarksSemesters: (val) => set({ marksSemesters: val }),
  marksSelectedSem: "",
  setMarksSelectedSem: (val) => set({ marksSelectedSem: val }),
  marksSearchQuery: "",
  setMarksSearchQuery: (val) => set({ marksSearchQuery: val }),
  isMarksModernView: true,
  setIsMarksModernView: (val) => set({ isMarksModernView: val }),

  gradesSemesters: [],
  setGradesSemesters: (val) => set({ gradesSemesters: val }),
  gradesSelectedSem: "",
  setGradesSelectedSem: (val) => set({ gradesSelectedSem: val }),
}));
