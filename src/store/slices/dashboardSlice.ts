import { StateCreator } from 'zustand';
import { VTOPNetwork } from '../../utils/network';
import {
  parseAcademicStats,
  parseCourseDetails,
  parseDigitalAssignments,
} from '../../parsers/dashboard';
import { parseEvents } from '../../parsers/events';
import { parseSemesters, parseTimetable } from '../../parsers/timetable';
import {
  parseCalendarDays,
  parseCalendarGroupsAndMonths,
  parseCalendarSemesters,
} from '../../parsers/calendar';
import { parseMarksSemesters } from '../../parsers/marks';
import { parseGradesSemesters } from '../../parsers/grades';
import { parseDASemesters } from '../../parsers/digital-assignments';
import { parseStudentProfile } from '../../parsers/profile';
import {
  getCachedData,
  scopedCacheKey,
  setCachedData,
} from '../../utils/cache';
import { currentCampus } from '../../utils/campus';
import { detailedToCourseSummary } from '../../utils/attendanceHome';
import {
  currentCacheAccount,
  readLastAttendanceSemester,
  scopedPreferenceKey,
} from '../../utils/attendanceSemester';
import { waitForIntercepted } from '../../utils/dashboardInterceptor';
import { isNativeAndroidBridgeAvailable } from '../../utils/vtopBridge';
import {
  CalendarEvent,
  CalendarMonthPreview,
  CourseSummary,
  Assignment,
  Event,
  TimetableCourse,
} from '../../types/vtop';
import { UpcomingClass } from '../../utils/timetable-slots';
import {
  isUpcomingSemester,
  nextChronologicalSemesterId,
  resolveCurrentSemesterId,
} from '../../utils/semesterContinuity';
import { DataState } from '../dataStore';

export type ContinuityMonth = {
  month: CalendarMonthPreview;
  days: CalendarEvent[];
  startOffset: number;
};

export interface DashboardSlice {
  status: string;
  setStatus: (status: string) => void;

  stats: {
    cgpa: string;
    credits: string;
    totalCredits: string;
    nonGraded: string;
    placement: string;
  };
  attendance: CourseSummary[];
  assignments: Assignment[];
  events: Event[];
  upcoming: UpcomingClass[];
  /** Next chronological semester, loaded without changing the current selection. */
  nextTtCourses: TimetableCourse[];
  nextCalGridData: ContinuityMonth[];
  lastSyncTime: number;
  /** Last successful reload per view, for the shell reload tooltip. */
  pageSyncTimes: Record<string, number>;
  markPageSynced: (view: string, at?: number) => void;
  isSyncing: boolean;
  fetchDashboardData: (
    network: VTOPNetwork,
    csrf: string,
    authId: string,
  ) => Promise<void>;
  syncDashboard: (
    network: VTOPNetwork,
    csrf: string,
    authId: string,
  ) => Promise<void>;
  enableDemoMode: () => void;
}

/** AP has no dashboard widget; derive Home rows from the working attendance page. */
async function hydrateVitapHomeAttendance(
  get: () => DataState,
  set: (partial: Partial<DataState>) => void,
  network: VTOPNetwork,
  authId: string,
) {
  if (currentCampus() !== 'vitap') return;

  let detailed = get().detailedAttendance;
  const semId = get().attSelectedSem;
  if ((!detailed || detailed.length === 0) && semId) {
    await get().fetchDetailedAttendance(network, semId);
    detailed = get().detailedAttendance;
  }
  if (!detailed || detailed.length === 0) return;

  const attendance = detailed.map(detailedToCourseSummary);
  set({ attendance });
  await setCachedData(
    scopedCacheKey('dashboard_attendance', authId || currentCacheAccount()),
    attendance,
  );
}

