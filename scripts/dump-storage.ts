import fs from "fs";
import path from "path";

const EXT_DIR = "/data/data/org.cromite.cromite/app_chrome/Default/Local Extension Settings/bagienbknnhjpbfnjenpkdelcbnoljhl";
const IDB_DIR = "/data/data/org.cromite.cromite/app_chrome/Default/IndexedDB/chrome-extension_bagienbknnhjpbfnjenpkdelcbnoljhl_0.indexeddb.leveldb";
const OUT_DIR = path.resolve(process.cwd(), "vtop_network_captures");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function scanFiles(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (!file.endsWith(".ldb") && !file.endsWith(".log")) continue;
    const fullPath = path.join(dir, file);
    try {
      const buffer = fs.readFileSync(fullPath);
      const text = buffer.toString("latin1");

      // Search for keys
      const keyMatches = text.match(/retop_cache_[A-Za-z0-9_]+/g);
      if (keyMatches) {
        const uniqueKeys = Array.from(new Set(keyMatches));
        console.log(`Found keys in ${file}:`, uniqueKeys);
      }

      // Look for raw HTML fragments containing student profile
      const idx = text.indexOf("StudentProfileAllView");
      if (idx !== -1) {
        const start = Math.max(0, idx - 500);
        const end = Math.min(text.length, idx + 50000);
        const snippet = text.slice(start, end);
        const fn = path.join(OUT_DIR, `profile_html_${file}.html`);
        fs.writeFileSync(fn, snippet);
        console.log(`Saved profile snippet to ${fn}`);
      }

      // Look for tt_sem or semester list fragments
      const semIdx = text.indexOf("semesterSubId");
      if (semIdx !== -1) {
        const start = Math.max(0, semIdx - 500);
        const end = Math.min(text.length, semIdx + 5000);
        const snippet = text.slice(start, end);
        const fn = path.join(OUT_DIR, `sem_html_${file}.html`);
        fs.writeFileSync(fn, snippet);
        console.log(`Saved semester snippet to ${fn}`);
      }
    } catch (e: any) {
      console.error(`Error reading ${file}:`, e.message);
    }
  }
}

console.log("Scanning Extension Settings...");
scanFiles(EXT_DIR);

console.log("Scanning IndexedDB...");
scanFiles(IDB_DIR);
