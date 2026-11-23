import { useEffect, useState } from 'react';
import {
  parseCurriculumCategoryTable,
  parseCurriculumDashboard,
} from '../parsers/curriculum';
import { CurriculumCourse } from '../types/vtop';
import { VTOPNetwork } from '../utils/network';

/**
 * Pulls the matching curriculum entry into the course page so its syllabus
 * PDF is reachable without leaving the course view.
 */
export const useCourseCurriculum = (
  network: VTOPNetwork,
  courseCode: string,
) => {
  const [courses, setCourses] = useState<CurriculumCourse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!courseCode) return;

    setLoading(true);
    (async () => {
      try {
        const dashboard = parseCurriculumDashboard(
          await network.getCurriculumDashboard(),
        );
        const found = await Promise.all(
          (dashboard.categories || []).map(async (cat) => {
            try {
              const html = await network.getCurriculumCategory(cat.id);
              return (parseCurriculumCategoryTable(html)?.courses || []).filter(
                (c) => c.code.toUpperCase() === courseCode.toUpperCase(),
              );
            } catch {
              return [];
            }
          }),
        );
        if (active) setCourses(found.flat());
      } catch {
        // Keep the last good courses on failure; the next success replaces them.
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [network, courseCode]);

  return { courses, loading };
};
