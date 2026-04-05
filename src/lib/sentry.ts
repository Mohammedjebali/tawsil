import * as Sentry from "@sentry/nextjs";

/**
 * Wrap an API route handler to capture errors in Sentry.
 * Usage: export const GET = withSentry((req) => { ... });
 */
export function withSentry<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      Sentry.captureException(error);
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }) as T;
}

/**
 * Capture a handled error (400s, validation failures, etc.)
 */
export function captureError(error: unknown, context?: Record<string, string>) {
  if (error instanceof Error) {
    Sentry.captureException(error, { extra: context });
  } else {
    Sentry.captureMessage(String(error), { extra: context, level: "error" });
  }
}

/**
 * Capture an API error response in Sentry before returning it.
 * Call this before returning NextResponse.json({error}, {status: 4xx/5xx}).
 */
export function captureApiError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  Sentry.captureMessage(`API ${status}: ${message}`, {
    level: status >= 500 ? "error" : "warning",
    extra: { status, ...extra },
    tags: { http_status: String(status) },
  });
}
