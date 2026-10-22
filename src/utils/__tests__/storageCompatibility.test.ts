import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  getCachedData,
  getCachedDataWithTimestamp,
  setCachedData,
  isSchemaStale,
  PARSER_SCHEMA_VERSIONS,
} from "../cache";
import { getStorageData, setStorageData, getAllStorageData } from "../storageAdapter";
import { wrapWithSchemaVersion } from "../../parsers/version";

describe("Storage and Cache Compatibility Suite", () => {
  // In-memory mocks for tests in non-browser runner
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(mockLocalStorage)) {
      delete mockLocalStorage[key];
    }

    // Set up global localStorage mock if not present in Bun test environment
    if (typeof globalThis.localStorage === "undefined") {
      (globalThis as any).localStorage = {
        getItem: (k: string) => mockLocalStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockLocalStorage[k] = String(v);
        },
        removeItem: (k: string) => {
          delete mockLocalStorage[k];
        },
        clear: () => {
          for (const k of Object.keys(mockLocalStorage)) delete mockLocalStorage[k];
        },
      };
    }
  });

  afterEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  describe("Old data retrieval across storage tiers", () => {
    it("retrieves legacy raw JSON strings from localStorage", async () => {
      const oldAttendanceData = [
        { courseCode: "CSE1001", attendancePercentage: 88, attendedClasses: 22, totalClasses: 25 },
      ];
      localStorage.setItem("21BCE1234_attendance", JSON.stringify(oldAttendanceData));

      const result = await getStorageData(["21BCE1234_attendance"]);
      expect(result["21BCE1234_attendance"]).toBeDefined();
      expect(result["21BCE1234_attendance"]).toEqual(oldAttendanceData);
    });

    it("retrieves legacy un-enveloped objects without timestamp envelope", async () => {
      const oldProfile = { name: "ALEX DOE", regNo: "21BCE1234", campus: "vellore" };
      localStorage.setItem("21BCE1234_vtop_profile", JSON.stringify(oldProfile));
      localStorage.setItem("retop_active_user", "21BCE1234");

      const cached = await getCachedData<typeof oldProfile>("vtop_profile");
      expect(cached).toBeDefined();
      expect(cached?.name).toBe("ALEX DOE");
      expect(cached?.regNo).toBe("21BCE1234");
    });

    it("retrieves modern enveloped cached data with timestamp", async () => {
      const timetableData = [{ courseCode: "MAT2001", slot: "A1", venue: "SJT301" }];
      await setCachedData("21BCE1234_tt_WIN2024", timetableData);

      const cached = await getCachedDataWithTimestamp<typeof timetableData>("21BCE1234_tt_WIN2024");
      expect(cached).not.toBeNull();
      expect(cached?.data).toEqual(timetableData);
      expect(cached?.timestamp).toBeGreaterThan(0);
    });

    it("falls back to generic key when user-scoped key is requested without active user", async () => {
      const genericSpotlight = [{ category: "Circulars", items: [{ title: "Exam Notice" }] }];
      localStorage.setItem("retop_cache_vtop_spotlight", JSON.stringify({
        timestamp: Date.now(),
        data: genericSpotlight,
      }));

      const cached = await getCachedData<typeof genericSpotlight>("vtop_spotlight");
      expect(cached).toBeDefined();
      expect(cached?.[0].category).toBe("Circulars");
    });

    it("respects TTL and expires very old cached data (over 30 days)", async () => {
      const staleTimestamp = Date.now() - 35 * 24 * 60 * 60 * 1000; // 35 days ago
      localStorage.setItem("retop_cache_stale_data", JSON.stringify({
        timestamp: staleTimestamp,
        data: { value: "old" },
      }));

      const result = await getCachedDataWithTimestamp("stale_data");
      expect(result).toBeNull();
    });
  });

  describe("Schema versioning & staleness checks", () => {
    it("detects unversioned or outdated schemas as stale", () => {
      expect(isSchemaStale(null, "timetable")).toBe(true);
      expect(isSchemaStale({}, "timetable")).toBe(true);
      expect(isSchemaStale({ _schemaVersion: 0 }, "timetable")).toBe(true);
      expect(isSchemaStale({ _schemaVersion: PARSER_SCHEMA_VERSIONS.timetable }, "timetable")).toBe(false);
    });

    it("wraps arrays and objects with schema version metadata", () => {
      const obj = { code: "CSE2001" };
      const versionedObj = wrapWithSchemaVersion(obj, "timetable");
      expect(versionedObj._schemaVersion).toBe(PARSER_SCHEMA_VERSIONS.timetable);
      expect(versionedObj._parsedAt).toBeGreaterThan(0);

      const arr = [{ code: "CSE2001" }];
      const versionedArr = wrapWithSchemaVersion(arr, "attendance");
      expect((versionedArr as any)._schemaVersion).toBe(PARSER_SCHEMA_VERSIONS.attendance);
      expect((versionedArr as any)._parsedAt).toBeGreaterThan(0);
    });
  });

  describe("Multi-user isolation", () => {
    it("ensures student A cached records are separate from student B", async () => {
      await setCachedData("21BCE0001_vtop_marks", [{ subject: "Data Structures", mark: 95 }]);
      await setCachedData("21BCE0002_vtop_marks", [{ subject: "Data Structures", mark: 80 }]);

      localStorage.setItem("retop_active_user", "21BCE0001");
      const studentAMarks = await getCachedData<any[]>("vtop_marks");
      expect(studentAMarks?.[0].mark).toBe(95);

      localStorage.setItem("retop_active_user", "21BCE0002");
      const studentBMarks = await getCachedData<any[]>("vtop_marks");
      expect(studentBMarks?.[0].mark).toBe(80);
    });
  });

  describe("Settings payload backward compatibility", () => {
    it("handles legacy plain JSON settings and base64 encoded settings", () => {
      const rawSettings = { defaultView: "legacy", themeMode: "amoled", accentColor: "purple" };

      // Helper simulating dashboard.ts / settings-store decoding
      const decode = (raw: string) => {
        if (raw.startsWith("enc_")) {
          return decodeURIComponent(atob(raw.slice(4)));
        }
        return raw;
      };

      const plainJson = JSON.stringify({ state: { settings: rawSettings } });
      expect(JSON.parse(decode(plainJson)).state.settings.defaultView).toBe("legacy");

      const encoded = "enc_" + btoa(encodeURIComponent(plainJson));
      expect(JSON.parse(decode(encoded)).state.settings.defaultView).toBe("legacy");
    });
  });
});
