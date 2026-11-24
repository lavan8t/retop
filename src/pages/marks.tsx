import React, { useState, useEffect, useMemo } from 'react';
import { VTOPNetwork } from '../utils/network';
import { parseMarksSemesters, parseStudentMarks } from '../parsers/marks';
import { CourseMarks } from '../types/vtop';
import { groupMarksByCourse } from '../utils/marksSummary';
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

  const groupedMarks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? marksData.filter(
          (course) =>
            course.title.toLowerCase().includes(query) ||
            course.code.toLowerCase().includes(query),
        )
      : marksData;
    return groupMarksByCourse(filtered);
  }, [marksData, searchQuery]);

  if (offlineMiss) {
    return (
      <div className="h-full pb-32 md:pb-12">
        <OfflineNotSynced pageName="Marks" />
      </div>
    );
  }

  const isLoading = (loading || fetchingMarks) && marksData.length === 0;

  return (
    <div className="h-full flex flex-col bg-transparent text-(--text-main) overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pt-3 pb-32 md:pb-12">
        <div className="mx-auto w-full max-w-7xl pt-2">
          {isLoading ? (
            <div
              className="grid gap-3 animate-pulse"
              style={{
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 34rem), 1fr))',
              }}
              role="status"
              aria-busy="true"
              aria-label="Loading marks"
            >
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-(--bg-highlight)" />
              ))}
            </div>
          ) : groupedMarks.length === 0 ? (
            <EmptyState
              msg="No marks found"
              subMsg="Marks for the selected semester are not available yet."
              icon={QueryStats}
            />
          ) : (
            <div
              className="grid items-start gap-3"
              style={{
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 34rem), 1fr))',
              }}
            >
              {groupedMarks.map((group) => (
                <section
                  key={group.code}
                  aria-labelledby={`marks-group-${group.code}`}
                  className="min-w-0 rounded-2xl bg-(--bg-highlight)/45 p-2"
                >
                  <div className="mb-1.5 flex items-baseline gap-2 px-1">
                    <span
                      id={`marks-group-${group.code}`}
                      className="text-xs font-semibold tracking-wide text-(--text-main)"
                    >
                      {group.code}
                    </span>
                    <span className="text-[10px] font-medium text-(--text-muted)">
                      {group.courses
                        .map((course) => course.type || course.code.slice(-1))
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                    {group.courses.map((course) => (
                      <MarksCourseCard
                        key={`${course.code}-${course.type}`}
                        course={course}
                        isModernView={isModernView}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
