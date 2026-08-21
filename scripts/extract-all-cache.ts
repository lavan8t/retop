import fs from "fs";
import path from "path";

const EXT_DIR = "/data/data/org.cromite.cromite/app_chrome/Default/Local Extension Settings/bagienbknnhjpbfnjenpkdelcbnoljhl";

const files = fs.readdirSync(EXT_DIR).filter((f) => f.endsWith(".ldb") || f.endsWith(".log"));

for (const file of files) {
  const fullPath = path.join(EXT_DIR, file);
  const data = fs.readFileSync(fullPath).toString("latin1");

  // Regex to extract retop_cache keys and their trailing JSON objects
  const re = /(retop_cache_[a-zA-Z0-9_]+)[\s\S]{0,30}(\{"data":[\s\S]*?\}(?=(?:retop_cache|\x00|\x01|$)))/g;
  let match;
  while ((match = re.exec(data)) !== null) {
    const key = match[1];
    const rawVal = match[2];
    try {
      // Find valid balanced JSON
      let depth = 0;
      let endIdx = 0;
      for (let i = 0; i < rawVal.length; i++) {
        if (rawVal[i] === "{") depth++;
        else if (rawVal[i] === "}") {
          depth--;
          if (depth === 0) {
            endIdx = i + 1;
            break;
          }
        }
      }
      if (endIdx > 0) {
        const jsonStr = rawVal.slice(0, endIdx);
        const obj = JSON.parse(jsonStr);
        console.log(`\n========================================`);
        console.log(`KEY: ${key}`);
        console.log(`========================================`);
        console.log(JSON.stringify(obj, null, 2).slice(0, 800));
      }
    } catch {}
  }
}
