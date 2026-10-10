import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { AuthProvider } from './AuthProvider';

type Reply = { status?: number; body?: unknown };

// Replaces fetch with a fake server: handlers are keyed by "METHOD /path" (without /api).
export function mockApi(handlers: Record<string, Reply | (() => Reply)>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^\/api/, '');
    const key = `${init?.method ?? 'GET'} ${path}`;
    const handler = handlers[key];
    if (!handler) {
      throw new Error(`Unexpected request: ${key}`);
    }
    const { status = 200, body } = typeof handler === 'function' ? handler() : handler;
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderApp(ui: ReactElement, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}
