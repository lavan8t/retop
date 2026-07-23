import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Close, Description, Error, CheckCircle } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { useDataStore } from "../../store/dataStore";
import { VTOPNetwork } from "../../utils/network";
import { SPRING_SNAPPY } from "../../utils/motion";

interface GlobalDADropZoneProps {
  network: VTOPNetwork;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export const GlobalDADropZone: React.FC<GlobalDADropZoneProps> = ({ network }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [uploadMsg, setUploadMsg] = useState("");
  
  const { 
    daSemesters, 
    daCourses, 
    daAssignments, 
    daLoading,
    fetchDASemesters, 
    fetchDAAssignments 
  } = useDataStore();

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.clientX === 0 && e.clientY === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.size > MAX_FILE_SIZE) {
        alert("File size exceeds 4MB limit.");
        return;
      }
      setFile(droppedFile);
      setShowModal(true);
      setUploadStatus("idle");
      setUploadMsg("");
      
      // Instantly load DAs if not loaded
      if (daSemesters.length === 0 && network) {
        fetchDASemesters(network);
      }
    }
  }, [daSemesters.length, fetchDASemesters, network]);

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  // Load assignments for all courses if not already loaded
  useEffect(() => {
    if (showModal && daCourses.length > 0 && network) {
      daCourses.forEach(course => {
        if (!daAssignments[course.classId]) {
          fetchDAAssignments(network, course.classId);
        }
      });
    }
  }, [showModal, daCourses, daAssignments, fetchDAAssignments, network]);

  const pendingDAs = useMemo(() => {
    const list: any[] = [];
    daCourses.forEach(course => {
      const assignments = daAssignments[course.classId];
      if (assignments) {
        assignments.forEach((assgn: any) => {
          if (!assgn.lastUpdated || assgn.lastUpdated.trim() === "") {
            list.push({ course, assgn });
          }
        });
      }
    });
    return list;
  }, [daCourses, daAssignments]);

  const handleUpload = async (courseId: string, assgnCode: string, assgnTitle: string) => {
    if (!file || !network) return;
    setIsUploading(true);
    setUploadStatus("idle");
    try {
      await network.getDAUploadView(courseId, assgnCode);
      await network.uploadStudentDA(courseId, assgnCode, assgnTitle, file);
      setUploadStatus("success");
      setUploadMsg("Assignment uploaded successfully!");
      fetchDAAssignments(network, courseId, true);
      setTimeout(() => setShowModal(false), 2000);
    } catch (err: any) {
      setUploadStatus("error");
      setUploadMsg(err.message || "Failed to upload DA.");
    } finally {
      setIsUploading(false);
    }
  };

  const closeDropZone = () => {
    setShowModal(false);
    setFile(null);
  };

  const filePreviewUrl = useMemo(() => {
    if (file && file.type === "application/pdf") {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file]);

  return (
    <>
      <AnimatePresence>
        {isDragging && !showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-(--bg-main)/80 backdrop-blur-md flex items-center justify-center border-4 border-dashed border-(--accent-base) pointer-events-none"
          >
            <div className="flex flex-col items-center text-(--accent-base) pointer-events-none">
              <Upload className="w-24 h-24 mb-4" />
              <h2 className="text-3xl font-black font-expanded uppercase text-center">
                Drop file here<br/>to upload DA
              </h2>
              <p className="mt-2 text-(--text-muted) font-bold">Max file size: 4MB</p>
            </div>
          </motion.div>
        )}

        {showModal && file && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={closeDropZone}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={SPRING_SNAPPY}
              className="bg-(--bg-surface) border-2 border-(--border-main) rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={closeDropZone}
                className="absolute top-4 right-4 z-20 p-2 bg-(--bg-main) hover:bg-(--bg-highlight) rounded-full border-2 border-(--border-main) transition-colors text-(--text-muted) hover:text-(--text-main)"
              >
                <Close className="w-5 h-5" />
              </button>

              {/* Left Panel: Preview */}
              <div className="w-full md:w-1/2 h-1/2 md:h-full border-b-2 md:border-b-0 md:border-r-2 border-(--border-main) bg-(--bg-highlight) flex flex-col p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Description className="w-8 h-8 text-(--accent-base)" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg text-(--text-main) truncate">{file.name}</h3>
                    <p className="text-sm font-mono text-(--text-muted)">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                
                <div className="flex-1 bg-(--bg-main) rounded-2xl border-2 border-(--border-main) overflow-hidden relative">
                  {filePreviewUrl ? (
                    <iframe src={filePreviewUrl} className="w-full h-full" title="File Preview" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-(--text-muted)">
                      <Description className="w-16 h-16 mb-4 opacity-50" />
                      <p className="font-bold">No preview available</p>
                      <p className="text-xs">Preview only available for PDFs</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: DA Selection */}
              <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col bg-(--bg-main) p-6">
                <h3 className="text-xl font-black font-expanded uppercase text-(--text-main) mb-6">
                  Select Assignment
                </h3>
                
                {uploadStatus !== "idle" ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    {uploadStatus === "success" ? (
                      <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
                    ) : (
                      <Error className="w-20 h-20 text-red-500 mb-4" />
                    )}
                    <h4 className="text-xl font-bold text-(--text-main) mb-2">
                      {uploadStatus === "success" ? "Success!" : "Upload Failed"}
                    </h4>
                    <p className="text-(--text-muted)">{uploadMsg}</p>
                    <button onClick={closeDropZone} className="mt-8 px-8 py-2 bg-(--accent-base) text-(--text-inverse) rounded-xl font-bold font-expanded uppercase transition-all shadow-none hover:shadow-(--brutal-shadow-hover) hover:-translate-y-0.5 active:translate-y-0 active:shadow-(--brutal-shadow-active)">
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
                    {daLoading && pendingDAs.length === 0 ? (
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-24 bg-(--bg-panel) rounded-xl border-2 border-(--border-main) animate-pulse" />
                        ))}
                      </div>
                    ) : pendingDAs.length > 0 ? (
                      pendingDAs.map((item, idx) => (
                        <div key={idx} className="bg-(--bg-panel) p-4 rounded-xl border-2 border-(--border-main) hover:border-(--accent-base) transition-colors flex flex-col">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded bg-(--accent-base)/10 text-(--accent-base) text-xs font-bold font-mono">
                                  {item.course.code}
                                </span>
                                <span className="text-xs font-bold text-(--text-muted) uppercase">
                                  {item.course.type}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-(--text-main) line-clamp-1">{item.assgn.title}</h4>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs font-mono text-(--text-muted) font-bold">
                              Due: {item.assgn.dueDate}
                            </span>
                            <button 
                              onClick={() => handleUpload(item.course.classId, item.assgn.code, item.assgn.title)}
                              disabled={isUploading}
                              className="flex items-center px-4 py-1.5 min-h-0 text-xs shadow-none border hover:shadow-(--brutal-shadow-sm) rounded-lg bg-(--accent-base) text-(--text-inverse) disabled:opacity-50 transition-all font-bold uppercase"
                            >
                              <Upload className="w-3.5 h-3.5 mr-1" />
                              Upload
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <Error className="w-16 h-16 text-(--text-muted) mb-4 opacity-50" />
                        <h4 className="text-lg font-bold text-(--text-main) mb-2">No Pending DAs Found</h4>
                        <p className="text-(--text-muted) text-sm">
                          We couldn't find any pending digital assignments to upload this file to.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