/** Cache-first calendar grid for any semester; never touches the selected semester. */
async function getSemesterCalendar(
  network: VTOPNetwork | undefined,
  authId: string,
  semId: string,
  offline: boolean,
): Promise<ContinuityMonth[]> {
  if (!semId) return [];
  const owner = authId || currentCacheAccount();
  const groupsKey = scopedCacheKey(`cal_groups_${semId}`, owner);
  let groups: { id: string; label: string }[] = [];
  let months: CalendarMonthPreview[] = [];
  const cached = await getCachedData<any>(groupsKey);
  if (cached?.groups?.length && cached?.months?.length) {
    groups = cached.groups;
    months = cached.months;
  } else if (!offline && network?.csrf) {
    try {
      const body = new URLSearchParams();
      body.append('_csrf', network.csrf);
      body.append('paramReturnId', 'getDateForSemesterPreview');
      body.append('semSubId', semId);
      body.append('authorizedID', network.authorizedID);
      body.append('x', new Date().toUTCString());
      const res = await fetch('/vtop/getDateForSemesterPreview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body,
      });
      const parsed = parseCalendarGroupsAndMonths(await res.text());
      groups = parsed.groups;
      months = parsed.months;
      if (groups.length && months.length) {
        await setCachedData(groupsKey, { groups, months });
      }
    } catch {}
  }
  const groupId = groups.length > 1 ? groups[1].id : groups[0]?.id;
  if (!groupId || months.length === 0) return [];

  const grid: ContinuityMonth[] = [];
  for (const month of months) {
    const cacheKey = `cal_${semId}_${groupId}_${month.dateString}`;
    let html: any = null;
    if (offline || !network) {
      html = await getCachedData<any>(scopedCacheKey(cacheKey, owner));
    } else {
      html = await network
        .fetchWithCache(cacheKey, () =>
          network.fetchFragment('processViewCalendar', {
            calDate: month.dateString,
            semSubId: semId,
            classGroupId: groupId,
          }),
        )
        .catch(() => null);
    }
    if (html)
      grid.push({
        month,
        days: parseCalendarDays(html, month.label),
        startOffset: 0,
      });
  }
  return grid;
}

/** Cache-first timetable for a semester, without changing ttSelectedSem. */
async function getSemesterTimetable(
  network: VTOPNetwork | undefined,
  authId: string,
  semId: string,
  offline: boolean,
): Promise<TimetableCourse[]> {
  if (!semId) return [];
  let html: any = null;
  if (offline || !network) {
    html = await getCachedData<any>(
      scopedCacheKey(`tt_${semId}`, authId || currentCacheAccount()),
    );
  } else {
    html = await network
      .fetchWithCache(
        `tt_${semId}`,
        () =>
          network.fetchVtopApi('processViewTimeTable', {
            semesterSubId: semId,
          }),
        false,
        Infinity,
      )
      .catch(() => null);
  }
  if (!html) return [];
  const parsed = typeof html === 'string' ? parseTimetable(html) : html;
  return (Array.isArray(parsed) ? parsed : []).filter(
    (course: TimetableCourse) => !/drop|withdraw/i.test(course.status || ''),
  );
}

/**
 * Derives the active semester and one-hop continuity data without ever writing
 * ttSelectedSem / calSelectedSem for the next term.
 */
async function deriveSemesterContinuity(
  ttPool: { id: string; isLatest?: boolean; selected?: boolean }[],
  calPool: { id: string; isLatest?: boolean; selected?: boolean }[],
  savedTtSem: string | null,
  savedCalSem: string | null,
  network: VTOPNetwork,
  authId: string,
  offline: boolean,
) {
  const vitap = currentCampus() === 'vitap';
  const newestId = ttPool[0]?.id || calPool[0]?.id || '';
  const newestGrid =
    vitap && newestId
      ? await getSemesterCalendar(network, authId, newestId, offline)
      : [];
  const upcomingIds = isUpcomingSemester(newestGrid.flatMap((m) => m.days))
    ? [newestId]
    : [];
  const ttDefault =
    resolveCurrentSemesterId(ttPool, {
      savedId: savedTtSem,
      upcomingIds,
      useUpcomingGate: vitap,
    }) || '';
  const calDefault =
    resolveCurrentSemesterId(calPool, {
      savedId: savedCalSem,
      upcomingIds,
      useUpcomingGate: vitap,
    }) || '';
  const nextId =
    nextChronologicalSemesterId(ttPool, ttDefault) ||
    (upcomingIds.length ? newestId : null);
  const nextCalGridData =
    nextId && nextId === newestId
      ? newestGrid
      : nextId
        ? await getSemesterCalendar(network, authId, nextId, offline)
        : [];
  const nextTtCourses = nextId
    ? await getSemesterTimetable(network, authId, nextId, offline)
    : [];
  return { ttDefault, calDefault, nextId, nextTtCourses, nextCalGridData };
}

