import {
  Description,
  MenuBook,
  HistoryEdu,
  Wallet,
  Celebration,
  Globe,
  Build,
  Domain,
  Chat,
  LocalLibrary,
  Work,
  Science,
  DirectionsBus,
  Layers,
  CalendarMonth,
  School,
  Person,
  Settings as SettingsIcon,
  AppRegistration,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

export const getCategoryIcon = (title: string, url: string = "") => {
  const t = title.toLowerCase();
  const u = url.toLowerCase();

  // Core Links
  if (t.includes("time table") || u.includes("studenttimetable"))
    return CalendarMonth;
  if (
    t.includes("course page") ||
    u.includes("coursepage") ||
    t.includes("course")
  )
    return Layers;
  if (t.includes("curriculum")) return MenuBook;
  if (t.includes("mark") || t.includes("grade")) return School;
  if (t.includes("profile") || u.includes("studentprofileallview"))
    return Person;
  if (t.includes("setting") || u.includes("setting")) return SettingsIcon;

  // Categories
  if (t.includes("academic")) return MenuBook;
  if (t.includes("admission")) return AppRegistration;
  if (t.includes("examination")) return HistoryEdu;
  if (t.includes("finance")) return Wallet;
  if (t.includes("event")) return Celebration;
  if (t.includes("sap") || t.includes("international")) return Globe;
  if (t.includes("service")) return Build;
  if (t.includes("hostel")) return Domain;
  if (t.includes("feedback")) return Chat;
  if (t.includes("library")) return LocalLibrary;
  if (t.includes("placement")) return Work;
  if (t.includes("research")) return Science;
  if (t.includes("transport")) return DirectionsBus;

  // Fallback
  return Description;
};
