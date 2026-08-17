import React, { useEffect, useState, useRef, useMemo } from "react";
import { useDataStore } from "../store/dataStore";
import { useAppStore } from "../store/appStore";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";
import { VTOPNetwork } from "../utils/network";
import { compressBalanced, compressMax } from "@quicktoolsone/pdf-compress";

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
  Lock,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

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

const parseDueDateTimestamp = (dateStr?: string): number => {
  if (!dateStr || dateStr.trim() === "" || dateStr.toUpperCase() === "N/A") {
    return Infinity;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.getTime();
    const parts = dateStr.trim().split(/[\s-]+/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const month = monthMap[parts[1].toLowerCase().slice(0, 3)];
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day).getTime();
      }
    }
  } catch (e) {}
  return Infinity;
};

/**
 * Checks VTOP response for success, OTP prompt, or errors.
 */
function checkDAUploadResponse(html: string): {
  success: boolean;
  requiresOtp: boolean;
  emailHint?: string;
  otpPrefix?: string;
  error?: string;
} {
  // 1. Check for OTP form
  if (
    html.includes("daUploadOtpAlert") ||
    html.includes("doDAssignmentOtpUpload") ||
    html.includes("otpEmail")
  ) {
    const emailMatch = html.match(
      /sent to your email ID\s*<span[^>]*>([\s\S]*?)<\/span>/i,
    );
    const emailHint = emailMatch
      ? emailMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";

    const prefixMatch = html.match(
      /id=["']otpIdCode["'][^>]*>([\s\S]*?)<\/output>/i,
    );
    const otpPrefix = prefixMatch
      ? prefixMatch[1].replace(/<[^>]+>/g, "").trim()
      : "SDA -";

    return {
      success: false,
      requiresOtp: true,
      emailHint,
      otpPrefix,
    };
  }

  // 2. Check for explicit success in hidden input or text
  const successInputMatch = html.match(
    /id=["']success["'][^>]*value=["']([^"']*)["']/i,
  );
  const successVal = successInputMatch ? successInputMatch[1].trim() : "";

  const jsonBomMatch = html.match(
    /id=["']jsonBom["'][^>]*value=["']([^"']*)["']/i,
  );
  const jsonBomVal = jsonBomMatch ? jsonBomMatch[1].trim() : "";

  if (successVal && successVal.length > 0) {
    return { success: true, requiresOtp: false };
  }

  if (html.toLowerCase().includes("uploaded successfully")) {
    return { success: true, requiresOtp: false };
  }

  if (jsonBomVal && jsonBomVal.length > 0) {
    return { success: false, requiresOtp: false, error: jsonBomVal };
  }

  const alertMatch = html.match(
    /<span[^>]*style=["'][^"']*color:\s*red[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
  );
  if (alertMatch && alertMatch[1].trim()) {
    return {
      success: false,
      requiresOtp: false,
      error: alertMatch[1].replace(/<[^>]+>/g, "").trim(),
    };
  }

  if (html.includes("customTable") || html.includes("fixedTableContainer")) {
    return { success: true, requiresOtp: false };
  }

  return {
    success: false,
    requiresOtp: false,
    error: "Upload completed or returned unexpected response.",
  };
}

interface LeftUploadPanelProps {
  selectedFile: File | null;
  onClearFile: () => void;
  onSelectFile: (file: File) => void;
  courses: any[];
  assignmentsMap: Record<string, any[]>;
  initialClassId: string;
  initialAssgnCode: string;
  network: VTOPNetwork;
  onSuccessUpload: (classId: string) => void;
}

const LeftUploadPanel: React.FC<LeftUploadPanelProps> = ({
  selectedFile,
  onClearFile,
  onSelectFile,
  courses,
  assignmentsMap,
  initialClassId,
  initialAssgnCode,
  network,
  onSuccessUpload,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedAssgnCode, setSelectedAssgnCode] = useState<string>(initialAssgnCode);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // OTP State
  const [otpState, setOtpState] = useState<{
    requiresOtp: boolean;
    emailHint: string;
    otpPrefix: string;
    otpVal: string;
  } | null>(null);

  useEffect(() => {
    if (initialClassId) setSelectedClassId(initialClassId);
  }, [initialClassId]);

  useEffect(() => {
    if (initialAssgnCode) setSelectedAssgnCode(initialAssgnCode);
  }, [initialAssgnCode]);

  useEffect(() => {
    if (!selectedClassId && courses.length > 0) {
      setSelectedClassId(courses[0].classId);
    }
  }, [courses, selectedClassId]);

  const availableAssignments = useMemo(() => {
    return assignmentsMap[selectedClassId] || [];
  }, [assignmentsMap, selectedClassId]);

  useEffect(() => {
    if (!selectedAssgnCode && availableAssignments.length > 0) {
      setSelectedAssgnCode(availableAssignments[0].code);
    }
  }, [availableAssignments, selectedAssgnCode]);

  const pdfUrl = useMemo(() => {
    if (selectedFile && (selectedFile.type === "application/pdf" || getFileExtension(selectedFile.name) === "pdf")) {
      return URL.createObjectURL(selectedFile);
    }
    return null;
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

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
      if (droppedFile.size > MAX_FILE_SIZE && getFileExtension(droppedFile.name) !== "pdf") {
        alert("File size exceeds 4MB limit.");
        return;
      }
      setOtpState(null);
      setStatusMsg(null);
      onSelectFile(droppedFile);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    if (!selectedClassId || !selectedAssgnCode) {
      setStatusMsg({ type: "error", text: "Please select target course and assignment." });
      return;
    }

    const currentAssgn = availableAssignments.find((a) => a.code === selectedAssgnCode);
    const assgnTitle = currentAssgn?.title || "Digital Assignment";

    setIsUploading(true);
    setStatusMsg({ type: "success", text: "Processing file..." });

    try {
      let fileToUpload = selectedFile;
      if (selectedFile.size > MAX_FILE_SIZE && getFileExtension(selectedFile.name) === "pdf") {
        setStatusMsg({ type: "success", text: "Compressing PDF to under 4MB..." });
        const buffer = await selectedFile.arrayBuffer();
        let compressed = await compressBalanced(buffer);
        if (compressed.stats.compressedSize > MAX_FILE_SIZE) {
          compressed = await compressMax(buffer);
        }
        if (compressed.stats.compressedSize > MAX_FILE_SIZE) {
          setStatusMsg({ type: "error", text: "PDF too large even after maximum compression." });
          setIsUploading(false);
          return;
        }
        fileToUpload = new File([compressed.pdf], selectedFile.name, { type: "application/pdf" });
      }

      setStatusMsg({ type: "success", text: "Uploading to VTOP..." });
      await network.getDAUploadView(selectedClassId, selectedAssgnCode);
      const responseHtml = await network.uploadStudentDA(selectedClassId, selectedAssgnCode, assgnTitle, fileToUpload);
      
      const checkResult = checkDAUploadResponse(responseHtml);

      if (checkResult.requiresOtp) {
        setOtpState({
          requiresOtp: true,
          emailHint: checkResult.emailHint || "",
          otpPrefix: checkResult.otpPrefix || "SDA -",
          otpVal: "",
        });
        setStatusMsg(null);
      } else if (checkResult.success) {
        setStatusMsg({ type: "success", text: "Assignment uploaded successfully!" });
        setTimeout(() => {
          onSuccessUpload(selectedClassId);
          onClearFile();
          setStatusMsg(null);
          setOtpState(null);
        }, 1500);
      } else {
        setStatusMsg({ type: "error", text: checkResult.error || "Upload failed. Please try again." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Upload failed. Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otpState || !otpState.otpVal.trim()) return;

    setIsUploading(true);
    setStatusMsg({ type: "success", text: "Verifying OTP with VTOP..." });

    try {
      const responseHtml = await network.submitDAUploadOtp(otpState.otpVal.trim());
      const checkResult = checkDAUploadResponse(responseHtml);

      if (checkResult.success) {
        setStatusMsg({ type: "success", text: "Verified & uploaded successfully!" });
        setTimeout(() => {
          onSuccessUpload(selectedClassId);
          onClearFile();
          setStatusMsg(null);
          setOtpState(null);
        }, 1500);
      } else {
        setStatusMsg({
          type: "error",
          text: checkResult.error || "OTP verification failed. Please check the code and try again.",
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Failed to verify OTP." });
    } finally {
      setIsUploading(false);
    }
  };

  const ext = selectedFile ? getFileExtension(selectedFile.name) : "";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
      }}
      onDrop={handleDrop}
      className={`w-full lg:w-112.5 shrink-0 bg-(--bg-surface)/40 rounded-3xl p-6 border transition-all flex flex-col gap-5 ${
        isDraggingOver
          ? "border-(--accent-base) bg-(--accent-base)/10 ring-2 ring-(--accent-base)/30"
          : "border-(--border-dim)/40 hover:border-(--border-dim)/70"
      }`}>
      {/* Title / Header */}
      <div className="flex items-center justify-between pb-1 border-b border-(--border-dim)/20">
        <h3 className="font-expanded font-black text-sm uppercase tracking-wider text-(--text-main) flex items-center gap-2">
          {otpState ? (
            <>
              <Lock className="w-4 h-4 text-(--accent-base)" />
              OTP Verification
            </>
          ) : selectedFile ? (
            <>
              <CloudUpload className="w-4 h-4 text-(--accent-base)" />
              Upload Assignment
            </>
          ) : (
            <>
              <CloudUpload className="w-4 h-4 text-(--accent-base)" />
              Quick Upload
            </>
          )}
        </h3>
        {otpState ? (
          <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            OTP Required
          </span>
        ) : selectedFile ? (
          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            File Ready
          </span>
        ) : null}
      </div>

      {otpState ? (
        /* OTP Verification View */
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Authentication Code Sent</span>
            </div>
            <p className="text-xs text-(--text-muted) leading-relaxed">
              Updating an existing submission requires OTP verification. Enter the 6-digit OTP sent to your student email
              {otpState.emailHint ? (
                <> (<strong className="text-(--text-main)">{otpState.emailHint}</strong>)</>
              ) : null}.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-(--text-muted)">
              Enter 6-Digit OTP
            </label>
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-2.5 rounded-xl bg-(--bg-main) border border-(--border-dim)/40 text-xs font-mono font-bold text-(--text-muted) select-none shrink-0">
                {otpState.otpPrefix}
              </div>
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={otpState.otpVal}
                onChange={(e) =>
                  setOtpState({
                    ...otpState,
                    otpVal: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
                placeholder="123456"
                className="flex-1 px-3.5 py-2.5 rounded-xl text-base font-mono font-bold tracking-widest bg-(--bg-main) border border-(--border-dim)/40 text-(--text-main) outline-none focus:border-(--accent-base)"
              />
            </div>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl font-bold text-xs flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/15 text-red-400 border border-red-500/30"
              }`}>
              {statusMsg.type === "success" ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <ErrorIcon className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                setOtpState(null);
                setStatusMsg(null);
              }}
              disabled={isUploading}
              className="flex-1 py-3 rounded-xl text-xs font-bold uppercase bg-(--bg-main) hover:bg-(--bg-highlight) text-(--text-muted) transition-colors cursor-pointer border border-(--border-dim)/40">
              Cancel
            </button>
            <button
              onClick={handleOtpSubmit}
              disabled={isUploading || otpState.otpVal.length < 4}
              className="flex-1 py-3 rounded-xl text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) transition-all cursor-pointer disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-2 border-0">
              <CheckCircle className="w-4 h-4" />
              {isUploading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        </div>
      ) : !selectedFile ? (
        /* Empty State Dropzone */
        <div
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
                if (f.size > MAX_FILE_SIZE && getFileExtension(f.name) !== "pdf") {
                  alert("File size exceeds 4MB limit.");
                  return;
                }
                setOtpState(null);
                setStatusMsg(null);
                onSelectFile(f);
              }
            };
            input.click();
          }}
          className="w-full py-10 px-6 rounded-2xl border-2 border-dashed border-(--border-dim) bg-(--bg-main)/40 hover:bg-(--bg-main)/80 hover:border-(--accent-base)/60 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer">
          <div className="p-3.5 rounded-2xl bg-(--accent-base)/15 text-(--accent-base)">
            <CloudUpload className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-expanded font-black text-base text-(--text-main)">
              Drag & Drop Assignment
            </h4>
            <span className="text-xs font-medium text-(--text-muted)">
              Drop file here or click to browse
            </span>
            <span className="text-[10px] font-mono text-(--text-muted)/70 mt-1">
              PDF, DOCX, XLSX, XLS, DOC • Max 4MB
            </span>
          </div>
        </div>
      ) : (
        /* Attached File + Selection Controls in SAME Card */
        <div className="flex flex-col gap-4">
          {/* File Card Banner */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-(--bg-main) border border-(--border-dim)/40">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2.5 rounded-xl bg-(--accent-base) text-(--text-inverse) shrink-0 font-mono font-black text-xs uppercase">
                {ext}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-bold text-xs text-(--text-main) truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </span>
                <span className="text-[11px] text-(--text-muted) font-mono">
                  {formatFileSize(selectedFile.size)}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setOtpState(null);
                setStatusMsg(null);
                onClearFile();
              }}
              className="p-1.5 rounded-lg text-(--text-muted) hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Remove File">
              <Close className="w-4 h-4" />
            </button>
          </div>

          {/* PDF Visual Preview if available */}
          {pdfUrl && (
            <div className="w-full h-44 rounded-2xl overflow-hidden border border-(--border-dim)/40 bg-zinc-900">
              <iframe src={pdfUrl} title="PDF Preview" className="w-full h-full border-0" />
            </div>
          )}

          {/* Course & Assignment Target Pickers */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-(--text-muted)">
                Target Course
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedAssgnCode("");
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-(--bg-main) border border-(--border-dim)/40 text-(--text-main) outline-none cursor-pointer focus:border-(--accent-base)">
                {courses.map((c) => (
                  <option key={c.classId} value={c.classId}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-(--text-muted)">
                Target Assignment
              </label>
              <select
                value={selectedAssgnCode}
                onChange={(e) => setSelectedAssgnCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-(--bg-main) border border-(--border-dim)/40 text-(--text-main) outline-none cursor-pointer focus:border-(--accent-base)">
                {availableAssignments.length === 0 ? (
                  <option value="">No assignments found for course</option>
                ) : (
                  availableAssignments.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.title} {a.dueDate ? `(Due: ${a.dueDate})` : ""} {a.lastUpdated ? "• Re-upload" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl font-bold text-xs flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/15 text-red-400 border border-red-500/30"
              }`}>
              {statusMsg.type === "success" ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <ErrorIcon className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            onClick={handleUploadSubmit}
            disabled={isUploading || availableAssignments.length === 0}
            className="w-full py-3 rounded-xl text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) transition-all cursor-pointer disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-2 border-0">
            <CloudUpload className="w-4 h-4" />
            {isUploading ? "Uploading to VTOP..." : "Submit to VTOP"}
          </button>
        </div>
      )}
    </div>
  );
};

const CourseCard = ({ course, network, expanded, setExpanded, onSelectFile }: any) => {
  const { daAssignments, fetchDAAssignments, daLoading } = useDataStore();
  const rawAssignments = daAssignments[course.classId];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeAssgn, setActiveAssgn] = useState<any>(null);
  const [downloadingDA, setDownloadingDA] = useState<string | null>(null);
  const [downloadingQP, setDownloadingQP] = useState<string | null>(null);

  // Sort assignments: pending first, then by due date timestamp ascending
  const sortedAssignments = useMemo(() => {
    if (!rawAssignments) return [];
    return [...rawAssignments].sort((a, b) => {
      const aSubmitted = Boolean(a.lastUpdated && a.lastUpdated.trim() !== "");
      const bSubmitted = Boolean(b.lastUpdated && b.lastUpdated.trim() !== "");
      if (aSubmitted !== bSubmitted) return aSubmitted ? 1 : -1;
      return parseDueDateTimestamp(a.dueDate) - parseDueDateTimestamp(b.dueDate);
    });
  }, [rawAssignments]);

  const handleDownloadStudentDA = async (e: React.MouseEvent, assgn: any) => {
    e.stopPropagation();
    try {
      setDownloadingDA(assgn.code);
      await network.downloadStudentDA(course.classId, assgn.code, `${course.code}_${assgn.code}_Submission.pdf`);
    } catch (err) {
      alert("Failed to download assignment submission.");
    } finally {
      setDownloadingDA(null);
    }
  };

  const handleDownloadQP = async (e: React.MouseEvent, assgn: any) => {
    e.stopPropagation();
    try {
      setDownloadingQP(assgn.code);
      await network.downloadQP(course.classId, assgn.code, `${course.code}_${assgn.code}_QP.pdf`);
    } catch (err) {
      alert("Failed to download question paper.");
    } finally {
      setDownloadingQP(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAssgn) return;

    if (!isAllowedFile(file)) {
      alert("Invalid file format. Allowed formats: PDF, XLS, XLSX, DOC, DOCX.");
      return;
    }
    if (file.size > MAX_FILE_SIZE && getFileExtension(file.name) !== "pdf") {
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
      if (!rawAssignments || rawAssignments.length === 0) {
        fetchDAAssignments(network, course.classId);
      }
    }
  };

  const pendingCount = rawAssignments
    ? rawAssignments.filter((a: any) => !a.lastUpdated || a.lastUpdated.trim() === "").length
    : 0;

  const isCourseLoading = daLoading && !rawAssignments;

  return (
    <div className="bg-(--bg-surface)/40 hover:bg-(--bg-surface)/70 rounded-3xl overflow-hidden transition-colors border-0 shadow-none">
      <button
        onClick={handleToggle}
        className="w-full p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left transition-colors cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-(--bg-highlight) text-(--text-main) text-xs font-mono font-bold">
              {course.code}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-black uppercase">
              {course.type}
            </span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono font-black uppercase tracking-wider">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <h3 className="text-base md:text-lg font-bold text-(--text-main) truncate leading-snug">
            {course.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-(--text-muted) text-xs">
            <Person className="w-4 h-4 text-(--text-muted)" />
            <span className="truncate">{course.faculty}</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between md:justify-end gap-3">
          <div
            className={`p-2 rounded-full bg-(--bg-main) transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}>
            <KeyboardArrowDown className="w-5 h-5 text-(--text-muted)" />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="overflow-hidden">
          <div className="p-4 md:p-5 pt-0 border-t border-(--border-dim)/20 bg-(--bg-main)/40">
            {isCourseLoading ? (
              <div className="flex justify-center py-6 text-(--text-muted) font-mono font-bold text-xs animate-pulse">
                LOADING ASSIGNMENTS...
              </div>
            ) : sortedAssignments && sortedAssignments.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 mt-3">
                {sortedAssignments.map((assgn: any, idx: number) => {
                  const isSubmitted = Boolean(assgn.lastUpdated && assgn.lastUpdated.trim() !== "");

                  return (
                    <div
                      key={idx}
                      className="bg-(--bg-surface)/60 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-0">
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-(--text-main) text-sm truncate">
                            {assgn.title}
                          </h4>
                          <span
                            className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                              isSubmitted
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}>
                            {isSubmitted ? "Submitted" : "Pending"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-(--text-muted)">
                          <span className="bg-(--bg-main) px-2.5 py-0.5 rounded-md">
                            Max: <strong className="text-(--text-main)">{assgn.maxMark}</strong>
                          </span>
                          <span className="bg-(--bg-main) px-2.5 py-0.5 rounded-md">
                            Weightage: <strong className="text-(--text-main)">{assgn.weightage}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-start md:items-end gap-1 text-xs font-mono text-(--text-muted)">
                        <div>
                          Due: <span className="text-(--text-main) font-bold">{assgn.dueDate || "N/A"}</span>
                        </div>
                        <div className="text-[11px] text-(--text-muted)">
                          Updated: {assgn.lastUpdated || "Not Uploaded"}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {/* QP Download Button */}
                          {assgn.hasQP && (
                            <button
                              onClick={(e) => handleDownloadQP(e, assgn)}
                              disabled={downloadingQP === assgn.code}
                              title="Download Question Paper"
                              className="px-3 py-1 flex items-center gap-1.5 bg-(--bg-main) hover:bg-(--bg-highlight) rounded-xl transition-colors text-xs font-bold text-(--text-main) cursor-pointer border border-(--border-dim)/40">
                              <Description className="w-3.5 h-3.5 text-(--accent-base)" />
                              {downloadingQP === assgn.code ? "Downloading..." : "QP"}
                            </button>
                          )}

                          {/* Student Submission Download Button */}
                          {isSubmitted && (
                            <button
                              onClick={(e) => handleDownloadStudentDA(e, assgn)}
                              disabled={downloadingDA === assgn.code}
                              title="Download Your Submission"
                              className="px-3 py-1 flex items-center gap-1.5 bg-(--bg-main) hover:bg-(--bg-highlight) rounded-xl transition-colors text-xs font-bold text-(--text-main) cursor-pointer border border-(--border-dim)/40">
                              <Download className="w-3.5 h-3.5 text-(--accent-base)" />
                              {downloadingDA === assgn.code ? "Downloading..." : "Download"}
                            </button>
                          )}

                          {/* Upload / Re-upload Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAssgn(assgn);
                              fileInputRef.current?.click();
                            }}
                            className="px-3.5 py-1 flex items-center gap-1.5 bg-(--accent-base) text-(--text-inverse) hover:opacity-90 rounded-xl transition-opacity text-xs font-mono font-bold uppercase cursor-pointer border-0">
                            <Upload className="w-3.5 h-3.5" />
                            {isSubmitted ? "Re-upload" : "Upload"}
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
                  onChange={handleFileInputChange} />
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-(--text-muted) font-medium">
                No digital assignments found for this course.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function DigitalAssignments({ network }: { network: VTOPNetwork }) {
  const { daSemesters, daCourses, daAssignments, daLoading, status, fetchDASemesters, fetchDAAssignments } =
    useDataStore();
  const { daDropFile, setDaDropFile } = useAppStore();

  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetContext, setTargetContext] = useState<{ classId: string; assgnCode: string }>({
    classId: "",
    assgnCode: "",
  });

  useEffect(() => {
    if (status !== "Demo Mode Active" && daSemesters.length === 0) {
      fetchDASemesters(network);
    }
    const handleRefresh = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const sem = detail?.sem || useDataStore.getState().daSelectedSem;
      if (sem) {
        useDataStore.getState().fetchDACourses(network, sem, true);
      }
    };
    window.addEventListener("retop-refresh-da", handleRefresh);
    return () => window.removeEventListener("retop-refresh-da", handleRefresh);
  }, [status, daSemesters.length, fetchDASemesters, network]);

  useEffect(() => {
    if (daDropFile) {
      handleSelectFile(daDropFile);
      setDaDropFile(null);
    }
  }, [daDropFile, setDaDropFile]);

  const handleSelectFile = (file: File, classId: string = "", assgnCode: string = "") => {
    if (classId) setTargetContext({ classId, assgnCode });
    setSelectedFile(file);
  };

  const handleSuccessUpload = (classId: string) => {
    fetchDAAssignments(network, classId, true);
  };

  // Sort courses by earliest pending assignment due date
  const sortedCourses = useMemo(() => {
    if (!daCourses) return [];
    return [...daCourses].sort((a, b) => {
      const aAssgns = daAssignments[a.classId] || [];
      const bAssgns = daAssignments[b.classId] || [];
      const aMinDue = aAssgns.reduce(
        (min: number, curr: any) => Math.min(min, parseDueDateTimestamp(curr.dueDate)),
        Infinity,
      );
      const bMinDue = bAssgns.reduce(
        (min: number, curr: any) => Math.min(min, parseDueDateTimestamp(curr.dueDate)),
        Infinity,
      );
      return aMinDue - bMinDue;
    });
  }, [daCourses, daAssignments]);

  if (status === "Offline - Not Synced") {
    return <OfflineNotSynced pageName="Digital Assignments" />;
  }

  return (
    <div
      id="retop-da-page"
      className="h-full w-full bg-(--bg-main) text-(--text-main) overflow-y-auto custom-scrollbar relative z-0">
      <div className="w-full h-20 md:h-24 shrink-0" />

      <div className="pb-32 px-4 md:px-8 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT COLUMN: Drag & Drop + File Attachment & Upload Target Panel (with OTP handling) */}
        <LeftUploadPanel
          selectedFile={selectedFile}
          onClearFile={() => {
            setSelectedFile(null);
            setTargetContext({ classId: "", assgnCode: "" });
          }}
          onSelectFile={handleSelectFile}
          courses={daCourses}
          assignmentsMap={daAssignments}
          initialClassId={targetContext.classId}
          initialAssgnCode={targetContext.assgnCode}
          network={network}
          onSuccessUpload={handleSuccessUpload} />

        {/* RIGHT COLUMN: Course Cards & Sorted Assignments */}
        <div className="flex-1 w-full flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-expanded font-black text-(--text-main)">
              Digital Assignments
            </h2>
            <span className="text-xs font-mono font-bold text-(--text-muted)">
              {daCourses.length} Courses
            </span>
          </div>

          {daLoading && daCourses.length === 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-(--bg-surface)/40 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : sortedCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {sortedCourses.map((course) => (
                <CourseCard
                  key={course.classId}
                  course={course}
                  network={network}
                  expanded={expandedCourse === course.classId}
                  setExpanded={setExpandedCourse}
                  onSelectFile={(file: File, classId: string, assgnCode: string) =>
                    handleSelectFile(file, classId, assgnCode)
                  } />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={School}
              msg="No Courses Found"
              subMsg="Could not find any courses for the selected semester." />
          )}
        </div>
      </div>
    </div>
  );
}
