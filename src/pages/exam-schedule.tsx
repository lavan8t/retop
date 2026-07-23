import React, { useEffect, useState } from "react";
import { VTOPNetwork } from "../utils/network";
import { useDataStore } from "../store/dataStore";
import { EmptyState } from "../components/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";
import { KeyboardArrowDown, Event, LocationOn, Schedule, Chair } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { ExamGroup } from "../parsers/exam-schedule";

interface ExamSchedulePageProps {
  network: VTOPNetwork;
}

const ExamGroupCard = ({ group, expanded, setExpanded }: { group: ExamGroup, expanded: boolean, setExpanded: (id: string | null) => void }) => {
  const handleToggle = () => {
    if (expanded) {
      setExpanded(null);
    } else {
      setExpanded(group.examType);
    }
  };

  return (
    <div className="bg-(--bg-panel) border-2 border-(--border-main) rounded-2xl overflow-hidden transition-all duration-300">
      <button 
        onClick={handleToggle}
        className="w-full p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left hover:bg-(--bg-highlight) transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-xl md:text-2xl font-black text-(--text-main) truncate leading-tight uppercase tracking-wide">
            {group.examType}
          </h3>
          <p className="text-(--text-muted) text-sm font-medium mt-1">
            {group.entries.length} Exam{group.entries.length !== 1 ? 's' : ''}
          </p>
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
              {group.entries.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 mt-4">
                  {group.entries.map((entry, idx) => (
                    <div key={idx} className="bg-(--bg-panel) p-5 rounded-xl border border-(--border-main) flex flex-col gap-4">
                      
                      {/* Top Row: Course Info */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                         <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="px-2 py-0.5 rounded bg-(--accent-base)/10 text-(--accent-base) text-xs font-bold font-mono border border-(--accent-base)/20">
                                {entry.courseCode}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-(--text-muted)/10 text-(--text-muted) text-xs font-bold font-mono border border-(--border-main)">
                                {entry.courseType}
                              </span>
                               <span className="px-2 py-0.5 rounded bg-(--text-muted)/10 text-(--text-muted) text-xs font-bold font-mono border border-(--border-main)">
                                SLOT: {entry.slot}
                              </span>
                            </div>
                            <h4 className="font-bold text-(--text-main) text-lg">{entry.courseTitle}</h4>
                         </div>
                         <div className="text-right flex flex-col items-start md:items-end w-full md:w-auto">
                            <div className="text-(--text-main) font-black text-lg md:text-xl">{entry.examDate}</div>
                            <div className="text-(--text-muted) font-bold text-sm uppercase">{entry.examSession}</div>
                         </div>
                      </div>

                      <div className="w-full h-[1px] bg-(--border-main) my-1"></div>
                      
                      {/* Bottom Row: Exam Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                         
                         <div className="flex items-start gap-2">
                           <div className="mt-0.5 text-(--accent-base)"><Schedule className="w-4 h-4" /></div>
                           <div>
                             <div className="text-(--text-muted) font-medium text-xs uppercase tracking-wider">Timing</div>
                             <div className="text-(--text-main) font-bold">{entry.examTime}</div>
                           </div>
                         </div>

                         <div className="flex items-start gap-2">
                           <div className="mt-0.5 text-(--accent-base)"><Event className="w-4 h-4" /></div>
                           <div>
                             <div className="text-(--text-muted) font-medium text-xs uppercase tracking-wider">Reporting</div>
                             <div className="text-(--text-main) font-bold">{entry.reportingTime}</div>
                           </div>
                         </div>

                         <div className="flex items-start gap-2">
                           <div className="mt-0.5 text-(--accent-base)"><LocationOn className="w-4 h-4" /></div>
                           <div>
                             <div className="text-(--text-muted) font-medium text-xs uppercase tracking-wider">Venue</div>
                             <div className="text-(--text-main) font-bold">{entry.venue || "TBA"}</div>
                           </div>
                         </div>

                         <div className="flex items-start gap-2">
                           <div className="mt-0.5 text-(--accent-base)"><Chair className="w-4 h-4" /></div>
                           <div>
                             <div className="text-(--text-muted) font-medium text-xs uppercase tracking-wider">Seat</div>
                             <div className="text-(--text-main) font-bold">{entry.seatLocation} <span className="text-(--text-muted)">#{entry.seatNo}</span></div>
                           </div>
                         </div>

                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center py-8 text-(--text-muted) font-bold font-mono">
                  NO EXAMS LISTED
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ExamSchedulePage: React.FC<ExamSchedulePageProps> = ({ network }) => {
  const {
    examSemesters,
    examGroups,
    examReportingNote,
    examLoading,
    status,
    fetchExamSemesters,
  } = useDataStore();

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "Demo Mode Active" && examSemesters.length === 0) {
      fetchExamSemesters(network);
    }
  }, [status, examSemesters.length, fetchExamSemesters, network]);

  useEffect(() => {
     if (examGroups.length > 0 && !expandedGroup) {
         setExpandedGroup(examGroups[0].examType);
     }
  }, [examGroups, expandedGroup]);


  if (status === "Offline - Not Synced") {
    return <OfflineNotSynced />;
  }

  return (
    <div className="h-full w-full bg-(--bg-main) text-(--text-main) overflow-hidden relative z-0 flex">
      <div className="flex-1 flex flex-col w-full h-full overflow-y-auto">
        <div className="w-full h-21 md:h-25 shrink-0" />
        <div className="flex-1 pb-20 p-4 md:p-8 max-w-5xl mx-auto w-full">
          
          {examReportingNote && (
            <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 font-medium text-sm flex items-start gap-3">
               <span className="shrink-0 mt-0.5"><Event className="w-5 h-5"/></span>
               <span>{examReportingNote}</span>
            </div>
          )}

          {examLoading && examGroups.length === 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-24 bg-(--bg-panel) rounded-2xl border-2 border-(--border-main) animate-pulse" />
              ))}
            </div>
          ) : examGroups.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {examGroups.map((group) => (
                <ExamGroupCard 
                  key={group.examType} 
                  group={group} 
                  expanded={expandedGroup === group.examType}
                  setExpanded={setExpandedGroup}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Event}
              msg="No Exams Found"
              subMsg="Could not find any exam schedules for the selected semester."
            />
          )}
        </div>
      </div>
    </div>
  );
};
