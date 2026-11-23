import { useState, useEffect, useMemo } from 'react';
import { VTOPNetwork } from '../utils/network';
import { parseCoursePage } from '../parsers/course-page';
import { parseStudentMarks } from '../parsers/marks';
import { parseGrades } from '../parsers/grades';
import {
  getGridPositions,
  getCorrectDayName,
  CAMPUS_SLOT_TIMINGS,
} from '../utils/timetable-slots';
import {
  CoursePageData,
  CoursePageOption,
  CourseMaterial,
} from '../types/vtop';
import { useDataStore } from '../store/dataStore';
import {
  planBulkDownloads,
  planSingleDownload,
  isDownloadableMaterial,
} from '../utils/courseDownloads';
import { readSessionFactsFromDocument } from '../utils/sessionFacts';
import { isSameSemester } from '../utils/semesterIdentity';
import { buildCourseMaterialGroups } from '../utils/courseMaterials';
import { currentCampus } from '../utils/campus';
import {
  parseApCourseDetail,
  parseApCourseOptions,
  parseApFacultyOptions,
  parseApSemesters,
  parseApSlotOptions,
} from '../parsers/course-page-ap';

interface UpcomingClassDetail {
  date: Date;
  slots: { start: string; end: string }[];
}

export const useCoursePageData = (
  network: VTOPNetwork,
  cpOptions: CoursePageOption[],
  setCpOptions: (opts: CoursePageOption[]) => void,
  selectedSem: string,
  selectedOptionId: string,
  setSelectedOptionId: (id: string) => void,
  searchTerm: string,
  materialSort: 'date' | 'module',
) => {
  const isAp = currentCampus() === 'vitap';
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CoursePageData | null>(null);
  const [courseMarks, setCourseMarks] = useState<any>(null);
  const [courseGrade, setCourseGrade] = useState<any>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<
    UpcomingClassDetail[] | null
  >(null);

  const {
    ttCourses,
    attendance,
    assignments,
    ttSemesters,
    ttSelectedSem,
    calGridData,
    detailedAttendance,
    setCpSelectedSem,
    setCpSemesters,
  } = useDataStore();

  // Non-AP keeps the previous semester list (timetable); AP replaces it below.
  useEffect(() => {
    if (!isAp && ttSemesters.length > 0) setCpSemesters(ttSemesters);
  }, [isAp, ttSemesters, setCpSemesters]);

  useEffect(() => {
    if (!selectedSem || cpOptions.length === 0) return;
    const coursesInSem = cpOptions.filter((o) =>
      isSameSemester(o.semester, selectedSem),
    );
    const isCurrentValid = coursesInSem.some(
      (c) => c.classId === selectedOptionId,
    );
    if (!isCurrentValid && coursesInSem.length > 0) {
      setSelectedOptionId(coursesInSem[0].classId);
    }
  }, [selectedSem, cpOptions, selectedOptionId, setSelectedOptionId]);

  useEffect(() => {
    let isMounted = true;

    const fallbackFromTimetable = (sem = selectedSem) => {
      // A fallback is not fresh data: never replace options already on screen.
      if (cpOptions.length > 0) return;
      if (ttCourses && ttCourses.length > 0 && isMounted) {
        const fallbackOpts: CoursePageOption[] = ttCourses.map((tc) => ({
          code: tc.code,
          title: tc.title,
          classId: tc.classId || tc.code,
          semester: sem || ttSelectedSem || 'VL20262701',
          type: tc.type,
          credits: tc.credits || '0',
          rawText: `${tc.code} - ${tc.title} - ${tc.type}`,
        }));
        if (fallbackOpts.length > 0) {
          setCpOptions(fallbackOpts);
        }
      }
    };

    const fetchOptions = async () => {
      if (isAp) {
        try {
          const shellHtml = await network.getApCoursePageShell();
          const semesters = parseApSemesters(shellHtml);
          let effectiveSem = selectedSem;
          if (semesters.length > 0) {
            setCpSemesters(semesters);
            if (!semesters.some((s) => s.id === selectedSem)) {
              effectiveSem = (semesters.find((s) => s.isLatest) ?? semesters[0])
                .id;
              setCpSelectedSem(effectiveSem);
            }
          }
          const html = await network.getApCourseOptions(effectiveSem);
          if (!isMounted) return;
          const options = parseApCourseOptions(html, effectiveSem);
          if (options.length > 0) setCpOptions(options);
          else fallbackFromTimetable(effectiveSem);
        } catch (err) {
          console.warn('Failed to load VIT-AP course options:', err);
          fallbackFromTimetable();
        }
        return;
      }
      try {
        let html = await network.getCoursePage();
        let parsed = parseCoursePage(html);
        if (parsed.options.length === 0) {
          html = await network.fetchFragment(
            'academics/CoursePageConsolidated/CoursePage',
          );
          parsed = parseCoursePage(html);
        }
        if (!isMounted) return;
        if (parsed.options.length > 0) {
          setCpOptions(parsed.options);
        } else {
          fallbackFromTimetable();
        }
      } catch (err) {
        console.warn(
          'Failed to load course options from network, falling back to timetable courses:',
          err,
        );
        fallbackFromTimetable();
      }
    };
    fetchOptions();
    return () => {
      isMounted = false;
    };
  }, [
    network,
    setCpOptions,
    ttCourses,
    selectedSem,
    ttSelectedSem,
    setCpSelectedSem,
    setCpSemesters,
  ]);

  useEffect(() => {
    if (!selectedOptionId || !selectedSem || cpOptions.length === 0) return;
    const opt = cpOptions.find(
      (o) =>
        o.classId === selectedOptionId &&
        isSameSemester(o.semester, selectedSem),
    );
    if (!opt) return;

    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        if (isAp) {
          const slots = parseApSlotOptions(
            await network.getApSlots(opt.classId, selectedSem),
          );
          if (slots.length === 0) return;
          const slotId = slots[0].id;
          const facultyOpts = parseApFacultyOptions(
            await network.getApFaculty(opt.classId, slotId, selectedSem),
          );
          if (facultyOpts.length === 0) return;
          const html = await network.getApCourseDetail(
            opt.classId,
            slotId,
            facultyOpts[0].id,
            selectedSem,
          );
          if (!isMounted) return;
          const parsedDetails = parseApCourseDetail(html);
          setData({
            ...parsedDetails,
            options: cpOptions,
            selectedCourseId: selectedOptionId,
          });
          return;
        }
        const html = await network.fetchFragment(
          'academics/CoursePageConsolidated/getCourseDetail',
          {
            semester: opt.semester,
            CourseId: opt.classId,
            CoursType: opt.type,
          },
        );
        if (!isMounted) return;

        const parsedDetails = parseCoursePage(html);
        setData({
          ...parsedDetails,
          options: cpOptions,
          selectedCourseId: selectedOptionId,
        });
      } catch (error) {
        console.error('Failed to fetch details', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();

    const handleRefresh = () => {
      fetchDetails();
    };
    window.addEventListener('retop-refresh-coursepage', handleRefresh);
    return () => {
      isMounted = false;
      window.removeEventListener('retop-refresh-coursepage', handleRefresh);
    };
  }, [selectedOptionId, selectedSem, cpOptions]);

  const currentOption = cpOptions.find((o) => o.classId === selectedOptionId);

  useEffect(() => {
    if (!currentOption) return;
    let isMounted = true;
    const fetchMarksAndGrades = async () => {
      try {
        const marksHtml = await network.getStudentMarks(selectedSem);
        if (!isMounted) return;
        const parsedMarks =
          typeof marksHtml === 'string'
            ? parseStudentMarks(marksHtml)
            : marksHtml;
        const marks = (Array.isArray(parsedMarks) ? parsedMarks : []).find(
          (m) =>
            m.code.toLowerCase() === currentOption.code.trim().toLowerCase() ||
            m.classNumber === currentOption.classId,
        );
        if (marks) setCourseMarks(marks);
      } catch (err) {
        console.warn('Failed to fetch marks', err);
      }
      try {
        const gradesHtml = await network.getStudentGrades(selectedSem);
        if (!isMounted) return;
        const parsedGrades =
          typeof gradesHtml === 'string' ? parseGrades(gradesHtml) : gradesHtml;
        const grade = parsedGrades?.courses?.find(
          (m: any) =>
            m.code.toLowerCase() === currentOption.code.trim().toLowerCase(),
        );
        if (grade) setCourseGrade(grade);
      } catch (err) {
        console.warn('Failed to fetch grades', err);
      }
    };
    fetchMarksAndGrades();
    return () => {
      isMounted = false;
    };
  }, [network, selectedSem, currentOption]);

  useEffect(() => {
    if (
      !currentOption ||
      !ttSelectedSem ||
      !isSameSemester(selectedSem, ttSelectedSem) ||
      !calGridData ||
      calGridData.length === 0
    ) {
      setUpcomingClasses(null);
      return;
    }
    const ttCourse = ttCourses.find((c) => c.classId === currentOption.classId);
    if (!ttCourse) {
      setUpcomingClasses(null);
      return;
    }

    const positions = getGridPositions(ttCourse.slot);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let upcoming: UpcomingClassDetail[] = [];
    calGridData.forEach((monthData) => {
      monthData.days.forEach((day) => {
        const d = new Date(day.dateObj);
        if (d >= today) {
          let dayName = getCorrectDayName(d);
          let hasOverride = false;

          const combined = (
            (day.info || '') +
            ' ' +
            (day.subInfo || '')
          ).toLowerCase();

          if (combined.includes('monday day order')) {
            dayName = 'Monday';
            hasOverride = true;
          } else if (combined.includes('tuesday day order')) {
            dayName = 'Tuesday';
            hasOverride = true;
          } else if (combined.includes('wednesday day order')) {
            dayName = 'Wednesday';
            hasOverride = true;
          } else if (combined.includes('thursday day order')) {
            dayName = 'Thursday';
            hasOverride = true;
          } else if (combined.includes('friday day order')) {
            dayName = 'Friday';
            hasOverride = true;
          }

          if (day.isInstructional || hasOverride) {
            const dayIdx = [
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ].indexOf(dayName);
            const cols = positions
              .filter((p) => p.day === dayIdx)
              .map((p) => p.col);
            if (cols.length > 0) {
              const type = ttCourse.type === 'Lab' ? 'Lab' : 'Theory';
              const timings =
                CAMPUS_SLOT_TIMINGS[type as keyof typeof CAMPUS_SLOT_TIMINGS];
              const slots = cols.map((c) => timings[c]).filter(Boolean);
              if (slots.length > 0) {
                upcoming.push({ date: d, slots });
              }
            }
          }
        }
      });
    });
    setUpcomingClasses(upcoming);
  }, [currentOption, selectedSem, ttSelectedSem, ttCourses, calGridData]);

  const handleDownload = (
    material: CourseMaterial,
    facultyName: string,
    courseName: string,
    moduleWise: boolean,
  ) => {
    const live = readSessionFactsFromDocument();
    const plans = planSingleDownload(
      {
        url: `${window.location.origin}/vtop/downloadCourseMaterialFacultyPdf`,
        csrf: live.csrf,
        authorizedId: live.regNo,
        semester: selectedSem,
        course: courseName,
        moduleWise,
      },
      {
        fileId: material.downloadId || material.id,
        title: material.title,
        faculty: facultyName,
        module: material.module,
        category: material.category,
      },
    );
    if (plans.length === 0) return;
    chrome.runtime.sendMessage({ action: 'DOWNLOAD_COURSE_MATERIALS', plans });
  };

  const downloadMaterials = (
    selections: { material: CourseMaterial; faculty: string }[],
    moduleWise: boolean,
  ): Promise<{ downloaded: number; skipped: number }> => {
    const course = [currentOption?.code, currentOption?.title]
      .filter(Boolean)
      .join(' - ');
    const live = readSessionFactsFromDocument();
    const plans = planBulkDownloads(
      {
        url: `${window.location.origin}/vtop/downloadCourseMaterialFacultyPdf`,
        csrf: live.csrf,
        authorizedId: live.regNo,
        semester: selectedSem,
        course,
        moduleWise,
      },
      selections.map(({ material, faculty }) => ({
        fileId: material.downloadId || material.id,
        title: material.title,
        faculty,
        module: material.module,
        category: material.category,
      })),
    );

    if (plans.length === 0) {
      return Promise.resolve({ downloaded: 0, skipped: selections.length });
    }

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'DOWNLOAD_COURSE_MATERIALS', plans },
        (res: { downloaded: number; skipped: number } | undefined) =>
          resolve(res || { downloaded: 0, skipped: 0 }),
      );
    });
  };

  const filteredMaterials =
    data?.materials.filter((m) => {
      const term = searchTerm.toLowerCase();
      return (
        m.title.toLowerCase().includes(term) ||
        m.faculty.toLowerCase().includes(term) ||
        m.category.toLowerCase().includes(term)
      );
    }) || [];

  const courseTimetable =
    ttCourses.find(
      (c) =>
        c.classId === currentOption?.classId ||
        (currentOption &&
          c.code.toLowerCase() === currentOption.code.toLowerCase()),
    ) || null;

  const assignedFacultyRaw = (
    courseTimetable?.faculty ||
    detailedAttendance?.find(
      (a) => currentOption && a.courseCode === currentOption.code,
    )?.faculty ||
    attendance?.find(
      (a) => currentOption && a.code.includes(currentOption.code.trim()),
    )?.faculty ||
    ''
  )
    .toLowerCase()
    .trim();

  // One deep module returns grouped, sorted, faculty-annotated entries.
  const materialGroups = useMemo(
    () =>
      buildCourseMaterialGroups(
        filteredMaterials,
        assignedFacultyRaw,
        materialSort,
      ),
    [filteredMaterials, assignedFacultyRaw, materialSort],
  );
  const downloadableSelections = useMemo(
    () =>
      materialGroups.flatMap((group) =>
        group.materials
          .filter(({ material }) => isDownloadableMaterial(material.category))
          .map(({ material }) => ({ material, faculty: group.key })),
      ),
    [materialGroups],
  );

  const courseAttendance = attendance.find(
    (a) => currentOption && a.code.includes(currentOption.code.trim()),
  );
  const courseAssignments = assignments.filter(
    (a) =>
      currentOption &&
      (a.course.includes(currentOption.code.trim()) ||
        a.course.includes(currentOption.title.trim())),
  );

  return {
    loading,
    data,
    courseMarks,
    courseGrade,
    upcomingClasses,
    currentOption,
    materialGroups,
    filteredMaterials,
    downloadableSelections,
    courseTimetable,
    courseAttendance,
    courseAssignments,
    handleDownload,
    downloadMaterials,
  };
};
