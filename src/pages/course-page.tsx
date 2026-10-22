import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  Language,
  Download,
  MenuBook,
  List,
  Layers,
  Description,
  Person,
  Filter,
  KeyboardArrowDown,
  Close,
  SwapVert,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { VTOPNetwork } from "../utils/network";
import { parseCoursePage } from "../parsers/course-page";
import {
  CoursePageData,
  CoursePageOption,
  Semester,
  MenuCategory,
  CourseMaterial,
} from "../types/vtop";
import { useDataStore } from "../store/dataStore";
import { useCoursePageData } from "../hooks/useCoursePage";
import { parseStudentMarks } from "../parsers/marks";
import { parseGrades } from "../parsers/grades";
import {
  getGridPositions,
  getCorrectDayName,
  CAMPUS_SLOT_TIMINGS,
} from "../utils/timetable-slots";


interface UpcomingClassDetail {
  date: Date;
  slots: { start: string; end: string }[];
}

interface CoursePageProps {
  network: VTOPNetwork;
  menu: MenuCategory[];
  cpOptions: CoursePageOption[];
  setCpOptions: (opts: CoursePageOption[]) => void;
  cpSemesters: Semester[];
  setCpSemesters: (sems: Semester[]) => void;
  selectedSem: string;
  setSelectedSem: (sem: string) => void;
  selectedOptionId: string;
  setSelectedOptionId: (id: string) => void;
  searchTerm: string;
}

