import { describe, expect, it, vi } from "vitest";
import { FetchError, fetchJson } from "./fetcher";

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("fetchJson", () => {
  it("returns the parsed JSON body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse(200, { hello: "world" }));
    await expect(fetchJson<{ hello: string }>("/x.json", fetchImpl)).resolves.toEqual({
      hello: "world",
    });
    expect(fetchImpl).toHaveBeenCalledWith("/x.json");
  });

  it("throws a typed error with status and url on non-2xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse(404, {}));
    const error = await fetchJson("/missing.json", fetchImpl).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FetchError);
    expect((error as FetchError).status).toBe(404);
    expect((error as FetchError).url).toBe("/missing.json");
  });
});
