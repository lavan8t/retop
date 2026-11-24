/**
 * Student Data Synchronization Orchestrator.
 * Fetches academic data from live VTOP session and persists to IndexedDB/chrome.storage.
 */

import { VtopClient, VtopCampus } from './vtopClient';
import {
  parseStudentProfile,
  fixBase64Image,
  resolveProctorPhoto,
} from '../parsers/profile';
import { parseSemesters, parseTimetable } from '../parsers/timetable';
import { parseStudentAttendance } from '../parsers/attendance';
import { parseCourseDetails } from '../parsers/dashboard';
import { detailedToCourseSummary } from './attendanceHome';
import { parseStudentMarks } from '../parsers/marks';
import { parseGrades, parseGradeHistory } from '../parsers/grades';
import { scopedCacheKey, setCachedData } from './cache';
import { getStorageData, setStorageData } from './storageAdapter';
import { saveUserProfileImage } from './pinSecurity';
import { stripProfilePhotosForCache } from './profileCache';
import { set as idbSet } from 'idb-keyval';

export interface SyncProgress {
  step: string;
  progressPercent: number;
}

export interface CachedUser {
  regNo: string;
  username?: string;
  name: string;
  profileImgBase64?: string;
  lastActive: number;
  campus?: VtopCampus;
}

