import { getAuthToken } from "./googleDriveSync";
import { TimetableCourse, CalendarEvent, Assignment, Event as VTOPEvent } from "../types/vtop";
import { ExamGroup } from "../parsers/exam-schedule";
import { CustomCalendarEvent } from "../store/slices/calendarSlice";

export interface SyncCalendarOptions {
  courses: TimetableCourse[];
  examGroups?: ExamGroup[];
  assignments?: Assignment[];
  events?: VTOPEvent[];
  customEvents?: CustomCalendarEvent[];
  clientId?: string;
}

export const syncEventsToGoogleCalendar = async (
  options: SyncCalendarOptions,
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const token = await getAuthToken(options.clientId);
    if (!token) throw new Error("Could not obtain Google OAuth token");

    let count = 0;

    // Helper to post event to Google Calendar API
    const postGoogleEvent = async (eventPayload: any) => {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventPayload),
        },
      );
      if (res.ok) {
        count++;
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn("[retop] Google Calendar sync item failed:", errJson);
      }
    };

    // 1. Sync Exams (30 min reminder before exam starting)
    if (options.examGroups) {
      for (const group of options.examGroups) {
        for (const entry of group.entries) {
          if (!entry.examDate) continue;
          const dObj = new Date(entry.examDate);
          if (isNaN(dObj.getTime())) continue;

          let h = 9, m = 0;
          if (entry.examTime && entry.examTime.includes("-")) {
            const parts = entry.examTime.split("-")[0].trim().split(":");
            if (parts.length >= 2) {
              h = parseInt(parts[0], 10);
              m = parseInt(parts[1], 10);
            }
          }

          const start = new Date(dObj);
          start.setHours(h, m, 0, 0);
          const end = new Date(start);
          end.setHours(start.getHours() + 2, start.getMinutes(), 0, 0);

          await postGoogleEvent({
            summary: `[EXAM] ${entry.courseTitle} (${entry.courseCode})`,
            description: `Exam Group: ${group.examType}\nSlot: ${entry.slot}\nReporting Time: ${entry.reportingTime}\nVenue: ${entry.venue || "TBA"}\nSeat: ${entry.seatNo || "N/A"}`,
            location: entry.venue || "",
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
            reminders: {
              useDefault: false,
              overrides: [{ method: "popup", minutes: 30 }],
            },
          });
        }
      }
    }

    // 2. Sync Custom User Events (Quizzes, Assessments, Tasks, Notes)
    if (options.customEvents) {
      for (const evt of options.customEvents) {
        if (!evt.date) continue;
        const dObj = new Date(evt.date);
        if (isNaN(dObj.getTime())) continue;

        let h = 10, m = 0;
        if (evt.time) {
          const parts = evt.time.split(":");
          if (parts.length >= 2) {
            h = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
          }
        }

        const start = new Date(dObj);
        start.setHours(h, m, 0, 0);
        const end = new Date(start);
        end.setHours(start.getHours() + 1, start.getMinutes(), 0, 0);

        await postGoogleEvent({
          summary: `[${evt.type.toUpperCase()}] ${evt.title}`,
          description: evt.description || evt.title,
          location: evt.venue || "",
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: 15 }],
          },
        });
      }
    }

    // 3. Sync Timetable Courses (10 min reminder before class starting)
    if (options.courses) {
      for (const course of options.courses) {
        await postGoogleEvent({
          summary: `[CLASS] ${course.title} (${course.code})`,
          description: `Faculty: ${course.faculty}\nSlot: ${course.slot}\nClass ID: ${course.classId}`,
          location: course.venue || "",
          start: {
            dateTime: new Date().toISOString(),
          },
          end: {
            dateTime: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
          },
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: 10 }],
          },
        });
      }
    }

    return { success: true, count };
  } catch (err: any) {
    console.error("[retop] Google Calendar sync failed:", err);
    return { success: false, count: 0, error: err.message || "Calendar sync failed" };
  }
};
