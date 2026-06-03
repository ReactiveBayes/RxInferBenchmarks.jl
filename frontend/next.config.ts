import type { NextConfig } from "next";

// GitHub Pages serves this app as a *project page* under /RxInferBenchmarks.jl.
// The base path is enabled only for the Pages build (GITHUB_PAGES=true) so that
// local dev and local static previews stay at /.
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = "/RxInferBenchmarks.jl";

const nextConfig: NextConfig = {
  // Hard rule (CLAUDE.md): the build must be fully static. `output: "export"`
  // makes `next build` fail on any dynamically rendered page; scripts/check-static.mjs
  // additionally verifies the exported artifact.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isGitHubPages ? { basePath, assetPrefix: `${basePath}/` } : {}),
};

export default nextConfig;
