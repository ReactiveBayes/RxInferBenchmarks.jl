// Hard rule (CLAUDE.md / design/frontend.md): the build must be FULLY static.
// `output: "export"` already fails the build on dynamically rendered pages;
// this script verifies the exported artifact as a second line of defense:
//   - out/ exists with the expected entry points
//   - no server runtime remnants are present in the artifact
//   - the custom domain (CNAME) is pinned and assets resolve from the site root
//     — no /RxInferBenchmarks.jl/ project-page prefix, which 404s on the custom
//     domain and leaves the page unstyled
// Exits non-zero when the build is not a pure static export.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "..", "out");
const failures = [];

if (!existsSync(out)) {
  fail(`out/ does not exist — run \`npm run build\` first (output: "export" must be set)`);
} else {
  for (const required of ["index.html", "404.html", ".nojekyll", "CNAME"]) {
    if (!existsSync(join(out, required))) {
      failures.push(`missing required static file: out/${required}`);
    }
  }
  // The site is served from the custom domain at the root. A project-page
  // basePath/assetPrefix would point assets at /RxInferBenchmarks.jl/_next/...,
  // which 404s on benchmarks.rxinfer.com (page renders without styles/JS).
  for (const html of walk(out).filter((f) => f.endsWith(".html"))) {
    if (readFileSync(html, "utf8").includes("/RxInferBenchmarks.jl/_next/")) {
      failures.push(
        `asset references a project-page basePath (/RxInferBenchmarks.jl/_next/) in ${html} — ` +
          `the custom domain serves from "/"; remove basePath/assetPrefix in next.config.ts`,
      );
    }
  }
  // Server runtime remnants must never appear in a static export.
  const forbidden = ["server", "standalone", "cache", "BUILD_ID"].filter((name) =>
    existsSync(join(out, name)),
  );
  for (const name of forbidden) {
    failures.push(`server artifact leaked into the static export: out/${name}`);
  }
  // Every HTML page must be a real prerendered file (non-empty).
  for (const html of walk(out).filter((f) => f.endsWith(".html"))) {
    if (statSync(html).size === 0) failures.push(`empty HTML page: ${html}`);
  }
}

if (failures.length > 0) {
  fail(failures.join("\n"));
}
console.log("check-static: build is fully static ✓");

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function fail(message) {
  console.error(`check-static FAILED:\n${message}`);
  process.exit(1);
}
