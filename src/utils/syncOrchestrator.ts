/**
 * Student Data Synchronization Orchestrator.
 * Fetches academic data from live VTOP session and persists to IndexedDB/chrome.storage.
 */

import { VtopClient, VtopCampus } from "./vtopClient";
import { parseStudentProfile, fixBase64Image, resolveProctorPhoto } from "../parsers/profile";
import { parseSemesters, parseTimetable } from "../parsers/timetable";
import { parseStudentAttendance } from "../parsers/attendance";
import { parseCourseDetails } from "../parsers/dashboard";
import { parseStudentMarks } from "../parsers/marks";
import { parseGrades, parseGradeHistory } from "../parsers/grades";
import { setCachedData } from "./cache";
import { getStorageData, setStorageData } from "./storageAdapter";
import { saveUserProfileImage } from "./pinSecurity";
import { set as idbSet } from "idb-keyval";

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
  onProgress?: (progress: SyncProgress) => void
): Promise<{
  success: boolean;
  user: CachedUser;
  error?: string;
}> {
  const regNo = client.registrationNumber.toUpperCase().trim();
  let studentName = client.studentName || regNo;
  let profilePhoto = "";

  try {
    // 1. Fetch Profile
    onProgress?.({ step: "Fetching student profile...", progressPercent: 15 });
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

        const rawImg = profileData?.profileImgBase64 || profileData?.basic?.profileImgBase64 || "";
        profilePhoto = fixBase64Image(rawImg);

        await setCachedData(`${regNo}_student_profile_data`, parsedProfile);
        await setCachedData("student_profile_data", parsedProfile);
        if (profilePhoto) {
          await saveUserProfileImage(regNo, profilePhoto).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("[syncOrchestrator] Profile fetch failed:", e);
    }

    // 2. Fetch Semesters
    onProgress?.({ step: "Discovering active semesters...", progressPercent: 35 });
    let activeSemId = "";
    try {
      const semHtml = await client.getSemesters();
      if (semHtml && semHtml.length > 50) {
        const semesters = parseSemesters(semHtml);
        await setCachedData(`${regNo}_tt_semester_list`, semesters);
        await setCachedData("tt_semester_list", semesters);

        const activeSem = semesters.find((s) => s.isLatest) || semesters[0];
        if (activeSem) {
          activeSemId = activeSem.id;
        }
      }
    } catch (e) {
      console.warn("[syncOrchestrator] Semesters fetch failed:", e);
    }

    // 3. Parallel fetch of Academic Data for active semester
    if (activeSemId) {
      onProgress?.({ step: "Syncing timetable, attendance & marks...", progressPercent: 55 });

      await Promise.allSettled([
        // Timetable
        (async () => {
          try {
            const ttHtml = await client.getTimetable(activeSemId);
            const courses = parseTimetable(ttHtml);
            await setCachedData(`${regNo}_tt_${activeSemId}`, courses);
            await setCachedData(`tt_${activeSemId}`, courses);
            await setCachedData(`${regNo}_timetable_courses`, courses);
          } catch (err) {
            console.warn("[syncOrchestrator] Timetable sync error:", err);
          }
        })(),

        // Attendance
        (async () => {
          try {
            const attHtml = await client.getAttendance(activeSemId);
            const attData = parseStudentAttendance(attHtml);
            await setCachedData(`${regNo}_attendance_detailed_${activeSemId}`, attData);
            await setCachedData(`attendance_detailed_${activeSemId}`, attData);
            // Also cache under dashboard keys for instant hydration in DashboardApp
            try {
              const dashAtt = parseCourseDetails(attHtml);
              await setCachedData(`${regNo}_dashboard_attendance`, dashAtt);
              await setCachedData(`dashboard_attendance`, dashAtt);
            } catch {}
          } catch (err) {
            console.warn("[syncOrchestrator] Attendance sync error:", err);
          }
        })(),

        // Marks
        (async () => {
          try {
            const marksHtml = await client.getMarks(activeSemId);
            const marksData = parseStudentMarks(marksHtml);
            await setCachedData(`${regNo}_marks_data_${activeSemId}`, marksData);
            await setCachedData(`marks_data_${activeSemId}`, marksData);
          } catch (err) {
            console.warn("[syncOrchestrator] Marks sync error:", err);
          }
        })(),

        // Grades + CGPA
        (async () => {
          try {
            const gradesHtml = await client.getGrades(activeSemId);
            const gradesData = parseGrades(gradesHtml);
            await setCachedData(`${regNo}_grades_data_${activeSemId}`, gradesData);
            await setCachedData(`grades_data_${activeSemId}`, gradesData);
          } catch (err) {
            console.warn("[syncOrchestrator] Grades sync error:", err);
          }
        })(),

        // Grade history (for CGPA summary)
        (async () => {
          try {
            const historyHtml = await client.getGradeHistory();
            if (historyHtml && historyHtml.length > 100) {
              const history = parseGradeHistory(historyHtml);
              await setCachedData(`${regNo}_grade_history`, history);
              await setCachedData(`grade_history`, history);
              // Extract CGPA and cache under dashboard_stats key
              if (history.cgpa) {
                const dashStats = {
                  cgpa: history.cgpa.cgpa || "...",
                  credits: history.cgpa.creditsEarned || "...",
                  totalCredits: history.cgpa.creditsRegistered || "...",
                  nonGraded: "...",
                  placement: "...",
                };
                await setCachedData(`${regNo}_dashboard_stats`, dashStats);
                await setCachedData(`dashboard_stats`, dashStats);
              }
            }
          } catch (err) {
            console.warn("[syncOrchestrator] Grade history sync error:", err);
          }
        })(),
      ]);
    }

    // 4. Update Cached Users and Auth State
    onProgress?.({ step: "Saving account credentials & state...", progressPercent: 85 });

    const newUser: CachedUser = {
      regNo,
      username: regNo,
      name: studentName,
      profileImgBase64: profilePhoto,
      lastActive: Date.now(),
      campus: client.campus,
    };

    const storageRes = await getStorageData(["retop_cached_users"]);
    const existingUsers: CachedUser[] = storageRes.retop_cached_users || [];
    const userIndex = existingUsers.findIndex((u) => u.regNo.toUpperCase() === regNo);

    if (userIndex >= 0) {
      existingUsers[userIndex] = {
        ...existingUsers[userIndex],
        ...newUser,
        profileImgBase64: profilePhoto || existingUsers[userIndex].profileImgBase64 || "",
      };
    } else {
      existingUsers.push(newUser);
    }

    await idbSet("retop_cached_users", existingUsers).catch(() => {});

    try {
      localStorage.setItem("retop_lastAuthId", regNo);
      localStorage.setItem("retop_active_user", regNo);
      localStorage.setItem("retop_lastName", studentName);
      if (profilePhoto) {
        localStorage.setItem(`${regNo}_profileImage`, profilePhoto);
      }
    } catch {}

    await setStorageData({
      retop_cached_users: existingUsers,
      retop_lastAuthId: regNo,
      retop_active_user: regNo,
      retop_lastName: studentName,
      [`${regNo}_profileImage`]: profilePhoto || "",
      [`${regNo}_user_basic_profile`]: {
        name: studentName,
        regNo,
        profileImgBase64: profilePhoto || "",
        campus: client.campus,
      },
    });

    onProgress?.({ step: "Sync complete!", progressPercent: 100 });

    return {
      success: true,
      user: newUser,
    };
  } catch (error: any) {
    console.error("[syncOrchestrator] Full sync failed:", error);
    return {
      success: false,
      user: {
        regNo,
        name: studentName,
        lastActive: Date.now(),
        campus: client.campus,
      },
      error: error?.message || "Sync failed",
    };
  }
}
