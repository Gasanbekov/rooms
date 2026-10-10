import { ApiError } from './api';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  email_taken: 'This email is already registered.',
  unauthorized: 'Please log in first.',
  room_not_found: 'This room does not exist.',
  payload_too_large: 'The message is too large.',
};

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'validation_error' && error.issues.length > 0) {
      return error.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    }
    return MESSAGES[error.code] ?? 'Something went wrong. Please try again.';
  }
  return 'Cannot reach the server. Please try again.';
}
