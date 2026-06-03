// Create the gitignored public/local-data symlink -> ../../data so that the
// dev server serves the repository's data folder at /local-data (design/frontend.md).
import { existsSync, symlinkSync, rmSync, lstatSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "..", "..", "data");
const link = resolve(here, "..", "public", "local-data");

if (!existsSync(target)) {
  console.error(`link-local-data: data folder not found at ${target}`);
  process.exit(1);
}

if (existsSync(link) || isDanglingSymlink(link)) {
  rmSync(link, { recursive: true, force: true });
}
symlinkSync(target, link, "dir");
console.log(`link-local-data: ${link} -> ${target}`);

function isDanglingSymlink(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}
