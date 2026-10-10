export type ApiIssue = { path: string; message: string };

export class ApiError extends Error {
  status: number;
  code: string;
  issues: ApiIssue[];

  constructor(status: number, code: string, issues: ApiIssue[] = []) {
    super(code);
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

type Options = { method?: string; body?: unknown };

// Same-origin requests carry the session cookie automatically,
// so there is nothing to do here about authentication.
export async function api<T>(path: string, { method = 'GET', body }: Options = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? 'unknown_error', data?.issues ?? []);
  }
  return data as T;
}
