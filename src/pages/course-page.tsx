import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { getGridPositions, getCorrectDayName, CAMPUS_SLOT_TIMINGS } from "../utils/timetable-slots";

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

const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

const NeoCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-surface border-4 border-border-default rounded-4xl shadow-none ${className}`}
  >
    {children}
  </div>
);

const getCsrf = () => {
  const match = document.documentElement.innerHTML.match(
    /csrfValue\s*=\s*"([^"]+)"/,
  );
  if (match) return match[1];
  return (
    (document.querySelector('input[name="_csrf"]') as HTMLInputElement)
      ?.value || ""
  );
};

const getAuthId = () => {
  const authInput = document.getElementById(
    "authorizedIDX",
  ) as HTMLInputElement;
  if (authInput) return authInput.value;
  return (
    (document.querySelector('input[name="authorizedID"]') as HTMLInputElement)
      ?.value || ""
  );
};

const isSameSem = (sem1: string, sem2: string) => {
  if (!sem1 || !sem2) return false;
  const normalize = (s: string) => s.replace(/0+([1-9])$/, "$1").toLowerCase();
  return normalize(sem1) === normalize(sem2);
};

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

  const formatFaculty = (raw: string) => {
    let name = raw;
    let subs: string[] = [];
    const parts = raw.split("-").map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      name = parts[0];
      subs = parts.slice(1);
    }
    return { name, subs };
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
    handleDownload
  } = useCoursePageData(
    network,
    cpOptions,
    setCpOptions,
    selectedSem,
    selectedOptionId,
    setSelectedOptionId,
    searchTerm,
    materialSort
  );

  return (
    <div className="absolute inset-0 w-full h-full font-mono transition-colors bg-transparent text-(--text-main)">
      <div className="h-full flex flex-col min-h-0">
        {!selectedOptionId ? (
          <div className="h-full flex flex-col items-center justify-center pt-24">
            <span className="font-bold uppercase text-xs text-(--text-dim)">No courses found for this semester</span>
          </div>
        ) : loading ? (
          <div className="h-full flex flex-col items-center justify-center group pt-24">
            <Layers className="w-24 h-24 text-(--accent-base) animate-bounce mb-6" />
            <span className="text-2xl text-(--text-dim) font-bold font-expanded uppercase transition-all duration-fast group-hover:font-squish animate-pulse">
              Fetching Data...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 flex-1 min-h-0 overflow-hidden pl-4 md:pl-8 lg:pl-12 pr-4 md:pr-8 lg:pr-12">
            {/* === STATIC LEFT PANEL === */}
            <div className="lg:col-span-4 xl:col-span-4 h-full flex flex-col overflow-y-auto custom-scrollbar pt-24 md:pt-32 pb-24 pr-4">
              
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
                      }}
                    >
                      <div 
                        className="flex items-start md:items-center gap-2 cursor-pointer transition-colors w-fit group/titlebtn"
                        onClick={() => setIsCourseSelectorOpen(p => !p)}
                      >
                        <h2 className="text-3xl md:text-4xl font-black font-expanded leading-none group-hover/titlebtn:text-(--accent-base) transition-colors">{currentOption.title}</h2>
                        <KeyboardArrowDown className={`w-8 h-8 md:w-10 md:h-10 transition-transform duration-fast shrink-0 group-hover/titlebtn:text-(--accent-base) ${isCourseSelectorOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      <AnimatePresence>
                        {isCourseSelectorOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 mt-2 w-[85vw] md:w-[24rem] bg-(--bg-surface) border-2 border-(--border-main) rounded-2xl shadow-none overflow-hidden origin-top-left z-50"
                          >
                            <div className="max-h-[50vh] overflow-y-auto overscroll-contain custom-scrollbar p-1.5 space-y-1">
                              {cpOptions
                                .filter((o) => o.semester.replace(/0+([1-9])$/, "$1").toLowerCase() === selectedSem.replace(/0+([1-9])$/, "$1").toLowerCase())
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
                                    }`}
                                  >
                                    <div className="flex justify-between items-center gap-2 w-full">
                                      <span className="font-black text-xs uppercase">{opt.code}</span>
                                      <span className="opacity-80 text-[9px] border border-current px-1 py-0.5 rounded font-bold uppercase tracking-widest shrink-0">
                                        {opt.type}
                                      </span>
                                    </div>
                                    <div className="font-bold font-expanded mt-0.5 w-full text-sm leading-tight wrap-break-word">
                                      {opt.title}
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="font-bold text-xs md:text-sm text-(--accent-base) bg-(--accent-base)/10 px-3 py-1.5 rounded-lg uppercase tracking-widest">{currentOption.code}</span>
                      <span className="font-bold text-xs md:text-sm text-(--text-main) bg-(--bg-highlight) px-3 py-1.5 rounded-lg uppercase tracking-widest">{currentOption.type}</span>
                      <span className="font-bold text-xs md:text-sm text-(--text-main) bg-(--bg-highlight) px-3 py-1.5 rounded-lg uppercase tracking-widest">{currentOption.credits} Credits</span>
                      <span className="font-bold text-xs md:text-sm text-(--text-main) bg-(--bg-highlight) px-3 py-1.5 rounded-lg uppercase tracking-widest">Class {currentOption.classId}</span>
                    </div>
                  </div>
                  
                  {(courseTimetable || courseAttendance || courseAssignments.length > 0 || courseMarks || courseGrade) && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {courseTimetable && (
                        <>
                          <div className="flex flex-col gap-1 bg-(--bg-surface) p-4 rounded-2xl border-none">
                            <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">Faculty</span>
                            <span className="text-sm md:text-base font-bold text-(--text-main) truncate" title={courseTimetable.faculty}>{courseTimetable.faculty}</span>
                          </div>
                          <div className="flex flex-col gap-1 bg-(--bg-surface) p-4 rounded-2xl border-none">
                            <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">Schedule</span>
                            <span className="text-sm md:text-base font-bold text-(--text-main) truncate" title={`${courseTimetable.slot} • ${courseTimetable.venue}`}>{courseTimetable.slot} • {courseTimetable.venue}</span>
                          </div>
                        </>
                      )}
                      {courseAttendance && (
                        <div className="flex flex-col gap-1 bg-(--bg-surface) p-4 rounded-2xl border-none">
                          <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">Attendance</span>
                          <span className={`text-sm md:text-base font-black ${parseFloat(courseAttendance.attendance) < 75 ? 'text-att-danger' : 'text-(--text-main)'}`}>
                            {courseAttendance.attendance}% <span className="font-bold opacity-50">({courseAttendance.attended}/{courseAttendance.total})</span>
                          </span>
                        </div>
                      )}
                      {courseAssignments.length > 0 && (
                        <div className="flex flex-col gap-1 bg-(--bg-surface) p-4 rounded-2xl border-none">
                          <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">Assignments</span>
                          <span className="text-sm md:text-base font-black text-(--text-main)">
                            {courseAssignments.filter(a => (a.status || '').toLowerCase() !== 'submitted').length} <span className="font-bold opacity-50">Pending</span>
                          </span>
                        </div>
                      )}

                      {courseGrade && (
                        <div className="flex flex-col gap-1 bg-(--bg-surface) p-4 rounded-2xl border-none">
                          <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">Final Grade</span>
                          <span className="text-sm md:text-base font-black text-(--text-main)">
                            {courseGrade.grade}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {courseMarks && courseMarks.assessments && courseMarks.assessments.length > 0 && (
                    <div className="flex flex-col gap-3 bg-(--bg-surface) p-5 rounded-3xl border-none mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">Assessments</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {courseMarks.assessments.map((a: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-(--bg-main) p-3 rounded-xl">
                            <span className="text-sm font-bold text-(--text-main)">{a.title}</span>
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-black text-(--accent-base)">
                                {a.scoredMark} <span className="opacity-50 text-(--text-dim)">/ {a.maxMark}</span>
                              </span>
                              {a.weightage && a.weightage !== "-" && a.weightage !== "0" && (
                                <span className="text-[10px] font-bold text-(--text-dim) uppercase">
                                  {a.scoredPercentage} / {a.weightage} WGT
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {upcomingClasses !== null && upcomingClasses.length > 0 && (
                    <div className="flex flex-col gap-3 bg-(--bg-surface) p-5 rounded-3xl border-none mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-(--text-dim) uppercase tracking-widest">Upcoming Classes</span>
                        <span className="text-xs font-bold text-(--text-main) bg-(--bg-main) px-2 py-1 rounded-lg uppercase">{upcomingClasses.reduce((acc, curr) => acc + curr.slots.length, 0)} Total Slots Left</span>
                      </div>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {upcomingClasses.slice(0, 15).map((uc, i) => (
                          <div key={i} className="flex justify-between items-center bg-(--bg-main) p-3 rounded-xl">
                            <span className="text-sm font-bold text-(--text-main)">
                              {uc.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex flex-col items-end gap-1">
                              {uc.slots.map((s, idx) => (
                                <span key={idx} className="text-xs font-bold text-(--accent-base)">{s.start} - {s.end}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                        {upcomingClasses.length > 15 && (
                          <div className="flex justify-center items-center p-2 mt-1">
                            <span className="text-xs font-bold text-(--text-dim) uppercase">+ {upcomingClasses.length - 15} more classes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Outcomes */}
              {data?.outcomes && data.outcomes.length > 0 && (
                <div className="flex flex-col mb-16">
                  <h3 className="font-black font-expanded text-(--text-dim) mb-6 uppercase tracking-widest text-sm text-left">Course Outcomes</h3>
                  <div className="flex flex-col gap-6">
                    {data.outcomes.map((oc, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="font-black text-xl text-(--accent-base) select-none font-expanded">#{oc.number || i + 1}</span>
                        <p className="text-sm md:text-base font-medium text-(--text-main) leading-relaxed pt-0.5">{oc.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Syllabus */}
              {data?.syllabus && data.syllabus.length > 0 && (
                <div className="flex flex-col mb-16">
                  <h3 className="font-black font-expanded text-(--text-dim) mb-6 uppercase tracking-widest text-sm text-left">Syllabus</h3>
                  <div className="flex flex-col gap-8">
                    {data.syllabus.map((mod, i) => {
                      const rawTopics = mod.topics || "";
                      const lines = rawTopics.split(/(?=\d+\s*-)/).filter(Boolean).map(l => l.replace(/^\d+\s*-\s*/, '').trim());
                      const renderTopics = lines.length > 0 ? lines : [rawTopics];
                      
                      return (
                        <div key={i} className="flex flex-col gap-5">
                          <div className="flex items-center gap-4">
                            <span className="font-black text-4xl text-(--accent-base)">{mod.number.replace(/\D/g, '') || (i + 1)}</span>
                            <h4 className="font-bold text-base md:text-lg text-(--text-main) uppercase">{mod.title}</h4>
                          </div>
                          <ul className="flex flex-col gap-2 pl-2">
                            {renderTopics.map((topic, j) => (
                              <li key={j} className="text-sm md:text-base font-medium text-(--text-main) leading-relaxed">
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
              {data?.books && data.books.length > 0 && (
                <div className="flex flex-col mb-16">
                  <h3 className="font-black font-expanded text-(--text-dim) mb-6 uppercase tracking-widest text-sm text-left">Suggested Books</h3>
                  <div className="flex flex-col gap-4">
                    {data.books.map((book, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <MenuBook className="w-5 h-5 text-(--accent-base) shrink-0 mt-0.5" />
                        <p className="font-bold text-sm md:text-base text-(--text-main) leading-relaxed">{book}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* === SCROLLABLE RIGHT PANEL === */}
            <div className="lg:col-span-6 xl:col-span-6 h-full flex flex-col overflow-y-auto custom-scrollbar pt-24 md:pt-32 pb-24 pr-2 space-y-12">
              {Object.entries(groupedMaterials).map(([facultyStr, mats]) => {
                const fac = formatFaculty(facultyStr);
                return (
                  <div key={facultyStr} className="flex flex-col">
                    <div className="flex flex-col gap-2 mb-4 border-b-2 border-(--border-dim) pb-4">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="text-xl md:text-2xl font-black font-expanded text-(--text-main) uppercase">{fac.name}</h3>
                        <button
                          onClick={() => setMaterialSort(s => s === "date" ? "module" : "date")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--bg-highlight) hover:bg-(--border-dim) transition-colors text-xs font-bold font-expanded uppercase text-(--text-main) shrink-0"
                        >
                          <Filter className="w-3.5 h-3.5" />
                          Sort by {materialSort}
                        </button>
                      </div>
                      {fac.subs.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {fac.subs.map((s, idx) => (
                            <span key={idx} className="text-[10px] md:text-xs font-black text-(--bg-main) bg-(--text-main) px-2 py-1 rounded-md uppercase tracking-wider">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {mats.map(mat => {
                        const isWebLink = (mat.category || "").toLowerCase().includes("web link");
                        const Icon = isWebLink ? Language : Description;
                        
                        return (
                          <div 
                            key={mat.id}
                            onClick={() => {
                              const courseName = currentOption?.title || "Course";
                              handleDownload(mat.id, fac.name, courseName);
                            }}
                            className="group flex items-center gap-4 py-3 px-3 rounded-2xl cursor-pointer bg-transparent hover:bg-(--bg-highlight) transition-colors border-none"
                          >
                            <div className="w-10 h-10 rounded-xl bg-(--bg-main) flex items-center justify-center text-(--accent-base) group-hover:text-(--bg-main) group-hover:bg-(--accent-base) transition-colors shrink-0">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col">
                              <div className="flex items-center gap-2">
                                {mat.module !== undefined && mat.module !== "" && (
                                  <span className="shrink-0 text-[9px] font-black font-expanded px-1.5 py-0.5 rounded-md bg-(--bg-main) text-(--text-muted) uppercase">
                                    MOD {mat.module}
                                  </span>
                                )}
                                <h4 className="font-bold text-(--text-main) text-sm md:text-base truncate group-hover:text-(--accent-base) transition-colors">{mat.title}</h4>
                              </div>
                              <span className="text-[10px] font-bold text-(--text-dim) font-mono uppercase mt-0.5">
                                {mat.uploadDate} • {mat.category}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                );
              })}
              {filteredMaterials.length === 0 && data && (
                <div className="py-12 flex justify-center text-(--text-dim)">
                  <span className="font-bold uppercase text-xs">No matching files</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
