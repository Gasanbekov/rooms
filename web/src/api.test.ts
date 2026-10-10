import { describe, expect, it } from 'vitest';
import { api, ApiError } from './api';
import { mockApi } from './test-utils';

describe('api', () => {
  it('returns the parsed JSON body', async () => {
    mockApi({ 'GET /health': { body: { status: 'ok' } } });

    expect(await api('/health')).toEqual({ status: 'ok' });
  });

  it('sends JSON bodies with the right header', async () => {
    const fetchMock = mockApi({ 'POST /login': { body: {} } });

    await api('/login', { method: 'POST', body: { email: 'a@b.c' } });

    const init = fetchMock.mock.calls[0][1];
    expect(init?.body).toBe('{"email":"a@b.c"}');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('throws an ApiError with the code and issues from the server', async () => {
    mockApi({
      'POST /register': {
        status: 400,
        body: { error: 'validation_error', issues: [{ path: 'email', message: 'Invalid email' }] },
      },
    });

    const error = (await api('/register', { method: 'POST', body: {} }).catch(
      (caught) => caught,
    )) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe('validation_error');
    expect(error.issues).toEqual([{ path: 'email', message: 'Invalid email' }]);
  });

  it('returns undefined for 204 responses', async () => {
    mockApi({ 'POST /logout': { status: 204 } });

    expect(await api('/logout', { method: 'POST' })).toBeUndefined();
  });
});
