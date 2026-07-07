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
    className={`bg-zinc-900 border-4 border-zinc-800 rounded-4xl shadow-none ${className}`}
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
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CoursePageData | null>(null);
  const [isCourseListOpen, setIsCourseListOpen] = useState(false);

  useEffect(() => {
    if (!selectedOptionId) {
      setData(null);
      setIsCourseListOpen(true);
    }
  }, [selectedOptionId]);

  useEffect(() => {
    setIsCourseListOpen(false);
  }, [selectedSem]);

  useEffect(() => {
    if (cpOptions.length > 0) return;

    let isMounted = true;
    const fetchOptions = async () => {
      try {
        let html = await network.fetchFragment(
          "academics/common/CoursePageConsolidated",
        );
        let parsed = parseCoursePage(html);

        if (parsed.options.length === 0) {
          html = await network.fetchFragment(
            "academics/CoursePageConsolidated/CoursePage",
          );
          parsed = parseCoursePage(html);
        }

        if (!isMounted) return;
        if (parsed.options.length > 0) {
          setCpOptions(parsed.options);
        }
      } catch (err) {
        console.error("Failed to load course options:", err);
      }
    };
    fetchOptions();
    return () => {
      isMounted = false;
    };
  }, [network, cpOptions.length, setCpOptions]);

  useEffect(() => {
    if (!selectedOptionId || !selectedSem || cpOptions.length === 0) return;

    const opt = cpOptions.find(
      (o) =>
        o.classId === selectedOptionId && isSameSem(o.semester, selectedSem),
    );
    if (!opt) return;

    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const body = new URLSearchParams();
        body.append("_csrf", getCsrf());
        body.append("authorizedID", getAuthId());
        body.append("semester", opt.semester);
        body.append("CourseId", opt.classId);
        body.append("CoursType", opt.type);
        body.append("x", new Date().toUTCString());

        const res = await fetch(
          "/vtop/academics/CoursePageConsolidated/getCourseDetail",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
              "Close-Requested-With": "XMLHttpRequest",
            },
            body: body,
          },
        );

        const html = await res.text();
        if (!isMounted) return;

        const parsedDetails = parseCoursePage(html);
        setData({
          ...parsedDetails,
          options: cpOptions,
          selectedCourseId: selectedOptionId,
        });
      } catch (error) {
        console.error("Failed to fetch details", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedOptionId, selectedSem, cpOptions]);

  const handleDownload = (fileId: string, facultyName: string, courseName: string) => {
    try {
      chrome.storage.local.set({
        lastDownloadInfo: {
          faculty: facultyName,
          course: courseName,
        },
      });
    } catch (e) {
      console.error("Failed to set download info", e);
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/vtop/downloadCourseMaterialFacultyPdf";

    const csrfInput = document.createElement("input");
    csrfInput.type = "hidden";
    csrfInput.name = "_csrf";
    csrfInput.value = getCsrf();

    const authInput = document.createElement("input");
    authInput.type = "hidden";
    authInput.name = "authorizedID";
    authInput.value = getAuthId();

    const fileInput = document.createElement("input");
    fileInput.type = "hidden";
    fileInput.name = "fileId";
    fileInput.value = fileId;

    form.appendChild(csrfInput);
    form.appendChild(authInput);
    form.appendChild(fileInput);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const currentOption = cpOptions.find((o) => o.classId === selectedOptionId);

  const filteredMaterials =
    data?.materials.filter((m) => {
      const term = searchTerm.toLowerCase();
      return (
        m.title.toLowerCase().includes(term) ||
        m.faculty.toLowerCase().includes(term) ||
        m.category.toLowerCase().includes(term)
      );
    }) || [];

  const groupedMaterials = React.useMemo(() => {
    if (!filteredMaterials) return {};
    return filteredMaterials.reduce((acc, mat) => {
      const fac = mat.faculty || "Unknown Faculty";
      if (!acc[fac]) acc[fac] = [];
      acc[fac].push(mat);
      return acc;
    }, {} as Record<string, CourseMaterial[]>);
  }, [filteredMaterials]);

  const formatFaculty = (facultyStr: string) => {
    const parts = facultyStr.split(" - ").map(p => p.trim());
    if (parts.length >= 3) {
      return { name: parts[1], subs: [parts[0], ...parts.slice(2)] };
    }
    if (parts.length === 2) {
      return { name: parts[1], subs: [parts[0]] };
    }
    return { name: facultyStr, subs: [] };
  };

  return (
    <div className="absolute inset-0 w-full h-full font-mono transition-colors bg-transparent text-(--text-main)">
      <div className="h-full flex flex-col min-h-0">
        {!selectedOptionId ? (
          <div className="h-full flex flex-col items-center justify-center pt-24">
            <span className="font-bold uppercase text-xs text-(--text-dim)">Select a course to view details</span>
          </div>
        ) : loading ? (
          <div className="h-full flex flex-col items-center justify-center group pt-24">
            <Layers className="w-24 h-24 text-(--accent-base) animate-bounce mb-6" />
            <span className="text-2xl text-(--text-dim) font-bold font-expanded uppercase transition-all duration-300 group-hover:font-squish animate-pulse">
              Fetching Data...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 flex-1 min-h-0 overflow-hidden pl-4 md:pl-8 lg:pl-12 pr-4 md:pr-8 lg:pr-12">
            {/* === STATIC LEFT PANEL === */}
            <div className="lg:col-span-4 xl:col-span-4 h-full flex flex-col overflow-y-auto custom-scrollbar pt-24 md:pt-32 pb-24 pr-4">
              
              {/* Outcomes */}
              {data?.outcomes && data.outcomes.length > 0 && (
                <div className="flex flex-col mb-16">
                  <h3 className="font-black font-expanded text-(--text-dim) mb-16 uppercase tracking-widest text-sm text-center">Course Outcomes</h3>
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
                  <h3 className="font-black font-expanded text-(--text-dim) mb-16 uppercase tracking-widest text-sm text-center">Syllabus</h3>
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
                  <h3 className="font-black font-expanded text-(--text-dim) mb-16 uppercase tracking-widest text-sm text-center">Suggested Books</h3>
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
                      <h3 className="text-xl md:text-2xl font-black font-expanded text-(--text-main) uppercase">{fac.name}</h3>
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
                              <h4 className="font-bold text-(--text-main) text-sm md:text-base truncate group-hover:text-(--accent-base) transition-colors">{mat.title}</h4>
                              <span className="text-[10px] font-bold text-(--text-dim) font-mono uppercase mt-0.5">{mat.uploadDate}</span>
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
