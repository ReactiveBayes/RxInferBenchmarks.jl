import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/** Render with a fresh TanStack QueryClient (no retries, no cache reuse between tests). */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Providers({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, ...render(ui, { wrapper: Providers }) };
}

/** Build a fetch mock that serves canned JSON by URL substring. */
export function mockFetchByUrl(routes: Record<string, unknown>) {
  return (url: string): Promise<Response> => {
    const match = Object.entries(routes).find(([key]) => url.includes(key));
    if (!match) {
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(match[1]),
    } as Response);
  };
}
