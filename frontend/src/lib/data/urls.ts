// Data base-URL resolution (design/frontend.md):
//   dev:  NEXT_PUBLIC_DATA_BASE_URL=/local-data  (public/local-data symlink -> repo data/)
//   prod: raw.githubusercontent.com — the live site picks up new benchmark
//         results without a redeploy.
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