export async function syncStudentData(
  client: VtopClient,
  onProgress?: (progress: SyncProgress) => void,
): Promise<{
  success: boolean;
  user: CachedUser;
  error?: string;
}> {
  const regNo = client.registrationNumber.toUpperCase().trim();
  let studentName = client.studentName || regNo;
  let profilePhoto = '';

  try {
    // 1. Fetch Profile
    onProgress?.({ step: 'Fetching student profile...', progressPercent: 15 });
    try {
      const profileHtml = await client.getProfile();
      if (profileHtml && profileHtml.length > 100) {
        let parsedProfile = parseStudentProfile(profileHtml);
        // Resolve the faculty image before caching, otherwise the offline profile
        // permanently shows whatever the parser saw — which is the student's photo.
        parsedProfile = await resolveProctorPhoto(parsedProfile as any);
        const profileData = (parsedProfile as any)?.data || parsedProfile;

        if (profileData?.basic?.name) {
          studentName = profileData.basic.name.trim();
        } else if (profileData?.name) {
          studentName = profileData.name.trim();
        }

        const rawImg =
          profileData?.profileImgBase64 ||
          profileData?.basic?.profileImgBase64 ||
          '';
        profilePhoto = fixBase64Image(rawImg);

        // Only the encrypted retop_img_* record keeps any profile photo.
        await setCachedData(
          scopedCacheKey('student_profile_data', regNo),
          stripProfilePhotosForCache(parsedProfile),
        );
        if (profilePhoto) {
          await saveUserProfileImage(regNo, profilePhoto).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[syncOrchestrator] Profile fetch failed:', e);
    }

    // 2. Fetch Semesters
    onProgress?.({
      step: 'Discovering active semesters...',
      progressPercent: 35,
    });
    let activeSemId = '';
    try {
      const semHtml = await client.getSemesters();
      if (semHtml && semHtml.length > 50) {
        const semesters = parseSemesters(semHtml);
        await setCachedData(
          scopedCacheKey('tt_semester_list', regNo),
          semesters,
        );

        const activeSem = semesters.find((s) => s.isLatest) || semesters[0];
        if (activeSem) {
          activeSemId = activeSem.id;
        }
      }
    } catch (e) {
      console.warn('[syncOrchestrator] Semesters fetch failed:', e);
    }

    // 3. Parallel fetch of Academic Data for active semester
    if (activeSemId) {
      onProgress?.({
        step: 'Syncing timetable, attendance & marks...',
        progressPercent: 55,
      });

      await Promise.allSettled([
        // Timetable
        (async () => {
          try {
            const ttHtml = await client.getTimetable(activeSemId);
            const courses = parseTimetable(ttHtml);
            // An empty parse must not wipe a previously good cached timetable.
            if (courses.length > 0) {
              await setCachedData(
                scopedCacheKey(`tt_${activeSemId}`, regNo),
                courses,
              );
              await setCachedData(
                scopedCacheKey('timetable_courses', regNo),
                courses,
              );
            }
          } catch (err) {
            console.warn('[syncOrchestrator] Timetable sync error:', err);
          }
        })(),

        // Attendance
        (async () => {
          try {
            const attHtml = await client.getAttendance(activeSemId);
            const attData = parseStudentAttendance(attHtml);
            if (attData.length > 0) {
              await setCachedData(
                scopedCacheKey(`attendance_detailed_${activeSemId}`, regNo),
                attData,
              );
              // AP has no dashboard widget; reuse the attendance page for Home.
              if (client.campus === 'vitap') {
                const homeAttendance = attData.map(detailedToCourseSummary);
                await setCachedData(
                  scopedCacheKey('dashboard_attendance', regNo),
                  homeAttendance,
                );
              }
            }
          } catch (err) {
            console.warn('[syncOrchestrator] Attendance sync error:', err);
          }
        })(),

        // Registered-course summary comes from the dedicated dashboard endpoint.
        // The attendance page has no span.fw-bold codes, so parsing it here
        // yielded an empty list and blanked the Home course list.
        (async () => {
          try {
            const dashHtml = await client.authenticatedPost(
              '/vtop/get/dashboard/current/semester/course/details',
              {
                _csrf: client.csrf,
                authorizedID: client.registrationNumber,
              },
            );
            const dashAtt = parseCourseDetails(dashHtml);
            // Keep a good cached list if the endpoint returns nothing usable.
            if (dashAtt.length > 0) {
              await setCachedData(
                scopedCacheKey('dashboard_attendance', regNo),
                dashAtt,
              );
            }
          } catch (err) {
            console.warn(
              '[syncOrchestrator] Dashboard attendance sync error:',
              err,
            );
          }
        })(),

        // Marks
        (async () => {
          try {
            const marksHtml = await client.getMarks(activeSemId);
            const marksData = parseStudentMarks(marksHtml);
            if (marksData.length > 0) {
              await setCachedData(
                scopedCacheKey(`marks_data_${activeSemId}`, regNo),
                marksData,
              );
            }
          } catch (err) {
            console.warn('[syncOrchestrator] Marks sync error:', err);
          }
        })(),

        // Grades + CGPA
        (async () => {
          try {
            const gradesHtml = await client.getGrades(activeSemId);
            const gradesData = parseGrades(gradesHtml);
            if (gradesData.courses.length > 0) {
              await setCachedData(
                scopedCacheKey(`grades_data_${activeSemId}`, regNo),
                gradesData,
              );
            }
          } catch (err) {
            console.warn('[syncOrchestrator] Grades sync error:', err);
          }
        })(),

        // Grade history (for CGPA summary)
        (async () => {
          try {
            const historyHtml = await client.getGradeHistory();
            if (historyHtml && historyHtml.length > 100) {
              const history = parseGradeHistory(historyHtml);
              await setCachedData(
                scopedCacheKey('grade_history', regNo),
                history,
              );
              // Extract CGPA and cache under dashboard_stats key
              if (history.cgpa) {
                const dashStats = {
                  cgpa: history.cgpa.cgpa || '...',
                  credits: history.cgpa.creditsEarned || '...',
                  totalCredits: history.cgpa.creditsRegistered || '...',
                  nonGraded: '...',
                  placement: '...',
                };
                await setCachedData(
                  scopedCacheKey('dashboard_stats', regNo),
                  dashStats,
                );
              }
            }
          } catch (err) {
            console.warn('[syncOrchestrator] Grade history sync error:', err);
          }
        })(),
      ]);
    }

    // 4. Update Cached Users and Auth State
    onProgress?.({
      step: 'Saving account credentials & state...',
      progressPercent: 85,
    });

    const newUser: CachedUser = {
      regNo,
      username: regNo,
      name: studentName,
      profileImgBase64: profilePhoto,
      lastActive: Date.now(),
      campus: client.campus,
    };
    // Only the encrypted retop_img_* record keeps the photo at rest.
    const { profileImgBase64: _runtimePhoto, ...storedUser } = newUser;

    const storageRes = await getStorageData(['retop_cached_users']);
    const existingUsers: CachedUser[] = (
      storageRes.retop_cached_users || []
    ).map(({ profileImgBase64: _stalePhoto, ...u }: CachedUser) => u);
    const userIndex = existingUsers.findIndex(
      (u) => u.regNo.toUpperCase() === regNo,
    );

    if (userIndex >= 0) {
      existingUsers[userIndex] = {
        ...existingUsers[userIndex],
        ...storedUser,
      };
    } else {
      existingUsers.push(storedUser);
    }

    await idbSet('retop_cached_users', existingUsers).catch(() => {});

    try {
      localStorage.setItem('retop_lastAuthId', regNo);
      localStorage.setItem('retop_active_user', regNo);
      localStorage.setItem('retop_lastName', studentName);
    } catch {}

    await setStorageData({
      retop_cached_users: existingUsers,
      retop_lastAuthId: regNo,
      retop_active_user: regNo,
      retop_lastName: studentName,
      [`${regNo}_user_basic_profile`]: {
        name: studentName,
        regNo,
        campus: client.campus,
      },
    });

    onProgress?.({ step: 'Sync complete!', progressPercent: 100 });

    return {
      success: true,
      user: newUser,
    };
  } catch (error: any) {
    console.error('[syncOrchestrator] Full sync failed:', error);
    return {
      success: false,
      user: {
        regNo,
        name: studentName,
        lastActive: Date.now(),
        campus: client.campus,
      },
      error: error?.message || 'Sync failed',
    };
  }
}
