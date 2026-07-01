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
      // 1. Decode HTML entities that VTOP sometimes returns in raw HTML
      .replace(/&amp;/g, "&")
      // 2. Strip " - VLR", "(VLR)", or " VLR" from the end of the string
      .replace(/\s*-\s*VLR\s*$/i, "")
      .replace(/\s*\(\s*VLR\s*\)\s*$/i, "")
      .replace(/\s*VLR\s*$/i, "")
      // 3. Fix weird spacing VTOP sometimes adds
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function formatTimeStr(timeStr: string, use24Hour: boolean): string {
  if (use24Hour || !timeStr) return timeStr;

  // Handles "08:00 - 08:50" or single times "08:00"
  const convert = (t: string) => {
    const parts = t.trim().split(":");
    if (parts.length < 2) return t;
    const hour = parseInt(parts[0], 10);
    const min = parts[1];
    if (isNaN(hour)) return t;
    
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${min} ${ampm}`;
  };

  if (timeStr.includes("-")) {
    const [start, end] = timeStr.split("-").map(s => s.trim());
    return `${convert(start)} - ${convert(end)}`;
  }

  return convert(timeStr);
}
