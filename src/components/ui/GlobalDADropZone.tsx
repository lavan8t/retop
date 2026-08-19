import React, { useState, useEffect, useCallback } from "react";
import { Upload } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { useDataStore } from "../../store/dataStore";
import { useAppStore } from "../../store/appStore";
import { VTOPNetwork } from "../../utils/network";

interface GlobalDADropZoneProps {
  network: VTOPNetwork;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export const GlobalDADropZone: React.FC<GlobalDADropZoneProps> = ({ network }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { setCurrentView, setDaDropFile } = useAppStore();
  
  const { 
    daSemesters, 
    fetchDASemesters 
  } = useDataStore();

  const isInsideDaPage = (target: EventTarget | null) =>
    Boolean(
      document.getElementById("retop-da-page") ||
        (target &&
          target instanceof Element &&
          typeof target.closest === "function" &&
          target.closest("#retop-da-page")),
    );

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInsideDaPage(e.target)) return;
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInsideDaPage(e.target)) return;
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInsideDaPage(e.target)) return;
    if (e.clientX === 0 && e.clientY === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isInsideDaPage(e.target)) return;
    
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setDaDropFile(droppedFile);
      setCurrentView("digitalAssignments");
      
      if (daSemesters.length === 0 && network) {
        fetchDASemesters(network);
      }
    }
  }, [daSemesters.length, fetchDASemesters, network, setCurrentView, setDaDropFile]);

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

  return (
    <>
        {isDragging && (
          <div
            className="fixed inset-0 z-100 bg-(--bg-main)/80 backdrop-blur-md flex items-center justify-center border-4 border-dashed border-(--accent-base) pointer-events-none animate-in fade-in duration-200"
          >
            <div className="flex flex-col items-center text-(--accent-base) pointer-events-none">
              <Upload className="w-24 h-24 mb-4" />
              <h2 className="text-3xl font-black font-expanded uppercase text-center">
                Drop file here<br/>to upload DA
              </h2>
            </div>
          </div>
        )}
    </>
  );
};
