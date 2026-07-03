import {
  CoursePageOption,
  CourseMaterial,
  CourseOutcome,
  SyllabusModule,
  CoursePageData,
} from "../types/vtop";

export const parseCoursePage = (html: string): CoursePageData => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const options: CoursePageOption[] = [];
  const select = doc.querySelector("select#courseId");

  if (select) {
    const optElements = select.querySelectorAll("option");
    optElements.forEach((opt) => {
      const val = opt.getAttribute("value");
      const text = opt.textContent?.trim() || "";
      if (val && val !== "" && !text.toLowerCase().includes("select")) {

        // CRITICAL FIX: Extract exact API-required hidden data parameters
        const courseId = opt.getAttribute("data-courseid") || val;
        const type = opt.getAttribute("data-crstype") || "TH";
        const semester = opt.getAttribute("data-semestr") || ""; // Grabs VL20252601, NOT "Fall Semester..."

        const parts = text.split(" - ");
        let code = parts[1] || "";
        let title = parts[2] || "";
        let credits = parts[parts.length - 1] || "0";

        if (parts.length >= 6) {
          credits = parts[parts.length - 1];
        } else if (parts.length >= 4) {
          credits = parts[parts.length - 1];
        }

        options.push({
          code: code.trim(),
          title: title.trim(),
          classId: courseId,
          semester,
          type,
          credits: credits.trim(),
          rawText: text,
        });
      }
    });
  }

  const outcomes: CourseOutcome[] = [];
  const outcomeRows = doc.querySelectorAll("#collapseOutcome table tbody tr");
  outcomeRows.forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length >= 2) {
      outcomes.push({
        number: tds[0].textContent?.trim() || "",
        description: tds[1].textContent?.trim() || "",
      });
    }
  });

  const syllabus: SyllabusModule[] = [];
  const syllabusRows = doc.querySelectorAll("#collapseModules table tbody tr");
  let currentModNumber = "";
  let currentModTitle = "";
  let currentModTopics: string[] = [];

  syllabusRows.forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length === 3) {
      if (currentModTitle) {
        syllabus.push({
          number: currentModNumber,
          title: currentModTitle,
          topics: currentModTopics.join("\n"),
        });
      }
      const headerText = tds[0].textContent?.trim() || "";
      const headerParts = headerText.split(" - ");
      currentModNumber = headerParts[0] || "";
      currentModTitle = headerParts[1] || headerText;
      currentModTopics = [tds[1].textContent?.trim() || ""];
    } else if (tds.length === 2) {
      currentModTopics.push(tds[0].textContent?.trim() || "");
    }
  });

  if (currentModTitle) {
    syllabus.push({
      number: currentModNumber,
      title: currentModTitle,
      topics: currentModTopics.join("\n"),
    });
  }

  const materials: CourseMaterial[] = [];
  const matTable = doc.querySelector("#materialTable");

  if (matTable) {
    const rows = matTable.querySelectorAll("tbody tr");
    rows.forEach((tr) => {
      const tds = tr.querySelectorAll("td");
      if (tds.length >= 5) {
        const btn = tds[4].querySelector(
          "button[data-fileid], a[data-fileid], a[href]",
        );
        const downloadId = btn?.getAttribute("data-fileid") || "";

        if (downloadId) {
          const materialSpans = tds[2].querySelectorAll("span");
          const title =
            materialSpans.length > 0
              ? materialSpans[0].textContent?.trim() || ""
              : tds[2].textContent?.trim() || "";
          const category =
            materialSpans.length >= 3
              ? materialSpans[2].textContent?.replace(/[()]/g, "").trim() || ""
              : "Document";

          const facSpans = tds[3].querySelectorAll("span");
          const faculty =
            facSpans.length > 0 ? facSpans[0].textContent?.trim() || "" : "";
          const uploadDate =
            facSpans.length > 1 ? facSpans[1].textContent?.trim() || "" : "";

          materials.push({
            id: downloadId,
            index: tds[0].textContent?.trim() || "",
            title,
            category,
            faculty,
            uploadDate,
            downloadId,
          });
        }
      }
    });
  }

  return {
    options,
    selectedCourseId: select?.getAttribute("value") || null,
    outcomes,
    syllabus,
    materials,
  };
};
