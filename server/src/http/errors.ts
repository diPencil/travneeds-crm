import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { code: error.code } });
    return;
  }
  if (error instanceof ZodError || (error instanceof SyntaxError && 'body' in error)) {
    response.status(400).json({ error: { code: 'INVALID_INPUT' } });
    return;
  }
  if (error && typeof error === 'object' && 'status' in error && error.status === 413) {
    response.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE' } });
    return;
  }
  console.error('Request failed', {
    errorType: error instanceof Error ? error.name : 'UnknownError',
  });
  response.status(500).json({ error: { code: 'SERVER_ERROR' } });
};