export const CoursePage = ({
  network,
  cpOptions,
  setCpOptions,
  selectedSem,
  selectedOptionId,
  setSelectedOptionId,
  searchTerm,
}: CoursePageProps) => {
  const [isCourseSelectorOpen, setIsCourseSelectorOpen] = useState(false);
  const [materialSort, setMaterialSort] = useState<"date" | "module">("date");
  const [localSearchTerm, setLocalSearchTerm] = useState("");

  const activeSearchTerm = localSearchTerm || searchTerm;

  const formatFaculty = (raw: string) => {
    const parts = raw
      .split("-")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) return { name: raw, subs: [] };

    // If first part is digits (Emp ID like "10234"), second part is Faculty Name
    if (/^\d+$/.test(parts[0]) && parts.length> 1) {
      const name = parts[1];
      const subs = [parts[0], ...parts.slice(2)];
      return { name, subs };
    }

    return {
      name: parts[0],
      subs: parts.slice(1),
    };
  };

  const {
    loading,
    data,
    courseMarks,
    courseGrade,
    upcomingClasses,
    currentOption,
    groupedMaterials,
    filteredMaterials,
    courseTimetable,
    courseAttendance,
    courseAssignments,
    handleDownload,
  } = useCoursePageData(
    network,
    cpOptions,
    setCpOptions,
    selectedSem,
    selectedOptionId,
    setSelectedOptionId,
    activeSearchTerm,
    materialSort
  );

  const { detailedAttendance, attendance } = useDataStore();

  const assignedFacRaw = (
    courseTimetable?.faculty ||
    detailedAttendance?.find(
      (a) => currentOption && a.courseCode === currentOption.code
    )?.faculty ||
    attendance?.find(
      (a) => currentOption && a.code.includes(currentOption.code.trim())
    )?.faculty ||
    ""
  ).toLowerCase().trim();

  const isAssignedFaculty = useMemo(() => {
    return (facKey: string) => {
      if (!assignedFacRaw) return false;

      // 1. Match by Employee ID (e.g. 4-7 digit numbers like 10234)
      const targetEmpId = (assignedFacRaw.match(/\b\d{4,7}\b/) || [])[0];
      const groupEmpId = (facKey.match(/\b\d{4,7}\b/) || [])[0];

      if (targetEmpId && groupEmpId && targetEmpId === groupEmpId) {
        return true;
      }
      if (targetEmpId && facKey.includes(targetEmpId)) {
        return true;
      }

      // 2. Match by Faculty Name Tokens
      const cleanTokens = (str: string) =>
        str
          .replace(/\b\d{4,7}\b/g, "")
          .replace(/\b(dr|prof|mr|mrs|ms|assoc|assistant|professor|ela|eth)\b/gi, "")
          .replace(/[^a-zA-Z\s]/g, "")
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length> 2);

      const targetTokens = cleanTokens(assignedFacRaw);
      const groupTokens = cleanTokens(facKey);

      if (targetTokens.length === 0 || groupTokens.length === 0) return false;

      const matchingTokens = targetTokens.filter((t) =>
        groupTokens.includes(t)
      );
      return matchingTokens.length> 0;
    };
  }, [assignedFacRaw]);

  const sortedGroupedEntries = useMemo(() => {
    const entries = Object.entries(groupedMaterials);
    if (!assignedFacRaw) return entries;

    return [...entries].sort(([facA], [facB]) => {
      const isA = isAssignedFaculty(facA);
      const isB = isAssignedFaculty(facB);
      if (isA && !isB) return -1;
      if (!isA && isB) return 1;
      return 0;
    });
  }, [groupedMaterials, assignedFacRaw, isAssignedFaculty]);

  return (
    <div className="absolute inset-0 w-full h-full font-mono transition-colors bg-transparent text-(--text-main)">
      <div className="h-full flex flex-col min-h-0">
        {!selectedOptionId ? (
          <div className="h-full flex flex-col items-center justify-center pt-24">
            <span className="font-bold uppercase text-xs text-(--text-dim)">
              No courses found for this semester
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 flex-1 min-h-0 overflow-hidden pl-4 md:pl-8 lg:pl-12 pr-4 md:pr-8 lg:pr-12">
            {/* === STATIC LEFT PANEL === */}
            <div className="lg:col-span-4 xl:col-span-4 h-full flex flex-col overflow-y-auto custom-scrollbar pt-24 md:pt-28 pb-24 pr-4">
              {/* Aggregated Info */}
              {currentOption && (
                <div className="flex flex-col gap-6 mb-16">
                  <div className="flex flex-col gap-2">
                    <div
                      className="relative z-50"
                      tabIndex={0}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setIsCourseSelectorOpen(false);
                        }
                      }}>
                      <div
                        className="flex items-start md:items-center gap-2 cursor-pointer transition-colors w-fit group/titlebtn"
                        onClick={() => setIsCourseSelectorOpen((p) => !p)}>
                        <h2 className="text-3xl md:text-4xl font-black font-expanded leading-none group-hover/titlebtn:text-(--accent-base) transition-colors">
                          {currentOption.title}
                        </h2>
                        <KeyboardArrowDown
                          className={`w-8 h-8 md:w-10 md:h-10 transition-transform duration-fast shrink-0 group-hover/titlebtn:text-(--accent-base) ${
                            isCourseSelectorOpen ? "rotate-180" : ""
                          }`} />
                      </div>

                      
                        {isCourseSelectorOpen && (
                          <div 
                            className="absolute top-full left-0 mt-2 w-[85vw] md:w-[24rem] bg-(--bg-surface) border-2 border-(--border-main) rounded-2xl shadow-none overflow-hidden origin-top-left z-50">
                            <div className="max-h-[50vh] overflow-y-auto overscroll-contain custom-scrollbar p-1.5 space-y-1">
                              {cpOptions
                                .filter(
                                  (o) =>
                                    o.semester
                                      .replace(/0+([1-9])$/, "$1")
                                      .toLowerCase() ===
                                    selectedSem
                                      .replace(/0+([1-9])$/, "$1")
                                      .toLowerCase()
                                )
                                .map((opt) => (
                                  <button
                                    key={opt.classId}
                                    onClick={() => {
                                      setSelectedOptionId(opt.classId);
                                      setIsCourseSelectorOpen(false);
                                    }}
                                    className={`w-full flex flex-col text-left px-3 py-2 text-xs transition-all rounded-xl border-2 ${
                                      opt.classId === selectedOptionId
                                        ? "bg-(--accent-base) text-(--text-inverse) border-(--border-main)"
                                        : "bg-transparent border-transparent text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main) hover:border-(--border-dim)"
                                    }`}>
                                    <div className="flex justify-between items-center gap-2 w-full">
                                      <span className="font-black text-xs uppercase">
                                        {opt.code}
                                      </span>
                                      <span className="opacity-80 text-[9px] border border-current px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shrink-0">
                                        {opt.type}
                                      </span>
                                    </div>
                                    <div className="font-bold font-expanded mt-0.5 w-full text-sm leading-tight wrap-break-word">
                                      {opt.title}
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="font-bold text-xs md:text-sm text-(--accent-base) bg-(--accent-base)/10 px-3 py-1.5 rounded-full uppercase tracking-widest">
                        {currentOption.code}
                      </span>
                      <span className="font-bold text-xs md:text-sm text-(--text-main) bg-(--bg-highlight) px-3 py-1.5 rounded-full uppercase tracking-widest">
                        {currentOption.type}
                      </span>
                      <span className="font-bold text-xs md:text-sm text-(--text-main) bg-(--bg-highlight) px-3 py-1.5 rounded-full uppercase tracking-widest">
                        {currentOption.credits} Credits
                      </span>
                      <span className="font-bold text-xs md:text-sm text-(--text-main) bg-(--bg-highlight) px-3 py-1.5 rounded-full uppercase tracking-widest">
                        Class {currentOption.classId}
                      </span>
                    </div>
                  </div>

                  {(courseTimetable ||
                    courseAttendance ||
                    courseAssignments.length> 0 ||
                    courseMarks ||
                    courseGrade) && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {courseTimetable && (
                        <>
                          <div className="flex flex-col gap-1 bg-(--bg-surface) p-4 rounded-2xl border-none">
                            <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">
                              Faculty
                            </span>
                            <span
                              className="text-sm md:text-base font-bold text-(--text-main) truncate"
                              title={courseTimetable.faculty}>
                              {courseTimetable.faculty}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 bg-(--bg-surface) p-4 rounded-2xl border-none">
                            <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">
                              Schedule
                            </span>
                            <span
                              className="text-sm md:text-base font-bold text-(--text-main) truncate"
                              title={`${courseTimetable.slot} • ${courseTimetable.venue}`}>
                              {courseTimetable.slot} • {courseTimetable.venue}
                            </span>
                          </div>
                        </>
                      )}
                      {courseAttendance && (
                        <div className="flex flex-col gap-1 bg-(--bg-surface) p-4 rounded-2xl border-none">
                          <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">
                            Attendance
                          </span>
                          <span
                            className={`text-sm md:text-base font-black ${
                              parseFloat(courseAttendance.attendance) < 75
                                ? "text-att-danger"
                                : "text-(--text-main)"
                            }`}>
                            {courseAttendance.attendance}%{" "}
                            <span className="font-bold opacity-50">
                              ({courseAttendance.attended}/
                              {courseAttendance.total})
                            </span>
                          </span>
                        </div>
                      )}
                      {courseAssignments.length> 0 && (
                        <div className="flex flex-col gap-1 bg-(--bg-surface) p-4 rounded-2xl border-none">
                          <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">
                            Assignments
                          </span>
                          <span className="text-sm md:text-base font-black text-(--text-main)">
                            {
                              courseAssignments.filter(
                                (a) =>
                                  (a.status || "").toLowerCase() !==
                                  "submitted"
                              ).length
                            }{" "}
                            <span className="font-bold opacity-50">
                              Pending
                            </span>
                          </span>
                        </div>
                      )}

                      {courseGrade && (
                        <div className="flex flex-col gap-1 bg-(--bg-surface) p-4 rounded-2xl border-none">
                          <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">
                            Final Grade
                          </span>
                          <span className="text-sm md:text-base font-black text-(--text-main)">
                            {courseGrade.grade}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {courseMarks &&
                    courseMarks.assessments &&
                    courseMarks.assessments.length> 0 && (
                      <div className="flex flex-col gap-3 bg-(--bg-surface) p-5 rounded-3xl border-none mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">
                            Assessments
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {courseMarks.assessments.map(
                            (a: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center bg-(--bg-main) p-3 rounded-xl">
                                <span className="text-sm font-bold text-(--text-main)">
                                  {a.title}
                                </span>
                                <div className="flex flex-col items-end">
                                  <span className="text-sm font-black text-(--accent-base)">
                                    {a.scoredMark}{" "}
                                    <span className="opacity-50 text-(--text-dim)">
                                      / {a.maxMark}
                                    </span>
                                  </span>
                                  {a.weightage &&
                                    a.weightage !== "-" &&
                                    a.weightage !== "0" && (
                                      <span className="text-[10px] font-bold text-(--text-dim) uppercase">
                                        {a.scoredPercentage} / {a.weightage} WGT
                                      </span>
                                    )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {upcomingClasses !== null && upcomingClasses.length> 0 && (
                    <div className="flex flex-col gap-3 bg-(--bg-surface) p-5 rounded-3xl border-none mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">
                          Upcoming Classes
                        </span>
                        <span className="text-xs font-bold text-(--text-main) bg-(--bg-main) px-2 py-1 rounded-full uppercase">
                          {upcomingClasses.reduce(
                            (acc, curr) => acc + curr.slots.length,
                            0
                          )}{" "}
                          Total Slots Left
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {upcomingClasses.slice(0, 15).map((uc, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center bg-(--bg-main) p-3 rounded-xl">
                            <span className="text-sm font-bold text-(--text-main)">
                              {uc.date.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <div className="flex flex-col items-end gap-1">
                              {uc.slots.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs font-bold text-(--accent-base)">
                                  {s.start} - {s.end}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                        {upcomingClasses.length> 15 && (
                          <div className="flex justify-center items-center p-2 mt-1">
                            <span className="text-xs font-bold text-(--text-dim) uppercase">
                              + {upcomingClasses.length - 15} more classes
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Outcomes */}
              {data?.outcomes && data.outcomes.length> 0 && (
                <div className="flex flex-col mb-16">
                  <h3 className="font-black font-expanded text-(--text-dim) mb-6 uppercase tracking-widest text-sm text-left">
                    Course Outcomes
                  </h3>
                  <div className="flex flex-col gap-6">
                    {data.outcomes.map((oc, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="font-black text-xl text-(--accent-base) select-none font-expanded">
                          #{oc.number || i + 1}
                        </span>
                        <p className="text-sm md:text-base font-medium text-(--text-main) leading-relaxed pt-0.5">
                          {oc.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Syllabus */}
              {data?.syllabus && data.syllabus.length> 0 && (
                <div className="flex flex-col mb-16">
                  <h3 className="font-black font-expanded text-(--text-dim) mb-6 uppercase tracking-widest text-sm text-left">
                    Syllabus
                  </h3>
                  <div className="flex flex-col gap-8">
                    {data.syllabus.map((mod, i) => {
                      const rawTopics = mod.topics || "";
                      const lines = rawTopics
                        .split(/(?=\d+\s*-)/)
                        .filter(Boolean)
                        .map((l) => l.replace(/^\d+\s*-\s*/, "").trim());
                      const renderTopics =
                        lines.length> 0 ? lines : [rawTopics];

                      return (
                        <div key={i} className="flex flex-col gap-5">
                          <div className="flex items-center gap-4">
                            <span className="font-black text-4xl text-(--accent-base)">
                              {mod.number.replace(/\D/g, "") || i + 1}
                            </span>
                            <h4 className="font-bold text-base md:text-lg text-(--text-main) uppercase">
                              {mod.title}
                            </h4>
                          </div>
                          <ul className="flex flex-col gap-2 pl-2">
                            {renderTopics.map((topic, j) => (
                              <li
                                key={j}
                                className="text-sm md:text-base font-medium text-(--text-main) leading-relaxed">
                                {topic}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Books */}
              {data?.books && data.books.length> 0 && (
                <div className="flex flex-col mb-16">
                  <h3 className="font-black font-expanded text-(--text-dim) mb-6 uppercase tracking-widest text-sm text-left">
                    Suggested Books
                  </h3>
                  <div className="flex flex-col gap-4">
                    {data.books.map((book, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <MenuBook className="w-5 h-5 text-(--accent-base) shrink-0 mt-0.5" />
                        <p className="font-bold text-sm md:text-base text-(--text-main) leading-relaxed">
                          {book}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* === SCROLLABLE RIGHT PANEL === */}
            <div className="lg:col-span-6 xl:col-span-6 h-full flex flex-col overflow-y-auto custom-scrollbar pt-18 md:pt-10 pb-24 pr-2 space-y-6">
              {/* Material 3 Search Bar & Sort Button at top of Right Panel */}
              <div className="sticky -top-1 z-20 pt-4 pb-3 bg-(--bg-main) flex items-center gap-3">
                <div className="relative flex items-center flex-1 group">
                  <Search className="absolute left-4 w-5 h-5 text-(--text-muted) group-focus-within:text-(--accent-base) transition-colors pointer-events-none" />
                  <input
                    type="text"
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                    placeholder="Search course materials, topics, modules..."
                    className="w-full pl-12 pr-10 py-4 bg-(--bg-surface) text-base font-mono font-bold text-(--text-main) placeholder:text-(--text-muted) rounded-full border-2 border-(--border-dim)/40 focus:border-(--accent-base) outline-none transition-colors" />
                  {localSearchTerm && (
                    <button
                      onClick={() => setLocalSearchTerm("")}
                      className="absolute right-3.5 p-1 rounded-full text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight) transition-colors cursor-pointer border-0">
                      <Close className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() =>
                    setMaterialSort((s) => (s === "date" ? "module" : "date"))
                  }
                  className="flex items-center gap-1.5 px-4 py-3 rounded-full bg-(--bg-surface) hover:bg-(--bg-highlight) transition-colors text-xs font-mono font-bold uppercase text-(--text-main) shrink-0 border border-(--border-dim)/40 cursor-pointer">
                  <SwapVert className="w-4 h-4 text-(--accent-base)" />
                  {materialSort === "date" ? "Date" : "Module"}
                </button>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 group">
                  <Layers className="w-16 h-16 text-(--accent-base) animate-bounce mb-4" />
                  <span className="text-lg text-(--text-dim) font-bold font-expanded uppercase transition-all duration-fast group-hover:font-squish animate-pulse">
                    Fetching Course Materials...
                  </span>
                </div>
              ) : (
                /* Stagger Animated Materials List */
                <div  
                  key={localSearchTerm + materialSort + currentOption?.classId}
                  className="flex flex-col gap-10">
                  {sortedGroupedEntries.map(([facultyStr, mats]) => {
                    const fac = formatFaculty(facultyStr);
                    const isAssigned = isAssignedFaculty(facultyStr);

                    return (
                      <div
                        key={facultyStr} 
                        className="flex flex-col">
                        <div className="flex flex-col gap-2 mb-4 border-b border-(--border-dim)/30 pb-4">
                          <div className="flex justify-between items-start gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl md:text-2xl font-black font-expanded text-(--text-main) uppercase">
                                {fac.name}
                              </h3>
                              {isAssigned && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-(--accent-base) text-(--text-inverse)">
                                  Assigned Faculty
                                </span>
                              )}
                            </div>
                          </div>
                          {fac.subs.length> 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {fac.subs.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] md:text-xs font-mono font-bold text-(--text-muted) bg-(--bg-surface) px-2.5 py-1 rounded-full uppercase tracking-wider border border-(--border-dim)/30">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div 
                          className="flex flex-col gap-2">
                          {mats.map((mat) => {
                            const isWebLink = (mat.category || "")
                              .toLowerCase()
                              .includes("web link");
                            const Icon = isWebLink ? Language : Description;

                            return (
                              <div
                                key={mat.id} 
                                onClick={() => {
                                  const courseName =
                                    currentOption?.title || "Course";
                                  handleDownload(mat.id, fac.name, courseName);
                                }}
                                className="group flex items-center gap-4 py-3 px-3.5 rounded-2xl cursor-pointer bg-transparent hover:bg-(--bg-surface)/70 transition-colors border border-transparent hover:border-(--border-dim)/30">
                                <div className="w-10 h-10 rounded-full bg-(--bg-surface) flex items-center justify-center text-(--accent-base) group-hover:text-(--text-inverse) group-hover:bg-(--accent-base) transition-colors shrink-0 border border-(--border-dim)/30">
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1 flex flex-col">
                                  <div className="flex items-center gap-2">
                                    {mat.module !== undefined &&
                                      mat.module !== "" && (
                                        <span className="shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-(--bg-surface) text-(--text-muted) uppercase border border-(--border-dim)/30">
                                          MOD {mat.module}
                                        </span>
                                      )}
                                    <h4 className="font-bold text-(--text-main) text-sm md:text-base truncate group-hover:text-(--accent-base) transition-colors">
                                      {mat.title}
                                    </h4>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-(--text-muted) uppercase mt-0.5">
                                    {mat.uploadDate} • {mat.category}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {filteredMaterials.length === 0 && data && (
                    <div className="py-12 flex justify-center text-(--text-dim)">
                      <span className="font-bold uppercase text-xs">
                        No matching files
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
