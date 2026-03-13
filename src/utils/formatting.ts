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