export const createDashboardSlice: StateCreator<
  DataState,
  [],
  [],
  DashboardSlice
> = (set, get) => ({
  status: 'Initializing...',
  setStatus: (status) => set({ status }),

  stats: {
    cgpa: '...',
    credits: '...',
    totalCredits: '...',
    nonGraded: '...',
    placement: '...',
  },
  attendance: [],
  assignments: [],
  events: [],
  upcoming: [],
  nextTtCourses: [],
  nextCalGridData: [],
  lastSyncTime: 0,
  pageSyncTimes: {},
  markPageSynced: (view, at = Date.now()) =>
    set((state) => ({
      pageSyncTimes: { ...state.pageSyncTimes, [view]: at },
    })),
  isSyncing: false,

  fetchDashboardData: async (network, csrf, authId) => {
    try {
      const isOffline =
        !isNativeAndroidBridgeAvailable() &&
        ((typeof window !== 'undefined' && (window as any).__RETOP_OFFLINE__) ||
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          (typeof location !== 'undefined' &&
            !location.hostname.includes('vit.ac.in') &&
            !location.hostname.includes('vitap.ac.in') &&
            !location.protocol.includes('chrome-extension') &&
            !location.protocol.includes('moz-extension')));

      set({ status: isOffline ? 'Offline' : 'Syncing...' });

      // ── Instant Cache Hydration ─────────────────────────────────────────────
      // Immediately hydrate store from local cache with zero latency so UI renders instantly
      try {
        const [cachedStats, cachedAtt, cachedDA, cachedEvents] =
          await Promise.all([
            getCachedData<any>(scopedCacheKey('dashboard_stats', authId)),
            getCachedData<any>(scopedCacheKey('dashboard_attendance', authId)),
            getCachedData<any>(scopedCacheKey('dashboard_da', authId)),
            getCachedData<any>(scopedCacheKey('dashboard_events', authId)),
          ]);

        const instantUpdates: any = {};
        if (cachedStats) {
          try {
            instantUpdates.stats =
              typeof cachedStats === 'string'
                ? parseAcademicStats(cachedStats)
                : cachedStats;
          } catch {}
        }
        if (cachedAtt) {
          try {
            instantUpdates.attendance =
              typeof cachedAtt === 'string'
                ? parseCourseDetails(cachedAtt)
                : cachedAtt;
          } catch {}
        }
        if (cachedDA) {
          try {
            instantUpdates.assignments =
              typeof cachedDA === 'string'
                ? parseDigitalAssignments(cachedDA)
                : cachedDA;
          } catch {}
        }
        if (cachedEvents) {
          try {
            instantUpdates.events =
              typeof cachedEvents === 'string'
                ? parseEvents(cachedEvents)
                : cachedEvents;
          } catch {}
        }

        if (Object.keys(instantUpdates).length > 0) {
          set(instantUpdates);
        }
      } catch (e) {
        console.warn('[retop] Instant cache load failed:', e);
      }

      const isChennai =
        typeof window !== 'undefined' &&
        window.location.hostname.includes('vtopcc');
      const ttEndpoint = isChennai
        ? 'academics/common/StudentTimeTableChn'
        : 'academics/common/StudentTimeTable';

      if (isOffline) {
        // In offline mode, read timetable & calendar from cache immediately without waiting for XHR interception
        try {
          const [semHTML, calHTML] = await Promise.all([
            getCachedData<any>(scopedCacheKey('tt_semester_list', authId)),
            getCachedData<any>(scopedCacheKey('cal_semester_list', authId)),
          ]);

          if (semHTML || calHTML) {
            const sems: any[] =
              typeof semHTML === 'string'
                ? parseSemesters(semHTML || '')
                : semHTML || [];
            const calSems: any[] =
              typeof calHTML === 'string'
                ? parseCalendarSemesters(calHTML || '')
                : calHTML || [];

            const filterNonIndustry = <
              T extends {
                id: string;
                label: string;
                selected?: boolean;
                isLatest?: boolean;
              },
            >(
              list: T[],
            ): T[] => {
              const nonInd = list.filter(
                (s) =>
                  !/industry|\(ind\)|_ind/i.test(s.label) &&
                  !/industry|\(ind\)|_ind/i.test(s.id),
              );
              return nonInd.length > 0 ? nonInd : list;
            };

            const savedCalSem = localStorage.getItem(
              scopedPreferenceKey('retop-cal-selected-sem'),
            );
            const calPool = filterNonIndustry(calSems);
            const savedTtSem = localStorage.getItem(
              scopedPreferenceKey('retop-tt-selected-sem'),
            );
            const ttPool = filterNonIndustry(sems);
            const continuity = await deriveSemesterContinuity(
              ttPool,
              calPool,
              savedTtSem,
              savedCalSem,
              network,
              authId,
              isOffline,
            );
            const { ttDefault, calDefault } = continuity;

            const savedAttSem = readLastAttendanceSemester(authId);
            const attDefault =
              savedAttSem && sems.some((s: any) => s.id === savedAttSem)
                ? savedAttSem
                : ttDefault;

            set({
              ttSemesters: sems,
              ttSelectedSem: ttDefault,
              cpSelectedSem: ttDefault,
              calSemesters: calSems,
              calSelectedSem: calDefault,
              attSelectedSem: attDefault,
              nextTtCourses: continuity.nextTtCourses,
              nextCalGridData: continuity.nextCalGridData,
            });

            if (ttDefault) {
              await get()
                .loadTimetable(network, csrf, authId, ttDefault)
                .catch(() => {});
            }
          }
        } catch {}

        set({
          status: 'Offline',
          isSyncing: false,
          lastSyncTime: Date.now(),
        });
        return;
      }

      // ── Background Fresh Sync Strategy ──────────────────────────────────────
      const isBridgeMode = isNativeAndroidBridgeAvailable();

      const resolveOrFetch = async (
        signalKey: string,
        cacheKey: string,
        fetcher: () => Promise<string>,
        parser: (html: string) => any,
        storeKey: string,
      ) => {
        const scopedKey = scopedCacheKey(cacheKey, authId);
        // In bridge/standalone mode: syncStudentData already populated these cache keys.
        // Skipping waitForIntercepted (never fires) and skipping live-fetch of
        // VTOP-home-only widget endpoints (return 302/empty outside home page context).
        if (isBridgeMode) {
          return; // cache hydration at top of fetchDashboardData already handled this
        }
        // 1. Wait for VTOP's own home-page XHR (via interceptDashboardResponse)
        const intercepted = await waitForIntercepted(signalKey, 1500);
        if (intercepted) {
          try {
            const parsed = parser(intercepted);
            set({ [storeKey]: parsed } as any);
            await setCachedData(scopedKey, parsed);
          } catch (e) {
            console.warn(`[retop] Parse failed for ${signalKey}:`, e);
          }
          return;
        }
        // 2. Fallback: live fetch with cache update
        try {
          const html = await network.fetchWithCache(cacheKey, fetcher, true);
          if (
            html &&
            (typeof html !== 'string' ||
              (!html.includes('HTTP Status 404') &&
                !html.includes('<title>404')))
          ) {
            set({
              [storeKey]: typeof html === 'string' ? parser(html) : html,
            } as any);
          }
        } catch (e) {
          // Gracefully suppress 404 / optional dashboard widget errors
          console.warn(
            `[retop] Sub-endpoint ${cacheKey} unavailable (404/network):`,
            e,
          );
        }
      };

      const statsP = resolveOrFetch(
        'dashboard_stats',
        'dashboard_stats',
        () => network.fetchFragment('get/dashboard/current/cgpa/credits'),
        parseAcademicStats,
        'stats',
      );
      const attP = resolveOrFetch(
        'dashboard_attendance',
        'dashboard_attendance',
        () =>
          network.fetchFragment(
            'get/dashboard/current/semester/course/details',
          ),
        parseCourseDetails,
        'attendance',
      );
      const daP = resolveOrFetch(
        'dashboard_da',
        'dashboard_da',
        () => network.fetchFragment('get/upcoming/digital/assignments'),
        parseDigitalAssignments,
        'assignments',
      );
      const eventsP = resolveOrFetch(
        'dashboard_events',
        'dashboard_events',
        () => network.fetchFragment('get/scheduled/events'),
        parseEvents,
        'events',
      );

      const timetableAndCalP = (async () => {
        try {
          const [semHTML, calHTML] = await Promise.all([
            network.fetchWithCache('tt_semester_list', () =>
              network.fetchFragment(ttEndpoint),
            ),
            network.fetchWithCache('cal_semester_list', () =>
              network.fetchFragment('academics/common/CalendarPreview'),
            ),
          ]);

          const sems: any[] =
            typeof semHTML === 'string'
              ? parseSemesters(semHTML)
              : semHTML || [];
          const calSems: any[] =
            typeof calHTML === 'string'
              ? parseCalendarSemesters(calHTML)
              : calHTML || [];

          if (sems.length > 0 || calSems.length > 0) {
            const filterNonIndustry = <
              T extends {
                id: string;
                label: string;
                selected?: boolean;
                isLatest?: boolean;
              },
            >(
              list: T[],
            ): T[] => {
              const nonInd = list.filter(
                (s) =>
                  !/industry|\(ind\)|_ind/i.test(s.label) &&
                  !/industry|\(ind\)|_ind/i.test(s.id),
              );
              return nonInd.length > 0 ? nonInd : list;
            };

            const savedCalSem = localStorage.getItem(
              scopedPreferenceKey('retop-cal-selected-sem'),
            );
            const calPool = filterNonIndustry(calSems);
            const savedTtSem = localStorage.getItem(
              scopedPreferenceKey('retop-tt-selected-sem'),
            );
            const ttPool = filterNonIndustry(sems);
            const continuity = await deriveSemesterContinuity(
              ttPool,
              calPool,
              savedTtSem,
              savedCalSem,
              network,
              authId,
              isOffline,
            );
            const { ttDefault, calDefault } = continuity;

            const savedAttSem = readLastAttendanceSemester(authId);
            const attDefault =
              savedAttSem && sems.some((s: any) => s.id === savedAttSem)
                ? savedAttSem
                : ttDefault;

            set({
              ttSemesters: sems,
              ttSelectedSem: ttDefault,
              cpSelectedSem: ttDefault,
              calSemesters: calSems,
              calSelectedSem: calDefault,
              attSelectedSem: attDefault,
              nextTtCourses: continuity.nextTtCourses,
              nextCalGridData: continuity.nextCalGridData,
            });

            const subPromises = [];
            subPromises.push(get().fetchUserProfile(network));
            subPromises.push(get().fetchExamSemesters(network));
            if (ttDefault) {
              subPromises.push(
                get().loadTimetable(network, csrf, authId, ttDefault),
              );
            }
            if (calDefault) {
              subPromises.push(
                (async () => {
                  await get().fetchCalendarMonthsAndGroups(network, calDefault);
                  const state = get();
                  if (
                    state.calSelectedGroup &&
                    state.calAvailableMonths.length > 0
                  ) {
                    await get().fetchCalendarGrid(
                      network,
                      calDefault,
                      state.calSelectedGroup,
                      state.calAvailableMonths,
                    );
                  }
                })(),
              );
            }
            await Promise.allSettled(subPromises);
          }
        } catch (e) {
          console.warn(e);
        }
      })();

      await Promise.allSettled([statsP, attP, daP, eventsP, timetableAndCalP]);

      await hydrateVitapHomeAttendance(get, set, network, authId);

      set({ status: 'Online', lastSyncTime: Date.now() });

      // Background refresh: silently update with fresh data (timetable/calendar/exam
      // only — stats/attendance/DA/events are already fresh from the intercepted XHRs)
      set({ isSyncing: true });
      Promise.all([
        network.fetchWithCache(
          'tt_semester_list',
          () => network.fetchFragment(ttEndpoint),
          true,
        ),
        network.fetchWithCache(
          'cal_semester_list',
          () => network.fetchFragment('academics/common/CalendarPreview'),
          true,
        ),
        network.fetchWithCache(
          'exam_schedule_view',
          () => network.getExamScheduleView(),
          true,
        ),
      ])
        .then(([newSem, newCal]) => {
          const freshSems = parseSemesters(newSem);
          const freshCalSems = parseCalendarSemesters(newCal);
          if (freshSems.length > 0) set({ ttSemesters: freshSems });
          if (freshCalSems.length > 0) set({ calSemesters: freshCalSems });

          const currentTtSem = get().ttSelectedSem;
          if (currentTtSem) {
            get()
              .loadTimetable(network, csrf, authId, currentTtSem, true)
              .catch(console.warn);
          }
          set({ lastSyncTime: Date.now() });
        })
        .catch(console.warn)
        .finally(() => set({ isSyncing: false }));
    } catch (e) {
      if (e instanceof Error && e.message === 'OFFLINE_CACHE_MISS') {
        set({ status: 'Offline - Not Synced', isSyncing: false });
      } else {
        set({ status: 'Sync Failed', isSyncing: false });
      }
    }
  },

  syncDashboard: async (network, csrf, authId) => {
    const { isSyncing } = get();
    if (isSyncing) return;

    set({ isSyncing: true, status: 'Syncing...' });
    try {
      const [newEdu, newAtt, newDa, newEvents] = await Promise.all([
        network.fetchWithCache(
          'dashboard_stats',
          () => network.fetchFragment('get/dashboard/current/cgpa/credits'),
          true,
        ),
        network.fetchWithCache(
          'dashboard_attendance',
          () =>
            network.fetchFragment(
              'get/dashboard/current/semester/course/details',
            ),
          true,
        ),
        network.fetchWithCache(
          'dashboard_da',
          () => network.fetchFragment('get/upcoming/digital/assignments'),
          true,
        ),
        network.fetchWithCache(
          'dashboard_events',
          () => network.fetchFragment('get/scheduled/events'),
          true,
        ),
      ]);

      set({
        stats: parseAcademicStats(newEdu),
        attendance: parseCourseDetails(newAtt),
        assignments: parseDigitalAssignments(newDa),
        events: parseEvents(newEvents),
        lastSyncTime: Date.now(),
        status: 'Online',
      });

      await hydrateVitapHomeAttendance(get, set, network, authId);

      // Refresh timetable for current active semester
      const currentTtSem = get().ttSelectedSem;
      if (currentTtSem) {
        await get()
          .loadTimetable(network, csrf, authId, currentTtSem, true)
          .catch(() => {});
      }
    } catch (e) {
      set({ status: 'Sync Failed' });
    } finally {
      set({ isSyncing: false });
    }
  },

  enableDemoMode: async () => {
    try {
      set({
        status: 'Demo Mode Active',
        user: { name: 'Demo User', regNo: '22ABC1234' },
        stats: { cgpa: '9.42', creditsEarned: '78', rank: '12/850' } as any,
        attendance: [
          {
            code: 'CSE3001',
            title: 'Software Engineering',
            type: 'ETH',
            attended: 28,
            total: 30,
            percentage: '93.33',
            faculty: 'Dr. Faculty',
            slot: 'A1+TA1',
          },
          {
            code: 'CSE3002',
            title: 'Database Management Systems',
            type: 'ETH',
            attended: 26,
            total: 30,
            percentage: '86.67',
            faculty: 'Dr. Faculty',
            slot: 'B1+TB1',
          },
        ] as any,
        assignments: [],
        events: [],
        upcoming: [],
        ttCourses: [] as any,
        ttSelectedSem: 'demo',
        ttSemesters: [{ id: 'demo', label: 'Winter Semester 2026-27' }] as any,
        calSemesters: [{ id: 'demo', label: 'Winter Semester 2026-27' }] as any,
        calSelectedSem: 'demo',
      });
    } catch (e) {
      console.warn('Failed loading demo data', e);
    }
  },
});
