import fs from "fs";
import path from "path";

const EXT_DIR = "/data/data/org.cromite.cromite/app_chrome/Default/Local Extension Settings/bagienbknnhjpbfnjenpkdelcbnoljhl";

const files = fs.readdirSync(EXT_DIR).filter((f) => f.endsWith(".ldb") || f.endsWith(".log"));

for (const file of files) {
  const fullPath = path.join(EXT_DIR, file);
  const data = fs.readFileSync(fullPath).toString("latin1");

  // Search for StudentProfileAllView or table containing personal details
  const matchIdx = data.indexOf("collapseOne");
  if (matchIdx !== -1) {
    const start = Math.max(0, matchIdx - 2000);
    const end = Math.min(data.length, matchIdx + 40000);
    const chunk = data.slice(start, end);
    fs.writeFileSync("vtop_network_captures/raw_student_profile.html", chunk);
    console.log(`Saved raw profile HTML from ${file} (${chunk.length} bytes)`);
    break;
  }
}
