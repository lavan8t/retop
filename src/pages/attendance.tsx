import { M3eSnackbar, M3eSplitPane } from '../components/attendance/m3eTags';
import { ensureM3eComponents } from '../utils/m3e';
import { useCallback, useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { VTOPNetwork } from '../utils/network';
import { OfflineNotSynced } from '../components/ui/OfflineNotSynced';
import { useCourseAttendanceForecast } from '../hooks/useCourseAttendanceForecast';
import {
  AttendanceEmpty,
  AttendanceError,
  AttendanceLoading,
} from '../components/attendance/AttendanceStates';
import { CourseList, courseKey } from '../components/attendance/CourseList';
import { CourseDetail } from '../components/attendance/CourseDetail';
import { Overview } from '../components/attendance/Overview';

const useIsWide = (): boolean => {
  const [wide, setWide] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return wide;
};

export const AttendancePage = ({ network }: { network: VTOPNetwork }) => {
  const {
    attSelectedSem,
    detailedAttendance,
    attLoading,
    attendanceRecords,
    attRecordsLoading,
    status,
    stats,
  } = useDataStore();

  const isNinePointer = parseFloat(stats?.cgpa || '0') >= 9;

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const isWide = useIsWide();

  useEffect(() => {
    void ensureM3eComponents();
  }, []);

  const selectedCourseObj = detailedAttendance.find(
    (course) => courseKey(course) === selectedCourse,
  );
  const forecast = useCourseAttendanceForecast(
    selectedCourseObj?.courseCode ?? '',
  );

  const load = useCallback(
    async (forceRefresh: boolean) => {
      const state = useDataStore.getState();
      const sem = state.attSelectedSem || state.ttSelectedSem;
      if (!sem || !network) return;
      setRefreshing(true);
      try {
        await state.fetchDetailedAttendance(network, sem, forceRefresh);
        const after = useDataStore.getState();
        setLoadFailed(
          after.detailedAttendance.length === 0 &&
            after.status !== 'Offline - Not Synced',
        );
      } finally {
        setRefreshing(false);
      }
    },
    [network],
  );

  useEffect(() => {
    if (attSelectedSem && network) void load(false);
  }, [attSelectedSem, network, load]);

  useEffect(() => {
    if (detailedAttendance.length === 0) return;
    const exists = detailedAttendance.some(
      (course) => courseKey(course) === selectedCourse,
    );
    if (!exists) {
      const first = detailedAttendance[0];
      const key = courseKey(first);
      setSelectedCourse(key);
      if (attSelectedSem && network) {
        useDataStore
          .getState()
          .fetchAttendanceRecords(
            network,
            attSelectedSem,
            first.courseId,
            first.classType,
          );
      }
    }
  }, [detailedAttendance, selectedCourse, attSelectedSem, network]);

  useEffect(() => {
    const handleRefresh = () => void load(true);
    window.addEventListener('retop-refresh-attendance', handleRefresh);
    return () =>
      window.removeEventListener('retop-refresh-attendance', handleRefresh);
  }, [load]);

  useEffect(() => {
    if (isWide || !selectedCourse) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedCourse(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isWide, selectedCourse]);

  const selectCourse = (key: string) => {
    setSelectedCourse(key);
    const course = detailedAttendance.find((item) => courseKey(item) === key);
    if (course && attSelectedSem && network) {
      useDataStore
        .getState()
        .fetchAttendanceRecords(
          network,
          attSelectedSem,
          course.courseId,
          course.classType,
        );
    }
  };

  if (attLoading) {
    return <AttendanceLoading />;
  }

  if (status === 'Offline - Not Synced') {
    return (
      <div className="h-full pt-16 md:pt-20 lg:pt-24 pb-32 md:pb-12">
        <OfflineNotSynced pageName="Attendance" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <AttendanceError
        onRetry={() => {
          void load(true);
        }}
      />
    );
  }

  if (detailedAttendance.length === 0) {
    return <AttendanceEmpty />;
  }

  const records = selectedCourse ? attendanceRecords[selectedCourse] : null;

  const overview = (
    <Overview
      courses={detailedAttendance}
      forecast={selectedCourseObj ? forecast : null}
      total={selectedCourseObj?.total ?? 0}
      attended={selectedCourseObj?.attended ?? 0}
      isNinePointer={isNinePointer}
      refreshing={refreshing}
      onRefresh={() => {
        void load(true).then(() => {
          setSnackbarMessage('Attendance refreshed');
          setSnackbarOpen(true);
        });
      }}
    />
  );

  const listPane = (
    <div className="flex flex-col h-full min-h-0 pt-21 md:pt-25 pb-32 lg:pb-12 px-4 md:px-6">
      {overview}
      <CourseList
        courses={detailedAttendance}
        selectedKey={selectedCourse}
        isNinePointer={isNinePointer}
        onSelect={selectCourse}
      />
    </div>
  );

  const detailPane = selectedCourseObj ? (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar pt-21 md:pt-25 pb-32 lg:pb-12 px-4 md:px-6 lg:px-8">
      <CourseDetail
        course={selectedCourseObj}
        records={records}
        recordsLoading={attRecordsLoading}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        isNinePointer={isNinePointer}
        compact={!isWide}
        onBack={() => setSelectedCourse(null)}
      />
    </div>
  ) : (
    <div className="flex h-full items-center justify-center px-6 text-sm text-(--text-muted)">
      Select a course to see its details.
    </div>
  );

  return (
    <div className="h-full w-full bg-(--bg-surface) text-(--text-main) relative z-0 overflow-hidden">
      {isWide ? (
        <M3eSplitPane
          className="h-full w-full"
          value={28}
          min={26}
          max={55}
          label="Resize course list and detail"
        >
          <div slot="start" className="h-full min-h-0 overflow-hidden">
            {listPane}
          </div>
          <div slot="end" className="h-full min-h-0 overflow-hidden">
            {detailPane}
          </div>
        </M3eSplitPane>
      ) : (
        <div className="h-full w-full">
          {selectedCourseObj ? detailPane : listPane}
        </div>
      )}

      <M3eSnackbar
        open={snackbarOpen}
        onToggle={(event: { newState?: string }) => {
          if (event.newState === 'closed') setSnackbarOpen(false);
        }}
      >
        {snackbarMessage}
      </M3eSnackbar>
    </div>
  );
};
