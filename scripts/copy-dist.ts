import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

const ROOT = resolve(import.meta.dir, "..");
const src = resolve(ROOT, "dist");
const target = resolve(homedir(), "storage/documents/dist");

if (!existsSync(src)) {
  console.error(`Error: ${src} does not exist. Run build first.`);
  process.exit(1);
}

try {
  mkdirSync(resolve(homedir(), "storage/documents"), { recursive: true });
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
  cpSync(src, target, { recursive: true });
  console.log(`\x1b[32m✓ Synced dist/ -> ${target}\x1b[0m`);
} catch (err) {
  console.error("Failed to copy dist to storage/documents:", err);
  process.exit(1);
}
