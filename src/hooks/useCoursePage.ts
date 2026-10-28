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
import { set as idbSet } from 'idb-keyval';

interface UpcomingClassDetail {
  date: Date;
  slots: { start: string; end: string }[];
}

const getCsrf = () => {
  const match = document.documentElement.outerHTML.match(
    /csrfValue\s*=\s*"([^"]+)"/,
  );
  if (match) return match[1];
  return (
    (document.querySelector('input[name="_csrf"]') as HTMLInputElement)
      ?.value || ''
  );
};

const getAuthId = () => {
  const authInput = document.getElementById(
    'authorizedIDX',
  ) as HTMLInputElement;
  if (authInput) return authInput.value;
  return (
    (document.querySelector('input[name="authorizedID"]') as HTMLInputElement)
      ?.value || ''
  );
};

const isSameSem = (sem1: string, sem2: string) => {
  if (!sem1 || !sem2) return false;
  const normalize = (s: string) => s.replace(/0+([1-9])$/, '$1').toLowerCase();
  return normalize(sem1) === normalize(sem2);
};

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
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CoursePageData | null>(null);
  const [courseMarks, setCourseMarks] = useState<any>(null);
  const [courseGrade, setCourseGrade] = useState<any>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<
    UpcomingClassDetail[] | null
  >(null);

  const { ttCourses, attendance, assignments, ttSelectedSem, calGridData } =
    useDataStore();

  useEffect(() => {
    if (!selectedOptionId) {
      setData(null);
    }
  }, [selectedOptionId]);

  useEffect(() => {
    if (!selectedSem || cpOptions.length === 0) return;
    const normalize = (s: string) =>
      s.replace(/0+([1-9])$/, '$1').toLowerCase();
    const coursesInSem = cpOptions.filter(
      (o) => normalize(o.semester) === normalize(selectedSem),
    );
    const isCurrentValid = coursesInSem.some(
      (c) => c.classId === selectedOptionId,
    );
    if (!isCurrentValid && coursesInSem.length > 0) {
      setSelectedOptionId(coursesInSem[0].classId);
    }
  }, [selectedSem, cpOptions, selectedOptionId, setSelectedOptionId]);

  useEffect(() => {
    if (cpOptions.length > 0) return;
    let isMounted = true;

    const fallbackFromTimetable = () => {
      if (ttCourses && ttCourses.length > 0 && isMounted) {
        const fallbackOpts: CoursePageOption[] = ttCourses.map((tc) => ({
          code: tc.code,
          title: tc.title,
          classId: tc.classId || tc.code,
          semester: selectedSem || ttSelectedSem || 'VL20262701',
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
    cpOptions.length,
    setCpOptions,
    ttCourses,
    selectedSem,
    ttSelectedSem,
  ]);

  useEffect(() => {
    if (!selectedOptionId || !selectedSem || cpOptions.length === 0) return;
    const opt = cpOptions.find(
      (o) =>
        o.classId === selectedOptionId && isSameSem(o.semester, selectedSem),
    );
    if (!opt) return;

    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
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
    if (!currentOption) {
      setCourseMarks(null);
      setCourseGrade(null);
      return;
    }
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
      !isSameSem(selectedSem, ttSelectedSem) ||
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
    fileId: string,
    facultyName: string,
    courseName: string,
  ) => {
    try {
      idbSet('lastDownloadInfo', {
        faculty: facultyName,
        course: courseName,
        timestamp: Date.now(),
      }).catch(() => {});
    } catch (e) {
      console.error('Failed to set download info', e);
    }
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/vtop/downloadCourseMaterialFacultyPdf';
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = '_csrf';
    csrfInput.value = getCsrf();
    const authInput = document.createElement('input');
    authInput.type = 'hidden';
    authInput.name = 'authorizedID';
    authInput.value = getAuthId();
    const fileInput = document.createElement('input');
    fileInput.type = 'hidden';
    fileInput.name = 'fileId';
    fileInput.value = fileId;
    form.appendChild(csrfInput);
    form.appendChild(authInput);
    form.appendChild(fileInput);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
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

  const groupedMaterials = useMemo(() => {
    if (!filteredMaterials) return {};
    const grouped = filteredMaterials.reduce(
      (acc, mat) => {
        const fac = mat.faculty || 'Unknown Faculty';
        if (!acc[fac]) acc[fac] = [];
        acc[fac].push(mat);
        return acc;
      },
      {} as Record<string, CourseMaterial[]>,
    );

    Object.keys(grouped).forEach((fac) => {
      grouped[fac].sort((a, b) => {
        if (materialSort === 'module') {
          const modA = a.module ? parseInt(a.module) : 999;
          const modB = b.module ? parseInt(b.module) : 999;
          if (modA !== modB) return modA - modB;
        }
        const dateA = new Date(a.uploadDate).getTime() || 0;
        const dateB = new Date(b.uploadDate).getTime() || 0;
        return dateB - dateA;
      });
    });
    return grouped;
  }, [filteredMaterials, materialSort]);

  const isCurrentSem = isSameSem(selectedSem, ttSelectedSem);
  const courseTimetable =
    ttCourses.find(
      (c) =>
        c.classId === currentOption?.classId ||
        (currentOption &&
          c.code.toLowerCase() === currentOption.code.toLowerCase()),
    ) || null;
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
    groupedMaterials,
    filteredMaterials,
    courseTimetable,
    courseAttendance,
    courseAssignments,
    handleDownload,
  };
};
