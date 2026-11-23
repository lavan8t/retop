import React, { useState, useEffect, useMemo } from 'react';
import { VTOPNetwork } from '../utils/network';
import { parseMarksSemesters, parseStudentMarks } from '../parsers/marks';
import { CourseMarks } from '../types/vtop';
import { QueryStats } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { EmptyState } from '../components/EmptyState';
import { MarksCourseCard } from '../components/marks/MarksCourseCard';
import { ensureM3eComponents } from '../utils/m3e';

import { useDataStore } from '../store/dataStore';
import { OfflineNotSynced } from '../components/ui/OfflineNotSynced';

interface MarksPageProps {
  network: VTOPNetwork;
  semesters: { id: string; label: string }[];
  setSemesters: (sems: { id: string; label: string }[]) => void;
  selectedSem: string;
  setSelectedSem: (sem: string) => void;
  searchQuery: string;
  isModernView: boolean;
}

export const MarksPage: React.FC<MarksPageProps> = ({
  network,
  semesters,
  setSemesters,
  selectedSem,
  setSelectedSem,
  searchQuery,
  isModernView,
}) => {
  const [loading, setLoading] = useState(true);
  const [marksData, setMarksData] = useState<CourseMarks[]>([]);
  const [fetchingMarks, setFetchingMarks] = useState(false);
  const [offlineMiss, setOfflineMiss] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (semesters.length > 0) {
        if (!selectedSem) setSelectedSem(semesters[0].id);
        setLoading(false);
        return;
      }
      if (useDataStore.getState().status === 'Demo Mode Active') {
        setSemesters([{ id: 'demo', label: 'Fall Semester 2026-27' }]);
        setSelectedSem('demo');
        setLoading(false);
        return;
      }
      try {
        const html = await network.getMarksView();
        const sems =
          typeof html === 'string' ? parseMarksSemesters(html) : html;
        let dropdownSems = (Array.isArray(sems) ? sems : []).map((s: any) => ({
          id: s.id,
          label: s.label,
          isLatest: s.isLatest,
        }));

        // Fallback: If marks page select is empty or pending, fallback to timetable semesters
        if (dropdownSems.length === 0) {
          const ttSems = useDataStore.getState().ttSemesters;
          if (ttSems && ttSems.length > 0) {
            dropdownSems = ttSems;
          }
        }

        setSemesters(dropdownSems);
        if (dropdownSems.length > 0 && !selectedSem) {
          setSelectedSem(dropdownSems[0].id);
        }
      } catch (e) {
        if (
          e instanceof globalThis.Error &&
          e.message === 'OFFLINE_CACHE_MISS'
        ) {
          setOfflineMiss(true);
        } else {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [network, semesters.length]);

  useEffect(() => {
    if (!selectedSem) return;
    const fetchMarks = async () => {
      setFetchingMarks(true);

      if (useDataStore.getState().status === 'Demo Mode Active') {
        setMarksData([
          {
            classNumber: '123',
            code: 'CSE1001',
            title: 'Problem Solving and Programming',
            type: 'TH',
            credits: '3',
            faculty: 'Dr. Demo',
            slot: 'A1',
            assessments: [
              {
                title: 'CAT 1',
                maxMark: '50',
                weightage: '15',
                status: 'Attended',
                scoredMark: '45',
                scoredPercentage: '13.5',
              },
            ],
          },
        ]);
        setFetchingMarks(false);
        return;
      }

      try {
        const isPastSemester =
          semesters.length > 0 && selectedSem !== semesters[0].id;
        const html = await network.getStudentMarks(
          selectedSem,
          false,
          isPastSemester,
        );
        const parsedMarks =
          typeof html === 'string' ? parseStudentMarks(html) : html;
        setMarksData(parsedMarks);
        setOfflineMiss(false);
      } catch (e) {
        if (
          e instanceof globalThis.Error &&
          e.message === 'OFFLINE_CACHE_MISS'
        ) {
          setOfflineMiss(true);
        } else {
          console.error(e);
        }
      } finally {
        setFetchingMarks(false);
      }
    };
    fetchMarks();

    const handleRefresh = () => {
      fetchMarks();
    };
    window.addEventListener('retop-refresh-marks', handleRefresh);
    return () =>
      window.removeEventListener('retop-refresh-marks', handleRefresh);
  }, [selectedSem, network, semesters]);

  useEffect(() => {
    void ensureM3eComponents();
  }, []);

  const filteredMarks = useMemo(() => {
    let result = marksData;
    if (searchQuery) {
      result = marksData.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return [...result].sort((a, b) => {
      const getBase = (code: string) => {
        const lastChar = code.slice(-1);
        if (lastChar === 'L' || lastChar === 'P') return code.slice(0, -1);
        return code;
      };
      const baseA = getBase(a.code);
      const baseB = getBase(b.code);

      if (baseA < baseB) return -1;
      if (baseA > baseB) return 1;

      const lastA = a.code.slice(-1);
      const lastB = b.code.slice(-1);
      if (lastA === 'L' && lastB === 'P') return -1;
      if (lastA === 'P' && lastB === 'L') return 1;

      return 0;
    });
  }, [marksData, searchQuery]);

  if (offlineMiss) {
    return (
      <div className="h-full pb-32 md:pb-12">
        <OfflineNotSynced pageName="Marks" />
      </div>
    );
  }

  const isLoading = (loading || fetchingMarks) && marksData.length === 0;
  const courseKey = (course: CourseMarks, idx: number) =>
    `${course.code}-${course.type}-${idx}`;

  return (
    <div className="h-full flex flex-col bg-transparent text-(--text-main) overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pt-3 pb-32 md:pb-12">
        <div className="mx-auto w-full max-w-3xl pt-2">
          {isLoading ? (
            <div
              className="flex flex-col gap-0.5 animate-pulse"
              role="status"
              aria-busy="true"
              aria-label="Loading marks"
            >
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-(--bg-highlight)" />
              ))}
            </div>
          ) : filteredMarks.length === 0 ? (
            <EmptyState
              msg="No marks found"
              subMsg="Marks for the selected semester are not available yet."
              icon={QueryStats}
            />
          ) : (
            <div className="flex flex-col gap-0.5">
              {filteredMarks.map((course, idx) => {
                const key = courseKey(course, idx);
                return (
                  <MarksCourseCard
                    key={key}
                    course={course}
                    isModernView={isModernView}
                    expanded={expandedKey === key}
                    onToggle={() =>
                      setExpandedKey((prev) => (prev === key ? null : key))
                    }
                    index={idx}
                    total={filteredMarks.length}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
