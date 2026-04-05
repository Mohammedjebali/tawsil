import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://48be640fd5cc45313e890df4e124fe8f@o998214.ingest.us.sentry.io/4511165112844288";

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
  ],
  debug: process.env.NODE_ENV === "development",
});

// Patch fetch to capture failed API responses in Sentry
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
    const response = await originalFetch.apply(this, args);

    if (!response.ok) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;

      // Only report API errors, not static assets
      if (url.includes("/api/")) {
        let body = "";
        try { body = await response.clone().text(); } catch {}
        Sentry.captureMessage(`API ${response.status}: ${url}`, {
          level: response.status >= 500 ? "error" : "warning",
          extra: {
            status: response.status,
            statusText: response.statusText,
            url,
            responseBody: body.slice(0, 2000),
          },
        });
      }
    }

    return response;
  };
}
