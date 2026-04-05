"use client";

import * as Sentry from "@sentry/nextjs";

/**
 * Wrapper around fetch that captures non-OK responses to Sentry.
 * Use this for all API calls in the app.
 */
export async function sentryFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || "GET";

    Sentry.captureMessage(`${method} ${url} → ${response.status}`, {
      level: response.status >= 500 ? "error" : "warning",
      extra: {
        url,
        method,
        status: response.status,
        statusText: response.statusText,
      },
    });
  }

  return response;
}
