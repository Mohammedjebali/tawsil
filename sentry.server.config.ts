import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://48be640fd5cc45313e890df4e124fe8f@o998214.ingest.us.sentry.io/4511165112844288";

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 1,
  debug: process.env.NODE_ENV === "development",
});
