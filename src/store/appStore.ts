import { create } from "zustand";
import { ViewType, CoursePageOption } from "../types/vtop";

export type SnackbarAction = {
  label: string;
  onClick: () => void;
};

export type SnackbarData = {
  id: string;
  message: string;
  icon?: React.ElementType;
  action?: SnackbarAction;
  type?: 'default' | 'error' | 'success';
};

type AppState = {
  isModernUI: boolean;
  isPeeking: boolean;
  currentView: ViewType;
  snackbars: SnackbarData[];
  setIsModernUI: (val: boolean) => void;
  setIsPeeking: (val: boolean) => void;
  setCurrentView: (val: ViewType) => void;
  addSnackbar: (snackbar: Omit<SnackbarData, 'id'>) => void;
  removeSnackbar: (id: string) => void;

  ttViewMode: "grid" | "list" | "week";
  setTtViewMode: (val: "grid" | "list" | "week") => void;

  calViewMode: "grid" | "list";
  setCalViewMode: (val: "grid" | "list") => void;

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

  daDropFile: File | null;
  setDaDropFile: (val: File | null) => void;

  curriculumHideCompleted: boolean;
  setCurriculumHideCompleted: (val: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  isModernUI: sessionStorage.getItem("vtop-legacy-mode") !== "true",
  isPeeking: false,
  currentView: (sessionStorage.getItem("vtop-retop-view") as ViewType) || "dashboard",
  snackbars: [],
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
  addSnackbar: (snackbar) =>
    set((state) => ({
      snackbars: [...state.snackbars, { ...snackbar, id: Math.random().toString(36).substr(2, 9) }].slice(-3),
    })),
  removeSnackbar: (id) =>
    set((state) => ({
      snackbars: state.snackbars.filter((s) => s.id !== id),
    })),

  ttViewMode: "grid",
  setTtViewMode: (val) => set({ ttViewMode: val }),

  calViewMode: "grid",
  setCalViewMode: (val) => set({ calViewMode: val }),

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

  daDropFile: null,
  setDaDropFile: (val) => set({ daDropFile: val }),

  curriculumHideCompleted: localStorage.getItem("curriculum_hide_completed") === "true",
  setCurriculumHideCompleted: (val) => {
    localStorage.setItem("curriculum_hide_completed", String(val));
    set({ curriculumHideCompleted: val });
  },
}));
