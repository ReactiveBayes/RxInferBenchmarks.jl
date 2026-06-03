// Data base-URL resolution (design/frontend.md, design/data.md). A single env
// var, NEXT_PUBLIC_DATA_BASE_URL, selects which dataset the app fetches:
//   prod (.env.production): raw.githubusercontent.com/.../main/data — the REAL
//         public CI dataset; the live site picks up new results without a redeploy.
//   dev  (.env.development): /local-data/seed — the FAKE seed dataset under
//         data/seed/, via the public/local-data symlink -> repo data/. Lets the
//         UI be developed against representative data without touching real results.
// The built-in fallback below mirrors the production (REAL) source.
const PROD_DATA_URL =
  "https://raw.githubusercontent.com/ReactiveBayes/RxInferBenchmarks.jl/main/data";

export function dataBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DATA_BASE_URL;
  return fromEnv && fromEnv.length > 0 ? fromEnv : PROD_DATA_URL;
}

/** Join a relative data path onto the base URL without duplicate slashes. */
export function dataUrl(relativePath: string): string {
  const base = dataBaseUrl().replace(/\/+$/, "");
  return `${base}/${relativePath.replace(/^\/+/, "")}`;
}
