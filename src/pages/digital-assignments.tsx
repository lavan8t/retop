import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useDataStore } from "../store/dataStore";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";
import { VTOPNetwork } from "../utils/network";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "../components/EmptyState";
import {
  KeyboardArrowDown,
  School,
  Person,
  Download,
  Upload,
  Description,
  CheckCircle,
  Error as ErrorIcon,
  Close,
  CloudUpload,
  Visibility,
  FilePresent,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { SPRING_SNAPPY } from "../utils/motion";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_EXTENSIONS = ["pdf", "xls", "xlsx", "doc", "docx"];

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileExtension = (filename: string) => {
  return filename.split(".").pop()?.toLowerCase() || "";
};

const isAllowedFile = (file: File) => {
  const ext = getFileExtension(file.name);
  return ALLOWED_EXTENSIONS.includes(ext);
};

interface FilePreviewModalProps {
  file: File;
  courses: any[];
  assignmentsMap: Record<string, any[]>;
  initialClassId?: string;
  initialAssgnCode?: string;
  onClose: () => void;
  network: VTOPNetwork;
  onSuccess: (classId: string) => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  courses,
  assignmentsMap,
  initialClassId = "",
  initialAssgnCode = "",
  onClose,
  network,
  onSuccess,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || courses[0]?.classId || "");
  const [selectedAssgnCode, setSelectedAssgnCode] = useState<string>(initialAssgnCode || "");
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const availableAssignments = useMemo(() => {
    return assignmentsMap[selectedClassId] || [];
  }, [assignmentsMap, selectedClassId]);

  useEffect(() => {
    if (!selectedAssgnCode && availableAssignments.length > 0) {
      setSelectedAssgnCode(availableAssignments[0].code);
    }
  }, [availableAssignments, selectedAssgnCode]);

  const pdfUrl = useMemo(() => {
    if (file.type === "application/pdf" || getFileExtension(file.name) === "pdf") {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleUploadSubmit = async () => {
    if (!selectedClassId || !selectedAssgnCode) {
      setStatusMsg({ type: "error", text: "Please select a target course and assignment." });
      return;
    }

    const currentAssgn = availableAssignments.find((a) => a.code === selectedAssgnCode);
    const assgnTitle = currentAssgn?.title || "Digital Assignment";

    setIsUploading(true);
    setStatusMsg(null);

    try {
      await network.getDAUploadView(selectedClassId, selectedAssgnCode);
      await network.uploadStudentDA(selectedClassId, selectedAssgnCode, assgnTitle, file);
      setStatusMsg({ type: "success", text: "Assignment uploaded successfully!" });
      setTimeout(() => {
        onSuccess(selectedClassId);
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Upload failed. Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  const ext = getFileExtension(file.name);

  return (
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={SPRING_SNAPPY}
        className="w-full max-w-2xl bg-(--bg-surface) border-2 border-(--border-dim) rounded-3xl overflow-hidden popup-shadow flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-(--border-dim) bg-(--bg-main)">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-(--accent-base)/10 text-(--accent-base)">
              <FilePresent className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-expanded font-black text-lg text-(--text-main) leading-tight">
                File Preview & Submission
              </h3>
              <span className="text-xs font-bold text-(--text-muted)">
                Review document details before uploading to VTOP
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight) transition-colors cursor-pointer"
          >
            <Close className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 flex-1">
          {/* File Card Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-(--bg-main) border-2 border-(--border-dim)">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-3 rounded-xl bg-(--accent-base) text-(--text-inverse) shrink-0 font-mono font-black text-xs uppercase">
                {ext}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-bold text-sm text-(--text-main) truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="text-xs text-(--text-muted) font-mono">
                  Size: {formatFileSize(file.size)} • Type: {file.type || "Document"}
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Valid Format
            </span>
          </div>

          {/* Document Visual Preview */}
          <div className="w-full flex flex-col gap-2">
            <span className="text-xs font-bold text-(--text-muted) uppercase font-expanded flex items-center gap-1.5">
              <Visibility className="w-4 h-4 text-(--accent-base)" />
              Document Preview
            </span>

            {pdfUrl ? (
              <div className="w-full h-64 rounded-2xl overflow-hidden border-2 border-(--border-dim) bg-zinc-900">
                <iframe
                  src={pdfUrl}
                  title="PDF Preview"
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="w-full p-8 rounded-2xl border-2 border-dashed border-(--border-dim) bg-(--bg-main) flex flex-col items-center justify-center text-center gap-2">
                <Description className="w-12 h-12 text-(--text-muted) opacity-60" />
                <span className="font-bold text-sm text-(--text-main)">
                  {file.name}
                </span>
                <span className="text-xs text-(--text-muted)">
                  Visual preview is available for PDF files. Document data ({ext.toUpperCase()}) will be submitted directly to VTOP portal.
                </span>
              </div>
            )}
          </div>

          {/* Target Assignment Selector */}
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-(--bg-main) border-2 border-(--border-dim)">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase font-expanded text-(--text-muted)">
                Select Course
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedAssgnCode("");
                }}
                className="w-full px-4 py-2.5 rounded-xl font-bold text-sm bg-(--bg-surface) border-2 border-(--border-dim) text-(--text-main) outline-none cursor-pointer focus:border-(--accent-base)"
              >
                {courses.map((c) => (
                  <option key={c.classId} value={c.classId}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase font-expanded text-(--text-muted)">
                Select Assignment
              </label>
              <select
                value={selectedAssgnCode}
                onChange={(e) => setSelectedAssgnCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl font-bold text-sm bg-(--bg-surface) border-2 border-(--border-dim) text-(--text-main) outline-none cursor-pointer focus:border-(--accent-base)"
              >
                {availableAssignments.length === 0 ? (
                  <option value="">No assignments found for course</option>
                ) : (
                  availableAssignments.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.title} (Due: {a.dueDate || "N/A"})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {statusMsg && (
            <div
              className={`p-4 rounded-2xl font-bold text-xs flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/30"
                  : "bg-red-500/15 text-red-600 dark:text-red-400 border-2 border-red-500/30"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <ErrorIcon className="w-5 h-5 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t-2 border-(--border-dim) bg-(--bg-main) flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase border-2 border-(--border-dim) text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight) transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUploadSubmit}
            disabled={isUploading || availableAssignments.length === 0}
            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) transition-all border-0 cursor-pointer disabled:opacity-50 hover:opacity-90 flex items-center gap-2"
          >
            <CloudUpload className="w-4 h-4" />
            {isUploading ? "Uploading to VTOP..." : "Submit Assignment"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const CourseCard = ({ course, network, expanded, setExpanded, onSelectFile }: any) => {
  const { daAssignments, fetchDAAssignments, daLoading } = useDataStore();
  const assignments = daAssignments[course.classId];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeAssgn, setActiveAssgn] = useState<any>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = (e: React.MouseEvent, assgn: any) => {
    e.stopPropagation();
    try {
      setDownloading(assgn.code);
      network.downloadStudentDA(course.classId, assgn.code);
      setTimeout(() => setDownloading(null), 2000);
    } catch (err) {
      alert("Failed to download DA.");
      setDownloading(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAssgn) return;

    if (!isAllowedFile(file)) {
      alert("Invalid file format. Allowed formats: PDF, XLS, XLSX, DOC, DOCX.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File size exceeds 4MB limit.");
      return;
    }

    onSelectFile(file, course.classId, activeAssgn.code);
    setActiveAssgn(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const pendingCount = assignments
    ? assignments.filter((a: any) => !a.lastUpdated || a.lastUpdated.trim() === "").length
    : 0;

  return (
    <div className="bg-(--bg-surface) border-2 border-(--border-dim) rounded-3xl overflow-hidden transition-all duration-200">
      <button
        onClick={handleToggle}
        className="w-full p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left hover:bg-(--bg-highlight) transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-(--accent-base)/10 text-(--accent-base) text-xs font-bold font-mono border border-(--accent-base)/20">
              {course.code}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-(--bg-main) text-(--text-muted) text-xs font-bold font-mono border border-(--border-dim)">
              {course.type}
            </span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-black uppercase font-mono border border-amber-500/30">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <h3 className="text-lg md:text-xl font-black font-expanded text-(--text-main) truncate leading-tight">
            {course.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-(--text-muted) text-xs md:text-sm font-bold">
            <Person className="w-4 h-4 text-(--accent-base)" />
            <span className="truncate">{course.faculty}</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between md:justify-end gap-4">
          <div className={`p-2 rounded-xl bg-(--bg-main) border-2 border-(--border-dim) transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
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
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-4 md:p-6 pt-0 border-t-2 border-(--border-dim) bg-(--bg-main)/50">
              {daLoading && !assignments ? (
                <div className="flex justify-center py-8 text-(--text-muted) font-mono font-bold text-xs animate-pulse">
                  LOADING ASSIGNMENTS...
                </div>
              ) : assignments && assignments.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 mt-4">
                  {assignments.map((assgn: any, idx: number) => {
                    const isSubmitted = Boolean(assgn.lastUpdated && assgn.lastUpdated.trim() !== "");

                    return (
                      <div
                        key={idx}
                        className="bg-(--bg-surface) p-4 rounded-2xl border-2 border-(--border-dim) flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-(--text-main) text-base truncate">{assgn.title}</h4>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                isSubmitted
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {isSubmitted ? "Submitted" : "Pending"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-(--text-muted)">
                            <span className="bg-(--bg-main) px-2.5 py-1 rounded-lg border border-(--border-dim)">
                              Max Marks: <strong className="text-(--text-main)">{assgn.maxMark}</strong>
                            </span>
                            <span className="bg-(--bg-main) px-2.5 py-1 rounded-lg border border-(--border-dim)">
                              Weightage: <strong className="text-(--text-main)">{assgn.weightage}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5 text-xs font-mono text-(--text-muted)">
                          <div>
                            Due Date: <span className="text-(--text-main) font-bold">{assgn.dueDate || "N/A"}</span>
                          </div>
                          <div className="text-[11px] text-(--text-muted)">
                            Updated: {assgn.lastUpdated || "Not Uploaded"}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {isSubmitted && (
                              <button
                                onClick={(e) => handleDownload(e, assgn)}
                                disabled={downloading === assgn.code}
                                className="px-3 py-1.5 flex items-center gap-1.5 bg-(--bg-main) hover:bg-(--bg-highlight) rounded-xl transition-colors border-2 border-(--border-dim) text-xs font-bold text-(--text-main) cursor-pointer"
                              >
                                <Download className="w-4 h-4 text-(--accent-base)" />
                                {downloading === assgn.code ? "Downloading..." : "Download"}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAssgn(assgn);
                                fileInputRef.current?.click();
                              }}
                              className="px-4 py-1.5 flex items-center gap-1.5 bg-(--accent-base) text-(--text-inverse) hover:opacity-90 rounded-xl transition-opacity text-xs font-black uppercase cursor-pointer border-0"
                            >
                              <Upload className="w-4 h-4" />
                              Upload
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".pdf,.xls,.xlsx,.doc,.docx"
                    onChange={handleFileInputChange}
                  />
                </div>
              ) : (
                <div className="flex justify-center py-8 text-(--text-muted) font-bold font-mono text-xs">
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
  const { daSemesters, daCourses, daAssignments, daLoading, status, fetchDASemesters, fetchDAAssignments } =
    useDataStore();

  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<File | null>(null);
  const [targetContext, setTargetContext] = useState<{ classId: string; assgnCode: string }>({ classId: "", assgnCode: "" });
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (status !== "Demo Mode Active" && daSemesters.length === 0) {
      fetchDASemesters(network);
    }
  }, [status, daSemesters.length, fetchDASemesters, network]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (!isAllowedFile(droppedFile)) {
        alert("Invalid file format. Allowed formats: PDF, XLS, XLSX, DOC, DOCX.");
        return;
      }
      if (droppedFile.size > MAX_FILE_SIZE) {
        alert("File size exceeds 4MB limit.");
        return;
      }
      setSelectedFileForPreview(droppedFile);
    }
  };

  const handleSelectFileFromCard = (file: File, classId: string, assgnCode: string) => {
    setTargetContext({ classId, assgnCode });
    setSelectedFileForPreview(file);
  };

  const handleSuccessUpload = (classId: string) => {
    fetchDAAssignments(network, classId, true);
  };

  if (status === "Offline - Not Synced") {
    return <OfflineNotSynced />;
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-full w-full bg-(--bg-main) text-(--text-main) overflow-hidden relative z-0 flex"
    >
      <div className="flex-1 flex flex-col w-full h-full overflow-y-auto custom-scrollbar">
        <div className="w-full h-21 md:h-25 shrink-0" />
        <div className="flex-1 pb-20 p-4 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
          {/* Cool Top Dropzone Banner */}
          <div
            className={`w-full p-6 md:p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer ${
              isDraggingOver
                ? "border-(--accent-base) bg-(--accent-base)/10 scale-[1.01]"
                : "border-(--border-dim) bg-(--bg-surface) hover:border-(--accent-base)/50"
            }`}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".pdf,.xls,.xlsx,.doc,.docx";
              input.onchange = (e: any) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (!isAllowedFile(f)) {
                    alert("Invalid file format. Allowed formats: PDF, XLS, XLSX, DOC, DOCX.");
                    return;
                  }
                  if (f.size > MAX_FILE_SIZE) {
                    alert("File size exceeds 4MB limit.");
                    return;
                  }
                  setSelectedFileForPreview(f);
                }
              };
              input.click();
            }}
          >
            <div className="p-4 rounded-2xl bg-(--accent-base)/10 text-(--accent-base)">
              <CloudUpload className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-expanded font-black text-lg md:text-xl text-(--text-main)">
                Drag & Drop Assignment File
              </h2>
              <span className="text-xs md:text-sm font-bold text-(--text-muted)">
                Click to browse or drop file anywhere (PDF, XLS, XLSX, DOC, DOCX • Max 4MB)
              </span>
            </div>
          </div>

          {/* Courses & Assignments Grid */}
          {daLoading && daCourses.length === 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-(--bg-surface) rounded-3xl border-2 border-(--border-dim) animate-pulse" />
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
                  onSelectFile={handleSelectFileFromCard}
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

      {/* File Preview & Submission Modal */}
      <AnimatePresence>
        {selectedFileForPreview && (
          <FilePreviewModal
            file={selectedFileForPreview}
            courses={daCourses}
            assignmentsMap={daAssignments}
            initialClassId={targetContext.classId}
            initialAssgnCode={targetContext.assgnCode}
            onClose={() => {
              setSelectedFileForPreview(null);
              setTargetContext({ classId: "", assgnCode: "" });
            }}
            network={network}
            onSuccess={handleSuccessUpload}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
