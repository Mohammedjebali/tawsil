import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
    Sentry.httpClientIntegration({
      failedRequestStatusCodes: [[400, 599]],
      failedRequestTargets: [/\/api\//],
    }),
  ],
  debug: process.env.NODE_ENV === "development",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// Manual fetch patch — more reliable than httpClientIntegration for Next.js SPA routing
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof Request
          ? args[0].url
          : String(args[0]);
    if (!response.ok && /\/api\//.test(url)) {
      let body = "";
      try {
        body = await response.clone().text();
      } catch {
        // ignore clone/read errors
      }
      Sentry.captureMessage(`HTTP ${response.status}: ${url}`, {
        level: response.status >= 500 ? "error" : "warning",
        extra: { status: response.status, url, body },
        tags: { http_status: String(response.status) },
      });
    }
    return response;
  };
}
