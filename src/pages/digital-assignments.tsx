import { useEffect, useState } from "react";
import { useDataStore } from "../store/dataStore";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";
import { VTOPNetwork } from "../utils/network";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "../components/EmptyState";
import { useRef } from "react";
import { KeyboardArrowDown, School, Person, Download, Upload } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

const CourseCard = ({ course, network, expanded, setExpanded }: any) => {
  const { daAssignments, fetchDAAssignments, daLoading } = useDataStore();
  const assignments = daAssignments[course.classId];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeAssgn, setActiveAssgn] = useState<any>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = (e: React.MouseEvent, assgn: any) => {
    e.stopPropagation();
    try {
      network.downloadStudentDA(course.classId, assgn.code);
    } catch (err) {
      alert("Failed to download DA.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAssgn) return;
    setUploading(activeAssgn.code);
    try {
      await network.getDAUploadView(course.classId, activeAssgn.code);
      await network.uploadStudentDA(course.classId, activeAssgn.code, activeAssgn.title, file);
      alert("Upload Successful!");
      fetchDAAssignments(network, course.classId, true);
    } catch (err) {
      alert("Upload Failed. Please try again.");
    } finally {
      setUploading(null);
      setActiveAssgn(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  
  const handleToggle = () => {
    if (expanded) {
      setExpanded(null);
    } else {
      setExpanded(course.classId);
      if (!assignments) {
        fetchDAAssignments(network, course.classId);
      }
    }
  };

  return (
    <div className="bg-(--bg-panel) border-2 border-(--border-main) rounded-2xl overflow-hidden transition-all duration-300">
      <button 
        onClick={handleToggle}
        className="w-full p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left hover:bg-(--bg-highlight) transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-(--accent-base)/10 text-(--accent-base) text-xs font-bold font-mono border border-(--accent-base)/20">
              {course.code}
            </span>
            <span className="px-2 py-0.5 rounded bg-(--text-muted)/10 text-(--text-muted) text-xs font-bold font-mono border border-(--border-main)">
              {course.type}
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-(--text-main) truncate leading-tight">
            {course.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-(--text-muted) text-sm font-medium">
            <Person className="w-4 h-4" />
            <span className="truncate">{course.faculty}</span>
          </div>
        </div>
        
        <div className="shrink-0 flex items-center justify-between md:justify-end gap-4">
          <div className={`p-1.5 rounded-full bg-(--bg-main) border border-(--border-main) transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>
            <KeyboardArrowDown className="w-5 h-5 text-(--text-muted)" />
          </div>
        </div>
      </button>
      
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 md:p-6 pt-0 border-t-2 border-(--border-main) bg-(--bg-highlight)/30">
              {daLoading && !assignments ? (
                <div className="flex justify-center py-8 text-(--text-muted) font-mono animate-pulse">
                  LOADING ASSIGNMENTS...
                </div>
              ) : assignments && assignments.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 mt-4">
                  {assignments.map((assgn: any, idx: number) => (
                    <div key={idx} className="bg-(--bg-panel) p-4 rounded-xl border border-(--border-main) flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-(--text-main) text-lg">{assgn.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-(--text-muted) font-medium">
                          <span className="flex items-center gap-1 bg-(--bg-main) px-2 py-1 rounded border border-(--border-main)">
                            Max: <strong className="text-(--text-main)">{assgn.maxMark}</strong>
                          </span>
                          <span className="flex items-center gap-1 bg-(--bg-main) px-2 py-1 rounded border border-(--border-main)">
                            Weight: <strong className="text-(--text-main)">{assgn.weightage}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-start md:items-end gap-2 text-sm font-mono text-(--text-muted)">
                        <div>Due: <span className="text-(--text-main) font-bold">{assgn.dueDate}</span></div>
                        <div className="text-xs">Updated: {assgn.lastUpdated || "Not Uploaded"}</div>
                        <div className="flex gap-2 mt-2">
                          {assgn.lastUpdated && assgn.lastUpdated.trim() !== "" && (
                            <button 
                              onClick={(e) => handleDownload(e, assgn)}
                              disabled={downloading === assgn.code}
                              className="px-3 py-1.5 flex items-center gap-1 bg-(--bg-highlight) hover:bg-(--accent-base) hover:text-black rounded-lg transition-colors border border-(--border-main) text-(--text-main)"
                            >
                              <Download className="w-4 h-4" />
                              {downloading === assgn.code ? "..." : "GET"}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAssgn(assgn);
                              fileInputRef.current?.click();
                            }}
                            disabled={uploading === assgn.code}
                            className="px-3 py-1.5 flex items-center gap-1 bg-(--text-main) text-(--bg-main) hover:opacity-90 rounded-lg transition-colors border border-(--border-main)"
                          >
                            <Upload className="w-4 h-4" />
                            {uploading === assgn.code ? "..." : "PUT"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: "none" }} 
                    accept=".xls,.xlsx,.pdf,.doc,.docx" 
                    onChange={handleUpload} 
                  />
                </div>
              ) : (
                <div className="flex justify-center py-8 text-(--text-muted) font-bold font-mono">
                  NO ASSIGNMENTS FOUND
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function DigitalAssignments({ network }: { network: VTOPNetwork }) {
  const {
    daSemesters,
    daCourses,
    daLoading,
    status,
    fetchDASemesters,
  } = useDataStore();

  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "Demo Mode Active" && daSemesters.length === 0) {
      fetchDASemesters(network);
    }
  }, [status, daSemesters.length, fetchDASemesters, network]);

  if (status === "Offline - Not Synced") {
    return <OfflineNotSynced />;
  }

  return (
    <div className="h-full w-full bg-(--bg-main) text-(--text-main) overflow-hidden relative z-0 flex">
      <div className="flex-1 flex flex-col w-full h-full overflow-y-auto">
        <div className="w-full h-21 md:h-25 shrink-0" />
        <div className="flex-1 pb-20 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {daLoading && daCourses.length === 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-(--bg-panel) rounded-2xl border-2 border-(--border-main) animate-pulse" />
              ))}
            </div>
          ) : daCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {daCourses.map((course) => (
                <CourseCard 
                  key={course.classId} 
                  course={course} 
                  network={network}
                  expanded={expandedCourse === course.classId}
                  setExpanded={setExpandedCourse}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={School}
              msg="No Courses Found"
              subMsg="Could not find any courses for the selected semester."
            />
          )}
        </div>
      </div>
    </div>
  );
}
