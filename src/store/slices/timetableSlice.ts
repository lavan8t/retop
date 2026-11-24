import { StateCreator } from 'zustand';
import { VTOPNetwork } from '../../utils/network';
import { parseTimetable } from '../../parsers/timetable';
import { Semester, TimetableCourse } from '../../types/vtop';
import { getUpcomingClasses } from '../../utils/timetable-slots';
import { scopedPreferenceKey } from '../../utils/attendanceSemester';
import { DataState } from '../dataStore';

const LEGACY_TT_SEM_KEY = 'retop-tt-selected-sem';
const ttSemKey = (): string => scopedPreferenceKey(LEGACY_TT_SEM_KEY);

export interface TimetableSlice {
  ttSemesters: Semester[];
  ttSelectedSem: string;
  ttCourses: TimetableCourse[];
  ttLoading: boolean;
  setTtSelectedSem: (semId: string) => void;
  loadTimetable: (
    network: VTOPNetwork,
    csrf: string,
    authId: string,
    semId: string,
    forceFetch?: boolean,
  ) => Promise<void>;

  cpSelectedSem: string;
  setCpSelectedSem: (semId: string) => void;
  cpSemesters: Semester[];
  setCpSemesters: (sems: Semester[]) => void;

  highlightedCourseCode: string | null;
  setHighlightedCourseCode: (code: string | null) => void;
}

export const createTimetableSlice: StateCreator<
  DataState,
  [],
  [],
  TimetableSlice
> = (set, get) => {
  localStorage.removeItem(LEGACY_TT_SEM_KEY);
  return {
    ttSemesters: [],
    ttSelectedSem: localStorage.getItem(ttSemKey()) || '',
    ttCourses: [],
    ttLoading: true,
    highlightedCourseCode: null,
    setHighlightedCourseCode: (code) => set({ highlightedCourseCode: code }),
    setTtSelectedSem: (semId) => {
      localStorage.setItem(ttSemKey(), semId);
      set({ ttSelectedSem: semId });
    },

    loadTimetable: async (network, csrf, authId, semId, forceFetch = false) => {
      set({ ttLoading: true, ttSelectedSem: semId });
      try {
        const cacheKey = `tt_${semId}`;
        console.log(
          `[VTOP] Request sent for TIMETABLE - /vtop/processViewTimeTable | params: { semesterSubId: ${semId} }`,
        );
        const html = await network.fetchWithCache(
          cacheKey,
          async () => {
            try {
              const rawHtml = await network.fetchVtopApi(
                'processViewTimeTable',
                {
                  semesterSubId: semId,
                },
              );
              console.log(
                `[VTOP] Response code 200, raw length: ${rawHtml.length}`,
              );
              return rawHtml;
            } catch (e: any) {
              console.log(`[VTOP] Response Error: ${e.message}`);
              throw e;
            }
          },
          forceFetch,
          get().ttSemesters.length > 0 && semId !== get().ttSemesters[0].id
            ? Infinity
            : undefined,
        );

        if (typeof html === 'string' && html.includes('data not available')) {
          set({ ttCourses: [], upcoming: [], ttLoading: false });
          return;
        }

        const parsedCourses =
          typeof html === 'string' ? parseTimetable(html) : html;
        const courses = (
          Array.isArray(parsedCourses) ? parsedCourses : []
        ).filter(
          (c) =>
            !c.status.toLowerCase().includes('drop') &&
            !c.status.toLowerCase().includes('withdrawn'),
        );

        console.log(
          `[VTOP] Timetable parsed data: ${courses.length} courses found.`,
        );

        if (courses.length > 0) {
          console.log(`[VTOP] Updating cache with latest for ${semId}`);
          set({
            ttCourses: courses,
            upcoming: getUpcomingClasses(courses),
            ttLoading: false,
          });
        } else {
          set({ ttCourses: [], upcoming: [], ttLoading: false });
        }
      } catch (e) {
        if (e instanceof Error && e.message === 'OFFLINE_CACHE_MISS') {
          set({ status: 'Offline - Not Synced' });
        } else {
          console.warn('Timetable load failed:', e);
        }
        // Keep the last good timetable visible while a retry runs.
        set({ ttLoading: false });
      }
    },

    cpSelectedSem: '',
    setCpSelectedSem: (semId) => set({ cpSelectedSem: semId }),
    cpSemesters: [],
    setCpSemesters: (sems) => set({ cpSemesters: sems }),
  };
};
