export const getCourseAcronym = (title: string) => {
  if (!title) return "";
  const upperTitle = title.trim().toUpperCase();
  const cleanKey = upperTitle.replace(/\s+/g, " ");

  const manualCodes: Record<string, string> = {
    "MICROPROCESSORS AND MICROCONTROLLERS": "MPMC",
    "COMPUTER ARCHITECTURE AND ORGANIZATION": "CAO",
    "DATA STRUCTURES AND ALGORITHMS": "DSA",
    "OBJECT ORIENTED PROGRAMMING": "OOP",
    "PROBABILITY AND STATISTICS": "P&S",
    "DESIGN AND ANALYSIS OF ALGORITHMS": "DAA",
  };

  for (const [phrase, code] of Object.entries(manualCodes)) {
    if (cleanKey.includes(phrase)) {
      return code;
    }
  }

  const words = title.split(/[\s\-\(\)\.,]+/).filter((w) => w.length > 0);
  if (words.length === 0) return "";

  const firstWord = words[0].toUpperCase();
  if (firstWord.length === 3 && !["THE", "AND", "FOR"].includes(firstWord)) {
    return firstWord;
  }

  if (words.length === 3) {
    return words.map((w) => w[0].toUpperCase()).join("");
  }

  const ignore = [
    "AND",
    "OF",
    "THE",
    "IN",
    "FOR",
    "TO",
    "A",
    "AN",
    "WITH",
    "BY",
  ];

  if (words.length === 1) return words[0].substring(0, 4).toUpperCase();

  const acronym = words
    .map((w) => {
      const clean = w.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      return ignore.includes(clean) ? "" : clean[0];
    })
    .join("");

  return acronym.length < 2 ? title.substring(0, 3).toUpperCase() : acronym;
};

export function normalizeSemesterLabel(rawLabel: string): string {
  if (!rawLabel) return "";

  return (
    rawLabel
      // Decode HTML entities that VTOP sometimes returns in raw HTML
      .replace(/&amp;/g, "&")
      // Strip " - VLR", "(VLR)", or " VLR" from the end of the string
      .replace(/\s*-\s*VLR\s*$/i, "")
      .replace(/\s*\(\s*VLR\s*\)\s*$/i, "")
      .replace(/\s*VLR\s*$/i, "")
      // Fix weird spacing VTOP sometimes adds
      .replace(/\s+/g, " ")
      .trim()
  );
}

export type TimeFormatMode = "24h" | "12h" | "12h-ampm";

export function formatTimeStr(
  timeStr: string,
  mode: TimeFormatMode | boolean = "12h",
  showAmPmParam?: boolean
): string {
  if (!timeStr) return "";

  let formatMode: TimeFormatMode = "12h";
  if (typeof mode === "string") {
    formatMode = mode as TimeFormatMode;
  } else if (mode === true) {
    formatMode = "24h";
  } else if (mode === false) {
    formatMode = showAmPmParam ? "12h-ampm" : "12h";
  }

  if (formatMode === "24h") return timeStr;

  const convert = (t: string) => {
    const parts = t.trim().split(":");
    if (parts.length < 2) return t;
    const hour = parseInt(parts[0], 10);
    const min = parts[1];
    if (isNaN(hour)) return t;

    const h12 = hour % 12 || 12;
    if (formatMode === "12h-ampm") {
      const ampm = hour >= 12 ? "PM" : "AM";
      return `${h12}:${min} ${ampm}`;
    }
    return `${h12}:${min}`;
  };

  if (timeStr.includes("-")) {
    const [start, end] = timeStr.split("-").map((s) => s.trim());
    return `${convert(start)} - ${convert(end)}`;
  }

  return convert(timeStr);
}

export const toTitleCase = (str: string): string => {
  if (!str) return "";
  if (str === "retop") return "retop";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word.length === 0) return "";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

export function parseVtopDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.replace(/[-/.]/g, " ").trim();
  const directDate = new Date(cleanStr);

  if (!isNaN(directDate.getTime())) {
    return directDate;
  }
  
  const parts = cleanStr.split(/\s+/);
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);
    let year = parseInt(parts[2], 10);
    let monthStr = parts[1].toLowerCase();

    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      day = parseInt(parts[2], 10);
      monthStr = parts[1].toLowerCase();
    }

    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    let monthIndex = months.indexOf(monthStr.slice(0, 3));
    if (monthIndex === -1 && !isNaN(parseInt(monthStr, 10))) {
      monthIndex = parseInt(monthStr, 10) - 1;
    }

    if (!isNaN(day) && monthIndex !== -1 && !isNaN(year)) {
      return new Date(year, monthIndex, day);
    }
  }
  
  return null;
}

export function formatDateStr(dateStr: string, pattern: string = "DD Mon YYYY"): string {
  if (!dateStr) return "";

  const dateObj = parseVtopDate(dateStr);
  if (!dateObj || isNaN(dateObj.getTime())) return dateStr;

  const DD = String(dateObj.getDate()).padStart(2, "0");
  const MM = String(dateObj.getMonth() + 1).padStart(2, "0");
  const YYYY = String(dateObj.getFullYear());
  const YY = YYYY.slice(2);
  const Mon = dateObj.toLocaleDateString("en-US", { month: "short" });

  switch (pattern) {
    case "DD Mon YYYY":
      return `${DD} ${Mon} ${YYYY}`;
    case "DD Mon YY":
      return `${DD} ${Mon} ${YY}`;
    case "DD/MM/YYYY":
      return `${DD}/${MM}/${YYYY}`;
    case "MM/DD/YYYY":
      return `${MM}/${DD}/${YYYY}`;
    case "YYYY-MM-DD":
      return `${YYYY}-${MM}-${DD}`;
    case "DD.MM.YYYY":
      return `${DD}.${MM}.${YYYY}`;
    case "DD-MM-YYYY":
      return `${DD}-${MM}-${YYYY}`;
    default:
      return `${DD} ${Mon} ${YYYY}`;
  }
}
