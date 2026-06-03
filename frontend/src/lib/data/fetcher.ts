export class FetchError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`fetch ${url} failed with status ${status}`);
    this.name = "FetchError";
  }
}

export type FetchImpl = (url: string) => Promise<Response>;

/** Typed JSON fetch with an injectable implementation (tests pass a mock). */
export async function fetchJson<T>(url: string, fetchImpl: FetchImpl = fetch): Promise<T> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new FetchError(url, response.status);
  return (await response.json()) as T;
}
