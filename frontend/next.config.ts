import type { NextConfig } from "next";

// The dashboard is served from the custom domain https://benchmarks.rxinfer.com,
// which maps to the site root ("/"). It is therefore NOT a GitHub Pages *project
// page* (those live under /<repo>/), so no basePath/assetPrefix is needed: assets
// and routes resolve from "/" in both local dev and the deployed site.
// `public/CNAME` pins the custom domain across deploys; `public/.nojekyll`
// prevents Jekyll from mangling the `_next/` asset directory.
const nextConfig: NextConfig = {
  // Hard rule (CLAUDE.md): the build must be fully static. `output: "export"`
  // makes `next build` fail on any dynamically rendered page; scripts/check-static.mjs
  // additionally verifies the exported artifact.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
