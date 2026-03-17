import {
  FileText,
  BookOpen,
  FileSignature,
  Wallet,
  PartyPopper,
  Globe,
  Wrench,
  Building,
  MessageSquare,
  Library,
  Briefcase,
  FlaskConical,
  Bus,
  Layers,
  Calendar,
  GraduationCap,
  User,
  Settings as SettingsIcon,
} from "lucide-react";

export const getCategoryIcon = (title: string, url: string = "") => {
  const t = title.toLowerCase();
  const u = url.toLowerCase();

  // Core Links
  if (t.includes("time table") || u.includes("studenttimetable"))
    return Calendar;
  if (
    t.includes("course page") ||
    u.includes("coursepage") ||
    t.includes("course")
  )
    return Layers;
  if (t.includes("curriculum")) return BookOpen;
  if (t.includes("mark") || t.includes("grade")) return GraduationCap;
  if (t.includes("profile") || u.includes("studentprofileallview")) return User;
  if (t.includes("setting") || u.includes("setting")) return SettingsIcon;

  // Categories
  if (t.includes("academic")) return BookOpen;
  if (t.includes("examination")) return FileSignature;
  if (t.includes("finance")) return Wallet;
  if (t.includes("event")) return PartyPopper;
  if (t.includes("sap") || t.includes("international")) return Globe;
  if (t.includes("service")) return Wrench;
  if (t.includes("hostel")) return Building;
  if (t.includes("feedback")) return MessageSquare;
  if (t.includes("library")) return Library;
  if (t.includes("placement")) return Briefcase;
  if (t.includes("research")) return FlaskConical;
  if (t.includes("transport")) return Bus;

  // Fallback
  return FileText;
};
